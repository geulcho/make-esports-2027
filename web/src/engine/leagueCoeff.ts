import type { LeagueSimState } from '../types';

export interface LeagueCoeffEntry {
  leagueId: string;
  avgElo: number;
  top4Sum: number;
  points: number;
  rank: number;
}

export function computeLeagueCoefficients(
  leagueStates: Record<string, LeagueSimState>,
): LeagueCoeffEntry[] {
  const results: Array<Omit<LeagueCoeffEntry, 'rank'>> = [];

  for (const [leagueId, state] of Object.entries(leagueStates)) {
    const elos = state.standings.map(r => r.elo).sort((a, b) => b - a);
    if (elos.length === 0) continue;
    const avgElo = elos.reduce((s, e) => s + e, 0) / elos.length;
    const top4Sum = elos.slice(0, 4).reduce((s, e) => s + e, 0);
    results.push({ leagueId, avgElo: Math.round(avgElo), top4Sum: Math.round(top4Sum), points: Math.round(avgElo + top4Sum) });
  }

  results.sort((a, b) => b.points - a.points);
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function wtSlotsForRank(rank: number): number {
  if (rank <= 4) return 3;
  if (rank <= 8) return 2;
  return 1;
}

export function seedPoolForTeam(
  leagueRank: number,
  teamSeedInLeague: number,
  isSpecialChampion: boolean,
): number {
  if (leagueRank <= 8 && teamSeedInLeague === 1) return 1;
  if (leagueRank <= 8 && teamSeedInLeague === 2) return 2;
  if (leagueRank >= 9 && teamSeedInLeague === 1) return 3;
  if (isSpecialChampion) return 4;
  if (leagueRank <= 4 && teamSeedInLeague === 3) return 4;
  return 4;
}
