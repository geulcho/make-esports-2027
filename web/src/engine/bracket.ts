import type {
  Club, BracketMatch, QualifierState, PlayoffSeries, PlayoffState,
  DivisionSim, TeamRecord,
} from '../types';
import { simulateMatch } from './combat';

// ─── Qualifier ─────────────────────────────────────────────────────────────────
// 7-match single-elimination: top-4 from each L_NA division → 1 MM representative

export function initQualifier(divisionStates: Record<string, DivisionSim>): QualifierState {
  const w = (divisionStates['WEST']?.standings ?? []).slice(0, 4).map(r => r.clubId);
  const e = (divisionStates['EAST']?.standings ?? []).slice(0, 4).map(r => r.clubId);

  return {
    matches: [
      { id: 'wsfa',   stage: 'W-SF-A',  teamA: w[0] ?? null, teamB: w[3] ?? null, result: null, winner: null },
      { id: 'esfa',   stage: 'E-SF-A',  teamA: e[0] ?? null, teamB: e[3] ?? null, result: null, winner: null },
      { id: 'wsfb',   stage: 'W-SF-B',  teamA: w[1] ?? null, teamB: w[2] ?? null, result: null, winner: null },
      { id: 'esfb',   stage: 'E-SF-B',  teamA: e[1] ?? null, teamB: e[2] ?? null, result: null, winner: null },
      { id: 'wfinal', stage: 'W-Final', teamA: null,          teamB: null,          result: null, winner: null },
      { id: 'efinal', stage: 'E-Final', teamA: null,          teamB: null,          result: null, winner: null },
      { id: 'final',  stage: 'Final',   teamA: null,          teamB: null,          result: null, winner: null },
    ],
    mmRepresentative: null,
    completed: false,
  };
}

function buildEloMap(
  clubMap: Map<string, Club>,
  standingsMap: Map<string, TeamRecord>,
): (id: string) => Club | undefined {
  return (id: string) => {
    const base = clubMap.get(id);
    if (!base) return undefined;
    const rec = standingsMap.get(id);
    return rec ? { ...base, elo_rating: rec.elo } : base;
  };
}

export function advanceQualifierToSlot(
  state: QualifierState,
  completedSlots: number,
  targetSlots: number,
  meta: string[],
  clubMap: Map<string, Club>,
  standingsMap: Map<string, TeamRecord>,
  winsNeeded = 2,
): QualifierState {
  if (targetSlots <= completedSlots || state.completed) return state;

  const m: BracketMatch[] = state.matches.map(x => ({ ...x }));
  const club = buildEloMap(clubMap, standingsMap);

  for (let slot = completedSlots; slot < Math.min(targetSlots, 7); slot++) {
    const match = m[slot];
    if (!match) break;

    if (slot === 4) { match.teamA = m[0].winner; match.teamB = m[2].winner; }
    if (slot === 5) { match.teamA = m[1].winner; match.teamB = m[3].winner; }
    if (slot === 6) { match.teamA = m[4].winner; match.teamB = m[5].winner; }

    if (!match.teamA || !match.teamB || match.result) continue;

    const ca = club(match.teamA);
    const cb = club(match.teamB);
    if (!ca || !cb) continue;

    const result = simulateMatch(ca, cb, meta, winsNeeded);
    m[slot] = {
      ...match,
      result,
      winner: result.scoreA > result.scoreB ? match.teamA : match.teamB,
    };
  }

  const done = m.length >= 7 && m.every(x => x.result !== null);
  return {
    matches: m,
    mmRepresentative: done ? (m[6].winner ?? null) : null,
    completed: done,
  };
}

// ─── L_CN Qualifier ──────────────────────────────────────────────────────────
// Same 7-match structure as L_NA but seeded from DRAGON/PHOENIX standings.
// Slot order matches L_NA so advanceQualifierToSlot can be reused.

export function initLCNQualifier(dragon: string[], phoenix: string[]): QualifierState {
  return {
    matches: [
      { id: 'd_sfa',   stage: 'D-SF-A',  teamA: dragon[0] ?? null,  teamB: dragon[3] ?? null,  result: null, winner: null },
      { id: 'p_sfa',   stage: 'P-SF-A',  teamA: phoenix[0] ?? null, teamB: phoenix[3] ?? null, result: null, winner: null },
      { id: 'd_sfb',   stage: 'D-SF-B',  teamA: dragon[1] ?? null,  teamB: dragon[2] ?? null,  result: null, winner: null },
      { id: 'p_sfb',   stage: 'P-SF-B',  teamA: phoenix[1] ?? null, teamB: phoenix[2] ?? null, result: null, winner: null },
      { id: 'd_final', stage: 'D-Final', teamA: null, teamB: null, result: null, winner: null },
      { id: 'p_final', stage: 'P-Final', teamA: null, teamB: null, result: null, winner: null },
      { id: 'final',   stage: 'Final',   teamA: null, teamB: null, result: null, winner: null },
    ],
    mmRepresentative: null,
    completed: false,
  };
}

