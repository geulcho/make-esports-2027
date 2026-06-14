export const SEASON_START = '2038-01-07'; // Monday of Season 1, Week 1
export const SEASON_LENGTH_WEEKS = 52;
export const SEASON_LENGTH_DAYS = SEASON_LENGTH_WEEKS * 7; // 364

export type WeekEventType =
  | 'regional'
  | 'intermatch'
  | 'mm'
  | 'wt'
  | 'we'
  | 'break'
  | 'offseason';

export interface WeekInfo {
  weekNum: number;   // 1–52, within-season
  season: number;    // 1-based season year
  type: WeekEventType;
  label: string;
  isInternational: boolean;
  hasRegionalMatches: boolean;
}

// Season-relative week definitions (repeat every 52 weeks)
const SPECIAL_WEEKS: Record<number, Omit<WeekInfo, 'weekNum' | 'season'>> = {
  7:  { type: 'intermatch', label: 'Intermatch 1',     isInternational: false, hasRegionalMatches: false },
  8:  { type: 'intermatch', label: 'Intermatch 1',     isInternational: false, hasRegionalMatches: false },
  16: { type: 'break',      label: 'MM Arrival',       isInternational: false, hasRegionalMatches: false },
  17: { type: 'mm',         label: 'MM Swiss Stage',   isInternational: true,  hasRegionalMatches: false },
  18: { type: 'mm',         label: 'MM Quarterfinals', isInternational: true,  hasRegionalMatches: false },
  19: { type: 'mm',         label: 'MM Finals',        isInternational: true,  hasRegionalMatches: false },
  20: { type: 'break',      label: 'MM Recovery',      isInternational: false, hasRegionalMatches: false },
  25: { type: 'intermatch', label: 'Intermatch 2',     isInternational: false, hasRegionalMatches: false },
  26: { type: 'intermatch', label: 'Intermatch 2',     isInternational: false, hasRegionalMatches: false },
  31: { type: 'intermatch', label: 'Intermatch 3',     isInternational: false, hasRegionalMatches: false },
  32: { type: 'intermatch', label: 'Intermatch 3',     isInternational: false, hasRegionalMatches: false },
  38: { type: 'break',      label: 'WT Preparation',   isInternational: false, hasRegionalMatches: false },
  39: { type: 'wt',         label: 'WT Groups W1',     isInternational: true,  hasRegionalMatches: false },
  40: { type: 'wt',         label: 'WT Groups W2',     isInternational: true,  hasRegionalMatches: false },
  41: { type: 'wt',         label: 'WT Round of 16',   isInternational: true,  hasRegionalMatches: false },
  42: { type: 'wt',         label: 'WT Quarterfinals', isInternational: true,  hasRegionalMatches: false },
  43: { type: 'wt',         label: 'WT Finals',        isInternational: true,  hasRegionalMatches: false },
  44: { type: 'break',      label: 'WE Preparation',   isInternational: false, hasRegionalMatches: false },
  45: { type: 'we',         label: 'WE Group Stage',   isInternational: true,  hasRegionalMatches: false },
  46: { type: 'we',         label: 'WE Group Stage',   isInternational: true,  hasRegionalMatches: false },
  47: { type: 'we',         label: 'WE Quarterfinals', isInternational: true,  hasRegionalMatches: false },
  48: { type: 'we',         label: 'WE Finals',        isInternational: true,  hasRegionalMatches: false },
  49: { type: 'offseason',  label: 'Off Season',       isInternational: false, hasRegionalMatches: false },
  50: { type: 'offseason',  label: 'Off Season',       isInternational: false, hasRegionalMatches: false },
  51: { type: 'offseason',  label: 'Off Season',       isInternational: false, hasRegionalMatches: false },
  52: { type: 'offseason',  label: 'Off Season',       isInternational: false, hasRegionalMatches: false },
};

// Cup blackout weeks: Mon/Tue/Wed blocked for regional leagues
const CUP_BLACKOUT_WEEKS = new Set([5, 9, 11, 22, 24, 28, 30]);

// ─── Date math ────────────────────────────────────────────────────────────────

export function addDays(date: string, n: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

// 0=Mon … 6=Sun
export function getDayOfWeek(date: string): number {
  return (new Date(date).getDay() + 6) % 7;
}

// ─── Season-relative helpers ───────────────────────────────────────────────────

/** Total days elapsed since SEASON_START (can exceed 364 for multi-season) */
function totalDaysFromStart(date: string): number {
  return daysBetween(SEASON_START, date);
}

/** 0-based season index (0 = first season, 1 = second season, …) */
export function getSeasonIndex(date: string): number {
  const d = totalDaysFromStart(date);
  return d < 0 ? 0 : Math.floor(d / SEASON_LENGTH_DAYS);
}

/** 1-based season year */
export function getSeasonYear(date: string): number {
  return getSeasonIndex(date) + 1;
}

/** 1–52 within-season week (repeats every 364 days) */
export function getWeekNum(date: string): number {
  const d = totalDaysFromStart(date);
  if (d < 0) return 0;
  return Math.floor((d % SEASON_LENGTH_DAYS) / 7) + 1;
}

/** Full WeekInfo for any date, repeating correctly across seasons */
export function getWeekInfo(date: string): WeekInfo {
  const weekNum = getWeekNum(date);
  const season = getSeasonYear(date);
  const special = SPECIAL_WEEKS[weekNum];
  if (special) return { weekNum, season, ...special };
  return {
    weekNum, season,
    type: 'regional',
    label: 'Regional Leagues',
    isInternational: false,
    hasRegionalMatches: true,
  };
}

/** Monday that started the current season */
export function getCurrentSeasonStart(date: string): string {
  const idx = getSeasonIndex(date);
  return addDays(SEASON_START, idx * SEASON_LENGTH_DAYS);
}

// ─── Match-day logic ──────────────────────────────────────────────────────────

/** Whether a given date is a valid match day for the specified league */
export function isLeagueMatchDay(
  _leagueId: string,
  date: string,
  matchDays: number[],
): boolean {
  const info = getWeekInfo(date);
  if (!info.hasRegionalMatches) return false;
  const dow = getDayOfWeek(date);
  // Cup blackout: Mon(0)/Tue(1)/Wed(2) blocked in blackout weeks
  if (CUP_BLACKOUT_WEEKS.has(info.weekNum) && dow <= 2) return false;
  return matchDays.includes(dow);
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

/** Next Monday strictly after `date` */
export function getNextMonday(date: string): string {
  const dow = getDayOfWeek(date);
  const daysUntil = dow === 0 ? 7 : 7 - dow;
  return addDays(date, daysUntil);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
