import type {
  Club, DivisionSim, LeagueSimState, PhaseResult, TeamRecord,
} from '../types';
import { clubsByLeague, clubsByDivision, leagueConfigs } from '../data/clubs';
import { simulateMatch } from './combat';
import { getSRRRounds } from './matchSchedule';

export function pickMeta(): string[] {
  const combos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  return [...combos].sort(() => Math.random() - 0.5).slice(0, 2);
}

function makeRecord(club: Club, divisionId: string | null): TeamRecord {
  return {
    clubId: club.id,
    divisionId,
    elo: club.elo_rating,
    wins: 0, losses: 0,
    setsFor: 0, setsAgainst: 0,
    momFor: 0, momAgainst: 0,
  };
}

function sortStandings(standings: TeamRecord[]): TeamRecord[] {
  return [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const sdA = a.setsFor - a.setsAgainst;
    const sdB = b.setsFor - b.setsAgainst;
    if (sdB !== sdA) return sdB - sdA;
    return (b.momFor - b.momAgainst) - (a.momFor - a.momAgainst);
  });
}

function initDivisionSim(clubs: Club[], divisionId: string): DivisionSim {
  return {
    divisionId,
    standings: clubs.map(c => makeRecord(c, divisionId)),
    results: [],
  };
}

export function initLeagueState(leagueId: string): LeagueSimState {
  const lc = leagueConfigs.find(l => l.id === leagueId)!;
  const clubs = clubsByLeague(leagueId);

  if (lc.divisions && lc.divisions.length > 0) {
    const divisionStates: Record<string, DivisionSim> = {};
    for (const divId of lc.divisions) {
      const divClubs = clubsByDivision(leagueId, divId);
      divisionStates[divId] = initDivisionSim(divClubs, divId);
    }
    const combined = lc.divisions.flatMap(d => divisionStates[d].standings);
    return { leagueId, standings: combined, results: [], divisionStates };
  }

  return {
    leagueId,
    standings: clubs.map(c => makeRecord(c, null)),
    results: [],
  };
}

export function initAllLeagues(): Record<string, LeagueSimState> {
  const states: Record<string, LeagueSimState> = {};
  for (const lc of leagueConfigs) {
    const clubs = clubsByLeague(lc.id);
    if (clubs.length < 2) continue;
    states[lc.id] = initLeagueState(lc.id);
  }
  return states;
}

// ─── Round-based simulation ───────────────────────────────────────────────────

/**
 * Simulate specific rounds (by 0-based index) for a group of teams.
 * `completedRounds` = how many rounds were already played before this call.
 * `targetRounds`    = how many rounds should be completed after this call.
 */
function simulateRoundsForGroup(
  standings: TeamRecord[],
  existingResults: PhaseResult[],
  completedRounds: number,
  targetRounds: number,
  meta: string[],
  clubMap: Map<string, Club>,
  leagueId: string,
  divisionId: string | null,
): { standings: TeamRecord[]; results: PhaseResult[] } {
  if (targetRounds <= completedRounds) return { standings, results: existingResults };

  const allRounds = getSRRRounds(leagueId, divisionId);
  const newStandings = standings.map(s => ({ ...s }));
  const standingMap = new Map(newStandings.map(s => [s.clubId, s]));
  const newResults = [...existingResults];

  for (let ri = completedRounds; ri < targetRounds; ri++) {
    const round = allRounds[ri];
    if (!round) break;

    const roundMatches = [];
    for (const [idA, idB] of round) {
      const clubA = clubMap.get(idA);
      const clubB = clubMap.get(idB);
      if (!clubA || !clubB) continue;

      const recA = standingMap.get(idA)!;
      const recB = standingMap.get(idB)!;

      const ca = { ...clubA, elo_rating: recA.elo };
      const cb = { ...clubB, elo_rating: recB.elo };
      const match = simulateMatch(ca, cb, meta);
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
      newResults.push({
        phase: ri + 1,
        splitNum: 1,
        divisionId,
        matches: roundMatches,
      });
    }
  }

  return { standings: sortStandings(newStandings), results: newResults };
}

/**
 * Advance a league to exactly `targetRounds` completed rounds.
 * Pass `completedRoundsMap` to know current progress per division.
 */
export function advanceLeagueToRound(
  state: LeagueSimState,
  completedRoundsMap: Record<string, number>,
  targetRoundsMap: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): LeagueSimState {
  const lc = leagueConfigs.find(l => l.id === state.leagueId)!;

  if (state.divisionStates) {
    const newDivStates: Record<string, DivisionSim> = {};

    for (const [divId, divState] of Object.entries(state.divisionStates)) {
      const key = `${state.leagueId}::${divId}`;
      const completed = completedRoundsMap[key] ?? 0;
      const target = targetRoundsMap[key] ?? completed;

      const { standings, results } = simulateRoundsForGroup(
        divState.standings,
        divState.results,
        completed,
        target,
        meta,
        clubMap,
        state.leagueId,
        divId,
      );
      newDivStates[divId] = { divisionId: divId, standings, results };
    }

    const combined = (lc.divisions ?? []).flatMap(d => newDivStates[d].standings);
    const allResults = (lc.divisions ?? []).flatMap(d => newDivStates[d].results);

    return {
      leagueId: state.leagueId,
      standings: combined,
      results: allResults,
      divisionStates: newDivStates,
    };
  }

  // Non-division league
  const key = state.leagueId;
  const completed = completedRoundsMap[key] ?? 0;
  const target = targetRoundsMap[key] ?? completed;

  const { standings, results } = simulateRoundsForGroup(
    state.standings,
    state.results,
    completed,
    target,
    meta,
    clubMap,
    state.leagueId,
    null,
  );
  return { leagueId: state.leagueId, standings, results };
}