// ─── L_CN Playoffs ────────────────────────────────────────────────────────────
// Play-In (Bo1 series) → DivSF (Bo3) → DivFinal (Bo3) → Grand Final (Bo5)
// Dragon side: D1-D5 enter. Phoenix side: P1-P5.

const L_CN_PLAYOFF_SLOT_SERIES: readonly (readonly string[])[] = [
  ['d_playin', 'p_playin'],                        // Slot 0  W35 Tue  Play-In
  ['d_sf_1', 'd_sf_2', 'p_sf_1', 'p_sf_2'],       // Slot 1  W35 Thu  DivSF G1
  ['d_sf_1', 'd_sf_2', 'p_sf_1', 'p_sf_2'],       // Slot 2  W35 Fri  DivSF G2
  ['d_sf_1', 'd_sf_2', 'p_sf_1', 'p_sf_2'],       // Slot 3  W35 Sun  DivSF G3
  ['d_final', 'p_final'],                           // Slot 4  W36 Tue  DivFinal G1
  ['d_final', 'p_final'],                           // Slot 5  W36 Thu  DivFinal G2
  ['d_final', 'p_final'],                           // Slot 6  W36 Sat  DivFinal G3
  ['grand_final'],                                   // Slot 7  W37 Mon  GF G1
  ['grand_final'],                                   // Slot 8  W37 Tue  GF G2
  ['grand_final'],                                   // Slot 9  W37 Thu  GF G3
  ['grand_final'],                                   // Slot 10 W37 Fri  GF G4
  ['grand_final'],                                   // Slot 11 W37 Sun  GF G5
];

export function initLCNPlayoffs(
  dragonStandings: TeamRecord[],
  phoenixStandings: TeamRecord[],
): PlayoffState {
  const d = dragonStandings.slice(0, 5).map(r => r.clubId);
  const p = phoenixStandings.slice(0, 5).map(r => r.clubId);

  return {
    series: [
      // Play-In: 4th vs 5th (single match — winsToAdvance=1)
      makeSeries('d_playin', 'playin', 'DRAGON', d[3] ?? null, d[4] ?? null, 0, 1),
      makeSeries('p_playin', 'playin', 'PHOENIX', p[3] ?? null, p[4] ?? null, 0, 1),
      // Division Semis: 1st vs Play-In winner (teamB set after play-in), 2nd vs 3rd
      makeSeries('d_sf_1', 'sf', 'DRAGON', d[0] ?? null, null, 0, 2),
      makeSeries('d_sf_2', 'sf', 'DRAGON', d[1] ?? null, d[2] ?? null, 0, 2),
      makeSeries('p_sf_1', 'sf', 'PHOENIX', p[0] ?? null, null, 0, 2),
      makeSeries('p_sf_2', 'sf', 'PHOENIX', p[1] ?? null, p[2] ?? null, 0, 2),
      // Division Finals
      makeSeries('d_final', 'divfinal', 'DRAGON', null, null, 0, 2),
      makeSeries('p_final', 'divfinal', 'PHOENIX', null, null, 0, 2),
      // Grand Final (Bo5 series: first to 3 wins)
      makeSeries('grand_final', 'grandfinal', null, null, null, 0, 3),
    ],
    champion: null,
    completed: false,
  };
}

function resolveLCNTeams(series: PlayoffSeries[]): PlayoffSeries[] {
  const s = series.map(x => ({ ...x }));
  const g = (id: string) => s.find(x => x.id === id)!;

  // Play-In winner → SF_1 teamB
  const dsf1 = g('d_sf_1');
  if (!dsf1.teamB && g('d_playin').winner) dsf1.teamB = g('d_playin').winner;
  const psf1 = g('p_sf_1');
  if (!psf1.teamB && g('p_playin').winner) psf1.teamB = g('p_playin').winner;

  // SF winners → DivFinal
  const df = g('d_final');
  if (!df.teamA && g('d_sf_1').winner && g('d_sf_2').winner) {
    df.teamA = g('d_sf_1').winner; df.teamB = g('d_sf_2').winner;
  }
  const pf = g('p_final');
  if (!pf.teamA && g('p_sf_1').winner && g('p_sf_2').winner) {
    pf.teamA = g('p_sf_1').winner; pf.teamB = g('p_sf_2').winner;
  }

  // DivFinal winners → Grand Final
  const gf = g('grand_final');
  if (!gf.teamA && g('d_final').winner && g('p_final').winner) {
    gf.teamA = g('d_final').winner; gf.teamB = g('p_final').winner;
  }

  return s;
}

