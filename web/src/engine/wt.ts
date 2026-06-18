import type {
  Club, LeagueSimState, CupState, MMState,
  WTState, WTParticipant, WTGroup, WTGroupRecord, WTGroupMatch, WTKnockoutMatch,
} from '../types';
import { simulateMatch } from './combat';
import { getWeekNum, getDayOfWeek } from './calendar';
import { computeLeagueCoefficients, wtSlotsForRank, seedPoolForTeam } from './leagueCoeff';
import { allClubs } from '../data/clubs';

const clubMap = new Map(allClubs.map(c => [c.id, c]));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function calcOdds(eloA: number, eloB: number) {
  const pA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  return {
    oddsA: Math.round(Math.max(1.01, 0.95 / pA) * 100) / 100,
    oddsB: Math.round(Math.max(1.01, 0.95 / (1 - pA)) * 100) / 100,
  };
}

function getClubElo(clubId: string, leagueStates: Record<string, LeagueSimState>): number {
  for (const state of Object.values(leagueStates)) {
    const rec = state.standings.find(r => r.clubId === clubId);
    if (rec) return rec.elo;
  }
  return clubMap.get(clubId)?.elo_rating ?? 1200;
}

// ─── Season stats aggregation ─────────────────────────────────────────────────

function aggregateSeasonSets(
  clubId: string,
  leagueStates: Record<string, LeagueSimState>,
  cupStates: Record<string, CupState>,
  mmState: MMState,
): { won: number; lost: number } {
  let won = 0, lost = 0;
  // League regular season + playoffs
  for (const state of Object.values(leagueStates)) {
    const rec = state.standings.find(r => r.clubId === clubId);
    if (rec) { won += rec.setsFor; lost += rec.setsAgainst; }
    // Playoffs
    if (state.playoffs) {
      for (const s of state.playoffs.series) {
        for (const m of s.matches) {
          if (m.teamA === clubId) { won += m.scoreA; lost += m.scoreB; }
          else if (m.teamB === clubId) { won += m.scoreB; lost += m.scoreA; }
        }
      }
    }
    if (state.springPlayoffs) {
      for (const s of state.springPlayoffs.series) {
        for (const m of s.matches) {
          if (m.teamA === clubId) { won += m.scoreA; lost += m.scoreB; }
          else if (m.teamB === clubId) { won += m.scoreB; lost += m.scoreA; }
        }
      }
    }
  }
  // Cups
  for (const cup of Object.values(cupStates)) {
    for (const round of cup.rounds) {
      for (const m of round.matches) {
        if (m.teamA === clubId) { won += m.scoreA; lost += m.scoreB; }
        else if (m.teamB === clubId) { won += m.scoreB; lost += m.scoreA; }
      }
    }
  }
  // MM
  if (mmState) {
    for (const sr of mmState.swissRounds) {
      for (const m of sr.matches) {
        if (m.teamA === clubId) { won += m.scoreA; lost += m.scoreB; }
        else if (m.teamB === clubId) { won += m.scoreB; lost += m.scoreA; }
      }
    }
    for (const km of mmState.knockoutMatches) {
      if (km.teamA === clubId) { won += km.scoreA; lost += km.scoreB; }
      else if (km.teamB === clubId) { won += km.scoreB; lost += km.scoreA; }
    }
  }
  return { won, lost };
}

// ─── Cup result string ────────────────────────────────────────────────────────

function getCupResult(clubId: string, cupStates: Record<string, CupState>, mmState: MMState): string {
  const results: string[] = [];
  // MM
  if (mmState.champion === clubId) results.push('MM 우승');
  else if (mmState.participants.some(p => p.clubId === clubId)) {
    const p = mmState.participants.find(pp => pp.clubId === clubId);
    if (p?.qualified) {
      const koMatch = mmState.knockoutMatches.find(m => (m.teamA === clubId || m.teamB === clubId) && m.winner && m.winner !== clubId);
      if (koMatch) results.push(`MM ${koMatch.slot}`);
      else if (mmState.knockoutMatches.find(m => m.slot === 'GF' && (m.teamA === clubId || m.teamB === clubId))) results.push('MM 준우승');
      else results.push('MM KO');
    } else if (p?.eliminated) results.push(`MM Swiss ${p.swissWins}-${p.swissLosses}`);
  }
  // Cups
  for (const [cupId, cup] of Object.entries(cupStates)) {
    if (cup.champion === clubId) { results.push(`${cupId} 우승`); continue; }
    let lastRound = '';
    for (const round of cup.rounds) {
      for (const m of round.matches) {
        if ((m.teamA === clubId || m.teamB === clubId) && m.winner && m.winner !== clubId) {
          lastRound = round.label;
        }
      }
    }
    if (lastRound) results.push(`${cupId} ${lastRound}`);
  }
  return results.join(', ') || '-';
}

