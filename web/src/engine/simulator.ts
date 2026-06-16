import type {
  Club, DivisionSim, FullLeagueSim, LeagueSimState, PhaseResult, PlayoffState, TeamRecord,
} from '../types';
import { clubsByLeague, clubsByDivision, leagueConfigs } from '../data/clubs';
import { simulateMatch } from './combat';
import { getSRRRounds, getDRRRounds, getLCNHalfRounds, getLKRSpringRounds, getLKRSummerRounds } from './matchSchedule';
import { getLeagueScheduleDef } from './leagueScheduleDefs';
import { initQualifier, advanceQualifierToSlot, initPlayoffs, advancePlayoffToSlot, initLCNQualifier, initLCNPlayoffs, advanceLCNPlayoffToSlot, initLKRPlayoffs, advanceLKRPlayoffToSlot, initNEUWEUPlayoffs, advanceNEUWEUPlayoffToSlot, initDE6Playoffs, advanceDE6PlayoffToSlot, initTWJPPlayoffs, advanceTWJPPlayoffToSlot, advanceMEAFSplitToSlot, meafRanksFromSplit, initMEAFMMQual, advanceMEAFMMQualToSlot } from './bracket';

export function pickMeta(): string[] {
  const combos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  return [...combos].sort(() => Math.random() - 0.5).slice(0, 2);
}

function makeRecord(club: Club, divisionId: string | null): TeamRecord {
  return {
    clubId: club.id, divisionId,
    elo: club.elo_rating,
    wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, momFor: 0, momAgainst: 0,
  };
}

export function sortStandings(standings: TeamRecord[]): TeamRecord[] {
  return [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const sdA = a.setsFor - a.setsAgainst, sdB = b.setsFor - b.setsAgainst;
    if (sdB !== sdA) return sdB - sdA;
    return (b.momFor - b.momAgainst) - (a.momFor - a.momAgainst);
  });
}

// ─── Initialization ───────────────────────────────────────────────────────────

export function initLeagueState(leagueId: string): LeagueSimState {
  const lc = leagueConfigs.find(l => l.id === leagueId)!;
  const clubs = clubsByLeague(leagueId);
  const def = getLeagueScheduleDef(leagueId);

  if (def) {
    const firstPhase = def.phases[0];
    if (firstPhase.scope === 'division' && lc.divisions) {
      const divisionStates: Record<string, DivisionSim> = {};
      for (const divId of lc.divisions) {
        const divClubs = clubsByDivision(leagueId, divId);
        divisionStates[divId] = {
          divisionId: divId,
          standings: divClubs.map(c => makeRecord(c, divId)),
          results: [],
        };
      }
      return {
        leagueId,
        standings: lc.divisions.flatMap(d => divisionStates[d].standings),
        results: [],
        divisionStates,
        currentPhase: firstPhase.id,
      };
    }
    // full_league or bracket scope: flat standings with divisionId from club data
    return {
      leagueId,
      standings: clubs.map(c => makeRecord(c, c.division ?? null)),
      results: [],
      currentPhase: firstPhase.id,
    };
  }

  if (lc.divisions && lc.divisions.length > 0) {
    const divisionStates: Record<string, DivisionSim> = {};
    for (const divId of lc.divisions) {
      const divClubs = clubsByDivision(leagueId, divId);
      divisionStates[divId] = {
        divisionId: divId,
        standings: divClubs.map(c => makeRecord(c, divId)),
        results: [],
      };
    }
    return {
      leagueId,
      standings: lc.divisions.flatMap(d => divisionStates[d].standings),
      results: [],
      divisionStates,
      currentPhase: 'default',
    };
  }

  return {
    leagueId,
    standings: clubs.map(c => makeRecord(c, null)),
    results: [],
    currentPhase: 'default',
  };
}

export function initAllLeagues(): Record<string, LeagueSimState> {
  const states: Record<string, LeagueSimState> = {};
  for (const lc of leagueConfigs) {
    if (clubsByLeague(lc.id).length < 2) continue;
    states[lc.id] = initLeagueState(lc.id);
  }
  return states;
}

// ─── Core round simulation ────────────────────────────────────────────────────

function simulateRoundsForGroup(
  standings: TeamRecord[],
  existingResults: PhaseResult[],
  completedRounds: number,
  targetRounds: number,
  meta: string[],
  clubMap: Map<string, Club>,
  rounds: [string, string][][],
  divisionId: string | null,
  winsNeeded = 2,
): { standings: TeamRecord[]; results: PhaseResult[] } {
  if (targetRounds <= completedRounds) return { standings, results: existingResults };

  const newStandings = standings.map(s => ({ ...s }));
  const standingMap = new Map(newStandings.map(s => [s.clubId, s]));
  const newResults = [...existingResults];

  for (let ri = completedRounds; ri < targetRounds; ri++) {
    const round = rounds[ri];
    if (!round) break;

    const roundMatches = [];
    for (const [idA, idB] of round) {
      const clubA = clubMap.get(idA);
      const clubB = clubMap.get(idB);
      if (!clubA || !clubB) continue;

      const recA = standingMap.get(idA)!;
      const recB = standingMap.get(idB)!;
      if (!recA || !recB) continue;

      const ca = { ...clubA, elo_rating: recA.elo };
      const cb = { ...clubB, elo_rating: recB.elo };
      const match = simulateMatch(ca, cb, meta, winsNeeded);
      roundMatches.push(match);

      if (match.scoreA > match.scoreB) { recA.wins++; recB.losses++; }
      else { recB.wins++; recA.losses++; }
      recA.setsFor += match.scoreA; recA.setsAgainst += match.scoreB;
      recB.setsFor += match.scoreB; recB.setsAgainst += match.scoreA;
      for (const set of match.sets) {
        recA.momFor += set.momA; recA.momAgainst += set.momB;
        recB.momFor += set.momB; recB.momAgainst += set.momA;
      }
      recA.elo += match.eloChangeA;
      recB.elo -= match.eloChangeA;
    }

    if (roundMatches.length > 0) {
      newResults.push({ phase: ri + 1, splitNum: 1, divisionId, matches: roundMatches });
    }
  }

  return { standings: sortStandings(newStandings), results: newResults };
}

// ─── L_CN phase-aware advance ─────────────────────────────────────────────────
//
// Phases: first_half (W1-13) → qualifier (W14-15) → second_half (W21-34) → playoffs (W35-37)
//
// Each half: 22 rounds (14 divisional DRR + 8 cross-div SRR), run as full-league.
// First half standings stored in divisionStates.ALL (for results) and split into
// DRAGON/PHOENIX for the UI division filter.

const L_CN_HALF_TOTAL = 22;
const L_CN_QUAL_TOTAL = 7;
const L_CN_PO_TOTAL   = 12;

