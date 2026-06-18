import type {
  NationalTeam, Club,
  IntermatchState, WEQualRegion, MEAFQualState, SideEventState,
  NatGroup, NatGroupRecord, NatGroupMatch, NatBracketMatch,
  WEParticipant, WEState,
} from '../types';
import { allNations, nationsByRegion, nationsByAmericasSub } from '../data/nations';
import { simulateMatch } from './combat';
import { getWeekNum, getDayOfWeek } from './calendar';

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

// ─── MD completion schedule (each MD completes on B-session day) ──────────────

// dow: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
const MD_SCHEDULE: Array<{ md: number; week: number; dow: number }> = [
  { md: 1, week: 7,  dow: 1 },  // MD1-B = W7 Tue
  { md: 2, week: 7,  dow: 3 },  // MD2-B = W7 Thu
  { md: 3, week: 8,  dow: 0 },  // MD3-B = W8 Mon
  { md: 4, week: 8,  dow: 2 },  // MD4-B = W8 Wed
  { md: 5, week: 8,  dow: 4 },  // MD5-B = W8 Fri
  { md: 6, week: 25, dow: 1 },  // MD6-B = W25 Tue
  { md: 7, week: 25, dow: 3 },  // MD7-B = W25 Thu
];
const SA_EXTRA: Array<{ md: number; week: number; dow: number }> = [
  { md: 8, week: 25, dow: 4 }, // SA MD8 = W25 Fri
  { md: 9, week: 25, dow: 5 }, // SA MD9 = W25 Sat (tiebreaker day)
];

function targetMDForDate(gameDate: string, isSA: boolean): number {
  const week = getWeekNum(gameDate);
  const dow  = getDayOfWeek(gameDate);
  let target = 0;
  for (const slot of MD_SCHEDULE) {
    if (week > slot.week || (week === slot.week && dow >= slot.dow)) target = slot.md;
  }
  if (isSA) {
    for (const slot of SA_EXTRA) {
      if (week > slot.week || (week === slot.week && dow >= slot.dow)) target = Math.max(target, slot.md);
    }
  }
  return target;
}

// IQ schedule: W31-32
const IQ_SCHEDULE: Array<{ week: number; dow: number }> = [
  { week: 31, dow: 1 }, // Match 1 = W31 Tue
  { week: 31, dow: 3 }, // Match 2 = W31 Thu
  { week: 31, dow: 5 }, // Match 3 = W31 Sat
  { week: 32, dow: 1 }, // Match 4 = W32 Tue
  { week: 32, dow: 3 }, // Match 5 = W32 Thu
];

// PO schedule
const PO_SCHEDULE: Record<string, { week: number; dow: number }> = {
  APAC:    { week: 26, dow: 1 }, // W26 Tue
  AMERICA: { week: 26, dow: 2 }, // W26 Wed
  EU_1:    { week: 26, dow: 3 }, // W26 Thu
  EU_2:    { week: 26, dow: 4 }, // W26 Fri
};

function poReady(gameDate: string, key: string): boolean {
  const sch = PO_SCHEDULE[key];
  if (!sch) return false;
  const week = getWeekNum(gameDate);
  const dow  = getDayOfWeek(gameDate);
  return week > sch.week || (week === sch.week && dow >= sch.dow);
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
  return { nationId, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, momFor: 0, momAgainst: 0 };
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
    matches, matchdaysCompleted: 0, matchdaysTotal, completed: false,
  };
}

// ─── Pot-based group draw ─────────────────────────────────────────────────────

