import type {
  NationalTeam, Club,
  IntermatchState, WEQualRegion, MEAFQualState,
  NatGroup, NatGroupRecord, NatGroupMatch, NatBracketMatch,
} from '../types';
import { allNations, nationsByRegion, nationsByAmericasSub } from '../data/nations';
import { simulateMatch } from './combat';
import { addDays, getCurrentSeasonStart, getWeekNum } from './calendar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function natToClub(n: NationalTeam, overrideElo?: number): Club {
  return {
    id: n.id, name: n.name, abbr: n.abbr,
    colors: n.colors, elo_rating: overrideElo ?? n.elo_rating,
    tier: n.tier, stats: n.stats, preferred_combos: n.preferred_combos,
    conference_id: '', league_id: n.region, division: null,
  };
}

const natMap = new Map(allNations.map(n => [n.id, n]));

function calcOdds(eloA: number, eloB: number) {
  const pA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  return {
    oddsA: Math.round(Math.max(1.01, 0.95 / pA) * 100) / 100,
    oddsB: Math.round(Math.max(1.01, 0.95 / (1 - pA)) * 100) / 100,
  };
}

// ─── Round-robin schedule generator ───────────────────────────────────────────

function generateSRR(teamIds: string[]): [string, string][][] {
  const n = teamIds.length;
  const ids = [...teamIds];
  if (n % 2 !== 0) ids.push('BYE');
  const total = ids.length;
  const rounds: [string, string][][] = [];

  for (let r = 0; r < total - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < total / 2; i++) {
      const a = ids[i], b = ids[total - 1 - i];
      if (a !== 'BYE' && b !== 'BYE') pairs.push([a, b]);
    }
    rounds.push(pairs);
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }
  return rounds;
}

// ─── Group creation ───────────────────────────────────────────────────────────

function makeGroupRecord(nationId: string): NatGroupRecord {
  return { nationId, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0 };
}

function createGroup(id: string, label: string, teamIds: string[], matchdaysTotal: number): NatGroup {
  const rounds = generateSRR(teamIds);
  const matches: NatGroupMatch[] = [];
  rounds.forEach((pairs, ri) => {
    pairs.forEach(([a, b], mi) => {
      const nA = natMap.get(a), nB = natMap.get(b);
      const odds = calcOdds(nA?.elo_rating ?? 1000, nB?.elo_rating ?? 1000);
      matches.push({
        id: `${id}_md${ri + 1}_m${mi}`,
        teamA: a, teamB: b,
        scoreA: 0, scoreB: 0, winner: null,
        oddsA: odds.oddsA, oddsB: odds.oddsB,
        matchday: ri + 1,
      });
    });
  });
  return {
    id, label, teams: teamIds,
    records: teamIds.map(makeGroupRecord),
    matches,
    matchdaysCompleted: 0,
    matchdaysTotal,
    completed: false,
  };
}

// ─── Pot-based group draw ─────────────────────────────────────────────────────

function potDraw(nations: NationalTeam[], numGroups: number, matchdaysTotal: number, prefix: string): NatGroup[] {
  const sorted = [...nations].sort((a, b) => b.elo_rating - a.elo_rating);
  const teamsPerGroup = Math.floor(sorted.length / numGroups);
  const numPots = teamsPerGroup;

  const pots: NationalTeam[][] = [];
  for (let p = 0; p < numPots; p++) {
    pots.push(sorted.slice(p * numGroups, (p + 1) * numGroups));
  }

  const groups: string[][] = Array.from({ length: numGroups }, () => []);
  for (const pot of pots) {
    const shuffled = shuffle(pot);
    shuffled.forEach((n, i) => groups[i].push(n.id));
  }

  const labels = 'ABCDEFGH'.split('');
  return groups.map((teamIds, i) =>
    createGroup(`${prefix}_${labels[i]}`, `Group ${labels[i]}`, teamIds, matchdaysTotal),
  );
}

// ─── MEAF bracket creation ────────────────────────────────────────────────────