export function advanceLCNPlayoffToSlot(
  state: PlayoffState,
  completedSlots: number,
  targetSlots: number,
  meta: string[],
  clubMap: Map<string, Club>,
  standingsMap: Map<string, TeamRecord>,
  winsNeeded = 2,
): PlayoffState {
  if (targetSlots <= completedSlots || state.completed) return state;

  let series = state.series.map(s => ({ ...s, matches: [...s.matches] }));

  for (let slot = completedSlots; slot < Math.min(targetSlots, L_CN_PLAYOFF_SLOT_SERIES.length); slot++) {
    series = resolveLCNTeams(series);
    const ids = L_CN_PLAYOFF_SLOT_SERIES[slot];
    series = series.map(s => ids.includes(s.id) ? advanceOneSeries(s, meta, clubMap, standingsMap, winsNeeded) : s);
  }

  series = resolveLCNTeams(series);

  const champion = series.find(s => s.id === 'grand_final')?.winner ?? null;
  return { series, champion, completed: champion !== null };
}

// ─── Playoffs ──────────────────────────────────────────────────────────────────
// QF: 8 series (4 West + 4 East), higher seed starts 1-0 (needs 2 total wins)
// SF: 4 series, first to 2
// DivFinal: 2 series, first to 2
// Grand Final: 1 series, first to 3

const PLAYOFF_SLOT_SERIES: readonly (readonly string[])[] = [
  ['w_qf_1','w_qf_2','w_qf_3','w_qf_4','e_qf_1','e_qf_2','e_qf_3','e_qf_4'], // Slot 0  W35 Mon QF-M1
  ['w_qf_1','w_qf_2','w_qf_3','w_qf_4','e_qf_1','e_qf_2','e_qf_3','e_qf_4'], // Slot 1  W35 Tue QF-M2
  ['w_sf_1','w_sf_2','e_sf_1','e_sf_2'],                                        // Slot 2  W35 Thu SF-M1
  ['w_sf_1','w_sf_2','e_sf_1','e_sf_2'],                                        // Slot 3  W35 Fri SF-M2
  ['w_sf_1','w_sf_2','e_sf_1','e_sf_2'],                                        // Slot 4  W35 Sat SF-M3
  ['w_final','e_final'],                                                          // Slot 5  W36 Tue DF-M1
  ['w_final','e_final'],                                                          // Slot 6  W36 Wed DF-M2
  ['w_final','e_final'],                                                          // Slot 7  W36 Fri DF-M3
  ['grand_final'],                                                                // Slot 8  W37 Mon GF-M1
  ['grand_final'],                                                                // Slot 9  W37 Tue GF-M2
  ['grand_final'],                                                                // Slot 10 W37 Thu GF-M3
  ['grand_final'],                                                                // Slot 11 W37 Fri GF-M4
  ['grand_final'],                                                                // Slot 12 W37 Sun GF-M5
];

function makeSeries(
  id: string, stage: PlayoffSeries['stage'], division: PlayoffSeries['division'],
  teamA: string | null, teamB: string | null, startWinsA: number, winsToAdvance: number,
): PlayoffSeries {
  return { id, stage, division, teamA, teamB, winsA: 0, winsB: 0, winsToAdvance, startWinsA, matches: [], winner: null };
}