function advanceLCN(
  state: LeagueSimState,
  completed: Record<string, number>,
  target: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  let s = { ...state };

  const dragonIds = new Set(clubsByDivision('L_CN', 'DRAGON').map(c => c.id));
  const phoenixIds = new Set(clubsByDivision('L_CN', 'PHOENIX').map(c => c.id));

  // ── Phase 1: First half — combined 22-round schedule ──────────────────────
  const sk1 = 'L_CN::first_half';
  const c1 = completed[sk1] ?? 0;
  const t1 = Math.min(target[sk1] ?? c1, L_CN_HALF_TOTAL);

  {
    // Use divisionStates.ALL to store combined first-half data across calls
    const fhAll = s.divisionStates?.['ALL'];
    const fhStandings = fhAll?.standings.length
      ? fhAll.standings
      : clubsByDivision('L_CN', 'DRAGON').concat(clubsByDivision('L_CN', 'PHOENIX'))
          .map(c => makeRecord(c, c.division ?? null));
    const fhResults = fhAll?.results ?? [];

    let newStandings = fhStandings;
    let newResults   = fhResults;

    if (t1 > c1) {
      const rounds = getLCNHalfRounds();
      const sim = simulateRoundsForGroup(fhStandings, fhResults, c1, t1, meta, clubMap, rounds, null, 3);
      newStandings = sim.standings;
      newResults   = sim.results;
    }

    const dragonNew  = newStandings.filter(r => dragonIds.has(r.clubId));
    const phoenixNew = newStandings.filter(r => phoenixIds.has(r.clubId));

    s = {
      ...s,
      standings: newStandings,
      results:   newResults,
      divisionStates: {
        DRAGON:  { divisionId: 'DRAGON',  standings: dragonNew,  results: [] },
        PHOENIX: { divisionId: 'PHOENIX', standings: phoenixNew, results: [] },
        ALL:     { divisionId: 'ALL',     standings: newStandings, results: newResults },
      },
      currentPhase: 'first_half',
    };
  }

  const firstHalfDone = (target[sk1] ?? 0) >= L_CN_HALF_TOTAL
                     || (completed[sk1] ?? 0) >= L_CN_HALF_TOTAL;
  if (!firstHalfDone) return s;

  // ── Phase 2: MM Qualifier — bracket (W14-15) ──────────────────────────────
  const skQ = 'L_CN::qualifier';
  const cQ  = completed[skQ] ?? 0;
  const tQ  = Math.min(target[skQ] ?? cQ, L_CN_QUAL_TOTAL);

  if (tQ > 0 || cQ > 0) {
    const fhStandings = s.divisionStates?.['ALL']?.standings ?? s.standings;
    const dragonSeeds  = fhStandings.filter(r => dragonIds.has(r.clubId)).slice(0, 4).map(r => r.clubId);
    const phoenixSeeds = fhStandings.filter(r => phoenixIds.has(r.clubId)).slice(0, 4).map(r => r.clubId);

    let q = s.mmQualifier;
    if (!q) q = initLCNQualifier(dragonSeeds, phoenixSeeds);
    if (q && tQ > cQ) {
      const qualMap = new Map<string, TeamRecord>();
      for (const r of (s.divisionStates?.['ALL']?.standings ?? [])) qualMap.set(r.clubId, r);
      q = advanceQualifierToSlot(q, cQ, tQ, meta, clubMap, qualMap, 3);
    }
    if (q) s = { ...s, mmQualifier: q, currentPhase: q.completed ? 'qualifier_done' : 'qualifier' };
  }

  // ── Phase 3: Second half — fresh 22-round combined schedule (W21-34) ──────
  const sk2 = 'L_CN::second_half';
  const c2  = completed[sk2] ?? 0;
  const t2  = Math.min(target[sk2] ?? c2, L_CN_HALF_TOTAL);

  if (t2 > 0 || c2 > 0) {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };

    if (c2 === 0 && fl.standings.length === 0) {
      // Carry over first-half accumulated standings (single league — no reset)
      fl = {
        standings: s.divisionStates?.['ALL']?.standings ??
          clubsByDivision('L_CN', 'DRAGON').concat(clubsByDivision('L_CN', 'PHOENIX'))
            .map(c => makeRecord(c, c.division ?? null)),
        results: [],
      };
    }

    if (t2 > c2) {
      const rounds = getLCNHalfRounds();
      const sim = simulateRoundsForGroup(fl.standings, fl.results, c2, t2, meta, clubMap, rounds, null, 3);
      fl = { standings: sim.standings, results: sim.results };
    }

    const dragonNew  = fl.standings.filter(r => dragonIds.has(r.clubId));
    const phoenixNew = fl.standings.filter(r => phoenixIds.has(r.clubId));

    s = {
      ...s,
      fullLeagueState: fl,
      standings: fl.standings,
      divisionStates: {
        ...s.divisionStates,
        DRAGON:  { divisionId: 'DRAGON',  standings: dragonNew,  results: [] },
        PHOENIX: { divisionId: 'PHOENIX', standings: phoenixNew, results: [] },
      },
      results: [...(s.divisionStates?.['ALL']?.results ?? []), ...fl.results],
      currentPhase: 'second_half',
    };
  }

  // ── Phase 4: Playoffs (W35-37) ────────────────────────────────────────────
  const secondHalfDone = (target[sk2] ?? 0) >= L_CN_HALF_TOTAL
                      || (completed[sk2] ?? 0) >= L_CN_HALF_TOTAL;

  if (secondHalfDone) {
    const skP = 'L_CN::playoffs';
    const cP  = completed[skP] ?? 0;
    const tP  = Math.min(target[skP] ?? cP, L_CN_PO_TOTAL);

    const fl = s.fullLeagueState;
    if (!s.playoffs && fl) {
      const dragonRecs  = fl.standings.filter(r => dragonIds.has(r.clubId));
      const phoenixRecs = fl.standings.filter(r => phoenixIds.has(r.clubId));
      s = { ...s, playoffs: initLCNPlayoffs(dragonRecs, phoenixRecs) };
    }

    if (s.playoffs && tP > cP) {
      const poMap = new Map<string, TeamRecord>(
        (fl?.standings ?? []).map(r => [r.clubId, r]),
      );
      s = {
        ...s,
        playoffs: advanceLCNPlayoffToSlot(s.playoffs, cP, tP, meta, clubMap, poMap, 3),
      };
    }

    if (s.playoffs?.completed) {
      s = { ...s, currentPhase: 'complete' };
    } else if ((tP > 0 || cP > 0) && s.playoffs) {
      s = { ...s, currentPhase: 'playoffs' };
    }
  }

  return s;
}

// ─── L_NA phase-aware advance ─────────────────────────────────────────────────
//
// Phases progress sequentially:
//   first_half (W1-13) → qualifier (W14-15) → second_half (W21-34) → playoffs (W35-37)
//
// IMPORTANT: no early returns between phases — all applicable phases are processed
// in a single call so the state is always self-consistent.

const L_NA_DRR_TOTAL = 22; // 12 teams → 11-round SRR × 2
const L_NA_SRR_TOTAL = 23; // 24 teams → 23-round SRR
const L_NA_QUAL_TOTAL = 7; // 7 qualifier matches
const L_NA_PO_TOTAL = 13;  // 13 playoff round-slots

