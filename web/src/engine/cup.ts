import type { CupMatch, CupRound, CupState, SeasonHistoryEntry } from '../types';
import type { Club } from '../types';
import { clubsByLeague } from '../data/clubs';
import { simulateMatch } from './combat';
import { targetRoundsFromSlots } from './leagueScheduleDefs';
import { getCurrentSeasonStart } from './calendar';

// ─── Stage definitions ────────────────────────────────────────────────────────

interface StageDef {
  weekNum: number;
  matchesPerSlot: number[];
  winsNeeded: number;
  label: string;
}

const EGT_DEFS: Record<string, StageDef> = {
  r1:    { weekNum: 5,  matchesPerSlot: [6, 5, 5],    winsNeeded: 2, label: 'Round 1'      },
  r64:   { weekNum: 9,  matchesPerSlot: [11, 11, 10], winsNeeded: 2, label: 'Round of 64'  },
  r32:   { weekNum: 11, matchesPerSlot: [6, 5, 5],    winsNeeded: 2, label: 'Round of 32'  },
  r16:   { weekNum: 22, matchesPerSlot: [3, 3, 2],    winsNeeded: 2, label: 'Round of 16'  },
  qf:    { weekNum: 24, matchesPerSlot: [2, 2],       winsNeeded: 3, label: 'Quarterfinals' },
  sf:    { weekNum: 28, matchesPerSlot: [1, 1],       winsNeeded: 3, label: 'Semifinals'    },
  final: { weekNum: 30, matchesPerSlot: [1],          winsNeeded: 3, label: 'Grand Final'   },
};

const COPA_DEFS: Record<string, StageDef> = {
  r1:    { weekNum: 5,  matchesPerSlot: [2, 2],    winsNeeded: 2, label: 'Round 1'      },
  r2:    { weekNum: 9,  matchesPerSlot: [3, 3, 2], winsNeeded: 2, label: 'Round 2'      },
  r32:   { weekNum: 11, matchesPerSlot: [6, 5, 5], winsNeeded: 2, label: 'Round of 32'  },
  r16:   { weekNum: 22, matchesPerSlot: [3, 3, 2], winsNeeded: 2, label: 'Round of 16'  },
  qf:    { weekNum: 24, matchesPerSlot: [2, 2],    winsNeeded: 3, label: 'Quarterfinals' },
  sf:    { weekNum: 28, matchesPerSlot: [1, 1],    winsNeeded: 3, label: 'Semifinals'    },
  final: { weekNum: 30, matchesPerSlot: [1],       winsNeeded: 3, label: 'Grand Final'   },
};

const APEX_DEFS: Record<string, StageDef> = {
  r1s:   { weekNum: 5,  matchesPerSlot: [2, 2, 2], winsNeeded: 2, label: 'South R1'     },
  r2n:   { weekNum: 9,  matchesPerSlot: [4, 3, 3], winsNeeded: 2, label: 'North R2'     },
  r2s:   { weekNum: 9,  matchesPerSlot: [2, 3, 3], winsNeeded: 2, label: 'South R2'     },
  r32:   { weekNum: 11, matchesPerSlot: [6, 5, 5], winsNeeded: 2, label: 'Round of 32'  },
  r16:   { weekNum: 22, matchesPerSlot: [3, 3, 2], winsNeeded: 2, label: 'Round of 16'  },
  qf:    { weekNum: 24, matchesPerSlot: [2, 2],    winsNeeded: 3, label: 'Quarterfinals' },
  sf:    { weekNum: 28, matchesPerSlot: [1, 1],    winsNeeded: 3, label: 'Semifinals'    },
  final: { weekNum: 30, matchesPerSlot: [1],       winsNeeded: 3, label: 'Grand Final'   },
};

function getStageDefs(cupId: string): Record<string, StageDef> {
  if (cupId === 'EGT')  return EGT_DEFS;
  if (cupId === 'COPA') return COPA_DEFS;
  return APEX_DEFS;
}

const CUP_STAGE_ORDER: Record<string, string[]> = {
  EGT:  ['r1', 'r64', 'r32', 'r16', 'qf', 'sf', 'final'],
  COPA: ['r1', 'r2', 'r32', 'r16', 'qf', 'sf', 'final'],
  APEX: ['r1s', 'r2n', 'r2s', 'r32', 'r16', 'qf', 'sf', 'final'],
};