export function initPlayoffs(
  westStandings: TeamRecord[],
  eastStandings: TeamRecord[],
): PlayoffState {
  const w = westStandings.slice(0, 8).map(r => r.clubId);
  const e = eastStandings.slice(0, 8).map(r => r.clubId);

  return {
    series: [
      makeSeries('w_qf_1', 'qf', 'WEST', w[0] ?? null, w[7] ?? null, 1, 2),
      makeSeries('w_qf_2', 'qf', 'WEST', w[1] ?? null, w[6] ?? null, 1, 2),
      makeSeries('w_qf_3', 'qf', 'WEST', w[2] ?? null, w[5] ?? null, 1, 2),
      makeSeries('w_qf_4', 'qf', 'WEST', w[3] ?? null, w[4] ?? null, 1, 2),
      makeSeries('e_qf_1', 'qf', 'EAST', e[0] ?? null, e[7] ?? null, 1, 2),
      makeSeries('e_qf_2', 'qf', 'EAST', e[1] ?? null, e[6] ?? null, 1, 2),
      makeSeries('e_qf_3', 'qf', 'EAST', e[2] ?? null, e[5] ?? null, 1, 2),
      makeSeries('e_qf_4', 'qf', 'EAST', e[3] ?? null, e[4] ?? null, 1, 2),
      makeSeries('w_sf_1', 'sf', 'WEST', null, null, 0, 2),
      makeSeries('w_sf_2', 'sf', 'WEST', null, null, 0, 2),
      makeSeries('e_sf_1', 'sf', 'EAST', null, null, 0, 2),
      makeSeries('e_sf_2', 'sf', 'EAST', null, null, 0, 2),
      makeSeries('w_final', 'divfinal', 'WEST', null, null, 0, 2),
      makeSeries('e_final', 'divfinal', 'EAST', null, null, 0, 2),
      makeSeries('grand_final', 'grandfinal', null, null, null, 0, 3),
    ],
    champion: null,
    completed: false,
  };
}

function get(series: PlayoffSeries[], id: string): PlayoffSeries {
  return series.find(s => s.id === id)!;
}

function resolveTeams(series: PlayoffSeries[]): PlayoffSeries[] {
  const s = series.map(x => ({ ...x }));
  const g = (id: string) => s.find(x => x.id === id)!;

  const wsf1 = g('w_sf_1'); if (!wsf1.teamA && g('w_qf_1').winner && g('w_qf_4').winner) { wsf1.teamA = g('w_qf_1').winner; wsf1.teamB = g('w_qf_4').winner; }
  const wsf2 = g('w_sf_2'); if (!wsf2.teamA && g('w_qf_2').winner && g('w_qf_3').winner) { wsf2.teamA = g('w_qf_2').winner; wsf2.teamB = g('w_qf_3').winner; }
  const esf1 = g('e_sf_1'); if (!esf1.teamA && g('e_qf_1').winner && g('e_qf_4').winner) { esf1.teamA = g('e_qf_1').winner; esf1.teamB = g('e_qf_4').winner; }
  const esf2 = g('e_sf_2'); if (!esf2.teamA && g('e_qf_2').winner && g('e_qf_3').winner) { esf2.teamA = g('e_qf_2').winner; esf2.teamB = g('e_qf_3').winner; }

  const wf = g('w_final'); if (!wf.teamA && g('w_sf_1').winner && g('w_sf_2').winner) { wf.teamA = g('w_sf_1').winner; wf.teamB = g('w_sf_2').winner; }
  const ef = g('e_final'); if (!ef.teamA && g('e_sf_1').winner && g('e_sf_2').winner) { ef.teamA = g('e_sf_1').winner; ef.teamB = g('e_sf_2').winner; }

  const gf = g('grand_final'); if (!gf.teamA && g('w_final').winner && g('e_final').winner) { gf.teamA = g('w_final').winner; gf.teamB = g('e_final').winner; }

  return s;
}

function advanceOneSeries(
  s: PlayoffSeries,
  meta: string[],
  clubMap: Map<string, Club>,
  standingsMap: Map<string, TeamRecord>,
  winsNeeded = 2,
): PlayoffSeries {
  if (s.winner !== null || !s.teamA || !s.teamB) return s;

  const totalA = s.startWinsA + s.winsA;
  const totalB = s.winsB;
  if (totalA >= s.winsToAdvance) return { ...s, winner: s.teamA };
  if (totalB >= s.winsToAdvance) return { ...s, winner: s.teamB };

  const recA = standingsMap.get(s.teamA);
  const recB = standingsMap.get(s.teamB);
  const baseA = clubMap.get(s.teamA);
  const baseB = clubMap.get(s.teamB);
  if (!baseA || !baseB) return s;

  const ca = { ...baseA, elo_rating: recA?.elo ?? baseA.elo_rating };
  const cb = { ...baseB, elo_rating: recB?.elo ?? baseB.elo_rating };
  const match = simulateMatch(ca, cb, meta, winsNeeded);

  const newWinsA = s.winsA + (match.scoreA > match.scoreB ? 1 : 0);
  const newWinsB = s.winsB + (match.scoreA <= match.scoreB ? 1 : 0);
  const newTotalA = s.startWinsA + newWinsA;
  const winner =
    newTotalA >= s.winsToAdvance ? s.teamA :
    newWinsB  >= s.winsToAdvance ? s.teamB : null;

  return { ...s, winsA: newWinsA, winsB: newWinsB, matches: [...s.matches, match], winner };
}