// ─── WT Qualification ─────────────────────────────────────────────────────────

function qualifyTeams(
  leagueStates: Record<string, LeagueSimState>,
  cupStates: Record<string, CupState>,
  mmState: MMState,
  coefficients: Array<{ leagueId: string; rank: number; points: number }>,
): WTParticipant[] {
  const qualified = new Set<string>();
  const participants: WTParticipant[] = [];

  const addTeam = (clubId: string, leagueId: string, leagueRank: number, seedInLeague: number, seedTag: string, isSpecial: boolean) => {
    if (qualified.has(clubId)) return false;
    qualified.add(clubId);
    const elo = getClubElo(clubId, leagueStates);
    const sets = aggregateSeasonSets(clubId, leagueStates, cupStates, mmState);
    participants.push({
      clubId, leagueId, leagueRank, seedInLeague, seedTag,
      seedPool: seedPoolForTeam(leagueRank, seedInLeague, isSpecial),
      elo,
      seasonSetsWon: sets.won, seasonSetsLost: sets.lost,
      cupResult: getCupResult(clubId, cupStates, mmState),
      preWTElo: elo,
    });
    return true;
  };

  // Step 1: Normal league slots
  for (const coeff of coefficients) {
    const state = leagueStates[coeff.leagueId];
    if (!state) continue;
    const sorted = [...state.standings].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.setsFor - b.setsAgainst) - (a.setsFor - a.setsAgainst);
    });
    const slots = wtSlotsForRank(coeff.rank);
    let seed = 0;
    for (const rec of sorted) {
      if (seed >= slots) break;
      seed++;
      addTeam(rec.clubId, coeff.leagueId, coeff.rank, seed, `#${seed}`, false);
    }
  }

  // Step 2: Special champion slots (with cascade)
  const specials: Array<{ tag: string; champion: string | null; leagueId: string | null }> = [
    { tag: '#M', champion: mmState.champion, leagueId: mmState.champion ? clubMap.get(mmState.champion)?.league_id ?? null : null },
    { tag: '#A', champion: cupStates.APEX?.champion ?? null, leagueId: cupStates.APEX?.champion ? clubMap.get(cupStates.APEX.champion!)?.league_id ?? null : null },
    { tag: '#E', champion: cupStates.EGT?.champion ?? null, leagueId: cupStates.EGT?.champion ? clubMap.get(cupStates.EGT.champion!)?.league_id ?? null : null },
    { tag: '#C', champion: cupStates.COPA?.champion ?? null, leagueId: cupStates.COPA?.champion ? clubMap.get(cupStates.COPA.champion!)?.league_id ?? null : null },
  ];

  for (const spec of specials) {
    if (!spec.champion || !spec.leagueId) continue;
    const coeff = coefficients.find(c => c.leagueId === spec.leagueId);
    if (!coeff) continue;

    if (!qualified.has(spec.champion)) {
      addTeam(spec.champion, spec.leagueId, coeff.rank, 0, spec.tag, true);
    } else {
      // Cascade: next eligible from same league
      const state = leagueStates[spec.leagueId];
      if (!state) continue;
      const sorted = [...state.standings].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.setsFor - b.setsAgainst) - (a.setsFor - a.setsAgainst);
      });
      for (const rec of sorted) {
        if (!qualified.has(rec.clubId)) {
          addTeam(rec.clubId, spec.leagueId, coeff.rank, 0, spec.tag, true);
          break;
        }
      }
    }
  }

  return participants;
}

// ─── Group Draw ───────────────────────────────────────────────────────────────

