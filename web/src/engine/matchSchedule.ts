import { leagueConfigs, clubsByLeague, clubsByDivision } from '../data/clubs';
import {
  addDays, SEASON_START, SEASON_LENGTH_DAYS,
  isLeagueMatchDay, getSeasonIndex,
} from './calendar';
import { generateSRR } from './schedule';

// ─── Per-league match day patterns (0=Mon … 6=Sun) ────────────────────────────
// Based on each league's broadcast schedule from PRDs
export const LEAGUE_MATCH_DAYS: Record<string, number[]> = {
  L_KR:   [1, 2, 3, 4, 5, 6],   // Tue–Sun
  L_CN:   [1, 3, 5, 6],          // Tue, Thu, Sat, Sun
  L_NA:   [4, 5, 6, 0],          // Fri, Sat, Sun, Mon
  L_NEU:  [0, 1, 2, 3],          // Mon–Thu  (Bo1 format, daily)
  L_WEU:  [1, 2, 3, 4],          // Tue–Fri  (Bo1 format, daily)
  L_DE:   [1, 3, 5],             // Tue, Thu, Sat
  L_EEU:  [2, 4, 6],             // Wed, Fri, Sun
  L_SEU:  [0, 3, 6],             // Mon, Thu, Sun
  L_RU:   [1, 3, 5],             // Tue, Thu, Sat
  L_TR:   [4, 5, 6],             // Fri, Sat, Sun
  L_MEAF: [5, 6],                // Sat, Sun
  L_SEA:  [3, 5, 6],             // Thu, Sat, Sun
  L_TW:   [5, 6],                // Sat, Sun
  L_JP:   [6, 0],                // Sun, Mon
  L_BR:   [3, 5, 6],             // Thu, Sat, Sun
  L_SA:   [4, 6],                // Fri, Sun
};

const FALLBACK_DAYS = [5, 6]; // Sat, Sun

// ─── SRR round cache (deterministic for a given team list) ────────────────────
const _srrCache = new Map<string, [string, string][][]>();

/** Returns pre-computed, stable SRR rounds for a league/division (cached) */
export function getSRRRounds(leagueId: string, divisionId: string | null): [string, string][][] {
  const key = divisionId ? `${leagueId}::${divisionId}` : leagueId;
  if (_srrCache.has(key)) return _srrCache.get(key)!;
  const teamIds = divisionId
    ? clubsByDivision(leagueId, divisionId).map(c => c.id)
    : clubsByLeague(leagueId).map(c => c.id);
  const rounds = generateSRR(teamIds);
  _srrCache.set(key, rounds);
  return rounds;
}

// ─── How many match-day slots have elapsed by a given date? ───────────────────
// Searches within the current season only (since rounds reset each season).
// Returns the 0-based count of match days for `leagueId` up to (and including) `targetDate`.

export function getElapsedMatchDays(
  leagueId: string,
  targetDate: string,
): number {
  const matchDays = LEAGUE_MATCH_DAYS[leagueId] ?? FALLBACK_DAYS;
  const seasonIdx = getSeasonIndex(targetDate);
  const seasonStart = addDays(SEASON_START, seasonIdx * SEASON_LENGTH_DAYS);

  let count = 0;
  for (let d = 0; d < SEASON_LENGTH_DAYS; d++) {
    const date = addDays(seasonStart, d);
    if (date > targetDate) break;
    if (isLeagueMatchDay(leagueId, date, matchDays)) count++;
  }
  return count;
}

/** Total SRR rounds for a league (or division) */
export function getTotalRounds(leagueId: string, divisionId: string | null): number {
  return getSRRRounds(leagueId, divisionId).length;
}

/** Rounds that should be complete by `targetDate` (capped by total rounds) */
export function targetRoundsForDate(
  leagueId: string,
  divisionId: string | null,
  targetDate: string,
): number {
  const elapsed = getElapsedMatchDays(leagueId, targetDate);
  const total = getTotalRounds(leagueId, divisionId);
  return Math.min(elapsed, total);
}

// ─── Convenience: list all active league+division keys ────────────────────────
export interface LeagueDivKey {
  leagueId: string;
  divisionId: string | null;
}

export function allLeagueDivKeys(): LeagueDivKey[] {
  const keys: LeagueDivKey[] = [];
  for (const lc of leagueConfigs) {
    const clubs = clubsByLeague(lc.id);
    if (clubs.length < 2) continue;
    if (lc.divisions && lc.divisions.length > 0) {
      for (const divId of lc.divisions) {
        keys.push({ leagueId: lc.id, divisionId: divId });
      }
    } else {
      keys.push({ leagueId: lc.id, divisionId: null });
    }
  }
  return keys;
}

/** Composite key for storing rounds completed */
export function roundKey(leagueId: string, divisionId: string | null): string {
  return divisionId ? `${leagueId}::${divisionId}` : leagueId;
}