function makeBracketMatch(id: string, stage: string, teamA: string | null, teamB: string | null, format: 'Bo3' | 'Bo5'): NatBracketMatch {
  let oddsA = 0, oddsB = 0;
  if (teamA && teamB) {
    const o = calcOdds(natMap.get(teamA)?.elo_rating ?? 1000, natMap.get(teamB)?.elo_rating ?? 1000);
    oddsA = o.oddsA; oddsB = o.oddsB;
  }
  return { id, stage, teamA, teamB, scoreA: 0, scoreB: 0, winner: null, oddsA, oddsB, format };
}

function initMEAF(): MEAFQualState {
  const teams = nationsByRegion('MEAF').sort((a, b) => b.elo_rating - a.elo_rating);
  const top12 = teams.slice(0, 12).map(n => n.id);
  const bottom8 = teams.slice(12).map(n => n.id);

  // 1st Qualifier: bottom 8 → 4 Bo5
  const b8 = shuffle(bottom8);
  const firstQual: NatBracketMatch[] = [];
  for (let i = 0; i < 4; i++) {
    firstQual.push(makeBracketMatch(`MEAF_Q1_${i}`, '1st Qualifier', b8[i * 2], b8[i * 2 + 1], 'Bo5'));
  }

  return {
    firstQual,
    secondQual: [],
    finalQual: [],
    weQualified: null,
    iqQualified: null,
    phase: 'pre',
  };
}

// ─── Americas (special: NA + SA separate groups) ──────────────────────────────

function initAmericas(): WEQualRegion {
  const na = nationsByAmericasSub('NA').sort((a, b) => b.elo_rating - a.elo_rating);
  const sa = nationsByAmericasSub('SA').sort((a, b) => b.elo_rating - a.elo_rating);
  const naGroup = createGroup('AMER_NA', 'North America', na.map(n => n.id), 7);
  const saGroup = createGroup('AMER_SA', 'South America', sa.map(n => n.id), 8);
  return {
    regionId: 'AMERICA',
    groups: [naGroup, saGroup],
    playoffMatches: [],
    weQualified: [],
    iqQualified: [],
    phase: 'pre',
  };
}

// ─── Initialization ───────────────────────────────────────────────────────────

export function initIntermatch(season: number): IntermatchState {
  const euNations = nationsByRegion('EU');
  const apacNations = nationsByRegion('APAC');

  const europe: WEQualRegion = {
    regionId: 'EU',
    groups: potDraw(euNations, 4, 7, 'EU'),
    playoffMatches: [],
    weQualified: [],
    iqQualified: [],
    phase: 'pre',
  };

  const asiaPacific: WEQualRegion = {
    regionId: 'APAC',
    groups: potDraw(apacNations, 3, 7, 'APAC'),
    playoffMatches: [],
    weQualified: [],
    iqQualified: [],
    phase: 'pre',
  };

  const rankings = allNations
    .map(n => ({ nationId: n.id, elo: n.elo_rating }))
    .sort((a, b) => b.elo - a.elo);

  return {
    season,
    europe,
    asiaPacific,
    americas: initAmericas(),
    meaf: initMEAF(),
    iq: null,
    rankings,
  };
}

// ─── Group match simulation ───────────────────────────────────────────────────

function simGroupMatch(
  match: NatGroupMatch,
  meta: string[],
  eloMap: Map<string, number>,
): NatGroupMatch {
  if (match.winner) return match;
  const nA = natMap.get(match.teamA);
  const nB = natMap.get(match.teamB);
  if (!nA || !nB) return match;
  const cA = natToClub(nA, eloMap.get(nA.id) ?? nA.elo_rating);
  const cB = natToClub(nB, eloMap.get(nB.id) ?? nB.elo_rating);
  const r = simulateMatch(cA, cB, meta, 2); // Bo3
  return {
    ...match,
    scoreA: r.scoreA, scoreB: r.scoreB,
    oddsA: r.oddsA, oddsB: r.oddsB,
    winner: r.scoreA > r.scoreB ? match.teamA : match.teamB,
  };
}