// ─── L_KR Playoffs ────────────────────────────────────────────────────────────
// 8-match bracket (same structure for spring W14-15 and summer W36-37):
//   M1: 3v6 (qf)     M2: 4v5 (qf)
//   M3: 1 vs M1W (sf)  M4: 2 vs M2W (sf)
//   M5: M3W vs M4W (upper)   M6: M3L vs M4L (lower)
//   M7: M5L vs M6W (finalq)  M8: M5W vs M7W (grandfinal)
// All series: winsNeeded=3 (Bo5)

const L_KR_PO_SLOT_SERIES: readonly (readonly string[])[] = [
  ['kr_m1'],  // Slot 0: M1 (3v6)
  ['kr_m2'],  // Slot 1: M2 (4v5)
  ['kr_m3'],  // Slot 2: M3 (1 vs M1W)
  ['kr_m4'],  // Slot 3: M4 (2 vs M2W)
  ['kr_m5'],  // Slot 4: M5 Upper Final
  ['kr_m6'],  // Slot 5: M6 Lower Match
  ['kr_m7'],  // Slot 6: M7 Final Qualifier
  ['kr_m8'],  // Slot 7: M8 Grand Final
];

export function initLKRPlayoffs(standings: TeamRecord[]): PlayoffState {
  const s = standings.slice(0, 6).map(r => r.clubId);
  return {
    series: [
      makeSeries('kr_m1', 'qf',         null, s[2] ?? null, s[5] ?? null, 0, 1), // 3rd vs 6th
      makeSeries('kr_m2', 'qf',         null, s[3] ?? null, s[4] ?? null, 0, 1), // 4th vs 5th
      makeSeries('kr_m3', 'sf',         null, s[0] ?? null, null,         0, 1), // 1st vs M1W
      makeSeries('kr_m4', 'sf',         null, s[1] ?? null, null,         0, 1), // 2nd vs M2W
      makeSeries('kr_m5', 'upper',      null, null,          null,         0, 1), // M3W vs M4W
      makeSeries('kr_m6', 'lower',      null, null,          null,         0, 1), // M3L vs M4L
      makeSeries('kr_m7', 'finalq',     null, null,          null,         0, 1), // M5L vs M6W
      makeSeries('kr_m8', 'grandfinal', null, null,          null,         0, 1), // M5W vs M7W
    ],
    champion: null,
    completed: false,
  };
}

function resolveLKRTeams(series: PlayoffSeries[]): PlayoffSeries[] {
  const s = series.map(x => ({ ...x }));
  const g = (id: string) => s.find(x => x.id === id)!;

  // M1/M2 winners → M3/M4 teamB
  const m3 = g('kr_m3'); if (!m3.teamB && g('kr_m1').winner) m3.teamB = g('kr_m1').winner;
  const m4 = g('kr_m4'); if (!m4.teamB && g('kr_m2').winner) m4.teamB = g('kr_m2').winner;

  // M3/M4 winners → M5, losers → M6
  const m5 = g('kr_m5');
  if (!m5.teamA && g('kr_m3').winner && g('kr_m4').winner) {
    m5.teamA = g('kr_m3').winner; m5.teamB = g('kr_m4').winner;
  }
  const m3l = g('kr_m3').winner ? (g('kr_m3').teamA === g('kr_m3').winner ? g('kr_m3').teamB : g('kr_m3').teamA) : null;
  const m4l = g('kr_m4').winner ? (g('kr_m4').teamA === g('kr_m4').winner ? g('kr_m4').teamB : g('kr_m4').teamA) : null;
  const m6 = g('kr_m6');
  if (!m6.teamA && m3l && m4l) { m6.teamA = m3l; m6.teamB = m4l; }

  // M5 loser + M6 winner → M7
  const m5l = g('kr_m5').winner ? (g('kr_m5').teamA === g('kr_m5').winner ? g('kr_m5').teamB : g('kr_m5').teamA) : null;
  const m7 = g('kr_m7');
  if (!m7.teamA && m5l && g('kr_m6').winner) { m7.teamA = m5l; m7.teamB = g('kr_m6').winner; }

  // M5 winner + M7 winner → M8
  const m8 = g('kr_m8');
  if (!m8.teamA && g('kr_m5').winner && g('kr_m7').winner) {
    m8.teamA = g('kr_m5').winner; m8.teamB = g('kr_m7').winner;
  }

  return s;
}

