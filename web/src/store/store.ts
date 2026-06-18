import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LeagueSimState, SeasonHistoryEntry, CupState, MMState, IntermatchState } from '../types';
import { allClubs } from '../data/clubs';
import { initAllLeagues, advanceLeagueToRound, pickMeta } from '../engine/simulator';
import { addDays, getNextMonday, getWeekInfo, getWeekNum, getSeasonIndex, getCurrentSeasonStart } from '../engine/calendar';
import { allSimKeys, targetRoundsForKey } from '../engine/matchSchedule';
import { initAllCups, advanceCup, allCupSimKeys, targetSlotsForCupKey } from '../engine/cup';
import { initMM, refreshMMState, advanceMMSingleMatch as simMMMatch, autoAdvanceMM } from '../engine/mm';
import { initIntermatch, autoAdvanceIntermatch } from '../engine/intermatch';

const clubMap = new Map(allClubs.map(c => [c.id, c]));

function metaPeriod(date: string): number {
  const season = getSeasonIndex(date);
  const week = getWeekNum(date);
  return season * 26 + Math.floor((week - 1) / 2);
}

interface Store {
  gameDate: string;
  activeMeta: string[];
  leagueStates: Record<string, LeagueSimState>;
  completedRounds: Record<string, number>;
  seasonHistory: SeasonHistoryEntry[];
  cupStates: Record<string, CupState>;
  mmState: MMState;
  intermatchState: IntermatchState;
  followedTeams: string[];
  followedLeagues: string[];
  advanceOneDay: () => void;
  advanceThreeDays: () => void;
  advanceToNextMonday: () => void;
  resetSeason: () => void;
  toggleFollowTeam: (id: string) => void;
  toggleFollowLeague: (id: string) => void;
  advanceMMMatch: (matchId: string) => void;
}

const INITIAL_DATE = '2038-01-07';

const defaultState = () => ({
  gameDate: INITIAL_DATE,
  activeMeta: ['A', 'B'] as string[],
  leagueStates: initAllLeagues(),
  completedRounds: {} as Record<string, number>,
  seasonHistory: [] as SeasonHistoryEntry[],
  cupStates: initAllCups([], 0, clubMap),
  mmState: initMM(0),
  intermatchState: initIntermatch(0),
  followedTeams: [] as string[],
  followedLeagues: [] as string[],
});