function advanceLNA(
  state: LeagueSimState,
  completed: Record<string, number>,
  target: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  let s = { ...state };

  // ── Phase 1: First half — DRR per division (W1-13) ────────────────────────
  if (s.divisionStates) {
    const newDiv: Record<string, DivisionSim> = {};
    for (const [divId, divState] of Object.entries(s.divisionStates)) {
      const sk = `L_NA::first_half::${divId}`;
      const c = completed[sk] ?? 0;
      const t = Math.min(target[sk] ?? c, L_NA_DRR_TOTAL);
      const rounds = getDRRRounds('L_NA', divId);
      const { standings, results } = simulateRoundsForGroup(
        divState.standings, divState.results, c, t, meta, clubMap, rounds, divId, 3,
      );
      newDiv[divId] = { divisionId: divId, standings, results };
    }
    // Always reflect first-half progress in the top-level standings so the
    // UI shows real records even before the second half begins.
    const combinedStandings = ['WEST', 'EAST'].flatMap(d => newDiv[d]?.standings ?? []);
    const combinedResults   = Object.values(newDiv).flatMap(d => d.results);
    s = { ...s, divisionStates: newDiv, standings: combinedStandings, results: combinedResults, currentPhase: 'first_half' };
  }

  // Determine whether first half is fully simulated for this target date
  const westTarget = target['L_NA::first_half::WEST'] ?? 0;
  const eastTarget = target['L_NA::first_half::EAST'] ?? 0;
  const firstHalfDone = westTarget >= L_NA_DRR_TOTAL && eastTarget >= L_NA_DRR_TOTAL;

  if (!firstHalfDone) return s; // still in first half — nothing further to do

  // ── Phase 2: MM Qualifier — bracket (W14-15) ──────────────────────────────
  const skQ = 'L_NA::qualifier';
  const cQ  = completed[skQ] ?? 0;
  const tQ  = Math.min(target[skQ] ?? cQ, L_NA_QUAL_TOTAL);

  if (tQ > 0 || cQ > 0) {
    const qualStandingsMap = new Map<string, TeamRecord>();
    for (const divState of Object.values(s.divisionStates ?? {})) {
      for (const rec of divState.standings) qualStandingsMap.set(rec.clubId, rec);
    }

    let q = s.mmQualifier;
    if (!q && s.divisionStates) q = initQualifier(s.divisionStates);
    if (q && tQ > cQ) {
      q = advanceQualifierToSlot(q, cQ, tQ, meta, clubMap, qualStandingsMap, 3);
    }
    if (q) s = { ...s, mmQualifier: q, currentPhase: q.completed ? 'qualifier_done' : 'qualifier' };
  }

  // ── Phase 3: Second half — full-league 24-team SRR (W21-34) ──────────────
  const sk2 = 'L_NA::second_half';
  const c2  = completed[sk2] ?? 0;
  const t2  = Math.min(target[sk2] ?? c2, L_NA_SRR_TOTAL);

  if (t2 > 0 || c2 > 0) {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };

    // Bootstrap from first-half standings on first entry
    if (c2 === 0 && fl.standings.length === 0 && s.divisionStates) {
      fl = {
        standings: Object.values(s.divisionStates).flatMap(d => d.standings),
        results: [],
      };
    }

    if (t2 > c2) {
      const rounds = getSRRRounds('L_NA', null);
      const { standings, results } = simulateRoundsForGroup(
        fl.standings, fl.results, c2, t2, meta, clubMap, rounds, null, 3,
      );
      fl = { standings, results };
    }

    s = {
      ...s,
      fullLeagueState: fl,
      standings: fl.standings,
      results: [
        ...(s.divisionStates?.WEST?.results ?? []),
        ...(s.divisionStates?.EAST?.results ?? []),
        ...fl.results,
      ],
      currentPhase: 'second_half',
    };
  }

  // ── Phase 4: Playoffs (W35-37) ────────────────────────────────────────────
  const secondHalfDone = (target[sk2] ?? 0) >= L_NA_SRR_TOTAL || (completed[sk2] ?? 0) >= L_NA_SRR_TOTAL;

  if (secondHalfDone) {
    const skP = 'L_NA::playoffs';
    const cP  = completed[skP] ?? 0;
    const tP  = Math.min(target[skP] ?? cP, L_NA_PO_TOTAL);

    const fl = s.fullLeagueState;
    if (!s.playoffs && fl) {
      // Use static club data to determine division membership — avoids relying on
      // divisionId being set on stored TeamRecord (which may be missing in old saves).
      const westIds = new Set(clubsByDivision('L_NA', 'WEST').map(c => c.id));
      const eastIds = new Set(clubsByDivision('L_NA', 'EAST').map(c => c.id));
      const westRecs = fl.standings.filter(r => westIds.has(r.clubId));
      const eastRecs = fl.standings.filter(r => eastIds.has(r.clubId));
      s = { ...s, playoffs: initPlayoffs(westRecs, eastRecs) };
    }

    if (s.playoffs && tP > cP) {
      const poStandingsMap = new Map<string, TeamRecord>(
        (fl?.standings ?? []).map(r => [r.clubId, r]),
      );
      s = {
        ...s,
        playoffs: advancePlayoffToSlot(s.playoffs, cP, tP, meta, clubMap, poStandingsMap, 3),
      };
    }

    if (s.playoffs?.completed) {
      s = { ...s, currentPhase: 'complete' };
    } else if ((tP > 0 || cP > 0) && s.playoffs) {
      s = { ...s, currentPhase: 'playoffs' };
    }
  }

  return s;
}

// ─── L_KR phase-aware advance ─────────────────────────────────────────────────
//
// Two-split structure:
//   spring (W1-13, 59 daily groups) → spring_playoffs (W14-15, 8 slots)
//   summer (W21-35, 58 daily groups) → summer_playoffs (W36-37, 8 slots)
// All regular season: Bo3 (default winsNeeded=2). All playoffs: Bo5 (winsNeeded=3).
// Spring archive (standings/results/playoffs/champion) stored in springXxx fields.

const L_KR_SPRING_TOTAL = 59;
const L_KR_SUMMER_TOTAL = 58;
const L_KR_PO_TOTAL     = 8;

function advanceLKR(
  state: LeagueSimState,
  completed: Record<string, number>,
  target: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  let s = { ...state };

  // ── Phase 1: Spring regular (W1-13) ───────────────────────────────────────
  const skSp = 'L_KR::spring';
  const cSp  = completed[skSp] ?? 0;
  const tSp  = Math.min(target[skSp] ?? cSp, L_KR_SPRING_TOTAL);

  {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSp === 0 && fl.standings.length === 0) {
      fl = { standings: clubsByLeague('L_KR').map(c => makeRecord(c, null)), results: [] };
    }
    if (tSp > cSp) {
      const rounds = getLKRSpringRounds();
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSp, tSp, meta, clubMap, rounds, null);
      fl = { standings: sim.standings, results: sim.results };
    }
    s = { ...s, fullLeagueState: fl, standings: fl.standings, results: fl.results, currentPhase: 'spring' };
  }

  const springDone = (target[skSp] ?? 0) >= L_KR_SPRING_TOTAL || (completed[skSp] ?? 0) >= L_KR_SPRING_TOTAL;
  if (!springDone) return s;

  // ── Phase 2: Spring playoffs (W14-15) ─────────────────────────────────────
  const skSpP = 'L_KR::spring_playoffs';
  const cSpP  = completed[skSpP] ?? 0;
  const tSpP  = Math.min(target[skSpP] ?? cSpP, L_KR_PO_TOTAL);

  if ((tSpP > 0 || cSpP > 0) && !s.springStandings) {
    const springFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initLKRPlayoffs(springFl.standings);
    if (tSpP > cSpP) {
      const poMap = new Map(springFl.standings.map(r => [r.clubId, r]));
      po = advanceLKRPlayoffToSlot(po, cSpP, tSpP, meta, clubMap, poMap, 3);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'spring_playoffs_done' : 'spring_playoffs' };
  }

  const springPODone = (target[skSpP] ?? 0) >= L_KR_PO_TOTAL || (completed[skSpP] ?? 0) >= L_KR_PO_TOTAL;
  if (!springPODone) return s;

  // Archive spring data (runs once when transitioning to summer)
  if (!s.springStandings) {
    s = {
      ...s,
      springStandings: s.fullLeagueState?.standings ?? [],
      springResults:   s.fullLeagueState?.results   ?? [],
      springPlayoffs:  s.playoffs,
      springChampion:  s.playoffs?.champion ?? null,
      playoffs:        undefined, // clear for summer
    };
  }

  // ── Phase 3: Summer regular (W21-35) ──────────────────────────────────────
  const skSu = 'L_KR::summer';
  const cSu  = completed[skSu] ?? 0;
  const tSu  = Math.min(target[skSu] ?? cSu, L_KR_SUMMER_TOTAL);

  if (tSu > 0 || cSu > 0) {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSu === 0) {
      // Start summer fresh: carry ELO from spring, reset W/L/sets
      const springFinal = s.springStandings ?? clubsByLeague('L_KR').map(c => makeRecord(c, null));
      fl = {
        standings: springFinal.map(r => ({ ...r, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, momFor: 0, momAgainst: 0 })),
        results: [],
      };
    }
    if (tSu > cSu) {
      const rounds = getLKRSummerRounds();
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSu, tSu, meta, clubMap, rounds, null);
      fl = { standings: sim.standings, results: sim.results };
    }
    s = {
      ...s,
      fullLeagueState: fl,
      standings: fl.standings,
      results: [...(s.springResults ?? []), ...fl.results],
      currentPhase: 'summer',
    };
  }

  const summerDone = (target[skSu] ?? 0) >= L_KR_SUMMER_TOTAL || (completed[skSu] ?? 0) >= L_KR_SUMMER_TOTAL;
  if (!summerDone) return s;

  // ── Phase 4: Summer playoffs (W36-37) ─────────────────────────────────────
  const skSuP = 'L_KR::summer_playoffs';
  const cSuP  = completed[skSuP] ?? 0;
  const tSuP  = Math.min(target[skSuP] ?? cSuP, L_KR_PO_TOTAL);

  if (tSuP > 0 || cSuP > 0) {
    const summerFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initLKRPlayoffs(summerFl.standings);
    if (tSuP > cSuP) {
      const poMap = new Map(summerFl.standings.map(r => [r.clubId, r]));
      po = advanceLKRPlayoffToSlot(po, cSuP, tSuP, meta, clubMap, poMap, 3);
    }
    s = {
      ...s,
      playoffs: po,
      currentPhase: po.completed ? 'complete' : 'summer_playoffs',
    };
  }

  return s;
}

