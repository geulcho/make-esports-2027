import type { TeamRecord, PhaseResult } from '../types';
import type { MatchSlot } from './leagueScheduleDefs';
import { getLeagueScheduleDef } from './leagueScheduleDefs';
import { sortStandings, sortStandingsNEUWEU } from './simulator';
import { getSRRRounds, getDRRRounds, getLKRSpringRounds, getLKRSummerRounds, getLCNHalfRounds } from './matchSchedule';

const BO1_LEAGUES = new Set([
  'L_NEU', 'L_WEU', 'L_DE', 'L_EEU', 'L_SEU', 'L_RU', 'L_TR',
]);

function isBo1(leagueId: string): boolean {
  return BO1_LEAGUES.has(leagueId);
}

function doSort(leagueId: string, standings: TeamRecord[], results: PhaseResult[]): TeamRecord[] {
  return isBo1(leagueId)
    ? sortStandingsNEUWEU(standings, results)
    : sortStandings(standings);
}

// ─── Replay standings from results ───────────────────────────────────────────

export function replayStandingsUpToPhase(
  teamIds: string[],
  results: PhaseResult[],
  upToPhase: number,
  divisionId: string | null,
  leagueId: string,
  initialElos?: Map<string, number>,
): TeamRecord[] {
  const records = new Map<string, TeamRecord>();
  for (const id of teamIds) {
    records.set(id, {
      clubId: id,
      divisionId: divisionId,
      elo: initialElos?.get(id) ?? 1500,
      wins: 0, losses: 0,
      setsFor: 0, setsAgainst: 0,
      momFor: 0, momAgainst: 0,
    });
  }

  const teamSet = new Set(teamIds);
  const filteredResults: PhaseResult[] = [];

  for (const pr of results) {
    if (pr.phase > upToPhase) break;
    if (divisionId != null && pr.divisionId != null && pr.divisionId !== divisionId) continue;
    const filteredMatches = pr.matches.filter(m => teamSet.has(m.teamA) && teamSet.has(m.teamB));
    if (filteredMatches.length === 0) continue;
    filteredResults.push({ ...pr, matches: filteredMatches });

    for (const m of filteredMatches) {
      const a = records.get(m.teamA);
      const b = records.get(m.teamB);
      if (!a || !b) continue;

      if (m.scoreA > m.scoreB) { a.wins++; b.losses++; }
      else { b.wins++; a.losses++; }
      a.setsFor += m.scoreA; a.setsAgainst += m.scoreB;
      b.setsFor += m.scoreB; b.setsAgainst += m.scoreA;
      for (const set of m.sets) {
        a.momFor += set.momA; a.momAgainst += set.momB;
        b.momFor += set.momB; b.momAgainst += set.momA;
      }
      a.elo += m.eloChangeA;
      b.elo -= m.eloChangeA;
    }
  }

  return doSort(leagueId, [...records.values()], filteredResults);
}

// ─── Week boundaries ─────────────────────────────────────────────────────────

export function weekBoundaries(slots: MatchSlot[]): { weekNum: number; lastPhase: number }[] {
  const map = new Map<number, number>();
  slots.forEach((s, i) => {
    map.set(s.weekNum, i + 1); // 1-indexed phase
  });
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekNum, lastPhase]) => ({ weekNum, lastPhase }));
}

type SplitKey = 'spring' | 'summer' | 'first_half' | 'second_half' | 'default';

export function getWeeklyBoundaries(leagueId: string, split: SplitKey): { weekNum: number; lastPhase: number }[] {
  const def = getLeagueScheduleDef(leagueId);
  if (!def) return [];

  const phaseIdMap: Record<string, string[]> = {
    spring: ['spring'],
    summer: ['summer'],
    first_half: ['first_half'],
    second_half: ['second_half'],
    default: [def.phases[0]?.id ?? ''],
  };

  const candidateIds = phaseIdMap[split] ?? [split];
  const phase = def.phases.find(p => candidateIds.includes(p.id));
  if (!phase) return [];

  return weekBoundaries(phase.slots);
}

// ─── Streaks ─────────────────────────────────────────────────────────────────