function generateDRR(teamIds: string[]): [string, string][] {
  // 4 teams DRR = 12 matches (play each opponent twice)
  const [a, b, c, d] = teamIds;
  // Round 1-6 (first pass)
  const first: [string, string][] = [
    [a, b], [c, d],  // MD1
    [a, c], [b, d],  // MD2
    [a, d], [b, c],  // MD3
  ];
  // Round 7-12 (second pass, reversed home/away)
  const second: [string, string][] = [
    [b, a], [d, c],  // MD4
    [c, a], [d, b],  // MD5
    [d, a], [c, b],  // MD6
  ];
  return [...first, ...second];
}

function drawGroups(participants: WTParticipant[]): WTGroup[] {
  const pools = [1, 2, 3, 4].map(p =>
    shuffle(participants.filter(t => t.seedPool === p)),
  );

  const groups: string[][] = Array.from({ length: 8 }, () => []);
  const groupLeagues: Set<string>[] = Array.from({ length: 8 }, () => new Set());

  for (const pool of pools) {
    const remaining = [...pool];
    for (let gi = 0; gi < 8 && remaining.length > 0; gi++) {
      // Find a team that doesn't conflict with the group's existing leagues
      let placed = false;
      for (let ti = 0; ti < remaining.length; ti++) {
        if (!groupLeagues[gi].has(remaining[ti].leagueId)) {
          const team = remaining.splice(ti, 1)[0];
          groups[gi].push(team.clubId);
          groupLeagues[gi].add(team.leagueId);
          placed = true;
          break;
        }
      }
      if (!placed && remaining.length > 0) {
        // Fallback: just place anyway
        const team = remaining.splice(0, 1)[0];
        groups[gi].push(team.clubId);
        groupLeagues[gi].add(team.leagueId);
      }
    }
  }

  const labels = 'ABCDEFGH';
  return groups.map((teamIds, i) => {
    const drr = generateDRR(teamIds);
    const matches: WTGroupMatch[] = drr.map(([a, b], mi) => {
      const matchday = mi + 1;
      // Global day mapping: MD1-6 → days 1-6 (first half), MD7-12 → day 7+i (second half, group-specific)
      const globalDay = matchday <= 6 ? Math.ceil(matchday / 2) : 7 + i;
      const o = calcOdds(
        getClubElo(a, {} as Record<string, LeagueSimState>),
        getClubElo(b, {} as Record<string, LeagueSimState>),
      );
      return {
        id: `WT_G${labels[i]}_m${mi}`, groupId: labels[i],
        teamA: a, teamB: b, scoreA: 0, scoreB: 0, winner: null,
        oddsA: o.oddsA, oddsB: o.oddsB,
        matchday, globalDay,
      };
    });

    return {
      id: labels[i],
      teams: teamIds,
      records: teamIds.map(id => ({ clubId: id, wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0 })),
      matches,
      matchdaysCompleted: 0,
      completed: false,
    };
  });
}

// ─── Group stage simulation ───────────────────────────────────────────────────

function simGroupMatch(m: WTGroupMatch, meta: string[], eloMap: Map<string, number>): { played: WTGroupMatch; eloA: number } {
  if (m.winner) return { played: m, eloA: 0 };
  const bA = clubMap.get(m.teamA), bB = clubMap.get(m.teamB);
  if (!bA || !bB) return { played: m, eloA: 0 };
  const cA = { ...bA, elo_rating: eloMap.get(m.teamA) ?? bA.elo_rating };
  const cB = { ...bB, elo_rating: eloMap.get(m.teamB) ?? bB.elo_rating };
  const r = simulateMatch(cA, cB, meta, 1); // Bo1
  return {
    played: {
      ...m,
      scoreA: r.scoreA > r.scoreB ? 1 : 0,
      scoreB: r.scoreB > r.scoreA ? 1 : 0,
      winner: r.scoreA > r.scoreB ? m.teamA : m.teamB,
      oddsA: r.oddsA, oddsB: r.oddsB,
    },
    eloA: r.eloChangeA,
  };
}