// ─── L_NEU / L_WEU phase-aware advance ───────────────────────────────────────
//
// Two-split structure (identical for both leagues):
//   spring (W1-12, 22 DRR rounds, Bo1) → spring_playoffs (W13-15, 12 slots, 8-team DE)
//   summer (W21-34, 22 DRR rounds, Bo1) → summer_playoffs (W35-37, 12 slots, 8-team DE)
// UBR1: Bo3 (winsNeeded=2). All other playoff rounds: Bo5 (winsNeeded=3).
// Tiebreaker: wins → score differential → sets won → head-to-head (within tied group)

const L_NEUWEU_DRR_TOTAL = 22;
const L_NEUWEU_PO_TOTAL  = 12;

// Bo1 리그 타이브레이커: 승수 → ScD(momFor-momAgainst) → ScG(momFor) → 상대전적
// Bo1에서 setsFor = wins 이므로 setsFor 기반 ScD/ScG는 의미 없음.
// 실질 점수 차는 매치 내 MoM(momFor/momAgainst)으로 계산한다.
function sortStandingsNEUWEU(standings: TeamRecord[], results: PhaseResult[]): TeamRecord[] {
  // 상대전적: 그룹 내 직접 대결 승수 집계
  const h2h = new Map<string, Map<string, number>>();
  for (const pr of results) {
    for (const m of pr.matches) {
      const winner = m.scoreA > m.scoreB ? m.teamA : m.teamB;
      const loser  = m.scoreA > m.scoreB ? m.teamB : m.teamA;
      if (!h2h.has(winner)) h2h.set(winner, new Map());
      h2h.get(winner)!.set(loser, (h2h.get(winner)!.get(loser) ?? 0) + 1);
    }
  }
  const h2hWins = (a: string, b: string) => h2h.get(a)?.get(b) ?? 0;

  // 1차 정렬: 승수 → ScD(momFor-momAgainst) → ScG(momFor)
  const sorted = [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const scDA = a.momFor - a.momAgainst;
    const scDB = b.momFor - b.momAgainst;
    if (scDB !== scDA) return scDB - scDA;
    if (b.momFor !== a.momFor) return b.momFor - a.momFor;
    return 0;
  });

  // 2차 패스: 동률 그룹 내 상대전적으로 재정렬
  const out: TeamRecord[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (
      j < sorted.length &&
      sorted[j].wins === sorted[i].wins &&
      (sorted[j].momFor - sorted[j].momAgainst) === (sorted[i].momFor - sorted[i].momAgainst) &&
      sorted[j].momFor === sorted[i].momFor
    ) j++;

    const group = sorted.slice(i, j);
    if (group.length > 1) {
      group.sort((a, b) => {
        const aW = group.reduce((s, x) => x.clubId !== a.clubId ? s + h2hWins(a.clubId, x.clubId) : s, 0);
        const bW = group.reduce((s, x) => x.clubId !== b.clubId ? s + h2hWins(b.clubId, x.clubId) : s, 0);
        return bW - aW;
      });
    }
    out.push(...group);
    i = j;
  }
  return out;
}

function advanceNEUWEU(
  state: LeagueSimState,
  completed: Record<string, number>,
  target: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  const id = state.leagueId;
  let s = { ...state };

  // ── Phase 1: Spring regular (W1-12, 22 Bo1 DRR rounds) ───────────────────
  const skSp = `${id}::spring`;
  const cSp  = completed[skSp] ?? 0;
  const tSp  = Math.min(target[skSp] ?? cSp, L_NEUWEU_DRR_TOTAL);

  {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSp === 0 && fl.standings.length === 0) {
      fl = { standings: clubsByLeague(id).map(c => makeRecord(c, null)), results: [] };
    }
    if (tSp > cSp) {
      const rounds = getDRRRounds(id, null);
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSp, tSp, meta, clubMap, rounds, null, 1);
      fl = { standings: sortStandingsNEUWEU(sim.standings, sim.results), results: sim.results };
    }
    s = { ...s, fullLeagueState: fl, standings: fl.standings, results: fl.results, currentPhase: 'spring' };
  }

  const springDone = (target[skSp] ?? 0) >= L_NEUWEU_DRR_TOTAL || (completed[skSp] ?? 0) >= L_NEUWEU_DRR_TOTAL;
  if (!springDone) return s;

  // ── Phase 2: Spring playoffs (W13-15, 12 slots) ───────────────────────────
  const skSpP = `${id}::spring_playoffs`;
  const cSpP  = completed[skSpP] ?? 0;
  const tSpP  = Math.min(target[skSpP] ?? cSpP, L_NEUWEU_PO_TOTAL);

  if ((tSpP > 0 || cSpP > 0) && !s.springStandings) {
    const springFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initNEUWEUPlayoffs(springFl.standings);
    if (tSpP > cSpP) {
      const poMap = new Map(springFl.standings.map(r => [r.clubId, r]));
      po = advanceNEUWEUPlayoffToSlot(po, cSpP, tSpP, meta, clubMap, poMap);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'spring_playoffs_done' : 'spring_playoffs' };
  }

  const springPODone = (target[skSpP] ?? 0) >= L_NEUWEU_PO_TOTAL || (completed[skSpP] ?? 0) >= L_NEUWEU_PO_TOTAL;
  if (!springPODone) return s;

  // Archive spring
  if (!s.springStandings) {
    s = {
      ...s,
      springStandings: s.fullLeagueState?.standings ?? [],
      springResults:   s.fullLeagueState?.results   ?? [],
      springPlayoffs:  s.playoffs,
      springChampion:  s.playoffs?.champion ?? null,
      playoffs:        undefined,
    };
  }

  // ── Phase 3: Summer regular (W21-34, 22 Bo1 DRR rounds) ──────────────────
  const skSu = `${id}::summer`;
  const cSu  = completed[skSu] ?? 0;
  const tSu  = Math.min(target[skSu] ?? cSu, L_NEUWEU_DRR_TOTAL);

  if (tSu > 0 || cSu > 0) {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSu === 0) {
      const springFinal = s.springStandings ?? clubsByLeague(id).map(c => makeRecord(c, null));
      fl = {
        standings: springFinal.map(r => ({ ...r, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, momFor: 0, momAgainst: 0 })),
        results: [],
      };
    }
    if (tSu > cSu) {
      const rounds = getDRRRounds(id, null);
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSu, tSu, meta, clubMap, rounds, null, 1);
      fl = { standings: sortStandingsNEUWEU(sim.standings, sim.results), results: sim.results };
    }
    s = {
      ...s,
      fullLeagueState: fl,
      standings: fl.standings,
      results: [...(s.springResults ?? []), ...fl.results],
      currentPhase: 'summer',
    };
  }

  const summerDone = (target[skSu] ?? 0) >= L_NEUWEU_DRR_TOTAL || (completed[skSu] ?? 0) >= L_NEUWEU_DRR_TOTAL;
  if (!summerDone) return s;

  // ── Phase 4: Summer playoffs (W35-37, 12 slots) ───────────────────────────
  const skSuP = `${id}::summer_playoffs`;
  const cSuP  = completed[skSuP] ?? 0;
  const tSuP  = Math.min(target[skSuP] ?? cSuP, L_NEUWEU_PO_TOTAL);

  if (tSuP > 0 || cSuP > 0) {
    const summerFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initNEUWEUPlayoffs(summerFl.standings);
    if (tSuP > cSuP) {
      const poMap = new Map(summerFl.standings.map(r => [r.clubId, r]));
      po = advanceNEUWEUPlayoffToSlot(po, cSuP, tSuP, meta, clubMap, poMap);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'complete' : 'summer_playoffs' };
  }

  return s;
}