export function computeStreaks(
  results: PhaseResult[],
  divisionId: string | null,
): Map<string, { type: 'W' | 'L'; count: number }> {
  const streaks = new Map<string, { type: 'W' | 'L'; count: number }>();

  for (const pr of results) {
    if (divisionId != null && pr.divisionId != null && pr.divisionId !== divisionId) continue;
    for (const m of pr.matches) {
      const winnerId = m.scoreA > m.scoreB ? m.teamA : m.teamB;
      const loserId = m.scoreA > m.scoreB ? m.teamB : m.teamA;

      const ws = streaks.get(winnerId);
      if (ws?.type === 'W') ws.count++;
      else streaks.set(winnerId, { type: 'W', count: 1 });

      const ls = streaks.get(loserId);
      if (ls?.type === 'L') ls.count++;
      else streaks.set(loserId, { type: 'L', count: 1 });
    }
  }

  return streaks;
}

// ─── Rank changes ────────────────────────────────────────────────────────────

export function computeRankChanges(
  leagueId: string,
  currentStandings: TeamRecord[],
  results: PhaseResult[],
  divisionId: string | null,
  split: SplitKey,
  initialElos?: Map<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  if (currentStandings.length === 0 || results.length === 0) return out;

  const boundaries = getWeeklyBoundaries(leagueId, split);
  if (boundaries.length === 0) return out;

  const maxPhase = results.reduce((mx, pr) => {
    if (divisionId != null && pr.divisionId != null && pr.divisionId !== divisionId) return mx;
    return Math.max(mx, pr.phase);
  }, 0);

  const completedWeeks = boundaries.filter(b => b.lastPhase <= maxPhase);
  if (completedWeeks.length < 2) return out;

  const prevWeekEnd = completedWeeks[completedWeeks.length - 2].lastPhase;
  const teamIds = currentStandings.map(r => r.clubId);
  const prevStandings = replayStandingsUpToPhase(teamIds, results, prevWeekEnd, divisionId, leagueId, initialElos);

  const prevRankMap = new Map<string, number>();
  prevStandings.forEach((r, i) => prevRankMap.set(r.clubId, i + 1));

  currentStandings.forEach((r, i) => {
    const curRank = i + 1;
    const prevRank = prevRankMap.get(r.clubId) ?? curRank;
    out.set(r.clubId, prevRank - curRank);
  });

  return out;
}

// ─── Weekly rank progression ─────────────────────────────────────────────────

export function buildRankProgression(
  leagueId: string,
  results: PhaseResult[],
  teamIds: string[],
  divisionId: string | null,
  split: SplitKey,
  initialElos?: Map<string, number>,
): { weeks: number[]; matrix: Map<string, number[]> } {
  const boundaries = getWeeklyBoundaries(leagueId, split);
  if (boundaries.length === 0 || teamIds.length === 0) {
    return { weeks: [], matrix: new Map() };
  }

  const maxPhase = results.reduce((mx, pr) => {
    if (divisionId != null && pr.divisionId != null && pr.divisionId !== divisionId) return mx;
    return Math.max(mx, pr.phase);
  }, 0);

  const activeWeeks = boundaries.filter(b => b.lastPhase <= maxPhase);
  if (activeWeeks.length === 0) return { weeks: [], matrix: new Map() };

  const weeks: number[] = [];
  const matrix = new Map<string, number[]>();
  for (const id of teamIds) matrix.set(id, []);

  for (const { weekNum, lastPhase } of activeWeeks) {
    const standings = replayStandingsUpToPhase(teamIds, results, lastPhase, divisionId, leagueId, initialElos);
    weeks.push(weekNum);
    standings.forEach((r, i) => {
      matrix.get(r.clubId)?.push(i + 1);
    });
    for (const id of teamIds) {
      const arr = matrix.get(id)!;
      if (arr.length < weeks.length) arr.push(teamIds.length);
    }
  }

  return { weeks, matrix };
}

// ─── Monte Carlo predictions ─────────────────────────────────────────────────

export interface PredictionResult {
  clubId: string;
  championshipProb: number;
  championshipOdds: number;
  playoffProb: number;
  playoffOdds: number;
  wtProb: number;
  wtOdds: number;
}