function advanceGroupToDay(group: WTGroup, targetDay: number, meta: string[], eloMap: Map<string, number>): WTGroup {
  let matches = [...group.matches];
  let records = group.records.map(r => ({ ...r }));
  const recMap = new Map(records.map(r => [r.clubId, r]));

  const maxMD = Math.min(targetDay <= 6 ? targetDay * 2 : 12, 12);
  if (group.matchdaysCompleted >= maxMD) return group;

  for (let md = group.matchdaysCompleted + 1; md <= maxMD; md++) {
    const m = matches[md - 1];
    if (!m || m.winner) continue;
    const { played, eloA } = simGroupMatch(m, meta, eloMap);
    matches = [...matches]; matches[md - 1] = played;
    if (played.winner) {
      // Apply Elo change
      eloMap.set(played.teamA, (eloMap.get(played.teamA) ?? 1200) + eloA);
      eloMap.set(played.teamB, (eloMap.get(played.teamB) ?? 1200) - eloA);
      const loser = played.winner === played.teamA ? played.teamB : played.teamA;
      const rW = recMap.get(played.winner);
      const rL = recMap.get(loser);
      if (rW) { rW.wins++; rW.scoreFor++; }
      if (rL) { rL.losses++; rL.scoreAgainst++; }
    }
  }

  const newMD = maxMD;
  return {
    ...group, matches,
    records: [...recMap.values()],
    matchdaysCompleted: newMD,
    completed: newMD >= 12,
  };
}

// ─── Global day mapping from game date ────────────────────────────────────────

// W39 Mon=day1, Tue=day2, ..., Sat=day6, Sun=day7(GroupA)
// W40 Mon=day8(GroupB), ..., Sun=day14(GroupH)
function wtGlobalDay(gameDate: string): number {
  const week = getWeekNum(gameDate);
  const dow  = getDayOfWeek(gameDate); // 0=Mon..6=Sun
  if (week < 39) return 0;
  if (week === 39) return dow + 1;       // 1-7
  if (week === 40) return 7 + dow + 1;   // 8-14
  return 14; // past group stage
}

// Knockout schedule
function wtKnockoutReady(gameDate: string, stage: string, matchIdx: number): boolean {
  const week = getWeekNum(gameDate);
  const dow  = getDayOfWeek(gameDate);
  // R16: W41 Tue-Fri (dow 1-4), 2 per day
  if (stage === 'R16') {
    const day = Math.floor(matchIdx / 2); // 0-3
    return week > 41 || (week === 41 && dow >= day + 1);
  }
  // QF: W42 Thu-Sun (dow 3-6)
  if (stage === 'QF') return week > 42 || (week === 42 && dow >= matchIdx + 3);
  // SF: W43 Tue(0) and Thu(1)
  if (stage === 'SF') return week > 43 || (week === 43 && dow >= (matchIdx === 0 ? 1 : 3));
  // GF: W43 Sun
  if (stage === 'GF') return week > 43 || (week === 43 && dow >= 6);
  return false;
}

// ─── Knockout generation ──────────────────────────────────────────────────────

export function sortWTGroupRecords(records: WTGroupRecord[]): WTGroupRecord[] {
  return [...records].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const sdA = a.scoreFor - a.scoreAgainst, sdB = b.scoreFor - b.scoreAgainst;
    if (sdB !== sdA) return sdB - sdA;
    return b.scoreFor - a.scoreFor;
  });
}

function generateKnockout(groups: WTGroup[], eloMap: Map<string, number>): WTKnockoutMatch[] {
  const gMap = new Map(groups.map(g => [g.id, g]));
  const winner = (gId: string) => sortWTGroupRecords(gMap.get(gId)?.records ?? [])[0]?.clubId ?? null;
  const runner = (gId: string) => sortWTGroupRecords(gMap.get(gId)?.records ?? [])[1]?.clubId ?? null;

  const mk = (id: string, stage: WTKnockoutMatch['stage'], half: 'upper'|'lower'|null, a: string|null, b: string|null): WTKnockoutMatch => {
    let oddsA = 0, oddsB = 0;
    if (a && b) {
      const o = calcOdds(eloMap.get(a) ?? 1200, eloMap.get(b) ?? 1200);
      oddsA = o.oddsA; oddsB = o.oddsB;
    }
    return { id, stage, bracketHalf: half, teamA: a, teamB: b, scoreA: 0, scoreB: 0, winner: null, oddsA, oddsB };
  };

  return [
    // R16 (recommended template)
    mk('R16_1', 'R16', 'upper', winner('A'), runner('H')),
    mk('R16_2', 'R16', 'upper', winner('B'), runner('G')),
    mk('R16_3', 'R16', 'upper', winner('C'), runner('F')),
    mk('R16_4', 'R16', 'upper', winner('D'), runner('E')),
    mk('R16_5', 'R16', 'lower', winner('E'), runner('D')),
    mk('R16_6', 'R16', 'lower', winner('F'), runner('C')),
    mk('R16_7', 'R16', 'lower', winner('G'), runner('B')),
    mk('R16_8', 'R16', 'lower', winner('H'), runner('A')),
    // QF
    mk('QF1', 'QF', 'upper', null, null),
    mk('QF2', 'QF', 'upper', null, null),
    mk('QF3', 'QF', 'lower', null, null),
    mk('QF4', 'QF', 'lower', null, null),
    // SF
    mk('SF1', 'SF', 'upper', null, null),
    mk('SF2', 'SF', 'lower', null, null),
    // GF
    mk('GF', 'GF', null, null, null),
  ];
}

