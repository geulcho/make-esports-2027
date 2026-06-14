import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LeagueSimState } from '../types';
import { allClubs } from '../data/clubs';
import {
  initAllLeagues,
  advanceLeagueToRound,
  pickMeta,
} from '../engine/simulator';
import {
  addDays,
  getNextMonday,
  getWeekInfo,
} from '../engine/calendar';
import {
  allLeagueDivKeys,
  roundKey,
  targetRoundsForDate,
} from '../engine/matchSchedule';

const clubMap = new Map(allClubs.map(c => [c.id, c]));

interface Store {
  gameDate: string;
  activeMeta: string[];
  leagueStates: Record<string, LeagueSimState>;
  // rounds completed per league/division composite key
  completedRounds: Record<string, number>;
  followedTeams: string[];
  followedLeagues: string[];
  // actions
  advanceOneDay: () => void;
  advanceThreeDays: () => void;
  advanceToNextMonday: () => void;
  resetSeason: () => void;
  toggleFollowTeam: (id: string) => void;
  toggleFollowLeague: (id: string) => void;
}

const INITIAL_DATE = '2038-01-07';

const defaultState = () => ({
  gameDate: INITIAL_DATE,
  activeMeta: ['A', 'B'] as string[],
  leagueStates: initAllLeagues(),
  completedRounds: {} as Record<string, number>,
  followedTeams: [] as string[],
  followedLeagues: [] as string[],
});

function advanceTo(
  currentDate: string,
  targetDate: string,
  leagueStates: Record<string, LeagueSimState>,
  completedRounds: Record<string, number>,
): {
  leagueStates: Record<string, LeagueSimState>;
  completedRounds: Record<string, number>;
  activeMeta: string[];
} {
  if (targetDate <= currentDate) {
    return { leagueStates, completedRounds, activeMeta: pickMeta() };
  }

  const keys = allLeagueDivKeys();
  const meta = pickMeta();

  // Compute target rounds for each key
  const targetRoundsMap: Record<string, number> = {};
  for (const { leagueId, divisionId } of keys) {
    const k = roundKey(leagueId, divisionId);
    targetRoundsMap[k] = targetRoundsForDate(leagueId, divisionId, targetDate);
  }

  const newLeagueStates: Record<string, LeagueSimState> = {};
  for (const [leagueId, state] of Object.entries(leagueStates)) {
    newLeagueStates[leagueId] = advanceLeagueToRound(
      state,
      completedRounds,
      targetRoundsMap,
      meta,
      clubMap,
    );
  }

  // Update completedRounds to reflect new progress
  const newCompleted = { ...completedRounds };
  for (const k of Object.keys(targetRoundsMap)) {
    newCompleted[k] = targetRoundsMap[k];
  }

  return { leagueStates: newLeagueStates, completedRounds: newCompleted, activeMeta: meta };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...defaultState(),

      advanceOneDay() {
        const { gameDate, leagueStates, completedRounds } = get();
        const target = addDays(gameDate, 1);
        const result = advanceTo(gameDate, target, leagueStates, completedRounds);
        set({ gameDate: target, ...result });
      },

      advanceThreeDays() {
        const { gameDate, leagueStates, completedRounds } = get();
        const target = addDays(gameDate, 3);
        const result = advanceTo(gameDate, target, leagueStates, completedRounds);
        set({ gameDate: target, ...result });
      },

      advanceToNextMonday() {
        const { gameDate, leagueStates, completedRounds } = get();
        const target = getNextMonday(gameDate);
        const result = advanceTo(gameDate, target, leagueStates, completedRounds);
        set({ gameDate: target, ...result });
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
    }),
    {
      name: 'make-esports-store-v5',
      partialize: state => ({
        gameDate: state.gameDate,
        activeMeta: state.activeMeta,
        leagueStates: state.leagueStates,
        completedRounds: state.completedRounds,
        followedTeams: state.followedTeams,
        followedLeagues: state.followedLeagues,
      }),
    },
  ),
);

// Re-export for TopBar / PhaseStrip
export { getWeekInfo };