function potDraw(nations: NationalTeam[], numGroups: number, matchdaysTotal: number, prefix: string): NatGroup[] {
  const sorted = [...nations].sort((a, b) => b.elo_rating - a.elo_rating);
  const teamsPerGroup = Math.floor(sorted.length / numGroups);
  const pots: NationalTeam[][] = [];
  for (let p = 0; p < teamsPerGroup; p++) {
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

function getNatElo(id: string, elos: Record<string, number>): number {
  return elos[id] ?? natMap.get(id)?.elo_rating ?? 1000;
}

function makeBracketMatch(id: string, stage: string, teamA: string | null, teamB: string | null, format: 'Bo3' | 'Bo5', elos?: Record<string, number>): NatBracketMatch {
  let oddsA = 0, oddsB = 0;
  if (teamA && teamB) {
    const eA = elos ? getNatElo(teamA, elos) : (natMap.get(teamA)?.elo_rating ?? 1000);
    const eB = elos ? getNatElo(teamB, elos) : (natMap.get(teamB)?.elo_rating ?? 1000);
    const o = calcOdds(eA, eB);
    oddsA = o.oddsA; oddsB = o.oddsB;
  }
  return { id, stage, teamA, teamB, scoreA: 0, scoreB: 0, winner: null, oddsA, oddsB, format };
}

function initMEAF(): MEAFQualState {
  const teams = nationsByRegion('MEAF').sort((a, b) => b.elo_rating - a.elo_rating);
  const bottom8 = teams.slice(12).map(n => n.id);
  const b8 = shuffle(bottom8);
  const firstQual: NatBracketMatch[] = [];
  for (let i = 0; i < 4; i++) {
    firstQual.push(makeBracketMatch(`MEAF_Q1_${i}`, '1st Qualifier', b8[i * 2], b8[i * 2 + 1], 'Bo5'));
  }
  return { firstQual, secondQual: [], finalQual: [], weQualified: null, iqQualified: null, phase: 'pre' };
}

// ─── Americas ─────────────────────────────────────────────────────────────────

function initAmericas(): WEQualRegion {
  const na = nationsByAmericasSub('NA').sort((a, b) => b.elo_rating - a.elo_rating);
  const sa = nationsByAmericasSub('SA').sort((a, b) => b.elo_rating - a.elo_rating);
  return {
    regionId: 'AMERICA',
    groups: [
      createGroup('AMER_NA', 'North America', na.map(n => n.id), 7),
      createGroup('AMER_SA', 'South America', sa.map(n => n.id), 9),
    ],
    playoffMatches: [], weQualified: [], iqQualified: [], phase: 'pre',
  };
}

// ─── Initialization ───────────────────────────────────────────────────────────

export function initIntermatch(season: number, prevElos?: Record<string, number>): IntermatchState {
  const nationElos: Record<string, number> = {};
  for (const n of allNations) nationElos[n.id] = prevElos?.[n.id] ?? n.elo_rating;
  const rankings = Object.entries(nationElos)
    .map(([nationId, elo]) => ({ nationId, elo }))
    .sort((a, b) => b.elo - a.elo);
  return {
    season,
    europe: {
      regionId: 'EU', groups: potDraw(nationsByRegion('EU'), 4, 7, 'EU'),
      playoffMatches: [], weQualified: [], iqQualified: [], phase: 'pre',
    },
    asiaPacific: {
      regionId: 'APAC', groups: potDraw(nationsByRegion('APAC'), 3, 7, 'APAC'),
      playoffMatches: [], weQualified: [], iqQualified: [], phase: 'pre',
    },
    americas: initAmericas(),
    meaf: initMEAF(),
    iq: null,
    eec: null,
    tpc: null,
    we: null,
    rankings,
    nationElos,
  };
}

// ─── Group match simulation ───────────────────────────────────────────────────

function simGroupMatch(match: NatGroupMatch, meta: string[], elos: Record<string, number>): { played: NatGroupMatch; eloChangeA: number; momA: number; momB: number } {
  if (match.winner) return { played: match, eloChangeA: 0, momA: 0, momB: 0 };
  const nA = natMap.get(match.teamA), nB = natMap.get(match.teamB);
  if (!nA || !nB) return { played: match, eloChangeA: 0, momA: 0, momB: 0 };
  const cA = natToClub(nA, getNatElo(nA.id, elos));
  const cB = natToClub(nB, getNatElo(nB.id, elos));
  const r = simulateMatch(cA, cB, meta, 2); // Bo3
  let momA = 0, momB = 0;
  for (const set of r.sets) { momA += set.momA; momB += set.momB; }
  return {
    played: {
      ...match,
      scoreA: r.scoreA, scoreB: r.scoreB,
      oddsA: r.oddsA, oddsB: r.oddsB,
      winner: r.scoreA > r.scoreB ? match.teamA : match.teamB,
    },
    eloChangeA: r.eloChangeA,
    momA, momB,
  };
}

function advanceGroupMatchday(group: NatGroup, targetMD: number, meta: string[], elos: Record<string, number>, kMul = 1): NatGroup {
  if (group.matchdaysCompleted >= targetMD || group.completed) return group;

  let matches = [...group.matches];
  let records = group.records.map(r => ({ ...r }));
  const recMap = new Map(records.map(r => [r.nationId, r]));

  for (let md = group.matchdaysCompleted + 1; md <= targetMD; md++) {
    const mdMatches = matches.filter(m => m.matchday === md && !m.winner);
    for (const orig of mdMatches) {
      const idx = matches.findIndex(m => m.id === orig.id);
      const { played, eloChangeA, momA, momB } = simGroupMatch(orig, meta, elos);
      matches = [...matches]; matches[idx] = played;
      if (played.winner) {
        const scaledElo = Math.round(eloChangeA * kMul);
        elos[played.teamA] = (elos[played.teamA] ?? 1000) + scaledElo;
        elos[played.teamB] = (elos[played.teamB] ?? 1000) - scaledElo;
        const loser = played.winner === played.teamA ? played.teamB : played.teamA;
        const wScore = played.winner === played.teamA ? played.scoreA : played.scoreB;
        const lScore = played.winner === played.teamA ? played.scoreB : played.scoreA;
        const rW = recMap.get(played.winner);
        const rL = recMap.get(loser);
        if (rW) { rW.wins++; rW.setsFor += wScore; rW.setsAgainst += lScore; }
        if (rL) { rL.losses++; rL.setsFor += lScore; rL.setsAgainst += wScore; }
        const rA = recMap.get(played.teamA);
        const rB = recMap.get(played.teamB);
        if (rA) { rA.momFor += momA; rA.momAgainst += momB; }
        if (rB) { rB.momFor += momB; rB.momAgainst += momA; }
      }
    }
  }

  const newMD = Math.min(targetMD, group.matchdaysTotal);
  return {
    ...group, matches,
    records: [...recMap.values()],
    matchdaysCompleted: newMD,
    completed: newMD >= group.matchdaysTotal,
  };
}

// ─── Bracket simulation helper ────────────────────────────────────────────────

function simBracketMatch(m: NatBracketMatch, meta: string[], elos: Record<string, number>, kMul = 1, winnerOnly = false): NatBracketMatch {
  if (m.winner || !m.teamA || !m.teamB) return m;
  const nA = natMap.get(m.teamA), nB = natMap.get(m.teamB);
  if (!nA || !nB) return m;
  const winsNeeded = m.format === 'Bo3' ? 2 : 3;
  const cA = natToClub(nA, getNatElo(nA.id, elos));
  const cB = natToClub(nB, getNatElo(nB.id, elos));
  const r = simulateMatch(cA, cB, meta, winsNeeded);
  const scaledElo = Math.round(r.eloChangeA * kMul);
  if (winnerOnly) {
    if (scaledElo > 0) elos[m.teamA] = (elos[m.teamA] ?? nA.elo_rating) + scaledElo;
    else elos[m.teamB] = (elos[m.teamB] ?? nB.elo_rating) + Math.abs(scaledElo);
  } else {
    elos[m.teamA] = (elos[m.teamA] ?? nA.elo_rating) + scaledElo;
    elos[m.teamB] = (elos[m.teamB] ?? nB.elo_rating) - scaledElo;
  }
  return {
    ...m,
    scoreA: r.scoreA, scoreB: r.scoreB,
    oddsA: r.oddsA, oddsB: r.oddsB,
    winner: r.scoreA > r.scoreB ? m.teamA : m.teamB,
  };
}

// ─── Playoff generation & simulation ──────────────────────────────────────────

function generateRegionalPO(region: WEQualRegion, meta: string[], elos: Record<string, number>): WEQualRegion {
  if (region.playoffMatches.length > 0) return region;
  if (!region.groups.every(g => g.completed)) return region;

  const groups = region.groups;
  const thirds: string[] = [];
  const fourths: string[] = [];
  for (const g of groups) {
    const sorted = sortGroupRecords(g.records);
    if (sorted.length >= 3) thirds.push(sorted[2].nationId);
    if (sorted.length >= 4) fourths.push(sorted[3].nationId);
  }

  if (region.regionId === 'AMERICA') {
    // NA 3rd vs SA 4th, SA 3rd vs NA 4th
    const naGroup = groups.find(g => g.id === 'AMER_NA');
    const saGroup = groups.find(g => g.id === 'AMER_SA');
    if (!naGroup || !saGroup) return region;
    const naSorted = sortGroupRecords(naGroup.records);
    const saSorted = sortGroupRecords(saGroup.records);
    const na3 = naSorted[2]?.nationId, na4 = naSorted[3]?.nationId;
    const sa3 = saSorted[2]?.nationId, sa4 = saSorted[3]?.nationId;
    const matches: NatBracketMatch[] = [];
    if (na3 && sa4) matches.push(simBracketMatch(makeBracketMatch('AMER_PO_0', 'American PO', na3, sa4, 'Bo5', elos), meta, elos, 1.2));
    if (sa3 && na4) matches.push(simBracketMatch(makeBracketMatch('AMER_PO_1', 'American PO', sa3, na4, 'Bo5', elos), meta, elos, 1.2));
    const iqQ = matches.filter(m => m.winner).map(m => m.winner!);
    return { ...region, playoffMatches: matches, iqQualified: iqQ, phase: 'completed' };
  }

  // EU or APAC: 3rd vs different group 4th, random draw
  const shuffledFourths = shuffle(fourths);
  const pairs: [string, string][] = [];

  // Greedy pairing: 3rd can't face 4th from same group
  const groupOf = new Map<string, string>();
  for (const g of groups) {
    const sorted = sortGroupRecords(g.records);
    for (const r of sorted) groupOf.set(r.nationId, g.id);
  }

  const pool4 = [...shuffledFourths];
  for (const t3 of shuffle(thirds)) {
    const t3Group = groupOf.get(t3);
    const validIdx = pool4.findIndex(t4 => groupOf.get(t4) !== t3Group);
    const idx = validIdx >= 0 ? validIdx : 0;
    const t4 = pool4.splice(idx, 1)[0];
    if (t4) pairs.push([t3, t4]);
  }

  const prefix = region.regionId === 'EU' ? 'EU_PO' : 'APAC_PO';
  const matches = pairs.map(([a, b], i) =>
    simBracketMatch(makeBracketMatch(`${prefix}_${i}`, `${region.regionId} Playoff`, a, b, 'Bo5', elos), meta, elos, 1.2),
  );
  const iqQ = matches.filter(m => m.winner).map(m => m.winner!);
  return { ...region, playoffMatches: matches, iqQualified: iqQ, phase: 'completed' };
}

// ─── MEAF advancement ─────────────────────────────────────────────────────────

function advanceMEAF(state: MEAFQualState, meta: string[], targetWeek: number, elos: Record<string, number>): MEAFQualState {
  let s = { ...state };

  if (targetWeek >= 7 && s.phase === 'pre') {
    const played = s.firstQual.map(m => simBracketMatch(m, meta, elos));
    s = { ...s, firstQual: played, phase: played.every(m => m.winner) ? 'first' : 'pre' };
  }

  if (targetWeek >= 8 && s.phase === 'first' && s.secondQual.length === 0) {
    const teams = nationsByRegion('MEAF').sort((a, b) => getNatElo(b.id, elos) - getNatElo(a.id, elos));
    const top12 = teams.slice(0, 12).map(n => n.id);
    const q1Winners = s.firstQual.filter(m => m.winner).map(m => m.winner!);
    const all16 = shuffle([...top12, ...q1Winners]);
    const secondQual: NatBracketMatch[] = [];
    for (let i = 0; i < 8; i++) {
      secondQual.push(makeBracketMatch(`MEAF_Q2_${i}`, '2nd Qualifier', all16[i * 2], all16[i * 2 + 1], 'Bo5', elos));
    }
    const played = secondQual.map(m => simBracketMatch(m, meta, elos));
    s = { ...s, secondQual: played, phase: played.every(m => m.winner) ? 'second' : 'first' };
  }

  if (targetWeek >= 25 && s.phase === 'second' && s.finalQual.length === 0) {
    const q2Winners = shuffle(s.secondQual.filter(m => m.winner).map(m => m.winner!));
    // UB R1: 4 Bo3
    const ubr1 = [];
    for (let i = 0; i < 4; i++) ubr1.push(simBracketMatch(makeBracketMatch(`MEAF_FQ_UBR1_${i}`, 'UB R1', q2Winners[i * 2], q2Winners[i * 2 + 1], 'Bo3', elos), meta, elos));
    const ubW = ubr1.filter(m => m.winner).map(m => m.winner!);
    const ubL = ubr1.filter(m => m.winner).map(m => m.winner === m.teamA ? m.teamB! : m.teamA!);
    // LB R1: 2 Bo5
    const lbr1 = [0, 1].map(i => simBracketMatch(makeBracketMatch(`MEAF_FQ_LBR1_${i}`, 'LB R1', ubL[i * 2], ubL[i * 2 + 1], 'Bo5', elos), meta, elos));
    // UB SF: 2 Bo5
    const ubsf = [0, 1].map(i => simBracketMatch(makeBracketMatch(`MEAF_FQ_UBSF_${i}`, 'UB SF', ubW[i * 2], ubW[i * 2 + 1], 'Bo5', elos), meta, elos));
    const lbr1W = lbr1.filter(m => m.winner).map(m => m.winner!);
    const ubsfL = ubsf.filter(m => m.winner).map(m => m.winner === m.teamA ? m.teamB! : m.teamA!);
    // LB R2: 2 Bo5
    const lbr2 = [0, 1].map(i => simBracketMatch(makeBracketMatch(`MEAF_FQ_LBR2_${i}`, 'LB R2', lbr1W[i], ubsfL[i], 'Bo5', elos), meta, elos));
    const lbr2W = lbr2.filter(m => m.winner).map(m => m.winner!);
    // LB R3: 1 Bo5
    const lbr3 = [simBracketMatch(makeBracketMatch('MEAF_FQ_LBR3', 'LB R3', lbr2W[0] ?? null, lbr2W[1] ?? null, 'Bo5', elos), meta, elos)];
    const ubsfW = ubsf.filter(m => m.winner).map(m => m.winner!);
    // UB Final: 1 Bo5
    const ubf = [simBracketMatch(makeBracketMatch('MEAF_FQ_UBF', 'UB Final', ubsfW[0] ?? null, ubsfW[1] ?? null, 'Bo5', elos), meta, elos)];
    // LB Final: 1 Bo5
    const lbfA = lbr3[0]?.winner ?? null;
    const lbfB = ubf[0]?.winner ? (ubf[0].winner === ubf[0].teamA ? ubf[0].teamB : ubf[0].teamA) : null;
    const lbf = [simBracketMatch(makeBracketMatch('MEAF_FQ_LBF', 'LB Final', lbfA, lbfB, 'Bo5', elos), meta, elos)];
    // Grand Final: 1 Bo5
    const gf = [simBracketMatch(makeBracketMatch('MEAF_FQ_GF', 'Grand Final', ubf[0]?.winner ?? null, lbf[0]?.winner ?? null, 'Bo5', elos), meta, elos)];
    const allFQ = [...ubr1, ...lbr1, ...ubsf, ...lbr2, ...lbr3, ...ubf, ...lbf, ...gf];
    const champion = gf[0]?.winner ?? null;
    const runnerUp = champion ? (champion === gf[0].teamA ? gf[0].teamB : gf[0].teamA) : null;
    s = { ...s, finalQual: allFQ, weQualified: champion, iqQualified: runnerUp, phase: 'completed' };
  }

  return s;
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
  const elos = { ...s.nationElos };

  // ── Group stages (date-based MD progression) ──
  const stdTarget = targetMDForDate(targetDate, false);
  const saTarget  = targetMDForDate(targetDate, true);

  if (stdTarget > 0) {
    // EU
    const euGroups = s.europe.groups.map(g => advanceGroupMatchday(g, Math.min(stdTarget, g.matchdaysTotal), meta, elos));
    const euDone = euGroups.every(g => g.completed);
    let euWeQ = s.europe.weQualified;
    if (euDone && euWeQ.length === 0) {
      euWeQ = euGroups.flatMap(g => sortGroupRecords(g.records).slice(0, 2).map(r => r.nationId));
    }
    const euPhase = euDone
      ? (s.europe.playoffMatches.length > 0 ? 'completed' as const : 'playoff' as const)
      : (stdTarget <= 5 ? 'group_p1' as const : 'group_p2' as const);
    s = { ...s, europe: { ...s.europe, groups: euGroups, weQualified: euWeQ, phase: euPhase } };

    // APAC
    const apacGroups = s.asiaPacific.groups.map(g => advanceGroupMatchday(g, Math.min(stdTarget, g.matchdaysTotal), meta, elos));
    const apacDone = apacGroups.every(g => g.completed);
    let apacWeQ = s.asiaPacific.weQualified;
    if (apacDone && apacWeQ.length === 0) {
      apacWeQ = apacGroups.flatMap(g => sortGroupRecords(g.records).slice(0, 2).map(r => r.nationId));
    }
    const apacPhase = apacDone
      ? (s.asiaPacific.playoffMatches.length > 0 ? 'completed' as const : 'playoff' as const)
      : (stdTarget <= 5 ? 'group_p1' as const : 'group_p2' as const);
    s = { ...s, asiaPacific: { ...s.asiaPacific, groups: apacGroups, weQualified: apacWeQ, phase: apacPhase } };
  }

  // Americas (NA uses stdTarget, SA uses saTarget)
  if (stdTarget > 0 || saTarget > 0) {
    const amerGroups = s.americas.groups.map(g => {
      const isSA = g.id === 'AMER_SA';
      return advanceGroupMatchday(g, Math.min(isSA ? saTarget : stdTarget, g.matchdaysTotal), meta, elos);
    });
    const amerDone = amerGroups.every(g => g.completed);
    let amerWeQ = s.americas.weQualified;
    if (amerDone && amerWeQ.length === 0) {
      amerWeQ = amerGroups.flatMap(g => sortGroupRecords(g.records).slice(0, 2).map(r => r.nationId));
    }
    const amerPhase = amerDone
      ? (s.americas.playoffMatches.length > 0 ? 'completed' as const : 'playoff' as const)
      : (stdTarget <= 5 ? 'group_p1' as const : 'group_p2' as const);
    s = { ...s, americas: { ...s.americas, groups: amerGroups, weQualified: amerWeQ, phase: amerPhase } };
  }

  // ── Regional Playoffs (after groups done + PO date reached) ──
  if (s.europe.phase === 'playoff' && poReady(targetDate, 'EU_1')) {
    s = { ...s, europe: generateRegionalPO(s.europe, meta, elos) };
  }
  if (s.asiaPacific.phase === 'playoff' && poReady(targetDate, 'APAC')) {
    s = { ...s, asiaPacific: generateRegionalPO(s.asiaPacific, meta, elos) };
  }
  if (s.americas.phase === 'playoff' && poReady(targetDate, 'AMERICA')) {
    s = { ...s, americas: generateRegionalPO(s.americas, meta, elos) };
  }

  // ── MEAF ──
  s = { ...s, meaf: advanceMEAF(s.meaf, meta, week, elos) };

  // ── IQ: W31-32 (after all regions completed) ──
  if (week >= 31 && !s.iq) {
    const euDone = s.europe.phase === 'completed';
    const apacDone = s.asiaPacific.phase === 'completed';
    const amerDone = s.americas.phase === 'completed';
    const meafDone = s.meaf.phase === 'completed';
    if (euDone && apacDone && amerDone && meafDone) {
      s = { ...s, iq: generateIQ(s, meta) };
    }
  }

  // Auto-advance IQ matches by date
  if (s.iq && !s.iq.completed) {
    s = { ...s, iq: advanceIQ(s.iq, targetDate, meta, elos) };
  }

  // ── EEC: W31-32 (after EU completed) ──
  if (week >= 31 && !s.eec && s.europe.phase === 'completed' && s.europe.weQualified.length >= 8) {
    s = { ...s, eec: generateEEC(s, elos) };
  }
  if (s.eec && !s.eec.completed) {
    s = { ...s, eec: advanceEEC(s.eec, targetDate, meta, elos) };
  }

  // ── TPC: W31-32 (after APAC + AMER + MEAF completed) ──
  if (week >= 31 && !s.tpc
    && s.asiaPacific.phase === 'completed'
    && s.americas.phase === 'completed'
    && s.meaf.phase === 'completed'
  ) {
    s = { ...s, tpc: generateTPC(s, elos) };
  }
  if (s.tpc && !s.tpc.completed) {
    s = { ...s, tpc: advanceTPC(s.tpc, targetDate, meta, elos) };
  }

  // ── WE: W45-48 ──
  if (week >= 45 && !s.we && s.iq?.completed) {
    const participants = collectWEParticipants(s, elos);
    if (participants.length === 24) {
      const { groups, seeded } = generateWEDraw(participants, elos);
      s = { ...s, we: {
        participants: seeded, groups,
        thirdPlaceRanking: [], advancingThirds: [], thirdPlaceKey: '',
        knockoutMatches: [], champion: null, phase: 'groups',
        finalRankings: [],
      }};
    }
  }
  if (s.we && s.we.phase !== 'completed') {
    s = { ...s, we: advanceWE(s.we, targetDate, meta, elos) };
  }

  // Persist updated Elos + refresh rankings
  const newRankings = Object.entries(elos)
    .map(([nationId, elo]) => ({ nationId, elo: Math.round(elo) }))
    .sort((a, b) => b.elo - a.elo);
  s = { ...s, nationElos: elos, rankings: newRankings };

  return s;
}

// ─── IQ generation ────────────────────────────────────────────────────────────

function generateIQ(state: IntermatchState, _meta: string[]): IntermatchState['iq'] {
  const euIQ   = state.europe.iqQualified;
  const apacIQ = state.asiaPacific.iqQualified;
  const amerIQ = state.americas.iqQualified;
  const meafIQ = state.meaf.iqQualified ? [state.meaf.iqQualified] : [];

  const regionOf = new Map<string, string>();
  for (const id of euIQ) regionOf.set(id, 'EU');
  for (const id of apacIQ) regionOf.set(id, 'APAC');
  for (const id of amerIQ) regionOf.set(id, 'AMERICA');
  for (const id of meafIQ) regionOf.set(id, 'MEAF');

  const allTeams = [...euIQ, ...apacIQ, ...amerIQ, ...meafIQ]
    .sort((a, b) => (natMap.get(b)?.elo_rating ?? 0) - (natMap.get(a)?.elo_rating ?? 0));

  if (allTeams.length < 10) {
    return { matches: [], weQualified: [], completed: true };
  }

  // Pair: top seed vs bottom seed, avoiding same-region matchups
  const top5 = allTeams.slice(0, 5);
  const bot5 = [...allTeams.slice(5)];
  const pairs: [string, string][] = [];

  for (const hi of top5) {
    const hiRegion = regionOf.get(hi);
    let idx = bot5.findIndex(lo => regionOf.get(lo) !== hiRegion);
    if (idx === -1) idx = 0;
    const lo = bot5.splice(idx, 1)[0];
    pairs.push([hi, lo]);
  }

  const matches: import('../types').IQMatch[] = pairs.map(([a, b], i) => {
    const o = calcOdds(natMap.get(a)?.elo_rating ?? 1000, natMap.get(b)?.elo_rating ?? 1000);
    return { id: `IQ_${i}`, teamA: a, teamB: b, scoreA: 0, scoreB: 0, winner: null, oddsA: o.oddsA, oddsB: o.oddsB };
  });

  return { matches, weQualified: [], completed: false };
}

function advanceIQ(
  iq: NonNullable<IntermatchState['iq']>,
  gameDate: string,
  meta: string[],
  elos: Record<string, number>,
): NonNullable<IntermatchState['iq']> {
  const week = getWeekNum(gameDate);
  const dow  = getDayOfWeek(gameDate);

  let targetCount = 0;
  for (const slot of IQ_SCHEDULE) {
    if (week > slot.week || (week === slot.week && dow >= slot.dow)) targetCount++;
  }

  let matches = [...iq.matches];
  let changed = false;
  for (let i = 0; i < targetCount && i < matches.length; i++) {
    if (matches[i].winner) continue;
    const m = matches[i];
    if (!m.teamA || !m.teamB) continue;
    const nA = natMap.get(m.teamA), nB = natMap.get(m.teamB);
    if (!nA || !nB) continue;
    const cA = natToClub(nA, getNatElo(nA.id, elos));
    const cB = natToClub(nB, getNatElo(nB.id, elos));
    const r = simulateMatch(cA, cB, meta, 3); // Bo5
    const scaledElo = Math.round(r.eloChangeA * 1.5); // IQ: 1.5x
    elos[m.teamA] = (elos[m.teamA] ?? nA.elo_rating) + scaledElo;
    elos[m.teamB] = (elos[m.teamB] ?? nB.elo_rating) - scaledElo;
    matches = [...matches];
    matches[i] = {
      ...m,
      scoreA: r.scoreA, scoreB: r.scoreB,
      oddsA: r.oddsA, oddsB: r.oddsB,
      winner: r.scoreA > r.scoreB ? m.teamA : m.teamB,
    };
    changed = true;
  }

  if (!changed) return iq;
  const weQ = matches.filter(m => m.winner).map(m => m.winner!);
  const completed = matches.every(m => m.winner !== null);
  return { matches, weQualified: weQ, completed };
}

// ─── EEC generation & advancement ─────────────────────────────────────────────

// Schedule: W31 Mon QF1-2, W31 Wed QF3-4, W32 Fri SF1-2, W32 Sun Final
const EEC_SCHEDULE: Array<{ stage: string; week: number; dow: number; count: number }> = [
  { stage: 'QF', week: 31, dow: 0, count: 2 }, // W31 Mon QF1-2
  { stage: 'QF', week: 31, dow: 2, count: 2 }, // W31 Wed QF3-4
  { stage: 'SF', week: 32, dow: 4, count: 2 }, // W32 Fri SF1-2
  { stage: 'Final', week: 32, dow: 6, count: 1 }, // W32 Sun Final
];

function generateEEC(state: IntermatchState, elos: Record<string, number>): SideEventState {
  const teams = [...state.europe.weQualified]
    .sort((a, b) => getNatElo(b, elos) - getNatElo(a, elos));

  // Bracket: 1v8, 4v5, 3v6, 2v7
  const mainMatches: NatBracketMatch[] = [
    makeBracketMatch('EEC_QF1', 'QF', teams[0], teams[7], 'Bo5', elos),
    makeBracketMatch('EEC_QF2', 'QF', teams[3], teams[4], 'Bo5', elos),
    makeBracketMatch('EEC_QF3', 'QF', teams[2], teams[5], 'Bo5', elos),
    makeBracketMatch('EEC_QF4', 'QF', teams[1], teams[6], 'Bo5', elos),
    makeBracketMatch('EEC_SF1', 'SF', null, null, 'Bo5', elos),
    makeBracketMatch('EEC_SF2', 'SF', null, null, 'Bo5', elos),
    makeBracketMatch('EEC_F',   'Final', null, null, 'Bo5', elos),
  ];

  return { participants: teams, playInMatches: [], mainMatches, champion: null, completed: false };
}

function advanceEEC(eec: SideEventState, targetDate: string, meta: string[], elos: Record<string, number>): SideEventState {
  const week = getWeekNum(targetDate);
  const dow  = getDayOfWeek(targetDate);
  let matches = [...eec.mainMatches];
  let changed = false;

  // Determine how many QF slots to simulate
  let qfDone = 0;
  for (const slot of EEC_SCHEDULE) {
    if (slot.stage !== 'QF') continue;
    if (week > slot.week || (week === slot.week && dow >= slot.dow)) qfDone += slot.count;
  }

  // Sim QFs
  for (let i = 0; i < Math.min(qfDone, 4); i++) {
    if (matches[i].winner) continue;
    matches = [...matches];
    matches[i] = simBracketMatch(matches[i], meta, elos, 1.5, true);
    changed = true;
  }

  // Feed QF → SF
  const qf1w = matches[0]?.winner, qf2w = matches[1]?.winner;
  const qf3w = matches[2]?.winner, qf4w = matches[3]?.winner;
  if (qf1w && !matches[4].teamA) { matches = [...matches]; matches[4] = { ...matches[4], teamA: qf1w }; }
  if (qf2w && !matches[4].teamB) { matches = [...matches]; matches[4] = { ...matches[4], teamB: qf2w }; recalcBracketOdds(matches, 4, elos); }
  if (qf3w && !matches[5].teamA) { matches = [...matches]; matches[5] = { ...matches[5], teamA: qf3w }; }
  if (qf4w && !matches[5].teamB) { matches = [...matches]; matches[5] = { ...matches[5], teamB: qf4w }; recalcBracketOdds(matches, 5, elos); }

  // Sim SFs
  const sfReady = week > 32 || (week === 32 && dow >= 4);
  if (sfReady) {
    for (let i = 4; i < 6; i++) {
      if (matches[i].winner || !matches[i].teamA || !matches[i].teamB) continue;
      matches = [...matches];
      matches[i] = simBracketMatch(matches[i], meta, elos, 1.5, true);
      changed = true;
    }
  }

  // Feed SF → Final
  const sf1w = matches[4]?.winner, sf2w = matches[5]?.winner;
  if (sf1w && !matches[6].teamA) { matches = [...matches]; matches[6] = { ...matches[6], teamA: sf1w }; }
  if (sf2w && !matches[6].teamB) { matches = [...matches]; matches[6] = { ...matches[6], teamB: sf2w }; recalcBracketOdds(matches, 6, elos); }

  // Sim Final
  const finalReady = week > 32 || (week === 32 && dow >= 6);
  if (finalReady && !matches[6].winner && matches[6].teamA && matches[6].teamB) {
    matches = [...matches];
    matches[6] = simBracketMatch(matches[6], meta, elos, 1.5, true);
    changed = true;
  }

  const champion = matches[6]?.winner ?? null;
  return { ...eec, mainMatches: matches, champion, completed: champion !== null };
}

// ─── TPC generation & advancement ─────────────────────────────────────────────

// Schedule: W31 Mon Play-In 3Bo3, W31 Fri QF1-2, W31 Sun QF3-4, W32 Wed SF1-2, W32 Sat Final
const TPC_PLAYIN  = { week: 31, dow: 0 }; // W31 Mon
const TPC_QF_1    = { week: 31, dow: 4 }; // W31 Fri
const TPC_QF_2    = { week: 31, dow: 6 }; // W31 Sun
const TPC_SF      = { week: 32, dow: 2 }; // W32 Wed
const TPC_FINAL   = { week: 32, dow: 5 }; // W32 Sat

function generateTPC(state: IntermatchState, elos: Record<string, number>): SideEventState {
  const apac = state.asiaPacific.weQualified;
  const amer = state.americas.weQualified;
  const meaf = state.meaf.weQualified ? [state.meaf.weQualified] : [];
  const all = [...apac, ...amer, ...meaf].sort((a, b) => getNatElo(b, elos) - getNatElo(a, elos));

  const top7 = all.slice(0, 7);
  const bot4 = all.slice(7, 11);

  // Play-in: 4 teams → 2 SF + 1 Final (Bo3)
  const playInMatches: NatBracketMatch[] = [
    makeBracketMatch('TPC_PI_SF1', 'Play-In SF', bot4[0] ?? null, bot4[3] ?? null, 'Bo3', elos),
    makeBracketMatch('TPC_PI_SF2', 'Play-In SF', bot4[1] ?? null, bot4[2] ?? null, 'Bo3', elos),
    makeBracketMatch('TPC_PI_F',   'Play-In Final', null, null, 'Bo3', elos),
  ];

  // Main bracket: 8 teams (top7 + play-in winner), seeded 1v8, 4v5, 3v6, 2v7
  const mainMatches: NatBracketMatch[] = [
    makeBracketMatch('TPC_QF1', 'QF', top7[0] ?? null, null, 'Bo5', elos), // 1 vs 8(PI winner)
    makeBracketMatch('TPC_QF2', 'QF', top7[3] ?? null, top7[4] ?? null, 'Bo5', elos),
    makeBracketMatch('TPC_QF3', 'QF', top7[2] ?? null, top7[5] ?? null, 'Bo5', elos),
    makeBracketMatch('TPC_QF4', 'QF', top7[1] ?? null, top7[6] ?? null, 'Bo5', elos),
    makeBracketMatch('TPC_SF1', 'SF', null, null, 'Bo5', elos),
    makeBracketMatch('TPC_SF2', 'SF', null, null, 'Bo5', elos),
    makeBracketMatch('TPC_F',   'Final', null, null, 'Bo5', elos),
  ];

  return { participants: all, playInMatches, mainMatches, champion: null, completed: false };
}

function advanceTPC(tpc: SideEventState, targetDate: string, meta: string[], elos: Record<string, number>): SideEventState {
  const week = getWeekNum(targetDate);
  const dow  = getDayOfWeek(targetDate);
  let pi = [...tpc.playInMatches];
  let main = [...tpc.mainMatches];

  // Play-In (W31 Mon)
  const piReady = week > TPC_PLAYIN.week || (week === TPC_PLAYIN.week && dow >= TPC_PLAYIN.dow);
  if (piReady) {
    // SF1, SF2
    for (let i = 0; i < 2; i++) {
      if (!pi[i].winner && pi[i].teamA && pi[i].teamB) {
        pi = [...pi]; pi[i] = simBracketMatch(pi[i], meta, elos, 1.5, true);
      }
    }
    // Feed → Play-In Final
    if (pi[0].winner && !pi[2].teamA) { pi = [...pi]; pi[2] = { ...pi[2], teamA: pi[0].winner }; }
    if (pi[1].winner && !pi[2].teamB) { pi = [...pi]; pi[2] = { ...pi[2], teamB: pi[1].winner }; recalcBracketOdds(pi, 2, elos); }
    if (!pi[2].winner && pi[2].teamA && pi[2].teamB) {
      pi = [...pi]; pi[2] = simBracketMatch(pi[2], meta, elos, 1.5, true);
    }
    // Feed play-in winner → QF1 slot 8 (teamB)
    if (pi[2].winner && !main[0].teamB) {
      main = [...main]; main[0] = { ...main[0], teamB: pi[2].winner };
      recalcBracketOdds(main, 0, elos);
    }
  }

  // QF (W31 Fri QF1-2, W31 Sun QF3-4)
  const qf12Ready = week > TPC_QF_1.week || (week === TPC_QF_1.week && dow >= TPC_QF_1.dow);
  const qf34Ready = week > TPC_QF_2.week || (week === TPC_QF_2.week && dow >= TPC_QF_2.dow);
  if (qf12Ready) {
    for (let i = 0; i < 2; i++) {
      if (!main[i].winner && main[i].teamA && main[i].teamB) {
        main = [...main]; main[i] = simBracketMatch(main[i], meta, elos, 1.5, true);
      }
    }
  }
  if (qf34Ready) {
    for (let i = 2; i < 4; i++) {
      if (!main[i].winner && main[i].teamA && main[i].teamB) {
        main = [...main]; main[i] = simBracketMatch(main[i], meta, elos, 1.5, true);
      }
    }
  }

  // Feed QF → SF
  if (main[0].winner && !main[4].teamA) { main = [...main]; main[4] = { ...main[4], teamA: main[0].winner }; }
  if (main[1].winner && !main[4].teamB) { main = [...main]; main[4] = { ...main[4], teamB: main[1].winner }; recalcBracketOdds(main, 4, elos); }
  if (main[2].winner && !main[5].teamA) { main = [...main]; main[5] = { ...main[5], teamA: main[2].winner }; }
  if (main[3].winner && !main[5].teamB) { main = [...main]; main[5] = { ...main[5], teamB: main[3].winner }; recalcBracketOdds(main, 5, elos); }

  // SF (W32 Wed)
  const sfReady = week > TPC_SF.week || (week === TPC_SF.week && dow >= TPC_SF.dow);
  if (sfReady) {
    for (let i = 4; i < 6; i++) {
      if (!main[i].winner && main[i].teamA && main[i].teamB) {
        main = [...main]; main[i] = simBracketMatch(main[i], meta, elos, 1.5, true);
      }
    }
  }

  // Feed SF → Final
  if (main[4].winner && !main[6].teamA) { main = [...main]; main[6] = { ...main[6], teamA: main[4].winner }; }
  if (main[5].winner && !main[6].teamB) { main = [...main]; main[6] = { ...main[6], teamB: main[5].winner }; recalcBracketOdds(main, 6, elos); }

  // Final (W32 Sat)
  const fReady = week > TPC_FINAL.week || (week === TPC_FINAL.week && dow >= TPC_FINAL.dow);
  if (fReady && !main[6].winner && main[6].teamA && main[6].teamB) {
    main = [...main]; main[6] = simBracketMatch(main[6], meta, elos, 1.5, true);
  }

  const champion = main[6]?.winner ?? null;
  return { ...tpc, playInMatches: pi, mainMatches: main, champion, completed: champion !== null };
}

function recalcBracketOdds(matches: NatBracketMatch[], idx: number, elos: Record<string, number>) {
  const m = matches[idx];
  if (m.teamA && m.teamB && !m.winner) {
    const o = calcOdds(getNatElo(m.teamA, elos), getNatElo(m.teamB, elos));
    matches[idx] = { ...m, oddsA: o.oddsA, oddsB: o.oddsB };
  }
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

// ─── WE (World Event) engine ─────────────────────────────────────────────────

const WE_GROUP_SCHEDULE: Array<{ groups: string[]; md: number; week: number; dow: number }> = [
  { groups: ['A','B'], md: 1, week: 45, dow: 0 },
  { groups: ['C','D'], md: 1, week: 45, dow: 1 },
  { groups: ['E','F'], md: 1, week: 45, dow: 2 },
  { groups: ['A','B'], md: 2, week: 45, dow: 3 },
  { groups: ['C','D'], md: 2, week: 45, dow: 4 },
  { groups: ['E','F'], md: 2, week: 45, dow: 5 },
  { groups: ['A','B'], md: 3, week: 45, dow: 6 },
  { groups: ['C','D'], md: 3, week: 46, dow: 0 },
  { groups: ['E','F'], md: 3, week: 46, dow: 1 },
];

const WE_KO_SCHEDULE: Array<{ ids: string[]; week: number; dow: number }> = [
  { ids: ['WE_R16_1','WE_R16_2'], week: 46, dow: 3 },
  { ids: ['WE_R16_3','WE_R16_4'], week: 46, dow: 4 },
  { ids: ['WE_R16_5','WE_R16_6'], week: 46, dow: 5 },
  { ids: ['WE_R16_7','WE_R16_8'], week: 46, dow: 6 },
  { ids: ['WE_QF1'], week: 47, dow: 3 },
  { ids: ['WE_QF2'], week: 47, dow: 4 },
  { ids: ['WE_QF3'], week: 47, dow: 5 },
  { ids: ['WE_QF4'], week: 47, dow: 6 },
  { ids: ['WE_SF1'], week: 48, dow: 1 },
  { ids: ['WE_SF2'], week: 48, dow: 3 },
  { ids: ['WE_GF'],  week: 48, dow: 6 },
];

const THIRD_PLACE_MATRIX: Record<string, [string, string, string, string]> = {
  'ABCD': ['C','D','A','B'],
  'ABCE': ['C','A','B','E'],
  'ABCF': ['C','A','B','F'],
  'ABDE': ['D','A','B','E'],
  'ABDF': ['D','A','B','F'],
  'ABEF': ['E','A','B','F'],
  'ACDE': ['C','D','A','E'],
  'ACDF': ['C','D','A','F'],
  'ACEF': ['C','A','F','E'],
  'ADEF': ['D','A','F','E'],
  'BCDE': ['C','D','B','E'],
  'BCDF': ['C','D','B','F'],
  'BCEF': ['E','C','B','F'],
  'BDEF': ['E','D','B','F'],
  'CDEF': ['C','D','F','E'],
};

function collectWEParticipants(state: IntermatchState, elos: Record<string, number>): WEParticipant[] {
  const out: WEParticipant[] = [];
  const add = (ids: string[], region: string, path: 'direct' | 'iq_wildcard') => {
    for (const id of ids) {
      const rec = findQualRecord(state, id);
      out.push({
        nationId: id, region, entryPath: path, pot: 1,
        w33Elo: getNatElo(id, elos),
        qualRecord: rec,
        qualDate: path === 'iq_wildcard' ? 'W32' : 'W26',
      });
    }
  };
  add(state.europe.weQualified, 'EU', 'direct');
  add(state.asiaPacific.weQualified, 'APAC', 'direct');
  add(state.americas.weQualified, 'AMERICA', 'direct');
  if (state.meaf.weQualified) add([state.meaf.weQualified], 'MEAF', 'direct');
  if (state.iq) add(state.iq.weQualified, '', 'iq_wildcard');
  for (const p of out) {
    if (p.entryPath === 'iq_wildcard') p.region = natMap.get(p.nationId)?.region ?? '';
  }
  return out;
}

function findQualRecord(state: IntermatchState, nationId: string): { wins: number; losses: number } {
  let setsW = 0, setsL = 0;
  const regions = [state.europe, state.asiaPacific, state.americas];
  for (const r of regions) {
    for (const g of r.groups) {
      const rec = g.records.find(rr => rr.nationId === nationId);
      if (rec) { setsW += rec.setsFor; setsL += rec.setsAgainst; }
    }
    for (const m of r.playoffMatches) {
      if (m.teamA === nationId) { setsW += m.scoreA; setsL += m.scoreB; }
      else if (m.teamB === nationId) { setsW += m.scoreB; setsL += m.scoreA; }
    }
  }
  if (state.eec) {
    for (const m of state.eec.mainMatches) {
      if (m.teamA === nationId) { setsW += m.scoreA; setsL += m.scoreB; }
      else if (m.teamB === nationId) { setsW += m.scoreB; setsL += m.scoreA; }
    }
  }
  if (state.tpc) {
    for (const m of [...state.tpc.playInMatches, ...state.tpc.mainMatches]) {
      if (m.teamA === nationId) { setsW += m.scoreA; setsL += m.scoreB; }
      else if (m.teamB === nationId) { setsW += m.scoreB; setsL += m.scoreA; }
    }
  }
  if (state.iq) {
    for (const m of state.iq.matches) {
      if (m.teamA === nationId) { setsW += m.scoreA; setsL += m.scoreB; }
      else if (m.teamB === nationId) { setsW += m.scoreB; setsL += m.scoreA; }
    }
  }
  return { wins: setsW, losses: setsL };
}

function generateWEDraw(
  participants: WEParticipant[],
  elos: Record<string, number>,
): { groups: NatGroup[]; seeded: WEParticipant[] } {
  const iqWildcards = participants.filter(p => p.entryPath === 'iq_wildcard');
  const directs = participants.filter(p => p.entryPath === 'direct')
    .sort((a, b) => b.w33Elo - a.w33Elo);

  const pot1 = directs.slice(0, 6);
  const pot2 = directs.slice(6, 12);
  const pot3 = directs.slice(12, 18);
  const pot4Direct = directs.slice(18);
  const pot4: WEParticipant[] = [...iqWildcards, ...pot4Direct];

  pot1.forEach(p => p.pot = 1);
  pot2.forEach(p => p.pot = 2);
  pot3.forEach(p => p.pot = 3);
  pot4.forEach(p => p.pot = 4);

  const pots = [pot1, pot2, pot3, pot4];
  const groupLabels = ['A','B','C','D','E','F'];
  const assigned: string[][] = groupLabels.map(() => []);
  const assignedRegions: Map<string, string[]>[] = groupLabels.map(() => new Map());

  const potIndex = [pot1, pot2, pot3, pot4];
  for (let pi = 0; pi < pots.length; pi++) {
    const pot = pots[pi];
    const maxPerGroup = pi + 1;
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const relaxRegion = attempt >= 100;
      const shuffled = shuffle(pot);
      const backup = assigned.map(a => [...a]);
      const backupR = assignedRegions.map(m => new Map([...m].map(([k, v]) => [k, [...v]])));
      let ok = true;

      for (let ti = 0; ti < shuffled.length; ti++) {
        const p = shuffled[ti];
        const isWC = p.entryPath === 'iq_wildcard';
        let slotFound = false;

        for (let gi = ti; gi < 6 + ti; gi++) {
          const g = gi % 6;
          if (assigned[g].length >= maxPerGroup) continue;

          if (!relaxRegion && !isWC) {
            const regionList = assignedRegions[g].get(p.region) ?? [];
            const directCount = regionList.filter(id =>
              participants.find(pp => pp.nationId === id && pp.entryPath === 'direct')
            ).length;
            if (p.region === 'EU') {
              if (directCount >= 2) continue;
            } else {
              if (directCount >= 1) continue;
            }
          }

          assigned[g].push(p.nationId);
          const list = assignedRegions[g].get(p.region) ?? [];
          list.push(p.nationId);
          assignedRegions[g].set(p.region, list);
          slotFound = true;
          break;
        }

        if (!slotFound) { ok = false; break; }
      }

      if (ok) {
        placed = true;
      } else {
        for (let g = 0; g < 6; g++) {
          assigned[g] = backup[g];
          assignedRegions[g] = backupR[g];
        }
      }
    }
  }

  const groups = assigned.map((teamIds, i) =>
    createGroup(`WE_${groupLabels[i]}`, `Group ${groupLabels[i]}`, teamIds, 3),
  );

  const seeded = [...pot1, ...pot2, ...pot3, ...pot4];
  return { groups, seeded };
}

function sortWEGroupRecords(
  records: NatGroupRecord[],
  matches: NatGroupMatch[],
  w33Elos: Map<string, number>,
): NatGroupRecord[] {
  const sorted = [...records].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const sdA = a.setsFor - a.setsAgainst, sdB = b.setsFor - b.setsAgainst;
    if (sdB !== sdA) return sdB - sdA;
    const scdA = a.momFor - a.momAgainst, scdB = b.momFor - b.momAgainst;
    if (scdB !== scdA) return scdB - scdA;
    if (b.momFor !== a.momFor) return b.momFor - a.momFor;
    const h2h = h2hResult(a.nationId, b.nationId, matches);
    if (h2h !== 0) return h2h;
    return (w33Elos.get(b.nationId) ?? 0) - (w33Elos.get(a.nationId) ?? 0);
  });
  return sorted;
}