// ─── Knockout advancement ─────────────────────────────────────────────────────

function simKOMatch(m: WTKnockoutMatch, meta: string[], eloMap: Map<string, number>): WTKnockoutMatch {
  if (m.winner || !m.teamA || !m.teamB) return m;
  const bA = clubMap.get(m.teamA), bB = clubMap.get(m.teamB);
  if (!bA || !bB) return m;
  const cA = { ...bA, elo_rating: eloMap.get(m.teamA) ?? bA.elo_rating };
  const cB = { ...bB, elo_rating: eloMap.get(m.teamB) ?? bB.elo_rating };
  const r = simulateMatch(cA, cB, meta, 3); // Bo5
  eloMap.set(m.teamA, (eloMap.get(m.teamA) ?? 1200) + r.eloChangeA);
  eloMap.set(m.teamB, (eloMap.get(m.teamB) ?? 1200) - r.eloChangeA);
  return {
    ...m,
    scoreA: r.scoreA, scoreB: r.scoreB,
    oddsA: r.oddsA, oddsB: r.oddsB,
    winner: r.scoreA > r.scoreB ? m.teamA : m.teamB,
  };
}

function feedKnockout(matches: WTKnockoutMatch[], eloMap: Map<string, number>): WTKnockoutMatch[] {
  const ms = [...matches];
  const get = (id: string) => ms.find(m => m.id === id);
  const set = (id: string, field: 'teamA' | 'teamB', val: string) => {
    const idx = ms.findIndex(m => m.id === id);
    if (idx >= 0 && !ms[idx][field]) {
      ms[idx] = { ...ms[idx], [field]: val };
      if (ms[idx].teamA && ms[idx].teamB) {
        const o = calcOdds(eloMap.get(ms[idx].teamA!) ?? 1200, eloMap.get(ms[idx].teamB!) ?? 1200);
        ms[idx] = { ...ms[idx], oddsA: o.oddsA, oddsB: o.oddsB };
      }
    }
  };
  // R16 → QF
  const r = (id: string) => get(id)?.winner;
  if (r('R16_1')) set('QF1', 'teamA', r('R16_1')!);
  if (r('R16_2')) set('QF1', 'teamB', r('R16_2')!);
  if (r('R16_3')) set('QF2', 'teamA', r('R16_3')!);
  if (r('R16_4')) set('QF2', 'teamB', r('R16_4')!);
  if (r('R16_5')) set('QF3', 'teamA', r('R16_5')!);
  if (r('R16_6')) set('QF3', 'teamB', r('R16_6')!);
  if (r('R16_7')) set('QF4', 'teamA', r('R16_7')!);
  if (r('R16_8')) set('QF4', 'teamB', r('R16_8')!);
  // QF → SF
  if (r('QF1')) set('SF1', 'teamA', r('QF1')!);
  if (r('QF2')) set('SF1', 'teamB', r('QF2')!);
  if (r('QF3')) set('SF2', 'teamA', r('QF3')!);
  if (r('QF4')) set('SF2', 'teamB', r('QF4')!);
  // SF → GF
  if (r('SF1')) set('GF', 'teamA', r('SF1')!);
  if (r('SF2')) set('GF', 'teamB', r('SF2')!);
  return ms;
}

// ─── Initialization ───────────────────────────────────────────────────────────