const STAGE_PREREQS: Record<string, Record<string, string[]>> = {
  EGT: {
    r1: [], r64: ['r1'], r32: ['r64'],
    r16: ['r32'], qf: ['r16'], sf: ['qf'], final: ['sf'],
  },
  COPA: {
    r1: [], r2: ['r1'], r32: ['r2'],
    r16: ['r32'], qf: ['r16'], sf: ['qf'], final: ['sf'],
  },
  APEX: {
    r1s: [], r2n: [], r2s: ['r1s'], r32: ['r2n', 'r2s'],
    r16: ['r32'], qf: ['r16'], sf: ['qf'], final: ['sf'],
  },
};

// ─── Cup stage slot map (for targetSlotsForCupKey) ────────────────────────────

export const CUP_STAGE_SLOT_MAP: Record<string, Array<{ weekNum: number; dow: number }>> = {
  'EGT::r1':    [{ weekNum: 5,  dow: 0 }, { weekNum: 5,  dow: 1 }, { weekNum: 5,  dow: 2 }],
  'EGT::r64':   [{ weekNum: 9,  dow: 0 }, { weekNum: 9,  dow: 1 }, { weekNum: 9,  dow: 2 }],
  'EGT::r32':   [{ weekNum: 11, dow: 0 }, { weekNum: 11, dow: 1 }, { weekNum: 11, dow: 2 }],
  'EGT::r16':   [{ weekNum: 22, dow: 0 }, { weekNum: 22, dow: 1 }, { weekNum: 22, dow: 2 }],
  'EGT::qf':    [{ weekNum: 24, dow: 0 }, { weekNum: 24, dow: 1 }],
  'EGT::sf':    [{ weekNum: 28, dow: 0 }, { weekNum: 28, dow: 1 }],
  'EGT::final': [{ weekNum: 30, dow: 2 }],

  'COPA::r1':    [{ weekNum: 5,  dow: 0 }, { weekNum: 5,  dow: 1 }],
  'COPA::r2':    [{ weekNum: 9,  dow: 0 }, { weekNum: 9,  dow: 1 }, { weekNum: 9,  dow: 2 }],
  'COPA::r32':   [{ weekNum: 11, dow: 0 }, { weekNum: 11, dow: 1 }, { weekNum: 11, dow: 2 }],
  'COPA::r16':   [{ weekNum: 22, dow: 0 }, { weekNum: 22, dow: 1 }, { weekNum: 22, dow: 2 }],
  'COPA::qf':    [{ weekNum: 24, dow: 0 }, { weekNum: 24, dow: 1 }],
  'COPA::sf':    [{ weekNum: 28, dow: 0 }, { weekNum: 28, dow: 1 }],
  'COPA::final': [{ weekNum: 30, dow: 1 }],

  'APEX::r1s':   [{ weekNum: 5,  dow: 0 }, { weekNum: 5,  dow: 1 }, { weekNum: 5,  dow: 2 }],
  'APEX::r2n':   [{ weekNum: 9,  dow: 0 }, { weekNum: 9,  dow: 1 }, { weekNum: 9,  dow: 2 }],
  'APEX::r2s':   [{ weekNum: 9,  dow: 0 }, { weekNum: 9,  dow: 1 }, { weekNum: 9,  dow: 2 }],
  'APEX::r32':   [{ weekNum: 11, dow: 0 }, { weekNum: 11, dow: 1 }, { weekNum: 11, dow: 2 }],
  'APEX::r16':   [{ weekNum: 22, dow: 0 }, { weekNum: 22, dow: 1 }, { weekNum: 22, dow: 2 }],
  'APEX::qf':    [{ weekNum: 24, dow: 0 }, { weekNum: 24, dow: 1 }],
  'APEX::sf':    [{ weekNum: 28, dow: 0 }, { weekNum: 28, dow: 1 }],
  'APEX::final': [{ weekNum: 30, dow: 0 }],
};

export function allCupSimKeys(): Array<{ cupId: string; stage: string; storeKey: string }> {
  return Object.keys(CUP_STAGE_SLOT_MAP).map(k => {
    const [cupId, stage] = k.split('::');
    return { cupId, stage, storeKey: `CUP::${k}` };
  });
}