function h2hResult(idA: string, idB: string, matches: NatGroupMatch[]): number {
  for (const m of matches) {
    if (!m.winner) continue;
    if (m.teamA === idA && m.teamB === idB) return m.winner === idA ? -1 : 1;
    if (m.teamA === idB && m.teamB === idA) return m.winner === idA ? -1 : 1;
  }
  return 0;
}

function resolveThirdPlace(
  groups: NatGroup[],
  w33Elos: Map<string, number>,
): { ranking: NatGroupRecord[]; advancing: string[]; key: string; thirdMap: Record<string, string> } {
  const thirds: Array<{ record: NatGroupRecord; groupLabel: string }> = [];
  for (const g of groups) {
    const sorted = sortWEGroupRecords(g.records, g.matches, w33Elos);
    if (sorted.length >= 3) {
      const label = g.id.replace('WE_', '');
      thirds.push({ record: sorted[2], groupLabel: label });
    }
  }

  thirds.sort((a, b) => {
    const ra = a.record, rb = b.record;
    if (rb.wins !== ra.wins) return rb.wins - ra.wins;
    const sdA = ra.setsFor - ra.setsAgainst, sdB = rb.setsFor - rb.setsAgainst;
    if (sdB !== sdA) return sdB - sdA;
    const scdA = ra.momFor - ra.momAgainst, scdB = rb.momFor - rb.momAgainst;
    if (scdB !== scdA) return scdB - scdA;
    if (rb.momFor !== ra.momFor) return rb.momFor - ra.momFor;
    return (w33Elos.get(rb.nationId) ?? 0) - (w33Elos.get(ra.nationId) ?? 0);
  });

  const advancing = thirds.slice(0, 4);
  const key = advancing.map(t => t.groupLabel).sort().join('');
  const matrix = THIRD_PLACE_MATRIX[key];

  const thirdMap: Record<string, string> = {};
  if (matrix) {
    const slots = ['A','B','C','D'];
    for (let i = 0; i < 4; i++) {
      const srcGroup = matrix[i];
      const third = advancing.find(t => t.groupLabel === srcGroup);
      if (third) thirdMap[slots[i]] = third.record.nationId;
    }
  }

  return {
    ranking: thirds.map(t => t.record),
    advancing: advancing.map(t => t.record.nationId),
    key,
    thirdMap,
  };
}