export interface PlayoffConfig {
  topN: number;
  bracketType: 'neuweu' | 'kr6' | 'de6' | 'twjp' | 'na' | 'cn';
}

function splitSRR(srr: [string, string][][], chunkA: number): [string, string][][] {
  const sub: [string, string][][] = [];
  for (const round of srr) {
    sub.push(round.slice(0, chunkA));
    sub.push(round.slice(chunkA));
  }
  return sub;
}

function splitDRRWeekly(drr: [string, string][][], perWeekPattern: number[]): [string, string][][] {
  const sub: [string, string][][] = [];
  const weeks = drr.length / 2;
  for (let w = 0; w < weeks; w++) {
    const combined = [...drr[w * 2], ...drr[w * 2 + 1]];
    let offset = 0;
    for (const count of perWeekPattern) {
      sub.push(combined.slice(offset, offset + count));
      offset += count;
    }
  }
  return sub;
}

export function getAllRoundsForSplit(
  leagueId: string,
  split: 'spring' | 'summer' | 'first_half' | 'second_half' | 'default',
): [string, string][][] {
  if (leagueId === 'L_KR') {
    return split === 'summer' ? getLKRSummerRounds() : getLKRSpringRounds();
  }
  if (leagueId === 'L_CN') {
    return getLCNHalfRounds();
  }
  if (leagueId === 'L_BR' || leagueId === 'L_SA') {
    return splitSRR(getSRRRounds(leagueId, null), 2);
  }
  if (leagueId === 'L_TW' || leagueId === 'L_JP') {
    return splitDRRWeekly(getDRRRounds(leagueId, null), [2, 3, 3]);
  }
  if (leagueId === 'L_SEA') {
    return splitSRR(getSRRRounds(leagueId, null), 3);
  }
  if (leagueId === 'L_NEU' || leagueId === 'L_WEU' || leagueId === 'L_TR'
    || leagueId === 'L_DE' || leagueId === 'L_EEU' || leagueId === 'L_SEU' || leagueId === 'L_RU') {
    return getDRRRounds(leagueId, null);
  }
  if (leagueId === 'L_NA') {
    if (split === 'first_half') return getDRRRounds('L_NA', 'WEST');
    return getSRRRounds('L_NA', null);
  }
  return getSRRRounds(leagueId, null);
}