export function targetSlotsForCupKey(storeKey: string, targetDate: string): number {
  const mapKey = storeKey.replace('CUP::', '');
  const slots = CUP_STAGE_SLOT_MAP[mapKey];
  if (!slots) return 0;
  const seasonStart = getCurrentSeasonStart(targetDate);
  return targetRoundsFromSlots(slots, seasonStart, targetDate);
}

// ─── Seeding ──────────────────────────────────────────────────────────────────

function getLeagueSeed(
  leagueId: string,
  history: SeasonHistoryEntry[],
  prevSeason: number,
  _clubMap: Map<string, Club>,
): string[] {
  const hist = history.find(h => h.leagueId === leagueId && h.season === prevSeason);
  if (hist && hist.finalStandings.length > 0) {
    return hist.finalStandings.map(r => r.clubId);
  }
  return [...clubsByLeague(leagueId)]
    .sort((a, b) => b.elo_rating - a.elo_rating)
    .map(c => c.id);
}

function computeDirectEntrants(
  cupId: string,
  history: SeasonHistoryEntry[],
  currentSeason: number,
  clubMap: Map<string, Club>,
): Record<string, string[]> {
  const prev = currentSeason - 1;

  if (cupId === 'EGT') {
    const lgs = ['L_NEU', 'L_WEU', 'L_RU', 'L_DE', 'L_SEU', 'L_EEU', 'L_TR', 'L_MEAF'];
    const seeds: Record<string, string[]> = {};
    for (const lg of lgs) seeds[lg] = getLeagueSeed(lg, history, prev, clubMap);
    return {
      r1:  lgs.flatMap(lg => seeds[lg].slice(-4)),
      r64: lgs.flatMap(lg => seeds[lg].slice(0, -4)),
    };
  }

  if (cupId === 'COPA') {
    const na = getLeagueSeed('L_NA', history, prev, clubMap);
    const sa = getLeagueSeed('L_SA', history, prev, clubMap);
    const br = getLeagueSeed('L_BR', history, prev, clubMap);
    return {
      r1:  [...sa.slice(-4), ...br.slice(-4)],
      r2:  [...na.slice(-4), ...sa.slice(2, 6), ...br.slice(2, 6)],
      r32: [...na.slice(0, 20), ...sa.slice(0, 2), ...br.slice(0, 2)],
    };
  }

  // APEX
  const cn  = getLeagueSeed('L_CN',  history, prev, clubMap);
  const kr  = getLeagueSeed('L_KR',  history, prev, clubMap);
  const tw  = getLeagueSeed('L_TW',  history, prev, clubMap);
  const jp  = getLeagueSeed('L_JP',  history, prev, clubMap);
  const sea = getLeagueSeed('L_SEA', history, prev, clubMap);
  return {
    r1s: [...tw.slice(4), ...jp.slice(4), ...sea.slice(8)],
    r2n: [...cn.slice(4), ...kr.slice(4)],
    r2s: [...tw.slice(2, 4), ...jp.slice(2, 4), ...sea.slice(2, 8)],
    r32: [...cn.slice(0, 4), ...kr.slice(0, 4), ...tw.slice(0, 2), ...jp.slice(0, 2), ...sea.slice(0, 2)],
  };
}

// ─── Match helpers ────────────────────────────────────────────────────────────

function makeCupMatch(id: string, teamA: string | null, teamB: string | null): CupMatch {
  return { id, teamA, teamB, scoreA: 0, scoreB: 0, winner: null, oddsA: 0, oddsB: 0 };
}

function simCupMatch(
  m: CupMatch,
  winsNeeded: number,
  meta: string[],
  clubMap: Map<string, Club>,
): CupMatch {
  if (!m.teamA || !m.teamB || m.winner) return m;
  const ca = clubMap.get(m.teamA);
  const cb = clubMap.get(m.teamB);
  if (!ca || !cb) return m;
  const r = simulateMatch(ca, cb, meta, winsNeeded, 1.5);
  return {
    ...m,
    scoreA: r.scoreA,
    scoreB: r.scoreB,
    oddsA: r.oddsA,
    oddsB: r.oddsB,
    winner: r.scoreA > r.scoreB ? m.teamA : m.teamB,
  };
}