function advanceGroupMatchday(group: NatGroup, targetMD: number, meta: string[]): NatGroup {
  if (group.matchdaysCompleted >= targetMD || group.completed) return group;

  const eloMap = new Map<string, number>();
  for (const rec of group.records) {
    const n = natMap.get(rec.nationId);
    if (n) eloMap.set(n.id, n.elo_rating);
  }

  let matches = [...group.matches];
  let records = group.records.map(r => ({ ...r }));
  const recMap = new Map(records.map(r => [r.nationId, r]));

  for (let md = group.matchdaysCompleted + 1; md <= targetMD; md++) {
    const mdMatches = matches.filter(m => m.matchday === md && !m.winner);
    for (let i = 0; i < mdMatches.length; i++) {
      const idx = matches.findIndex(m => m.id === mdMatches[i].id);
      const played = simGroupMatch(mdMatches[i], meta, eloMap);
      matches = [...matches]; matches[idx] = played;

      if (played.winner) {
        const loser = played.winner === played.teamA ? played.teamB : played.teamA;
        const rW = recMap.get(played.winner);
        const rL = recMap.get(loser);
        if (rW) { rW.wins++; rW.setsFor += played.scoreA > played.scoreB ? played.scoreA : played.scoreB; rW.setsAgainst += played.scoreA > played.scoreB ? played.scoreB : played.scoreA; }
        if (rL) { rL.losses++; rL.setsFor += played.scoreA > played.scoreB ? played.scoreB : played.scoreA; rL.setsAgainst += played.scoreA > played.scoreB ? played.scoreA : played.scoreB; }
      }
    }
  }

  const newMD = Math.min(targetMD, group.matchdaysTotal);
  const done = newMD >= group.matchdaysTotal;
  return {
    ...group,
    matches,
    records: [...recMap.values()],
    matchdaysCompleted: newMD,
    completed: done,
  };
}

// ─── MEAF bracket simulation ──────────────────────────────────────────────────

function simBracketMatch(m: NatBracketMatch, meta: string[]): NatBracketMatch {
  if (m.winner || !m.teamA || !m.teamB) return m;
  const nA = natMap.get(m.teamA), nB = natMap.get(m.teamB);
  if (!nA || !nB) return m;
  const winsNeeded = m.format === 'Bo3' ? 2 : 3;
  const r = simulateMatch(natToClub(nA), natToClub(nB), meta, winsNeeded);
  return {
    ...m,
    scoreA: r.scoreA, scoreB: r.scoreB,
    oddsA: r.oddsA, oddsB: r.oddsB,
    winner: r.scoreA > r.scoreB ? m.teamA : m.teamB,
  };
}