// ─── L_TR phase-aware advance ─────────────────────────────────────────────────
//
// Two-split structure:
//   spring (W1-9, 14 Bo1 DRR rounds) → spring_playoffs (W10-12, 12 slots, 8-team DE)
//   summer (W21-30, 14 Bo1 DRR rounds) → summer_playoffs (W33-35, 12 slots, 8-team DE)
// Playoffs identical to L_NEU/L_WEU: UBR1 Bo3, rest Bo5.

const L_TR_DRR_TOTAL = 14;
const L_TR_PO_TOTAL  = 12;

function advanceTR(
  state: LeagueSimState,
  completed: Record<string, number>,
  target: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  const id = state.leagueId; // 'L_TR'
  let s = { ...state };

  // ── Phase 1: Spring regular (W1-9, 14 Bo1 DRR rounds) ────────────────────
  const skSp = `${id}::spring`;
  const cSp  = completed[skSp] ?? 0;
  const tSp  = Math.min(target[skSp] ?? cSp, L_TR_DRR_TOTAL);

  {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSp === 0 && fl.standings.length === 0) {
      fl = { standings: clubsByLeague(id).map(c => makeRecord(c, null)), results: [] };
    }
    if (tSp > cSp) {
      const rounds = getDRRRounds(id, null);
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSp, tSp, meta, clubMap, rounds, null, 1);
      fl = { standings: sortStandingsNEUWEU(sim.standings, sim.results), results: sim.results };
    }
    s = { ...s, fullLeagueState: fl, standings: fl.standings, results: fl.results, currentPhase: 'spring' };
  }

  const springDone = (target[skSp] ?? 0) >= L_TR_DRR_TOTAL || (completed[skSp] ?? 0) >= L_TR_DRR_TOTAL;
  if (!springDone) return s;

  // ── Phase 2: Spring playoffs (W10-12, 12 slots) ───────────────────────────
  const skSpP = `${id}::spring_playoffs`;
  const cSpP  = completed[skSpP] ?? 0;
  const tSpP  = Math.min(target[skSpP] ?? cSpP, L_TR_PO_TOTAL);

  if ((tSpP > 0 || cSpP > 0) && !s.springStandings) {
    const springFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initNEUWEUPlayoffs(springFl.standings);
    if (tSpP > cSpP) {
      const poMap = new Map(springFl.standings.map(r => [r.clubId, r]));
      po = advanceNEUWEUPlayoffToSlot(po, cSpP, tSpP, meta, clubMap, poMap);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'spring_playoffs_done' : 'spring_playoffs' };
  }

  const springPODone = (target[skSpP] ?? 0) >= L_TR_PO_TOTAL || (completed[skSpP] ?? 0) >= L_TR_PO_TOTAL;
  if (!springPODone) return s;

  if (!s.springStandings) {
    s = {
      ...s,
      springStandings: s.fullLeagueState?.standings ?? [],
      springResults:   s.fullLeagueState?.results   ?? [],
      springPlayoffs:  s.playoffs,
      springChampion:  s.playoffs?.champion ?? null,
      playoffs:        undefined,
    };
  }

  // ── Phase 3: Summer regular (W21-30, 14 Bo1 DRR rounds) ──────────────────
  const skSu = `${id}::summer`;
  const cSu  = completed[skSu] ?? 0;
  const tSu  = Math.min(target[skSu] ?? cSu, L_TR_DRR_TOTAL);

  if (tSu > 0 || cSu > 0) {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSu === 0) {
      const springFinal = s.springStandings ?? clubsByLeague(id).map(c => makeRecord(c, null));
      fl = {
        standings: springFinal.map(r => ({ ...r, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, momFor: 0, momAgainst: 0 })),
        results: [],
      };
    }
    if (tSu > cSu) {
      const rounds = getDRRRounds(id, null);
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSu, tSu, meta, clubMap, rounds, null, 1);
      fl = { standings: sortStandingsNEUWEU(sim.standings, sim.results), results: sim.results };
    }
    s = {
      ...s,
      fullLeagueState: fl,
      standings: fl.standings,
      results: [...(s.springResults ?? []), ...fl.results],
      currentPhase: 'summer',
    };
  }

  const summerDone = (target[skSu] ?? 0) >= L_TR_DRR_TOTAL || (completed[skSu] ?? 0) >= L_TR_DRR_TOTAL;
  if (!summerDone) return s;

  // ── Phase 4: Summer playoffs (W33-35, 12 slots) ───────────────────────────
  const skSuP = `${id}::summer_playoffs`;
  const cSuP  = completed[skSuP] ?? 0;
  const tSuP  = Math.min(target[skSuP] ?? cSuP, L_TR_PO_TOTAL);

  if (tSuP > 0 || cSuP > 0) {
    const summerFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initNEUWEUPlayoffs(summerFl.standings);
    if (tSuP > cSuP) {
      const poMap = new Map(summerFl.standings.map(r => [r.clubId, r]));
      po = advanceNEUWEUPlayoffToSlot(po, cSuP, tSuP, meta, clubMap, poMap);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'complete' : 'summer_playoffs' };
  }

  return s;
}

// ─── L_DE / L_EEU / L_SEU / L_RU phase-aware advance ────────────────────────
//
// Two-split structure (identical for all 4 leagues):
//   spring (W1-11, 18 Bo1 DRR rounds) → spring_playoffs (W13-15, 8 slots, 6-team DE, all Bo5)
//   summer (W21-33, 18 Bo1 DRR rounds) → summer_playoffs (W35-37, 8 slots)
// Tiebreaker: wins → ScD(momFor-momAgainst) → ScG(momFor) → H2H (same as NEU/WEU)

const L_DE_DRR_TOTAL = 18;
const L_DE_PO_TOTAL  = 8;