function generateWEKnockout(
  groups: NatGroup[],
  thirdMap: Record<string, string>,
  w33Elos: Map<string, number>,
  elos: Record<string, number>,
): NatBracketMatch[] {
  const gRank = (groupLabel: string): NatGroupRecord[] => {
    const g = groups.find(gg => gg.id === `WE_${groupLabel}`);
    if (!g) return [];
    return sortWEGroupRecords(g.records, g.matches, w33Elos);
  };
  const top = (label: string, rank: number) => gRank(label)[rank]?.nationId ?? null;

  const matches: NatBracketMatch[] = [
    makeBracketMatch('WE_R16_1', 'R16', top('A', 0), thirdMap['A'] ?? null, 'Bo5', elos),
    makeBracketMatch('WE_R16_2', 'R16', top('B', 0), thirdMap['B'] ?? null, 'Bo5', elos),
    makeBracketMatch('WE_R16_3', 'R16', top('C', 0), thirdMap['C'] ?? null, 'Bo5', elos),
    makeBracketMatch('WE_R16_4', 'R16', top('D', 0), thirdMap['D'] ?? null, 'Bo5', elos),
    makeBracketMatch('WE_R16_5', 'R16', top('E', 0), top('F', 1), 'Bo5', elos),
    makeBracketMatch('WE_R16_6', 'R16', top('F', 0), top('E', 1), 'Bo5', elos),
    makeBracketMatch('WE_R16_7', 'R16', top('A', 1), top('B', 1), 'Bo5', elos),
    makeBracketMatch('WE_R16_8', 'R16', top('C', 1), top('D', 1), 'Bo5', elos),
    makeBracketMatch('WE_QF1', 'QF', null, null, 'Bo5', elos),
    makeBracketMatch('WE_QF2', 'QF', null, null, 'Bo5', elos),
    makeBracketMatch('WE_QF3', 'QF', null, null, 'Bo5', elos),
    makeBracketMatch('WE_QF4', 'QF', null, null, 'Bo5', elos),
    makeBracketMatch('WE_SF1', 'SF', null, null, 'Bo5', elos),
    makeBracketMatch('WE_SF2', 'SF', null, null, 'Bo5', elos),
    makeBracketMatch('WE_GF',  'GF', null, null, 'Bo5', elos),
  ];
  return matches;
}