// ─── Round draw helpers ───────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pairIntoMatches(stageId: string, teams: string[], randomDraw: boolean): CupMatch[] {
  const ordered = randomDraw ? shuffle(teams) : teams;
  const matches: CupMatch[] = [];
  for (let i = 0; i + 1 < ordered.length; i += 2) {
    matches.push(makeCupMatch(`${stageId}_m${Math.floor(i / 2)}`, ordered[i], ordered[i + 1]));
  }
  return matches;
}

function getParticipants(state: CupState, stageId: string): string[] {
  // Bracket rounds QF/SF/Final: use bracket-position seeding (no random redraw)
  if (['qf', 'sf', 'final'].includes(stageId)) {
    const prevId = stageId === 'qf' ? 'r16' : stageId === 'sf' ? 'qf' : 'sf';
    const prev = state.rounds.find(r => r.stage === prevId);
    if (!prev?.completed) return [];
    return prev.matches.map(m => m.winner).filter((w): w is string => w !== null);
  }

  // APEX R2 South: r1s winners + direct
  if (state.cupId === 'APEX' && stageId === 'r2s') {
    const r1s = state.rounds.find(r => r.stage === 'r1s');
    const r1sW = r1s?.matches.map(m => m.winner).filter((w): w is string => w !== null) ?? [];
    return [...r1sW, ...(state.directEntrants['r2s'] ?? [])];
  }

  // APEX R32: r2n winners + r2s winners + direct
  if (state.cupId === 'APEX' && stageId === 'r32') {
    const r2nW = state.rounds.find(r => r.stage === 'r2n')?.matches.map(m => m.winner).filter((w): w is string => w !== null) ?? [];
    const r2sW = state.rounds.find(r => r.stage === 'r2s')?.matches.map(m => m.winner).filter((w): w is string => w !== null) ?? [];
    return [...r2nW, ...r2sW, ...(state.directEntrants['r32'] ?? [])];
  }

  // Standard: direct entrants for this stage + prev stage winners
  const direct = state.directEntrants[stageId] ?? [];
  const prereqs = STAGE_PREREQS[state.cupId]?.[stageId] ?? [];
  const prevWinners: string[] = [];
  for (const prereqId of prereqs) {
    const pr = state.rounds.find(r => r.stage === prereqId);
    if (pr?.completed) {
      prevWinners.push(...pr.matches.map(m => m.winner).filter((w): w is string => w !== null));
    }
  }
  return [...prevWinners, ...direct];
}

function makeRound(state: CupState, stageId: string, def: StageDef): CupRound | null {
  const participants = getParticipants(state, stageId);
  if (participants.length < 2) return null;

  const bracketMode = ['qf', 'sf', 'final'].includes(stageId);
  const matches = pairIntoMatches(stageId, participants, !bracketMode);

  return {
    stage: stageId,
    label: def.label,
    weekNum: def.weekNum,
    matches,
    matchesPerSlot: def.matchesPerSlot,
    slotsCompleted: 0,
    slotsTotal: def.matchesPerSlot.length,
    completed: false,
  };
}

// ─── Round advancement ────────────────────────────────────────────────────────

function advanceRound(
  round: CupRound,
  winsNeeded: number,
  targetSlots: number,
  meta: string[],
  clubMap: Map<string, Club>,
): CupRound {
  if (round.slotsCompleted >= targetSlots || round.completed) return round;

  const matches = round.matches.map(m => ({ ...m }));
  let matchStart = 0;

  for (let slot = 0; slot < Math.min(targetSlots, round.slotsTotal); slot++) {
    const count = round.matchesPerSlot[slot] ?? 0;
    if (slot < round.slotsCompleted) { matchStart += count; continue; }
    for (let i = 0; i < count && matchStart + i < matches.length; i++) {
      matches[matchStart + i] = simCupMatch(matches[matchStart + i], winsNeeded, meta, clubMap);
    }
    matchStart += count;
  }

  const newSlots = Math.min(targetSlots, round.slotsTotal);
  const allDone = matches.every(m => m.winner !== null);
  return { ...round, matches, slotsCompleted: newSlots, completed: allDone };
}

