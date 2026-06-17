import type { NationalTeam } from '../types';
import nationsRaw from './nat_database.json';

export const allNations: NationalTeam[] = (nationsRaw as { teams: NationalTeam[] }).teams;

// ─── Americas sub-region mapping ──────────────────────────────────────────────

const NA_IDS = new Set([
  'NAT_USA', 'NAT_CAN', 'NAT_MEX', 'NAT_PUE', 'NAT_COS', 'NAT_PAN', 'NAT_DOM', 'NAT_WIN',
]);
const SA_IDS = new Set([
  'NAT_BRA', 'NAT_ARG', 'NAT_CHI', 'NAT_URU', 'NAT_PAR', 'NAT_PER', 'NAT_ECU', 'NAT_COL', 'NAT_VEN',
]);

export type AmericasSub = 'NA' | 'SA';

export function getAmericasSub(nationId: string): AmericasSub | null {
  if (NA_IDS.has(nationId)) return 'NA';
  if (SA_IDS.has(nationId)) return 'SA';
  return null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function nationById(id: string): NationalTeam | undefined {
  return allNations.find(n => n.id === id);
}

export function nationsByRegion(region: string): NationalTeam[] {
  return allNations.filter(n => n.region === region);
}

export function nationsByAmericasSub(sub: AmericasSub): NationalTeam[] {
  const ids = sub === 'NA' ? NA_IDS : SA_IDS;
  return allNations.filter(n => ids.has(n.id));
}

export function nationsSortedByElo(): NationalTeam[] {
  return [...allNations].sort((a, b) => b.elo_rating - a.elo_rating);
}

export function regionLabel(region: string): string {
  const labels: Record<string, string> = {
    EU: 'Europe', APAC: 'Asia-Pacific', AMERICA: 'Americas', MEAF: 'Middle East & Africa',
  };
  return labels[region] ?? region;
}