function feedWEBracket(matches: NatBracketMatch[], elos: Record<string, number>) {
  const m = (id: string) => matches.find(mm => mm.id === id);
  const feed = (srcA: string, srcB: string, target: string) => {
    const a = m(srcA), b = m(srcB), t = m(target);
    if (!t || t.winner) return;
    const changed = (!t.teamA && a?.winner) || (!t.teamB && b?.winner);
    if (a?.winner && !t.teamA) {
      const idx = matches.findIndex(mm => mm.id === target);
      matches[idx] = { ...matches[idx], teamA: a.winner };
    }
    if (b?.winner && !t.teamB) {
      const idx = matches.findIndex(mm => mm.id === target);
      matches[idx] = { ...matches[idx], teamB: b.winner };
    }
    if (changed) {
      const idx = matches.findIndex(mm => mm.id === target);
      const upd = matches[idx];
      if (upd.teamA && upd.teamB) {
        recalcBracketOdds(matches, idx, elos);
      }
    }
  };
  feed('WE_R16_1', 'WE_R16_2', 'WE_QF1');
  feed('WE_R16_3', 'WE_R16_4', 'WE_QF2');
  feed('WE_R16_5', 'WE_R16_6', 'WE_QF3');
  feed('WE_R16_7', 'WE_R16_8', 'WE_QF4');
  feed('WE_QF1',   'WE_QF2',   'WE_SF1');
  feed('WE_QF3',   'WE_QF4',   'WE_SF2');
  feed('WE_SF1',   'WE_SF2',   'WE_GF');
}