export function advanceLKRPlayoffToSlot(
  state: PlayoffState,
  completedSlots: number,
  targetSlots: number,
  meta: string[],
  clubMap: Map<string, Club>,
  standingsMap: Map<string, TeamRecord>,
  winsNeeded = 3,
): PlayoffState {
  if (targetSlots <= completedSlots || state.completed) return state;

  let series = state.series.map(s => ({ ...s, matches: [...s.matches] }));

  for (let slot = completedSlots; slot < Math.min(targetSlots, L_KR_PO_SLOT_SERIES.length); slot++) {
    series = resolveLKRTeams(series);
    const ids = L_KR_PO_SLOT_SERIES[slot];
    series = series.map(s => ids.includes(s.id) ? advanceOneSeries(s, meta, clubMap, standingsMap, winsNeeded) : s);
  }

  series = resolveLKRTeams(series);

  const champion = series.find(s => s.id === 'kr_m8')?.winner ?? null;
  return { series, champion, completed: champion !== null };
}

// ─── L_NEU / L_WEU Playoffs — 8-team double elimination ──────────────────────
// UBR1 (ub1-ub4): Bo3 (winsNeeded=2). All others: Bo5 (winsNeeded=3).
// Slot layout (12 slots):
//   0: ub1+ub2  1: ub3+ub4  2: ub5  3: ub6
//   4: lb1  5: lb2  6: lb3  7: lb4  8: ubf  9: lb5  10: lbf  11: gf

const NEU_WEU_PO_SLOT_SERIES: readonly (readonly string[])[] = [
  ['ub1', 'ub2'], // Slot 0  Thu UBR1
  ['ub3', 'ub4'], // Slot 1  Fri UBR1
  ['ub5'],        // Slot 2  Sat UBR2
  ['ub6'],        // Slot 3  Sun UBR2
  ['lb1'],        // Slot 4  Tue LBR1
  ['lb2'],        // Slot 5  Wed LBR1
  ['lb3'],        // Slot 6  Thu LBR2
  ['lb4'],        // Slot 7  Fri LBR2
  ['ubf'],        // Slot 8  Sat UBF
  ['lb5'],        // Slot 9  Sun LB Semi
  ['lbf'],        // Slot 10 Sat LBF
  ['gf'],         // Slot 11 Sun GF
];

const NEU_WEU_BO3_IDS = new Set(['ub1', 'ub2', 'ub3', 'ub4']);

export function initNEUWEUPlayoffs(standings: TeamRecord[]): PlayoffState {
  const s = standings.slice(0, 8).map(r => r.clubId);
  return {
    series: [
      makeSeries('ub1', 'qf',         null, s[0] ?? null, s[7] ?? null, 0, 1), // S1 vs S8
      makeSeries('ub2', 'qf',         null, s[3] ?? null, s[4] ?? null, 0, 1), // S4 vs S5
      makeSeries('ub3', 'qf',         null, s[1] ?? null, s[6] ?? null, 0, 1), // S2 vs S7
      makeSeries('ub4', 'qf',         null, s[2] ?? null, s[5] ?? null, 0, 1), // S3 vs S6
      makeSeries('ub5', 'sf',         null, null, null, 0, 1), // UB1W vs UB2W
      makeSeries('ub6', 'sf',         null, null, null, 0, 1), // UB3W vs UB4W
      makeSeries('lb1', 'lower',      null, null, null, 0, 1), // UB1L vs UB2L
      makeSeries('lb2', 'lower',      null, null, null, 0, 1), // UB3L vs UB4L
      makeSeries('lb3', 'lower',      null, null, null, 0, 1), // LB1W vs UB6L
      makeSeries('lb4', 'lower',      null, null, null, 0, 1), // LB2W vs UB5L
      makeSeries('ubf', 'upper',      null, null, null, 0, 1), // UB5W vs UB6W
      makeSeries('lb5', 'lower',      null, null, null, 0, 1), // LB3W vs LB4W
      makeSeries('lbf', 'finalq',     null, null, null, 0, 1), // LB5W vs UBF loser
      makeSeries('gf',  'grandfinal', null, null, null, 0, 1), // UBF winner vs LBF winner
    ],
    champion: null,
    completed: false,
  };
}