function advanceTo(
  currentDate: string,
  targetDate: string,
  leagueStates: Record<string, LeagueSimState>,
  completedRounds: Record<string, number>,
  currentMeta: string[],
  seasonHistory: SeasonHistoryEntry[],
  cupStates: Record<string, CupState>,
  mmState: MMState,
  intermatchState: IntermatchState,
) {
  if (targetDate <= currentDate) {
    return { leagueStates, completedRounds, activeMeta: currentMeta, seasonHistory, cupStates, mmState, intermatchState };
  }

  let ls = leagueStates;
  let cr = completedRounds;
  let sh = seasonHistory;
  let cups = cupStates;
  let mm = mmState;
  let im = intermatchState;

  // Season rollover
  const currentSeason = getSeasonIndex(currentDate);
  const targetSeason  = getSeasonIndex(targetDate);
  if (targetSeason > currentSeason) {
    const newHistory: SeasonHistoryEntry[] = [...sh];
    for (const [leagueId, state] of Object.entries(ls)) {
      newHistory.push({
        season: currentSeason,
        leagueId,
        finalStandings: [...state.standings],
        mmRepresentative: state.mmQualifier?.mmRepresentative ?? null,
        champion: state.playoffs?.champion ?? null,
      });
    }
    sh = newHistory;
    ls = initAllLeagues();
    cr = {};
    cups = initAllCups(sh, targetSeason, clubMap);
    mm = initMM(targetSeason);
    const prevNatElos = im.nationElos;
    im = initIntermatch(targetSeason, prevNatElos);
  }

  const meta = metaPeriod(targetDate) !== metaPeriod(currentDate) ? pickMeta() : currentMeta;

  // League advancement
  const keys = allSimKeys();
  const targetRoundsMap: Record<string, number> = {};
  for (const key of keys) {
    targetRoundsMap[key.storeKey] = targetRoundsForKey(key, targetDate);
  }

  const newLeagueStates: Record<string, LeagueSimState> = {};
  for (const [leagueId, state] of Object.entries(ls)) {
    newLeagueStates[leagueId] = advanceLeagueToRound(state, cr, targetRoundsMap, meta, clubMap);
  }

  // Cup advancement
  const cupKeys = allCupSimKeys();
  const targetCupRoundsMap: Record<string, number> = {};
  for (const key of cupKeys) {
    targetCupRoundsMap[key.storeKey] = targetSlotsForCupKey(key.storeKey, targetDate);
  }

  const newCupStates: Record<string, CupState> = {};
  for (const [cupId, cupState] of Object.entries(cups)) {
    newCupStates[cupId] = advanceCup(cupState, targetCupRoundsMap, meta, clubMap);
  }

  const newCompleted = { ...cr };
  for (const key of keys) {
    const t = targetRoundsMap[key.storeKey];
    if (t !== undefined) newCompleted[key.storeKey] = t;
  }
  for (const key of cupKeys) {
    const t = targetCupRoundsMap[key.storeKey];
    if (t !== undefined) newCompleted[key.storeKey] = t;
  }

  // MM: collect participants, then auto-sim past-due matches
  let newMM = refreshMMState(mm, newLeagueStates, targetDate, clubMap);
  const seasonStart = getCurrentSeasonStart(targetDate);
  newMM = autoAdvanceMM(newMM, targetDate, seasonStart, meta, clubMap);

  // Intermatch: auto-advance group stages & MEAF qualifiers
  const newIM = autoAdvanceIntermatch(im, targetDate, meta);

  return {
    leagueStates: newLeagueStates,
    completedRounds: newCompleted,
    activeMeta: meta,
    seasonHistory: sh,
    cupStates: newCupStates,
    mmState: newMM,
    intermatchState: newIM,
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...defaultState(),

      advanceOneDay() {
        const { gameDate, leagueStates, completedRounds, activeMeta, seasonHistory, cupStates, mmState, intermatchState } = get();
        const target = addDays(gameDate, 1);
        set({ gameDate: target, ...advanceTo(gameDate, target, leagueStates, completedRounds, activeMeta, seasonHistory, cupStates, mmState, intermatchState) });
      },

      advanceThreeDays() {
        const { gameDate, leagueStates, completedRounds, activeMeta, seasonHistory, cupStates, mmState, intermatchState } = get();
        const target = addDays(gameDate, 3);
        set({ gameDate: target, ...advanceTo(gameDate, target, leagueStates, completedRounds, activeMeta, seasonHistory, cupStates, mmState, intermatchState) });
      },

      advanceToNextMonday() {
        const { gameDate, leagueStates, completedRounds, activeMeta, seasonHistory, cupStates, mmState, intermatchState } = get();
        const target = getNextMonday(gameDate);
        set({ gameDate: target, ...advanceTo(gameDate, target, leagueStates, completedRounds, activeMeta, seasonHistory, cupStates, mmState, intermatchState) });
      },

      resetSeason() {
        set({ ...defaultState() });
      },

      toggleFollowTeam(id: string) {
        const { followedTeams } = get();
        set({
          followedTeams: followedTeams.includes(id)
            ? followedTeams.filter(t => t !== id)
            : [...followedTeams, id],
        });
      },

      toggleFollowLeague(id: string) {
        const { followedLeagues } = get();
        set({
          followedLeagues: followedLeagues.includes(id)
            ? followedLeagues.filter(l => l !== id)
            : [...followedLeagues, id],
        });
      },

      advanceMMMatch(matchId: string) {
        const { mmState, activeMeta } = get();
        const next = simMMMatch(mmState, matchId, activeMeta, clubMap);
        set({ mmState: next });
      },
    }),
    {
      name: 'make-esports-store-v20',
      partialize: state => ({
        gameDate: state.gameDate,
        activeMeta: state.activeMeta,
        leagueStates: state.leagueStates,
        completedRounds: state.completedRounds,
        seasonHistory: state.seasonHistory,
        cupStates: state.cupStates,
        mmState: state.mmState,
        intermatchState: state.intermatchState,
        followedTeams: state.followedTeams,
        followedLeagues: state.followedLeagues,
      }),
    },
  ),
);

export { getWeekInfo };
