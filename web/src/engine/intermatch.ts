import type {
  NationalTeam, Club,
  IntermatchState, WEQualRegion, MEAFQualState,
  NatGroup, NatGroupRecord, NatGroupMatch, NatBracketMatch,
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

export function initIntermatch(season: number): IntermatchState {
  const nationElos: Record<string, number> = {};
  for (const n of allNations) nationElos[n.id] = n.elo_rating;
  const rankings = allNations
    .map(n => ({ nationId: n.id, elo: n.elo_rating }))
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
    rankings,
    nationElos,
  };
}

// ─── Group match simulation ───────────────────────────────────────────────────

function simGroupMatch(match: NatGroupMatch, meta: string[], elos: Record<string, number>): { played: NatGroupMatch; eloChangeA: number } {
  if (match.winner) return { played: match, eloChangeA: 0 };
  const nA = natMap.get(match.teamA), nB = natMap.get(match.teamB);
  if (!nA || !nB) return { played: match, eloChangeA: 0 };
  const cA = natToClub(nA, getNatElo(nA.id, elos));
  const cB = natToClub(nB, getNatElo(nB.id, elos));
  const r = simulateMatch(cA, cB, meta, 2); // Bo3
  return {
    played: {
      ...match,
      scoreA: r.scoreA, scoreB: r.scoreB,
      oddsA: r.oddsA, oddsB: r.oddsB,
      winner: r.scoreA > r.scoreB ? match.teamA : match.teamB,
    },
    eloChangeA: r.eloChangeA,
  };
}

function advanceGroupMatchday(group: NatGroup, targetMD: number, meta: string[], elos: Record<string, number>): NatGroup {
  if (group.matchdaysCompleted >= targetMD || group.completed) return group;

  let matches = [...group.matches];
  let records = group.records.map(r => ({ ...r }));
  const recMap = new Map(records.map(r => [r.nationId, r]));

  for (let md = group.matchdaysCompleted + 1; md <= targetMD; md++) {
    const mdMatches = matches.filter(m => m.matchday === md && !m.winner);
    for (const orig of mdMatches) {
      const idx = matches.findIndex(m => m.id === orig.id);
      const { played, eloChangeA } = simGroupMatch(orig, meta, elos);
      matches = [...matches]; matches[idx] = played;
      if (played.winner) {
        // Apply Elo changes
        elos[played.teamA] = (elos[played.teamA] ?? 1000) + eloChangeA;
        elos[played.teamB] = (elos[played.teamB] ?? 1000) - eloChangeA;
        const loser = played.winner === played.teamA ? played.teamB : played.teamA;
        const wScore = played.winner === played.teamA ? played.scoreA : played.scoreB;
        const lScore = played.winner === played.teamA ? played.scoreB : played.scoreA;
        const rW = recMap.get(played.winner);
        const rL = recMap.get(loser);
        if (rW) { rW.wins++; rW.setsFor += wScore; rW.setsAgainst += lScore; }
        if (rL) { rL.losses++; rL.setsFor += lScore; rL.setsAgainst += wScore; }
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

function simBracketMatch(m: NatBracketMatch, meta: string[], elos: Record<string, number>): NatBracketMatch {
  if (m.winner || !m.teamA || !m.teamB) return m;
  const nA = natMap.get(m.teamA), nB = natMap.get(m.teamB);
  if (!nA || !nB) return m;
  const winsNeeded = m.format === 'Bo3' ? 2 : 3;
  const cA = natToClub(nA, getNatElo(nA.id, elos));
  const cB = natToClub(nB, getNatElo(nB.id, elos));
  const r = simulateMatch(cA, cB, meta, winsNeeded);
  // Apply Elo changes
  elos[m.teamA] = (elos[m.teamA] ?? nA.elo_rating) + r.eloChangeA;
  elos[m.teamB] = (elos[m.teamB] ?? nB.elo_rating) - r.eloChangeA;
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
    if (na3 && sa4) matches.push(simBracketMatch(makeBracketMatch('AMER_PO_0', 'American PO', na3, sa4, 'Bo5', elos), meta, elos));
    if (sa3 && na4) matches.push(simBracketMatch(makeBracketMatch('AMER_PO_1', 'American PO', sa3, na4, 'Bo5', elos), meta, elos));
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
    simBracketMatch(makeBracketMatch(`${prefix}_${i}`, `${region.regionId} Playoff`, a, b, 'Bo5', elos), meta, elos),
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
    elos[m.teamA] = (elos[m.teamA] ?? nA.elo_rating) + r.eloChangeA;
    elos[m.teamB] = (elos[m.teamB] ?? nB.elo_rating) - r.eloChangeA;
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

// ─── Group standings sorter ───────────────────────────────────────────────────

export function sortGroupRecords(records: NatGroupRecord[]): NatGroupRecord[] {
  return [...records].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const sdA = a.setsFor - a.setsAgainst, sdB = b.setsFor - b.setsAgainst;
    if (sdB !== sdA) return sdB - sdA;
    return b.setsFor - a.setsFor;
  });
}
