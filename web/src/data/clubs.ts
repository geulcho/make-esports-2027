import type { Club, LeagueConfig } from '../types';
import clubsRaw from './clubs_database.json';

export const allClubs: Club[] = (clubsRaw as { clubs: Club[] }).clubs;

export const leagueConfigs: LeagueConfig[] = [
  // APAC
  { id: 'L_KR',   name: 'KR League',    region: 'APAC' },
  { id: 'L_CN',   name: 'CN League',    region: 'APAC', divisions: ['DRAGON', 'PHOENIX'] },
  { id: 'L_TW',   name: 'TW League',    region: 'APAC' },
  { id: 'L_JP',   name: 'JP League',    region: 'APAC' },
  { id: 'L_SEA',  name: 'SEA League',   region: 'APAC' },
  // EMEA
  { id: 'L_NEU',  name: 'N.EU League',  region: 'EMEA' },
  { id: 'L_WEU',  name: 'W.EU League',  region: 'EMEA' },
  { id: 'L_DE',   name: 'DE League',    region: 'EMEA' },
  { id: 'L_EEU',  name: 'E.EU League',  region: 'EMEA' },
  { id: 'L_SEU',  name: 'S.EU League',  region: 'EMEA' },
  { id: 'L_RU',   name: 'RU League',    region: 'EMEA' },
  { id: 'L_TR',   name: 'TR League',    region: 'EMEA' },
  { id: 'L_MEAF', name: 'MEAF League',  region: 'EMEA' },
  // AMER
  { id: 'L_NA',   name: 'NA League',    region: 'AMER', divisions: ['EAST', 'WEST'] },
  { id: 'L_BR',   name: 'BR League',    region: 'AMER' },
  { id: 'L_SA',   name: 'SA League',    region: 'AMER' },
].map(l => ({
  ...l,
  teamCount: allClubs.filter(c => c.league_id === l.id).length,
}));

export function clubsByLeague(leagueId: string): Club[] {
  return allClubs.filter(c => c.league_id === leagueId);
}

export function clubsByDivision(leagueId: string, divisionId: string): Club[] {
  return allClubs.filter(c => c.league_id === leagueId && c.division === divisionId);
}

export function clubById(id: string): Club | undefined {
  return allClubs.find(c => c.id === id);
}

export function leagueConfigById(id: string): LeagueConfig | undefined {
  return leagueConfigs.find(l => l.id === id);
}

export const featuredLeagues = ['L_KR', 'L_NEU', 'L_SEA', 'L_BR'];