function advanceDE(
  state: LeagueSimState,
  completed: Record<string, number>,
  target: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  const id = state.leagueId;
  let s = { ...state };

  // ── Phase 1: Spring regular ───────────────────────────────────────────────
  const skSp = `${id}::spring`;
  const cSp  = completed[skSp] ?? 0;
  const tSp  = Math.min(target[skSp] ?? cSp, L_DE_DRR_TOTAL);

  {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSp === 0 && fl.standings.length === 0) {
      fl = { standings: clubsByLeague(id).map(c => makeRecord(c, null)), results: [] };
    }
    if (tSp > cSp) {
      const rounds = getDRRRounds(id, null);
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSp, tSp, meta, clubMap, rounds, null, 1);
      fl = { standings: sortStandingsNEUWEU(sim.standings, sim.results), results: sim.results };
    }
    s = { ...s, fullLeagueState: fl, standings: fl.standings, results: fl.results, currentPhase: 'spring' };
  }

  const springDone = (target[skSp] ?? 0) >= L_DE_DRR_TOTAL || (completed[skSp] ?? 0) >= L_DE_DRR_TOTAL;
  if (!springDone) return s;

  // ── Phase 2: Spring playoffs ──────────────────────────────────────────────
  const skSpP = `${id}::spring_playoffs`;
  const cSpP  = completed[skSpP] ?? 0;
  const tSpP  = Math.min(target[skSpP] ?? cSpP, L_DE_PO_TOTAL);

  if ((tSpP > 0 || cSpP > 0) && !s.springStandings) {
    const springFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initDE6Playoffs(springFl.standings);
    if (tSpP > cSpP) {
      const poMap = new Map(springFl.standings.map(r => [r.clubId, r]));
      po = advanceDE6PlayoffToSlot(po, cSpP, tSpP, meta, clubMap, poMap);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'spring_playoffs_done' : 'spring_playoffs' };
  }

  const springPODone = (target[skSpP] ?? 0) >= L_DE_PO_TOTAL || (completed[skSpP] ?? 0) >= L_DE_PO_TOTAL;
  if (!springPODone) return s;

  if (!s.springStandings) {
    s = {
      ...s,
      springStandings: s.fullLeagueState?.standings ?? [],
      springResults:   s.fullLeagueState?.results   ?? [],
      springPlayoffs:  s.playoffs,
      springChampion:  s.playoffs?.champion ?? null,
      playoffs:        undefined,
    };
  }

  // ── Phase 3: Summer regular ───────────────────────────────────────────────
  const skSu = `${id}::summer`;
  const cSu  = completed[skSu] ?? 0;
  const tSu  = Math.min(target[skSu] ?? cSu, L_DE_DRR_TOTAL);

  if (tSu > 0 || cSu > 0) {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSu === 0) {
      const springFinal = s.springStandings ?? clubsByLeague(id).map(c => makeRecord(c, null));
      fl = {
        standings: springFinal.map(r => ({ ...r, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, momFor: 0, momAgainst: 0 })),
        results: [],
      };
    }
    if (tSu > cSu) {
      const rounds = getDRRRounds(id, null);
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSu, tSu, meta, clubMap, rounds, null, 1);
      fl = { standings: sortStandingsNEUWEU(sim.standings, sim.results), results: sim.results };
    }
    s = {
      ...s,
      fullLeagueState: fl,
      standings: fl.standings,
      results: [...(s.springResults ?? []), ...fl.results],
      currentPhase: 'summer',
    };
  }

  const summerDone = (target[skSu] ?? 0) >= L_DE_DRR_TOTAL || (completed[skSu] ?? 0) >= L_DE_DRR_TOTAL;
  if (!summerDone) return s;

  // ── Phase 4: Summer playoffs ──────────────────────────────────────────────
  const skSuP = `${id}::summer_playoffs`;
  const cSuP  = completed[skSuP] ?? 0;
  const tSuP  = Math.min(target[skSuP] ?? cSuP, L_DE_PO_TOTAL);

  if (tSuP > 0 || cSuP > 0) {
    const summerFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initDE6Playoffs(summerFl.standings);
    if (tSuP > cSuP) {
      const poMap = new Map(summerFl.standings.map(r => [r.clubId, r]));
      po = advanceDE6PlayoffToSlot(po, cSuP, tSuP, meta, clubMap, poMap);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'complete' : 'summer_playoffs' };
  }

  return s;
}

// ─── L_BR / L_SA phase-aware advance ─────────────────────────────────────────
//
// Two-split structure (identical for both leagues):
//   spring (W1-11, 18 Bo3 SRR slots) → spring_playoffs (W13-15, 8 slots, L_KR bracket)
//   summer (W21-33, 18 Bo3 SRR slots) → summer_playoffs (W35-37, 8 slots, L_KR bracket)
// Each 9-round SRR is split into 18 daily sub-rounds: Sat (2 matches) + Sun (3 matches).

const L_BRSA_REG_TOTAL = 18;
const L_BRSA_PO_TOTAL  = 8;

const _brsaRoundsCache = new Map<string, [string, string][][]>();
function getBRSARounds(leagueId: string): [string, string][][] {
  if (_brsaRoundsCache.has(leagueId)) return _brsaRoundsCache.get(leagueId)!;
  const srr = getSRRRounds(leagueId, null); // 9 rounds × 5 matches
  const sub: [string, string][][] = [];
  for (const round of srr) {
    sub.push(round.slice(0, 2)); // Sat: 2 matches
    sub.push(round.slice(2));    // Sun: 3 matches
  }
  _brsaRoundsCache.set(leagueId, sub);
  return sub;
}

function advanceBRSA(
  state: LeagueSimState,
  completed: Record<string, number>,
  target: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  const id = state.leagueId;
  let s = { ...state };

  // ── Phase 1: Spring regular (W1-11, 18 Bo3 SRR slots) ────────────────────
  const skSp = `${id}::spring`;
  const cSp  = completed[skSp] ?? 0;
  const tSp  = Math.min(target[skSp] ?? cSp, L_BRSA_REG_TOTAL);

  {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSp === 0 && fl.standings.length === 0) {
      fl = { standings: clubsByLeague(id).map(c => makeRecord(c, null)), results: [] };
    }
    if (tSp > cSp) {
      const rounds = getBRSARounds(id);
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSp, tSp, meta, clubMap, rounds, null, 2);
      fl = { standings: sim.standings, results: sim.results };
    }
    s = { ...s, fullLeagueState: fl, standings: fl.standings, results: fl.results, currentPhase: 'spring' };
  }

  const springDone = (target[skSp] ?? 0) >= L_BRSA_REG_TOTAL || (completed[skSp] ?? 0) >= L_BRSA_REG_TOTAL;
  if (!springDone) return s;

  // ── Phase 2: Spring playoffs (W13-15, 8 slots) ────────────────────────────
  const skSpP = `${id}::spring_playoffs`;
  const cSpP  = completed[skSpP] ?? 0;
  const tSpP  = Math.min(target[skSpP] ?? cSpP, L_BRSA_PO_TOTAL);

  if ((tSpP > 0 || cSpP > 0) && !s.springStandings) {
    const springFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initLKRPlayoffs(springFl.standings);
    if (tSpP > cSpP) {
      const poMap = new Map(springFl.standings.map(r => [r.clubId, r]));
      po = advanceLKRPlayoffToSlot(po, cSpP, tSpP, meta, clubMap, poMap, 3);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'spring_playoffs_done' : 'spring_playoffs' };
  }

  const springPODone = (target[skSpP] ?? 0) >= L_BRSA_PO_TOTAL || (completed[skSpP] ?? 0) >= L_BRSA_PO_TOTAL;
  if (!springPODone) return s;

  if (!s.springStandings) {
    s = {
      ...s,
      springStandings: s.fullLeagueState?.standings ?? [],
      springResults:   s.fullLeagueState?.results   ?? [],
      springPlayoffs:  s.playoffs,
      springChampion:  s.playoffs?.champion ?? null,
      playoffs:        undefined,
    };
  }

  // ── Phase 3: Summer regular (W21-33, 18 Bo3 SRR slots) ───────────────────
  const skSu = `${id}::summer`;
  const cSu  = completed[skSu] ?? 0;
  const tSu  = Math.min(target[skSu] ?? cSu, L_BRSA_REG_TOTAL);

  if (tSu > 0 || cSu > 0) {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSu === 0) {
      const springFinal = s.springStandings ?? clubsByLeague(id).map(c => makeRecord(c, null));
      fl = {
        standings: springFinal.map(r => ({ ...r, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, momFor: 0, momAgainst: 0 })),
        results: [],
      };
    }
    if (tSu > cSu) {
      const rounds = getBRSARounds(id);
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSu, tSu, meta, clubMap, rounds, null, 2);
      fl = { standings: sim.standings, results: sim.results };
    }
    s = {
      ...s,
      fullLeagueState: fl,
      standings: fl.standings,
      results: [...(s.springResults ?? []), ...fl.results],
      currentPhase: 'summer',
    };
  }

  const summerDone = (target[skSu] ?? 0) >= L_BRSA_REG_TOTAL || (completed[skSu] ?? 0) >= L_BRSA_REG_TOTAL;
  if (!summerDone) return s;

  // ── Phase 4: Summer playoffs (W35-37, 8 slots) ────────────────────────────
  const skSuP = `${id}::summer_playoffs`;
  const cSuP  = completed[skSuP] ?? 0;
  const tSuP  = Math.min(target[skSuP] ?? cSuP, L_BRSA_PO_TOTAL);

  if (tSuP > 0 || cSuP > 0) {
    const summerFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initLKRPlayoffs(summerFl.standings);
    if (tSuP > cSuP) {
      const poMap = new Map(summerFl.standings.map(r => [r.clubId, r]));
      po = advanceLKRPlayoffToSlot(po, cSuP, tSuP, meta, clubMap, poMap, 3);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'complete' : 'summer_playoffs' };
  }

  return s;
}