// ─── Main advance function ────────────────────────────────────────────────────

export function advanceCup(
  state: CupState,
  targetRoundsMap: Record<string, number>,
  meta: string[],
  clubMap: Map<string, Club>,
): CupState {
  if (state.completed) return state;

  let s: CupState = { ...state, rounds: [...state.rounds] };
  const defs = getStageDefs(s.cupId);
  const stageOrder = CUP_STAGE_ORDER[s.cupId] ?? [];

  for (const stageId of stageOrder) {
    const storeKey = `CUP::${s.cupId}::${stageId}`;
    const target = targetRoundsMap[storeKey] ?? 0;
    if (target === 0) continue;

    // Check prerequisites
    const prereqs = STAGE_PREREQS[s.cupId]?.[stageId] ?? [];
    const prereqsMet = prereqs.every(p => s.rounds.find(r => r.stage === p)?.completed);
    if (!prereqsMet) continue;

    // Init round if not yet drawn
    let roundIdx = s.rounds.findIndex(r => r.stage === stageId);
    if (roundIdx === -1) {
      const def = defs[stageId];
      if (!def) continue;
      const newRound = makeRound(s, stageId, def);
      if (!newRound) continue;
      s = { ...s, rounds: [...s.rounds, newRound], currentStage: stageId };
      roundIdx = s.rounds.length - 1;
    }

    const round = s.rounds[roundIdx];
    if (round.completed || round.slotsCompleted >= target) continue;

    const def = defs[stageId];
    if (!def) continue;

    const advanced = advanceRound(round, def.winsNeeded, target, meta, clubMap);
    const newRounds = [...s.rounds];
    newRounds[roundIdx] = advanced;
    s = { ...s, rounds: newRounds };

    if (stageId === 'final' && advanced.completed) {
      s = { ...s, champion: advanced.matches[0]?.winner ?? null, completed: true };
    }
  }

  return s;
}

// ─── Initialization ───────────────────────────────────────────────────────────

export function initCup(
  cupId: 'EGT' | 'COPA' | 'APEX',
  history: SeasonHistoryEntry[],
  currentSeason: number,
  clubMap: Map<string, Club>,
): CupState {
  return {
    cupId,
    currentStage: CUP_STAGE_ORDER[cupId][0] ?? '',
    rounds: [],
    directEntrants: computeDirectEntrants(cupId, history, currentSeason, clubMap),
    champion: null,
    completed: false,
  };
}

export function initAllCups(
  history: SeasonHistoryEntry[],
  currentSeason: number,
  clubMap: Map<string, Club>,
): Record<string, CupState> {
  return {
    EGT:  initCup('EGT',  history, currentSeason, clubMap),
    COPA: initCup('COPA', history, currentSeason, clubMap),
    APEX: initCup('APEX', history, currentSeason, clubMap),
  };
}

// ─── Survivor helpers ─────────────────────────────────────────────────────────

export const CUP_LEAGUE_TOTALS: Record<string, Record<string, number>> = {
  EGT:  { L_NEU: 12, L_WEU: 12, L_RU: 10, L_DE: 10, L_SEU: 10, L_EEU: 10, L_TR: 8, L_MEAF: 8 },
  COPA: { L_NA: 24, L_SA: 10, L_BR: 10 },
  APEX: { L_CN: 16, L_KR: 12, L_TW: 8, L_JP: 8, L_SEA: 12 },
};

/** Returns set of surviving team ids after a given round index (inclusive). */
export function getSurvivorsAfterRound(
  state: CupState,
  upToRoundIdx: number,
): Set<string> {
  const allEntered = new Set<string>(Object.values(state.directEntrants).flat());
  const eliminated = new Set<string>();

  for (let i = 0; i <= upToRoundIdx && i < state.rounds.length; i++) {
    for (const m of state.rounds[i].matches) {
      if (m.winner) {
        const loser = m.winner === m.teamA ? m.teamB : m.teamA;
        if (loser) eliminated.add(loser);
        allEntered.add(m.winner);
        if (m.teamA) allEntered.add(m.teamA);
        if (m.teamB) allEntered.add(m.teamB);
      }
    }
  }

  return new Set([...allEntered].filter(id => !eliminated.has(id)));
}