function advanceWE(
  we: WEState,
  targetDate: string,
  meta: string[],
  elos: Record<string, number>,
): WEState {
  const week = getWeekNum(targetDate);
  const dow = getDayOfWeek(targetDate);
  let s = { ...we };

  if (s.phase === 'groups') {
    let groups = s.groups.map(g => ({ ...g }));
    for (const slot of WE_GROUP_SCHEDULE) {
      if (week > slot.week || (week === slot.week && dow >= slot.dow)) {
        for (const gl of slot.groups) {
          const gi = groups.findIndex(g => g.id === `WE_${gl}`);
          if (gi >= 0 && groups[gi].matchdaysCompleted < slot.md) {
            groups[gi] = advanceGroupMatchday(groups[gi], slot.md, meta, elos, 2);
          }
        }
      }
    }
    s = { ...s, groups };
    const allDone = groups.every(g => g.completed);
    if (allDone && (week > 46 || (week === 46 && dow >= 2))) {
      s = { ...s, phase: 'draw' };
    }
  }

  if (s.phase === 'draw') {
    const w33Elos = new Map(s.participants.map(p => [p.nationId, p.w33Elo]));
    const { ranking, advancing, key, thirdMap } = resolveThirdPlace(s.groups, w33Elos);
    const ko = generateWEKnockout(s.groups, thirdMap, w33Elos, elos);
    s = { ...s, thirdPlaceRanking: ranking, advancingThirds: advancing, thirdPlaceKey: key, knockoutMatches: ko, phase: 'r16' };
  }

  if (s.phase === 'r16' || s.phase === 'qf' || s.phase === 'sf' || s.phase === 'final') {
    let ko = [...s.knockoutMatches];
    for (const slot of WE_KO_SCHEDULE) {
      if (week > slot.week || (week === slot.week && dow >= slot.dow)) {
        for (const id of slot.ids) {
          const idx = ko.findIndex(m => m.id === id);
          if (idx >= 0 && !ko[idx].winner && ko[idx].teamA && ko[idx].teamB) {
            ko = [...ko];
            ko[idx] = simBracketMatch(ko[idx], meta, elos, 3, true);
            feedWEBracket(ko, elos);
          }
        }
      }
    }

    const r16Done = ko.slice(0, 8).every(m => !!m.winner);
    const qfDone = ko.slice(8, 12).every(m => !!m.winner);
    const sfDone = ko.slice(12, 14).every(m => !!m.winner);
    const gfDone = !!ko[14]?.winner;

    let phase = s.phase;
    if (gfDone) phase = 'completed';
    else if (sfDone) phase = 'final';
    else if (qfDone) phase = 'sf';
    else if (r16Done) phase = 'qf';
    else phase = 'r16';

    const champion = ko[14]?.winner ?? null;
    let finalRankings = s.finalRankings;
    if (gfDone && finalRankings.length === 0) {
      finalRankings = buildWEFinalRankings(s, ko, elos);
    }

    s = { ...s, knockoutMatches: ko, phase, champion, finalRankings };
  }

  return s;
}