function advanceMEAF(state: MEAFQualState, meta: string[], targetWeek: number): MEAFQualState {
  let s = { ...state };

  // 1st Qualifier: W7 Sat/Sun (week 7)
  if (targetWeek >= 7 && s.phase === 'pre') {
    const played = s.firstQual.map(m => simBracketMatch(m, meta));
    const allDone = played.every(m => m.winner);
    s = { ...s, firstQual: played, phase: allDone ? 'first' : 'pre' };
  }

  // 2nd Qualifier: W8 Sat/Sun (week 8)
  if (targetWeek >= 8 && s.phase === 'first' && s.secondQual.length === 0) {
    const teams = nationsByRegion('MEAF').sort((a, b) => b.elo_rating - a.elo_rating);
    const top12 = teams.slice(0, 12).map(n => n.id);
    const q1Winners = s.firstQual.filter(m => m.winner).map(m => m.winner!);
    const all16 = [...top12, ...q1Winners];
    const shuffled = shuffle(all16);
    const secondQual: NatBracketMatch[] = [];
    for (let i = 0; i < 8; i++) {
      secondQual.push(makeBracketMatch(`MEAF_Q2_${i}`, '2nd Qualifier', shuffled[i * 2], shuffled[i * 2 + 1], 'Bo5'));
    }
    const played = secondQual.map(m => simBracketMatch(m, meta));
    s = { ...s, secondQual: played, phase: played.every(m => m.winner) ? 'second' : 'first' };
  }

  // Final Qualifier: W25-26 (DE bracket, 8 teams)
  if (targetWeek >= 25 && s.phase === 'second' && s.finalQual.length === 0) {
    const q2Winners = shuffle(s.secondQual.filter(m => m.winner).map(m => m.winner!));
    // UB R1: 4 Bo3
    const fq: NatBracketMatch[] = [];
    for (let i = 0; i < 4; i++) {
      fq.push(makeBracketMatch(`MEAF_FQ_UBR1_${i}`, 'UB R1', q2Winners[i * 2], q2Winners[i * 2 + 1], 'Bo3'));
    }
    // Simulate UB R1
    const ubr1 = fq.map(m => simBracketMatch(m, meta));
    const ubWinners = ubr1.filter(m => m.winner).map(m => m.winner!);
    const ubLosers  = ubr1.filter(m => m.winner).map(m => m.winner === m.teamA ? m.teamB! : m.teamA!);

    // LB R1: 2 Bo5 (losers paired)
    const lbr1: NatBracketMatch[] = [];
    for (let i = 0; i < 2; i++) {
      lbr1.push(simBracketMatch(makeBracketMatch(`MEAF_FQ_LBR1_${i}`, 'LB R1', ubLosers[i * 2], ubLosers[i * 2 + 1], 'Bo5'), meta));
    }

    // UB SF: 2 Bo5
    const ubsf: NatBracketMatch[] = [];
    for (let i = 0; i < 2; i++) {
      ubsf.push(simBracketMatch(makeBracketMatch(`MEAF_FQ_UBSF_${i}`, 'UB SF', ubWinners[i * 2], ubWinners[i * 2 + 1], 'Bo5'), meta));
    }

    // LB R2: 2 Bo5 (LB R1 winners vs UB SF losers)
    const lbr1Winners = lbr1.filter(m => m.winner).map(m => m.winner!);
    const ubsfLosers  = ubsf.filter(m => m.winner).map(m => m.winner === m.teamA ? m.teamB! : m.teamA!);
    const lbr2: NatBracketMatch[] = [];
    for (let i = 0; i < 2; i++) {
      lbr2.push(simBracketMatch(makeBracketMatch(`MEAF_FQ_LBR2_${i}`, 'LB R2', lbr1Winners[i], ubsfLosers[i], 'Bo5'), meta));
    }

    // LB R3: 1 Bo5
    const lbr2Winners = lbr2.filter(m => m.winner).map(m => m.winner!);
    const lbr3 = [simBracketMatch(makeBracketMatch('MEAF_FQ_LBR3', 'LB R3', lbr2Winners[0] ?? null, lbr2Winners[1] ?? null, 'Bo5'), meta)];

    // UB Final: 1 Bo5
    const ubsfWinners = ubsf.filter(m => m.winner).map(m => m.winner!);
    const ubFinal = [simBracketMatch(makeBracketMatch('MEAF_FQ_UBF', 'UB Final', ubsfWinners[0] ?? null, ubsfWinners[1] ?? null, 'Bo5'), meta)];

    // LB Final: 1 Bo5
    const lbr3Winner = lbr3[0]?.winner ?? null;
    const ubfLoser   = ubFinal[0]?.winner ? (ubFinal[0].winner === ubFinal[0].teamA ? ubFinal[0].teamB : ubFinal[0].teamA) : null;
    const lbFinal = [simBracketMatch(makeBracketMatch('MEAF_FQ_LBF', 'LB Final', lbr3Winner, ubfLoser, 'Bo5'), meta)];

    // Grand Final: 1 Bo5
    const ubfWinner = ubFinal[0]?.winner ?? null;
    const lbfWinner = lbFinal[0]?.winner ?? null;
    const gf = [simBracketMatch(makeBracketMatch('MEAF_FQ_GF', 'Grand Final', ubfWinner, lbfWinner, 'Bo5'), meta)];

    const allFQ = [...ubr1, ...lbr1, ...ubsf, ...lbr2, ...lbr3, ...ubFinal, ...lbFinal, ...gf];
    const champion = gf[0]?.winner ?? null;
    const runnerUp = champion ? (champion === gf[0].teamA ? gf[0].teamB : gf[0].teamA) : null;

    s = {
      ...s,
      finalQual: allFQ,
      weQualified: champion,
      iqQualified: runnerUp,
      phase: 'completed',
    };
  }

  return s;
}

// ─── Matchday-to-week/day mapping ─────────────────────────────────────────────