function eloProbA(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

function simSeriesWinner(eloA: number, eloB: number, winsNeeded: number): 'A' | 'B' {
  let a = 0, b = 0;
  while (a < winsNeeded && b < winsNeeded) {
    Math.random() < eloProbA(eloA, eloB) ? a++ : b++;
  }
  return a >= winsNeeded ? 'A' : 'B';
}

function simNEUWEUBracket(seeds: { id: string; elo: number }[]): string[] {
  const s = seeds;
  const t = (i: number) => s[i];
  const win = (a: { id: string; elo: number }, b: { id: string; elo: number }, wn: number) =>
    simSeriesWinner(a.elo, b.elo, wn) === 'A' ? a : b;
  const lose = (a: { id: string; elo: number }, b: { id: string; elo: number }, wn: number) =>
    simSeriesWinner(a.elo, b.elo, wn) === 'A' ? b : a;

  const ub1w = win(t(0), t(7), 2), ub1l = t(0).id === ub1w.id ? t(7) : t(0);
  const ub2w = win(t(3), t(4), 2), ub2l = t(3).id === ub2w.id ? t(4) : t(3);
  const ub3w = win(t(1), t(6), 2), ub3l = t(1).id === ub3w.id ? t(6) : t(1);
  const ub4w = win(t(2), t(5), 2), ub4l = t(2).id === ub4w.id ? t(5) : t(2);

  const ub5w = win(ub1w, ub2w, 3), ub5l = ub1w.id === ub5w.id ? ub2w : ub1w;
  const ub6w = win(ub3w, ub4w, 3), ub6l = ub3w.id === ub6w.id ? ub4w : ub3w;

  const lb1w = win(ub1l, ub2l, 3);
  const lb2w = win(ub3l, ub4l, 3);
  const lb3w = win(lb1w, ub6l, 3);
  const lb4w = win(lb2w, ub5l, 3);

  const ubfw = win(ub5w, ub6w, 3), ubfl = ub5w.id === ubfw.id ? ub6w : ub5w;
  const lb5w = win(lb3w, lb4w, 3);
  const lbfw = win(lb5w, ubfl, 3);
  const gfw = win(ubfw, lbfw, 3), gfl = ubfw.id === gfw.id ? lbfw : ubfw;

  return [gfw.id, gfl.id, lbfw.id === gfl.id ? ubfl.id : lb5w.id];
}

function simKR6Bracket(seeds: { id: string; elo: number }[]): string[] {
  const t = (i: number) => seeds[i];
  const win = (a: { id: string; elo: number }, b: { id: string; elo: number }, wn: number) =>
    simSeriesWinner(a.elo, b.elo, wn) === 'A' ? a : b;

  const qf1w = win(t(2), t(5), 3), qf1l = t(2).id === qf1w.id ? t(5) : t(2);
  const qf2w = win(t(3), t(4), 3), qf2l = t(3).id === qf2w.id ? t(4) : t(3);
  const sf1w = win(t(0), qf1w, 3), sf1l = t(0).id === sf1w.id ? qf1w : t(0);
  const sf2w = win(t(1), qf2w, 3), sf2l = t(1).id === sf2w.id ? qf2w : t(1);
  const ufw = win(sf1w, sf2w, 3), ufl = sf1w.id === ufw.id ? sf2w : sf1w;
  const lw = win(sf1l, sf2l, 3);
  const fqw = win(lw, ufl, 3);
  const gfw = win(ufw, fqw, 3);

  return [gfw.id, gfw.id === ufw.id ? fqw.id : ufw.id];
}

function simDE6Bracket(seeds: { id: string; elo: number }[]): string[] {
  const t = (i: number) => seeds[i];
  const win = (a: { id: string; elo: number }, b: { id: string; elo: number }, wn: number) =>
    simSeriesWinner(a.elo, b.elo, wn) === 'A' ? a : b;

  const u1w = win(t(0), t(5), 3), u1l = t(0).id === u1w.id ? t(5) : t(0);
  const u2w = win(t(1), t(4), 3), u2l = t(1).id === u2w.id ? t(4) : t(1);
  const l1w = win(u1l, t(2), 3);
  const l2w = win(u2l, t(3), 3);
  const ubfw = win(u1w, u2w, 3), ubfl = u1w.id === ubfw.id ? u2w : u1w;
  const l3w = win(l1w, ubfl, 3);
  const lbfw = win(l3w, l2w, 3);
  const gfw = win(ubfw, lbfw, 3);

  return [gfw.id, gfw.id === ubfw.id ? lbfw.id : ubfw.id];
}

function simTWJPBracket(seeds: { id: string; elo: number }[]): string[] {
  const t = (i: number) => seeds[i];
  const win = (a: { id: string; elo: number }, b: { id: string; elo: number }, wn: number) =>
    simSeriesWinner(a.elo, b.elo, wn) === 'A' ? a : b;

  const r1w = win(t(3), t(4), 3);
  const r2w = win(t(2), r1w, 3);
  const r3w = win(t(1), r2w, 3);
  const fw = win(t(0), r3w, 3);

  return [fw.id];
}

function simBracket(
  standings: TeamRecord[],
  config: PlayoffConfig,
): string {
  const seeds = standings.slice(0, config.topN).map(r => ({ id: r.clubId, elo: r.elo }));

  switch (config.bracketType) {
    case 'neuweu': return simNEUWEUBracket(seeds)[0];
    case 'kr6':    return simKR6Bracket(seeds)[0];
    case 'de6':    return simDE6Bracket(seeds)[0];
    case 'twjp':   return simTWJPBracket(seeds)[0];
    default:       return simNEUWEUBracket(seeds)[0];
  }
}

const PLAYOFF_CONFIGS: Record<string, PlayoffConfig> = {
  L_KR:  { topN: 6, bracketType: 'kr6' },
  L_NEU: { topN: 8, bracketType: 'neuweu' },
  L_WEU: { topN: 8, bracketType: 'neuweu' },
  L_TR:  { topN: 8, bracketType: 'neuweu' },
  L_SEA: { topN: 8, bracketType: 'neuweu' },
  L_DE:  { topN: 6, bracketType: 'de6' },
  L_EEU: { topN: 6, bracketType: 'de6' },
  L_SEU: { topN: 6, bracketType: 'de6' },
  L_RU:  { topN: 6, bracketType: 'de6' },
  L_BR:  { topN: 6, bracketType: 'kr6' },
  L_SA:  { topN: 6, bracketType: 'kr6' },
  L_TW:  { topN: 5, bracketType: 'twjp' },
  L_JP:  { topN: 5, bracketType: 'twjp' },
};

const WT_SLOTS: Record<string, number> = {
  L_KR: 3, L_NA: 3, L_CN: 3, L_NEU: 3,
  L_WEU: 2, L_DE: 2, L_SEU: 2, L_TW: 2,
  L_RU: 1, L_BR: 1, L_SEA: 1, L_JP: 1,
  L_EEU: 1, L_SA: 1, L_TR: 1,
};

export function runMonteCarlo(
  leagueId: string,
  currentStandings: TeamRecord[],
  remainingRounds: [string, string][][],
  numSims = 500,
): PredictionResult[] {
  const config = PLAYOFF_CONFIGS[leagueId];
  if (!config) return [];

  const wtSlots = WT_SLOTS[leagueId] ?? 0;
  const winsNeeded = isBo1(leagueId) ? 1 : 2;
  const K = 32;

  const champCount: Record<string, number> = {};
  const playoffCount: Record<string, number> = {};
  const wtCount: Record<string, number> = {};

  for (const r of currentStandings) {
    champCount[r.clubId] = 0;
    playoffCount[r.clubId] = 0;
    wtCount[r.clubId] = 0;
  }

  for (let sim = 0; sim < numSims; sim++) {
    const recs = currentStandings.map(r => ({ ...r }));
    const recMap = new Map(recs.map(r => [r.clubId, r]));

    for (const round of remainingRounds) {
      for (const [idA, idB] of round) {
        const a = recMap.get(idA);
        const b = recMap.get(idB);
        if (!a || !b) continue;

        const pA = eloProbA(a.elo, b.elo);
        let wA = 0, wB = 0;
        while (wA < winsNeeded && wB < winsNeeded) {
          Math.random() < pA ? wA++ : wB++;
        }

        if (wA > wB) { a.wins++; b.losses++; }
        else { b.wins++; a.losses++; }
        a.setsFor += wA; a.setsAgainst += wB;
        b.setsFor += wB; b.setsAgainst += wA;
        const eloChange = Math.round(K * ((wA > wB ? 1 : 0) - pA));
        a.elo += eloChange;
        b.elo -= eloChange;
      }
    }

    const sorted = isBo1(leagueId) ? sortStandingsNEUWEU(recs, []) : sortStandings(recs);

    for (let i = 0; i < Math.min(config.topN, sorted.length); i++) {
      playoffCount[sorted[i].clubId]++;
    }

    const champion = simBracket(sorted, config);
    champCount[champion]++;

    if (wtSlots > 0) {
      for (let i = 0; i < Math.min(wtSlots, sorted.length); i++) {
        wtCount[sorted[i].clubId]++;
      }
    }
  }

  const results: PredictionResult[] = currentStandings.map(r => {
    const cp = champCount[r.clubId] / numSims;
    const pp = playoffCount[r.clubId] / numSims;
    const wp = wtCount[r.clubId] / numSims;
    return {
      clubId: r.clubId,
      championshipProb: cp,
      championshipOdds: cp > 0 ? Math.max(1.01, 0.90 / cp) : 999,
      playoffProb: pp,
      playoffOdds: pp > 0 ? Math.max(1.01, 0.90 / pp) : 999,
      wtProb: wp,
      wtOdds: wp > 0 ? Math.max(1.01, 0.90 / wp) : 999,
    };
  });

  results.sort((a, b) => b.championshipProb - a.championshipProb);
  return results;
}