function buildWEFinalRankings(
  we: WEState,
  ko: NatBracketMatch[],
  elos: Record<string, number>,
): Array<{ nationId: string; rank: number; eloChange: number }> {
  const rankings: Array<{ nationId: string; rank: number }> = [];
  const placed = new Set<string>();

  const loserOf = (m: NatBracketMatch) => m.winner === m.teamA ? m.teamB : m.teamA;

  if (ko[14]?.winner) { rankings.push({ nationId: ko[14].winner, rank: 1 }); placed.add(ko[14].winner); }
  const gfL = loserOf(ko[14]);
  if (gfL) { rankings.push({ nationId: gfL, rank: 2 }); placed.add(gfL); }

  const sfLosers = [loserOf(ko[12]), loserOf(ko[13])].filter(Boolean) as string[];
  sfLosers.forEach((id, i) => { if (!placed.has(id)) { rankings.push({ nationId: id, rank: 3 + i }); placed.add(id); }});

  const qfLosers = [loserOf(ko[8]), loserOf(ko[9]), loserOf(ko[10]), loserOf(ko[11])].filter(Boolean) as string[];
  qfLosers.forEach((id, i) => { if (!placed.has(id)) { rankings.push({ nationId: id, rank: 5 + i }); placed.add(id); }});

  const r16Losers = ko.slice(0, 8).map(loserOf).filter(Boolean) as string[];
  r16Losers.forEach((id, i) => { if (!placed.has(id)) { rankings.push({ nationId: id, rank: 9 + i }); placed.add(id); }});

  const nonAdvThirds = we.thirdPlaceRanking.filter(r => !we.advancingThirds.includes(r.nationId));
  nonAdvThirds.forEach((r, i) => { if (!placed.has(r.nationId)) { rankings.push({ nationId: r.nationId, rank: 17 + i }); placed.add(r.nationId); }});

  const w33Elos = new Map(we.participants.map(p => [p.nationId, p.w33Elo]));
  for (const g of we.groups) {
    const sorted = sortWEGroupRecords(g.records, g.matches, w33Elos);
    if (sorted.length >= 4) {
      const fourth = sorted[3].nationId;
      if (!placed.has(fourth)) { rankings.push({ nationId: fourth, rank: rankings.length + 1 }); placed.add(fourth); }
    }
  }

  return rankings.map(r => ({
    ...r,
    eloChange: Math.round((elos[r.nationId] ?? 0) - (we.participants.find(p => p.nationId === r.nationId)?.w33Elo ?? 0)),
  }));
}