export function initWT(season: number): WTState {
  return {
    season,
    leagueCoefficients: [],
    participants: [],
    groups: [],
    knockoutMatches: [],
    champion: null,
    phase: 'pre',
  };
}

// ─── Auto-advance ─────────────────────────────────────────────────────────────

export function autoAdvanceWT(
  state: WTState,
  targetDate: string,
  meta: string[],
  leagueStates: Record<string, LeagueSimState>,
  cupStates: Record<string, CupState>,
  mmState: MMState,
): WTState {
  const week = getWeekNum(targetDate);

  // Initialize at W38+
  if (state.phase === 'pre' && week >= 38) {
    const coefficients = computeLeagueCoefficients(leagueStates);
    const participants = qualifyTeams(leagueStates, cupStates, mmState, coefficients);
    if (participants.length < 32) return state;
    const groups = drawGroups(participants);
    return {
      ...state,
      leagueCoefficients: coefficients.map(c => ({ leagueId: c.leagueId, rank: c.rank, points: c.points })),
      participants,
      groups,
      phase: 'groups_first',
    };
  }

  if (week < 39) return state;
  let s = { ...state };

  // Build mutable Elo map from participants
  const eloMap = new Map(s.participants.map(p => [p.clubId, p.elo]));

  // Group stage auto-advance
  if (s.phase === 'groups_first' || s.phase === 'groups_second') {
    const globalDay = wtGlobalDay(targetDate);
    if (globalDay > 0) {
      const newGroups = s.groups.map((g, gi) => {
        const groupFinalDay = 7 + gi;
        const effectiveDay = Math.min(globalDay, groupFinalDay);
        return advanceGroupToDay(g, effectiveDay, meta, eloMap);
      });
      const allDone = newGroups.every(g => g.completed);
      const phase = allDone ? 'knockout_r16' as const : (globalDay <= 6 ? 'groups_first' as const : 'groups_second' as const);
      s = { ...s, groups: newGroups, phase };

      if (allDone && s.knockoutMatches.length === 0) {
        s = { ...s, knockoutMatches: generateKnockout(newGroups, eloMap) };
      }
    }
  }

  // Knockout auto-advance
  if (s.phase.startsWith('knockout_')) {
    let ko = [...s.knockoutMatches];
    let changed = false;

    for (let i = 0; i < 8; i++) {
      if (!ko[i].winner && ko[i].teamA && ko[i].teamB && wtKnockoutReady(targetDate, 'R16', i)) {
        ko = [...ko]; ko[i] = simKOMatch(ko[i], meta, eloMap); changed = true;
      }
    }
    for (let i = 0; i < 4; i++) {
      const idx = 8 + i;
      if (!ko[idx].winner && ko[idx].teamA && ko[idx].teamB && wtKnockoutReady(targetDate, 'QF', i)) {
        ko = [...ko]; ko[idx] = simKOMatch(ko[idx], meta, eloMap); changed = true;
      }
    }
    for (let i = 0; i < 2; i++) {
      const idx = 12 + i;
      if (!ko[idx].winner && ko[idx].teamA && ko[idx].teamB && wtKnockoutReady(targetDate, 'SF', i)) {
        ko = [...ko]; ko[idx] = simKOMatch(ko[idx], meta, eloMap); changed = true;
      }
    }
    if (!ko[14].winner && ko[14].teamA && ko[14].teamB && wtKnockoutReady(targetDate, 'GF', 0)) {
      ko = [...ko]; ko[14] = simKOMatch(ko[14], meta, eloMap); changed = true;
    }

    if (changed) {
      ko = feedKnockout(ko, eloMap);
      const champion = ko[14]?.winner ?? null;
      const phase = champion ? 'completed' as const :
        ko.slice(0, 8).every(m => m.winner) ? (
          ko.slice(8, 12).every(m => m.winner) ? (
            ko.slice(12, 14).every(m => m.winner) ? 'knockout_gf' as const : 'knockout_sf' as const
          ) : 'knockout_qf' as const
        ) : 'knockout_r16' as const;
      s = { ...s, knockoutMatches: ko, champion, phase };
    }
  }

  // Write back Elo changes to participants
  s = { ...s, participants: s.participants.map(p => ({
    ...p, elo: eloMap.get(p.clubId) ?? p.elo,
  }))};

  return s;
}