// ─── L_TW / L_JP phase-aware advance ─────────────────────────────────────────
//
// Two-split structure (identical for both leagues):
//   spring (W1-9, 21 Bo3 DRR sub-rounds) → spring_playoffs (W10-11, 4 slots, stepladder)
//   summer (W21-30, 21 Bo3 DRR sub-rounds) → summer_playoffs (W33-34, 4 slots, stepladder)
// Each DRR week (2 rounds × 4 matches) is split [Fri=2, Sat=3, Sun=3] = 3 sub-rounds.

const L_TWJP_REG_TOTAL = 21;
const L_TWJP_PO_TOTAL  = 4;

const _twjpRoundsCache = new Map<string, [string, string][][]>();
function getTWJPRounds(leagueId: string): [string, string][][] {
  if (_twjpRoundsCache.has(leagueId)) return _twjpRoundsCache.get(leagueId)!;
  const drr = getDRRRounds(leagueId, null); // 14 rounds × 4 matches
  const sub: [string, string][][] = [];
  for (let w = 0; w < 7; w++) {
    const week = [...drr[w * 2], ...drr[w * 2 + 1]]; // 8 matches
    sub.push(week.slice(0, 2)); // Fri: 2
    sub.push(week.slice(2, 5)); // Sat: 3
    sub.push(week.slice(5, 8)); // Sun: 3
  }
  _twjpRoundsCache.set(leagueId, sub);
  return sub;
}

function advanceTWJP(
  state: LeagueSimState,
  completed: Record<string, number>,
  target: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  const id = state.leagueId;
  let s = { ...state };

  // ── Phase 1: Spring regular (W1-9, 21 Bo3 sub-rounds) ────────────────────
  const skSp = `${id}::spring`;
  const cSp  = completed[skSp] ?? 0;
  const tSp  = Math.min(target[skSp] ?? cSp, L_TWJP_REG_TOTAL);

  {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSp === 0 && fl.standings.length === 0) {
      fl = { standings: clubsByLeague(id).map(c => makeRecord(c, null)), results: [] };
    }
    if (tSp > cSp) {
      const rounds = getTWJPRounds(id);
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSp, tSp, meta, clubMap, rounds, null, 2);
      fl = { standings: sim.standings, results: sim.results };
    }
    s = { ...s, fullLeagueState: fl, standings: fl.standings, results: fl.results, currentPhase: 'spring' };
  }

  const springDone = (target[skSp] ?? 0) >= L_TWJP_REG_TOTAL || (completed[skSp] ?? 0) >= L_TWJP_REG_TOTAL;
  if (!springDone) return s;

  // ── Phase 2: Spring playoffs (W10-11, 4 slots) ───────────────────────────
  const skSpP = `${id}::spring_playoffs`;
  const cSpP  = completed[skSpP] ?? 0;
  const tSpP  = Math.min(target[skSpP] ?? cSpP, L_TWJP_PO_TOTAL);

  if ((tSpP > 0 || cSpP > 0) && !s.springStandings) {
    const springFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initTWJPPlayoffs(springFl.standings);
    if (tSpP > cSpP) {
      const poMap = new Map(springFl.standings.map(r => [r.clubId, r]));
      po = advanceTWJPPlayoffToSlot(po, cSpP, tSpP, meta, clubMap, poMap);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'spring_playoffs_done' : 'spring_playoffs' };
  }

  const springPODone = (target[skSpP] ?? 0) >= L_TWJP_PO_TOTAL || (completed[skSpP] ?? 0) >= L_TWJP_PO_TOTAL;
  if (!springPODone) return s;

  if (!s.springStandings) {
    s = {
      ...s,
      springStandings: s.fullLeagueState?.standings ?? [],
      springResults:   s.fullLeagueState?.results   ?? [],
      springPlayoffs:  s.playoffs,
      springChampion:  s.playoffs?.champion ?? null,
      playoffs:        undefined,
    };
  }

  // ── Phase 3: Summer regular (W21-30, 21 Bo3 sub-rounds) ──────────────────
  const skSu = `${id}::summer`;
  const cSu  = completed[skSu] ?? 0;
  const tSu  = Math.min(target[skSu] ?? cSu, L_TWJP_REG_TOTAL);

  if (tSu > 0 || cSu > 0) {
    let fl: FullLeagueSim = s.fullLeagueState ?? { standings: [], results: [] };
    if (cSu === 0) {
      const springFinal = s.springStandings ?? clubsByLeague(id).map(c => makeRecord(c, null));
      fl = {
        standings: springFinal.map(r => ({ ...r, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, momFor: 0, momAgainst: 0 })),
        results: [],
      };
    }
    if (tSu > cSu) {
      const rounds = getTWJPRounds(id);
      const sim = simulateRoundsForGroup(fl.standings, fl.results, cSu, tSu, meta, clubMap, rounds, null, 2);
      fl = { standings: sim.standings, results: sim.results };
    }
    s = {
      ...s,
      fullLeagueState: fl,
      standings: fl.standings,
      results: [...(s.springResults ?? []), ...fl.results],
      currentPhase: 'summer',
    };
  }

  const summerDone = (target[skSu] ?? 0) >= L_TWJP_REG_TOTAL || (completed[skSu] ?? 0) >= L_TWJP_REG_TOTAL;
  if (!summerDone) return s;

  // ── Phase 4: Summer playoffs (W33-34, 4 slots) ───────────────────────────
  const skSuP = `${id}::summer_playoffs`;
  const cSuP  = completed[skSuP] ?? 0;
  const tSuP  = Math.min(target[skSuP] ?? cSuP, L_TWJP_PO_TOTAL);

  if (tSuP > 0 || cSuP > 0) {
    const summerFl = s.fullLeagueState!;
    let po = s.playoffs;
    if (!po) po = initTWJPPlayoffs(summerFl.standings);
    if (tSuP > cSuP) {
      const poMap = new Map(summerFl.standings.map(r => [r.clubId, r]));
      po = advanceTWJPPlayoffToSlot(po, cSuP, tSuP, meta, clubMap, poMap);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'complete' : 'summer_playoffs' };
  }

  return s;
}

// ─── L_MEAF ───────────────────────────────────────────────────────────────────

const MEAF_SPLIT_TOTAL = 8;
const MEAF_MMQ_TOTAL   = 2;
const MEAF_FP_TOTAL    = 4;
const MEAF_SPLIT_PTS   = [8, 5, 4, 3, 1, 1, 0, 0];

function meafComputeStandings(splits: PlayoffState[], baseTeams: TeamRecord[]): TeamRecord[] {
  const pts: Record<string, number> = {};
  for (const t of baseTeams) pts[t.clubId] = 0;
  for (const split of splits) {
    const ranks = meafRanksFromSplit(split);
    for (const [id, rank] of Object.entries(ranks)) {
      pts[id] = (pts[id] ?? 0) + (MEAF_SPLIT_PTS[rank - 1] ?? 0);
    }
  }
  return baseTeams
    .map(t => ({ ...t, wins: pts[t.clubId] ?? 0 }))
    .sort((a, b) => b.wins - a.wins);
}