function resolveNEUWEUTeams(series: PlayoffSeries[]): PlayoffSeries[] {
  const s = series.map(x => ({ ...x }));
  const g = (id: string) => s.find(x => x.id === id)!;
  const loser = (x: PlayoffSeries) => x.winner ? (x.winner === x.teamA ? x.teamB : x.teamA) : null;

  const ub5 = g('ub5'); if (!ub5.teamA && g('ub1').winner && g('ub2').winner) { ub5.teamA = g('ub1').winner; ub5.teamB = g('ub2').winner; }
  const ub6 = g('ub6'); if (!ub6.teamA && g('ub3').winner && g('ub4').winner) { ub6.teamA = g('ub3').winner; ub6.teamB = g('ub4').winner; }

  const lb1L = loser(g('ub1')); const lb1R = loser(g('ub2'));
  const lb1 = g('lb1'); if (!lb1.teamA && lb1L && lb1R) { lb1.teamA = lb1L; lb1.teamB = lb1R; }
  const lb2L = loser(g('ub3')); const lb2R = loser(g('ub4'));
  const lb2 = g('lb2'); if (!lb2.teamA && lb2L && lb2R) { lb2.teamA = lb2L; lb2.teamB = lb2R; }

  const lb3 = g('lb3'); if (!lb3.teamA && g('lb1').winner && loser(g('ub6'))) { lb3.teamA = g('lb1').winner; lb3.teamB = loser(g('ub6')); }
  const lb4 = g('lb4'); if (!lb4.teamA && g('lb2').winner && loser(g('ub5'))) { lb4.teamA = g('lb2').winner; lb4.teamB = loser(g('ub5')); }

  const ubf = g('ubf'); if (!ubf.teamA && g('ub5').winner && g('ub6').winner) { ubf.teamA = g('ub5').winner; ubf.teamB = g('ub6').winner; }

  const lb5 = g('lb5'); if (!lb5.teamA && g('lb3').winner && g('lb4').winner) { lb5.teamA = g('lb3').winner; lb5.teamB = g('lb4').winner; }

  const lbf = g('lbf'); if (!lbf.teamA && g('lb5').winner && loser(g('ubf'))) { lbf.teamA = g('lb5').winner; lbf.teamB = loser(g('ubf')); }

  const gf = g('gf'); if (!gf.teamA && g('ubf').winner && g('lbf').winner) { gf.teamA = g('ubf').winner; gf.teamB = g('lbf').winner; }

  return s;
}

export function advanceNEUWEUPlayoffToSlot(
  state: PlayoffState,
  completedSlots: number,
  targetSlots: number,
  meta: string[],
  clubMap: Map<string, Club>,
  standingsMap: Map<string, TeamRecord>,
): PlayoffState {
  if (targetSlots <= completedSlots || state.completed) return state;

  let series = state.series.map(s => ({ ...s, matches: [...s.matches] }));

  for (let slot = completedSlots; slot < Math.min(targetSlots, NEU_WEU_PO_SLOT_SERIES.length); slot++) {
    series = resolveNEUWEUTeams(series);
    const ids = NEU_WEU_PO_SLOT_SERIES[slot];
    series = series.map(s =>
      ids.includes(s.id)
        ? advanceOneSeries(s, meta, clubMap, standingsMap, NEU_WEU_BO3_IDS.has(s.id) ? 2 : 3)
        : s,
    );
  }

  series = resolveNEUWEUTeams(series);

  const champion = series.find(s => s.id === 'gf')?.winner ?? null;
  return { series, champion, completed: champion !== null };
}

// ─── L_DE / L_EEU / L_SEU / L_RU — 6-team double-elimination (all Bo5) ────────
// Bracket: U1(1v4), U2(2v3) → U3/UBF; L1(U1L vs S6), L2(U2L vs S5) → L3 → L4/LBF → GF
// 5th/6th seeds get BYE into LBR1 (L1/L2). No bracket reset.

const DE6_PO_SLOT_SERIES: readonly (readonly string[])[] = [
  ['de_u1'],  // Slot 0: U1 (1v4)
  ['de_u2'],  // Slot 1: U2 (2v3)
  ['de_l1'],  // Slot 2: L1 (U1L vs S6)
  ['de_l2'],  // Slot 3: L2 (U2L vs S5)
  ['de_u3'],  // Slot 4: U3/UBF (U1W vs U2W)
  ['de_l3'],  // Slot 5: L3/LBR2 (L1W vs L2W)
  ['de_l4'],  // Slot 6: L4/LBF (U3L vs L3W)
  ['de_gf'],  // Slot 7: Grand Final (U3W vs L4W)
];