// Returns the target matchday count for a given region based on game week
function targetMDForWeek(region: 'EU' | 'APAC' | 'AMERICA', week: number, isSA?: boolean): number {
  // Phase 1: W7-8 → MD1-5
  if (week < 7)  return 0;
  if (week === 7) return 3;    // MD1 (Mon/Tue), MD2 (Wed/Thu), MD3-A (Fri)
  if (week === 8) return 5;    // MD3-B (Mon) + MD4 (Tue/Wed) + MD5 (Thu/Fri)
  // Phase 2: W25-26 → MD6-7(8)
  if (week < 25) return 5;
  if (week === 25) {
    if (region === 'AMERICA' && isSA) return 8; // SA has MD8 on W25 Fri
    return 7;
  }
  if (week >= 26) {
    if (region === 'AMERICA' && isSA) return 8;
    return 7;
  }
  return 0;
}

// ─── Auto-advance ─────────────────────────────────────────────────────────────

export function autoAdvanceIntermatch(
  state: IntermatchState,
  targetDate: string,
  meta: string[],
): IntermatchState {
  const week = getWeekNum(targetDate);
  if (week < 7) return state;

  let s = { ...state };

  // EU groups
  const euTarget = targetMDForWeek('EU', week);
  if (euTarget > 0) {
    const newGroups = s.europe.groups.map(g => advanceGroupMatchday(g, euTarget, meta));
    const allDone = newGroups.every(g => g.completed);
    const phase = allDone ? 'group_p2' as const : (euTarget <= 5 ? 'group_p1' as const : 'group_p2' as const);
    // WE qualified = top 2 from each group
    let weQ = s.europe.weQualified;
    if (allDone && weQ.length === 0) {
      weQ = newGroups.flatMap(g => sortGroupRecords(g.records).slice(0, 2).map(r => r.nationId));
    }
    s = { ...s, europe: { ...s.europe, groups: newGroups, phase, weQualified: weQ } };
  }

  // APAC groups
  const apacTarget = targetMDForWeek('APAC', week);
  if (apacTarget > 0) {
    const newGroups = s.asiaPacific.groups.map(g => advanceGroupMatchday(g, apacTarget, meta));
    const allDone = newGroups.every(g => g.completed);
    const phase = allDone ? 'group_p2' as const : (apacTarget <= 5 ? 'group_p1' as const : 'group_p2' as const);
    let weQ = s.asiaPacific.weQualified;
    if (allDone && weQ.length === 0) {
      weQ = newGroups.flatMap(g => sortGroupRecords(g.records).slice(0, 2).map(r => r.nationId));
    }
    s = { ...s, asiaPacific: { ...s.asiaPacific, groups: newGroups, phase, weQualified: weQ } };
  }

  // Americas groups
  const naTarget = targetMDForWeek('AMERICA', week, false);
  const saTarget = targetMDForWeek('AMERICA', week, true);
  if (naTarget > 0 || saTarget > 0) {
    const newGroups = s.americas.groups.map(g => {
      const isSA = g.id === 'AMER_SA';
      return advanceGroupMatchday(g, isSA ? saTarget : naTarget, meta);
    });
    const allDone = newGroups.every(g => g.completed);
    const phase = allDone ? 'group_p2' as const : (naTarget <= 5 ? 'group_p1' as const : 'group_p2' as const);
    let weQ = s.americas.weQualified;
    if (allDone && weQ.length === 0) {
      weQ = newGroups.flatMap(g => sortGroupRecords(g.records).slice(0, 2).map(r => r.nationId));
    }
    s = { ...s, americas: { ...s.americas, groups: newGroups, phase, weQualified: weQ } };
  }

  // MEAF
  s = { ...s, meaf: advanceMEAF(s.meaf, meta, week) };

  return s;
}

// ─── Group standings sorter ───────────────────────────────────────────────────

export function sortGroupRecords(records: NatGroupRecord[]): NatGroupRecord[] {
  return [...records].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const sdA = a.setsFor - a.setsAgainst, sdB = b.setsFor - b.setsAgainst;
    if (sdB !== sdA) return sdB - sdA;
    return b.setsFor - a.setsFor;
  });
}