function advanceMEAF(
  state: LeagueSimState,
  completed: Record<string, number>,
  target: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  const id = state.leagueId;
  let s: LeagueSimState = { ...state };

  if (s.standings.length === 0) {
    s = { ...s, standings: clubsByLeague(id).map(c => makeRecord(c, null)) };
  }

  const splitNames = ['split1', 'split2', 'split3', 'split4', 'split5'];

  // Splits 1–3
  for (let i = 0; i < 3; i++) {
    if ((s.meafSplits ?? [])[i]) continue;
    const sk = `${id}::${splitNames[i]}`;
    const c = completed[sk] ?? 0;
    const t = Math.min(target[sk] ?? c, MEAF_SPLIT_TOTAL);
    if (t > 0 || c > 0) {
      let po = s.playoffs ?? initNEUWEUPlayoffs(s.standings);
      if (t > c) {
        const poMap = new Map(s.standings.map(r => [r.clubId, r]));
        po = advanceMEAFSplitToSlot(po, c, t, meta, clubMap, poMap);
      }
      s = { ...s, playoffs: po, currentPhase: splitNames[i] };
    }
    const done = (target[sk] ?? 0) >= MEAF_SPLIT_TOTAL || (completed[sk] ?? 0) >= MEAF_SPLIT_TOTAL;
    if (done && s.playoffs) {
      const newSplits = [...(s.meafSplits ?? [])];
      newSplits[i] = s.playoffs;
      s = { ...s, meafSplits: newSplits, standings: meafComputeStandings(newSplits, s.standings), playoffs: undefined };
    } else {
      return s;
    }
  }

  // MM Qualifier
  const skMMQ = `${id}::mm_qualifier`;
  const cMMQ = completed[skMMQ] ?? 0;
  const tMMQ = Math.min(target[skMMQ] ?? cMMQ, MEAF_MMQ_TOTAL);
  if (tMMQ > 0 || cMMQ > 0) {
    let mmq = s.meafMMQual;
    if (!mmq) {
      const split3Champ = (s.meafSplits ?? [])[2]?.series.find(ser => ser.id === 'gf')?.winner ?? null;
      const sorted = [...s.standings].sort((a, b) => b.wins - a.wins);
      const top3 = sorted.slice(0, 3).map(r => r.clubId);
      if (split3Champ && !top3.includes(split3Champ)) top3[2] = split3Champ;
      mmq = initMEAFMMQual(top3);
    }
    if (tMMQ > cMMQ) {
      const poMap = new Map(s.standings.map(r => [r.clubId, r]));
      mmq = advanceMEAFMMQualToSlot(mmq, cMMQ, tMMQ, meta, clubMap, poMap);
    }
    s = { ...s, meafMMQual: mmq, currentPhase: mmq.completed ? 'mm_qualifier_done' : 'mm_qualifier' };
  }
  if (!s.meafMMQual?.completed) return s;

  // Splits 4–5
  for (let i = 3; i < 5; i++) {
    if ((s.meafSplits ?? [])[i]) continue;
    const sk = `${id}::${splitNames[i]}`;
    const c = completed[sk] ?? 0;
    const t = Math.min(target[sk] ?? c, MEAF_SPLIT_TOTAL);
    if (t > 0 || c > 0) {
      let po = s.playoffs ?? initNEUWEUPlayoffs(s.standings);
      if (t > c) {
        const poMap = new Map(s.standings.map(r => [r.clubId, r]));
        po = advanceMEAFSplitToSlot(po, c, t, meta, clubMap, poMap);
      }
      s = { ...s, playoffs: po, currentPhase: splitNames[i] };
    }
    const done = (target[sk] ?? 0) >= MEAF_SPLIT_TOTAL || (completed[sk] ?? 0) >= MEAF_SPLIT_TOTAL;
    if (done && s.playoffs) {
      const newSplits = [...(s.meafSplits ?? [])];
      newSplits[i] = s.playoffs;
      s = { ...s, meafSplits: newSplits, standings: meafComputeStandings(newSplits, s.standings), playoffs: undefined };
    } else {
      return s;
    }
  }

  // Final Playoff
  const skFP = `${id}::final_playoff`;
  const cFP = completed[skFP] ?? 0;
  const tFP = Math.min(target[skFP] ?? cFP, MEAF_FP_TOTAL);
  if (tFP > 0 || cFP > 0) {
    let po = s.playoffs;
    if (!po) {
      const allSplits = s.meafSplits ?? [];
      const split5Champ = allSplits[4]?.series.find(ser => ser.id === 'gf')?.winner ?? null;
      const sorted = [...s.standings].sort((a, b) => b.wins - a.wins);
      const top5 = sorted.slice(0, 5).map(r => r.clubId);
      if (split5Champ) {
        const idx = top5.indexOf(split5Champ);
        if (idx === -1) { top5.pop(); top5.unshift(split5Champ); }
        else if (idx > 0) { top5.splice(idx, 1); top5.unshift(split5Champ); }
      }
      const seedRecords = top5.map(
        tid => s.standings.find(r => r.clubId === tid) ?? makeRecord(clubMap.get(tid)!, null),
      );
      po = initTWJPPlayoffs(seedRecords);
    }
    if (tFP > cFP) {
      const poMap = new Map(s.standings.map(r => [r.clubId, r]));
      po = advanceTWJPPlayoffToSlot(po, cFP, tFP, meta, clubMap, poMap);
    }
    s = { ...s, playoffs: po, currentPhase: po.completed ? 'complete' : 'final_playoff' };
  }

  return s;
}

// ─── Generic advance ──────────────────────────────────────────────────────────

export function advanceLeagueToRound(
  state: LeagueSimState,
  completedMap: Record<string, number>,
  targetMap: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  const def = getLeagueScheduleDef(state.leagueId);
  if (def) {
    if (state.leagueId === 'L_NA') return advanceLNA(state, completedMap, targetMap, meta, clubMap);
    if (state.leagueId === 'L_CN') return advanceLCN(state, completedMap, targetMap, meta, clubMap);
    if (state.leagueId === 'L_KR') return advanceLKR(state, completedMap, targetMap, meta, clubMap);
    if (state.leagueId === 'L_NEU' || state.leagueId === 'L_WEU') return advanceNEUWEU(state, completedMap, targetMap, meta, clubMap);
    if (state.leagueId === 'L_TR') return advanceTR(state, completedMap, targetMap, meta, clubMap);
    if (state.leagueId === 'L_DE' || state.leagueId === 'L_EEU' || state.leagueId === 'L_SEU' || state.leagueId === 'L_RU') return advanceDE(state, completedMap, targetMap, meta, clubMap);
    if (state.leagueId === 'L_BR' || state.leagueId === 'L_SA') return advanceBRSA(state, completedMap, targetMap, meta, clubMap);
    if (state.leagueId === 'L_TW' || state.leagueId === 'L_JP') return advanceTWJP(state, completedMap, targetMap, meta, clubMap);
    if (state.leagueId === 'L_MEAF') return advanceMEAF(state, completedMap, targetMap, meta, clubMap);
  }

  const lc = leagueConfigs.find(l => l.id === state.leagueId)!;

  if (state.divisionStates) {
    const newDiv: Record<string, DivisionSim> = {};
    for (const [divId, divState] of Object.entries(state.divisionStates)) {
      const sk  = `${state.leagueId}::default::${divId}`;
      const sk2 = `${state.leagueId}::${divId}`;
      const c = completedMap[sk] ?? completedMap[sk2] ?? 0;
      const t = targetMap[sk]   ?? targetMap[sk2]   ?? c;
      const rounds = getSRRRounds(state.leagueId, divId);
      const { standings, results } = simulateRoundsForGroup(
        divState.standings, divState.results, c, t, meta, clubMap, rounds, divId,
      );
      newDiv[divId] = { divisionId: divId, standings, results };
    }
    return {
      leagueId: state.leagueId,
      standings: (lc.divisions ?? []).flatMap(d => newDiv[d]?.standings ?? []),
      results: Object.values(newDiv).flatMap(d => d.results),
      divisionStates: newDiv,
      currentPhase: 'default',
    };
  }

  const sk = state.leagueId;
  const c = completedMap[sk] ?? 0;
  const t = targetMap[sk]   ?? c;
  const rounds = getSRRRounds(state.leagueId, null);
  const { standings, results } = simulateRoundsForGroup(
    state.standings, state.results, c, t, meta, clubMap, rounds, null,
  );
  return { leagueId: state.leagueId, standings, results, currentPhase: 'default' };
}