export function initDE6Playoffs(standings: TeamRecord[]): PlayoffState {
  const s = standings.slice(0, 6).map(r => r.clubId);
  return {
    series: [
      makeSeries('de_u1', 'upper',      null, s[0] ?? null, s[3] ?? null, 0, 1),
      makeSeries('de_u2', 'upper',      null, s[1] ?? null, s[2] ?? null, 0, 1),
      makeSeries('de_l1', 'lower',      null, null,          s[5] ?? null, 0, 1), // teamA = U1L (set via resolve)
      makeSeries('de_l2', 'lower',      null, null,          s[4] ?? null, 0, 1), // teamA = U2L
      makeSeries('de_u3', 'upper',      null, null, null, 0, 1),
      makeSeries('de_l3', 'lower',      null, null, null, 0, 1),
      makeSeries('de_l4', 'finalq',     null, null, null, 0, 1),
      makeSeries('de_gf', 'grandfinal', null, null, null, 0, 1),
    ],
    champion: null,
    completed: false,
  };
}

function resolveDE6Teams(series: PlayoffSeries[]): PlayoffSeries[] {
  const s = series.map(x => ({ ...x }));
  const g = (id: string) => s.find(x => x.id === id)!;
  const loser = (x: PlayoffSeries) => x.winner ? (x.winner === x.teamA ? x.teamB : x.teamA) : null;

  const l1 = g('de_l1'); if (!l1.teamA && loser(g('de_u1'))) l1.teamA = loser(g('de_u1'));
  const l2 = g('de_l2'); if (!l2.teamA && loser(g('de_u2'))) l2.teamA = loser(g('de_u2'));

  const u3 = g('de_u3');
  if (!u3.teamA && g('de_u1').winner && g('de_u2').winner) {
    u3.teamA = g('de_u1').winner; u3.teamB = g('de_u2').winner;
  }

  const l3 = g('de_l3');
  if (!l3.teamA && g('de_l1').winner && g('de_l2').winner) {
    l3.teamA = g('de_l1').winner; l3.teamB = g('de_l2').winner;
  }

  const l4 = g('de_l4');
  if (!l4.teamA && loser(g('de_u3'))) l4.teamA = loser(g('de_u3'));
  if (!l4.teamB && g('de_l3').winner) l4.teamB = g('de_l3').winner;

  const gf = g('de_gf');
  if (!gf.teamA && g('de_u3').winner && g('de_l4').winner) {
    gf.teamA = g('de_u3').winner; gf.teamB = g('de_l4').winner;
  }

  return s;
}

export function advanceDE6PlayoffToSlot(
  state: PlayoffState,
  completedSlots: number,
  targetSlots: number,
  meta: string[],
  clubMap: Map<string, Club>,
  standingsMap: Map<string, TeamRecord>,
): PlayoffState {
  if (targetSlots <= completedSlots || state.completed) return state;

  let series = state.series.map(s => ({ ...s, matches: [...s.matches] }));

  for (let slot = completedSlots; slot < Math.min(targetSlots, DE6_PO_SLOT_SERIES.length); slot++) {
    series = resolveDE6Teams(series);
    const ids = DE6_PO_SLOT_SERIES[slot];
    series = series.map(s => ids.includes(s.id) ? advanceOneSeries(s, meta, clubMap, standingsMap, 3) : s);
  }

  series = resolveDE6Teams(series);

  const champion = series.find(s => s.id === 'de_gf')?.winner ?? null;
  return { series, champion, completed: champion !== null };
}

export function advancePlayoffToSlot(
  state: PlayoffState,
  completedSlots: number,
  targetSlots: number,
  meta: string[],
  clubMap: Map<string, Club>,
  standingsMap: Map<string, TeamRecord>,
  winsNeeded = 2,
): PlayoffState {
  if (targetSlots <= completedSlots || state.completed) return state;

  let series = state.series.map(s => ({ ...s, matches: [...s.matches] }));

  for (let slot = completedSlots; slot < Math.min(targetSlots, PLAYOFF_SLOT_SERIES.length); slot++) {
    series = resolveTeams(series);
    const ids = PLAYOFF_SLOT_SERIES[slot];
    series = series.map(s => ids.includes(s.id) ? advanceOneSeries(s, meta, clubMap, standingsMap, winsNeeded) : s);
  }

  series = resolveTeams(series);

  const champion = get(series, 'grand_final').winner ?? null;
  return { series, champion, completed: champion !== null };
}
