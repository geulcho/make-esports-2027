import { leagueConfigs, clubsByLeague, clubsByDivision } from '../data/clubs';
import { addDays, SEASON_START, SEASON_LENGTH_DAYS, getSeasonIndex, getCurrentSeasonStart, isLeagueMatchDay } from './calendar';
import { generateSRR } from './schedule';
import { getLeagueScheduleDef, targetRoundsFromSlots } from './leagueScheduleDefs';

// ─── Per-league generic match day patterns (0=Mon … 6=Sun) ───────────────────
// Used only for leagues WITHOUT an explicit LeagueScheduleDef
export const LEAGUE_MATCH_DAYS: Record<string, number[]> = {
  L_KR:   [1, 2, 3, 4, 5, 6],
  L_CN:   [1, 3, 5, 6],
  L_NEU:  [0, 1, 2, 3],
  L_WEU:  [1, 2, 3, 4],
  L_DE:   [1, 3, 5],
  L_EEU:  [2, 4, 6],
  L_SEU:  [0, 3, 6],
  L_RU:   [1, 3, 5],
  L_TR:   [4, 5, 6],
  L_MEAF: [5, 6],
  L_SEA:  [3, 5, 6],
  L_TW:   [5, 6],
  L_JP:   [6, 0],
  L_BR:   [3, 5, 6],
  L_SA:   [4, 6],
};

const FALLBACK_DAYS = [5, 6];

// ─── SimKey ────────────────────────────────────────────────────────────────────
// Represents one "simulation unit" — one SRR (or DRR phase) to track separately.

export interface SimKey {
  leagueId: string;
  phaseId: string;           // 'default' for generic, 'first_half'/'second_half' for scheduled
  divisionId: string | null; // null for full-league or non-division
  storeKey: string;          // unique string for completedRounds Record
}

function makeStoreKey(leagueId: string, phaseId: string, divisionId: string | null): string {
  if (phaseId === 'default') return divisionId ? `${leagueId}::${divisionId}` : leagueId;
  return divisionId ? `${leagueId}::${phaseId}::${divisionId}` : `${leagueId}::${phaseId}`;
}

export function allSimKeys(): SimKey[] {
  const keys: SimKey[] = [];

  for (const lc of leagueConfigs) {
    const clubs = clubsByLeague(lc.id);
    if (clubs.length < 2) continue;

    const def = getLeagueScheduleDef(lc.id);
    if (def) {
      // Emit one key per phase×scope combination
      for (const phase of def.phases) {
        if (phase.scope === 'division' && lc.divisions) {
          for (const divId of lc.divisions) {
            keys.push({
              leagueId: lc.id,
              phaseId: phase.id,
              divisionId: divId,
              storeKey: makeStoreKey(lc.id, phase.id, divId),
            });
          }
        } else {
          // full_league and bracket phases: single key, no division
          keys.push({
            leagueId: lc.id,
            phaseId: phase.id,
            divisionId: null,
            storeKey: makeStoreKey(lc.id, phase.id, null),
          });
        }
      }
    } else {
      // Generic: emit per-division or single key
      if (lc.divisions && lc.divisions.length > 0) {
        for (const divId of lc.divisions) {
          keys.push({
            leagueId: lc.id,
            phaseId: 'default',
            divisionId: divId,
            storeKey: makeStoreKey(lc.id, 'default', divId),
          });
        }
      } else {
        keys.push({
          leagueId: lc.id,
          phaseId: 'default',
          divisionId: null,
          storeKey: makeStoreKey(lc.id, 'default', null),
        });
      }
    }
  }

  return keys;
}

// ─── SRR / DRR round cache ────────────────────────────────────────────────────

const _srrCache = new Map<string, [string, string][][]>();

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

/** DRR = SRR twice (home/away semantics; same matchups repeated) */
export function getDRRRounds(leagueId: string, divisionId: string | null): [string, string][][] {
  const srr = getSRRRounds(leagueId, divisionId);
  return [...srr, ...srr];
}

// ─── L_CN combined round schedule ────────────────────────────────────────────
// 22 rounds per half: R1-14 divisional (Dragon||Phoenix, 8 matches/round),
//                     R15-22 cross-division SRR (Dragon vs Phoenix, 8 matches/round)

const _lcnHalfCache: [string, string][][] | null = null;
let _lcnHalfRounds: [string, string][][] | null = null;

export function getLCNHalfRounds(): [string, string][][] {
  if (_lcnHalfRounds) return _lcnHalfRounds;

  const dragonRounds  = getDRRRounds('L_CN', 'DRAGON');  // 14 rounds × 4 matches
  const phoenixRounds = getDRRRounds('L_CN', 'PHOENIX'); // 14 rounds × 4 matches

  // Combine divisional rounds: each round has 4 Dragon + 4 Phoenix matches
  const divisional: [string, string][][] = dragonRounds.map((dr, i) => [
    ...dr,
    ...(phoenixRounds[i] ?? []),
  ]);

  // Cross-division SRR: Dragon[i] vs Phoenix[(i+r) % 8] for round r
  const dragon  = clubsByDivision('L_CN', 'DRAGON').map(c => c.id);
  const phoenix = clubsByDivision('L_CN', 'PHOENIX').map(c => c.id);
  const crossDiv: [string, string][][] = Array.from({ length: 8 }, (_, r) =>
    dragon.map<[string, string]>((d, i) => [d, phoenix[(i + r) % phoenix.length]])
  );

  _lcnHalfRounds = [...divisional, ...crossDiv];
  return _lcnHalfRounds;
}

// ─── L_KR per-day round schedule ─────────────────────────────────────────────
// Single venue: 2-3 matches per day. DRR flat match list chunked into daily groups.
// Spring: 59 groups (132 matches), Summer: 58 groups (132 matches).

// Match counts per day, in slot order matching L_KR_SPRING_SLOTS / L_KR_SUMMER_SLOTS
const L_KR_SPRING_PATTERN = [
  2,2,2,1,3,3, // W1  (13)
  2,2,2,1,3,3, // W2  (13)
  2,2,2,1,3,3, // W3  (13)
  2,2,2,1,3,3, // W4  (13)
  2,2,3,3,     // W5  cup (10)
  2,2,2,1,3,3, // W6  (13)
  2,2,3,3,     // W9  cup (10)
  2,2,2,1,3,3, // W10 (13)
  2,2,3,3,     // W11 cup (10)
  2,2,2,3,3,   // W12 (12)
  2,2,2,2,2,2, // W13 (12)
];

const L_KR_SUMMER_PATTERN = [
  2,2,2,2,3,3, // W21 (14)
  2,2,3,3,     // W22 cup (10)
  2,2,2,1,3,3, // W23 (13)
  2,2,3,3,     // W24 cup (10)
  2,2,2,2,3,3, // W27 (14)
  2,2,3,3,     // W28 cup (10)
  2,2,2,1,3,3, // W29 (13)
  2,2,3,3,     // W30 cup (10)
  2,2,2,1,3,3, // W33 (13)
  2,2,2,1,3,3, // W34 (13)
  2,2,2,2,2,2, // W35 (12)
];

let _lkrSpringRounds: [string, string][][] | null = null;
let _lkrSummerRounds: [string, string][][] | null = null;

function buildLKRRounds(pattern: number[]): [string, string][][] {
  const flat = getDRRRounds('L_KR', null).flat();
  const rounds: [string, string][][] = [];
  let idx = 0;
  for (const count of pattern) {
    rounds.push(flat.slice(idx, idx + count) as [string, string][]);
    idx += count;
  }
  return rounds;
}

export function getLKRSpringRounds(): [string, string][][] {
  if (_lkrSpringRounds) return _lkrSpringRounds;
  _lkrSpringRounds = buildLKRRounds(L_KR_SPRING_PATTERN);
  return _lkrSpringRounds;
}

export function getLKRSummerRounds(): [string, string][][] {
  if (_lkrSummerRounds) return _lkrSummerRounds;
  _lkrSummerRounds = buildLKRRounds(L_KR_SUMMER_PATTERN);
  return _lkrSummerRounds;
}

// ─── Target round calculation ─────────────────────────────────────────────────

function getElapsedMatchDays(leagueId: string, targetDate: string): number {
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

function genericTotalRounds(leagueId: string, divisionId: string | null): number {
  return getSRRRounds(leagueId, divisionId).length;
}

export function targetRoundsForKey(key: SimKey, targetDate: string): number {
  const def = getLeagueScheduleDef(key.leagueId);

  if (def) {
    const phase = def.phases.find(p => p.id === key.phaseId);
    if (!phase) return 0;
    const seasonStart = getCurrentSeasonStart(targetDate);
    return targetRoundsFromSlots(phase.slots, seasonStart, targetDate);
  }

  // Generic fallback
  const elapsed = getElapsedMatchDays(key.leagueId, targetDate);
  const total = genericTotalRounds(key.leagueId, key.divisionId);
  return Math.min(elapsed, total);
}
