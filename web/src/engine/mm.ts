import type {
  Club, LeagueSimState,
  MMState, MMParticipant, MMSubRound, MMMatch, MMKnockoutMatch,
} from '../types';
import { simulateMatch } from './combat';
import { addDays, getCurrentSeasonStart, getWeekNum } from './calendar';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MM_LEAGUES = [
  'L_KR', 'L_NA', 'L_CN', 'L_NEU', 'L_WEU', 'L_DE',
  'L_SEU', 'L_RU', 'L_EEU', 'L_TR', 'L_TW', 'L_JP',
  'L_SEA', 'L_BR', 'L_SA', 'L_MEAF',
] as const;

interface SubRoundDef {
  key: string;
  label: string;
  roundCol: number;
  recordGroup: string;
  format: 'Bo1' | 'Bo3' | 'Bo5';
  stakes: 'advancement' | 'elimination' | 'decisive' | 'non-decisive';
  week: number;
  day: string;
}

const SUBROUNDS: SubRoundDef[] = [
  { key: 'R1',  label: '1라운드', roundCol: 1, recordGroup: '0-0', format: 'Bo1', stakes: 'non-decisive', week: 17, day: 'Monday'    },
  { key: 'R2W', label: '2라운드', roundCol: 2, recordGroup: '1-0', format: 'Bo1', stakes: 'non-decisive', week: 17, day: 'Tuesday'   },
  { key: 'R2L', label: '2라운드', roundCol: 2, recordGroup: '0-1', format: 'Bo1', stakes: 'non-decisive', week: 17, day: 'Tuesday'   },
  { key: 'R3A', label: '3라운드', roundCol: 3, recordGroup: '2-0', format: 'Bo3', stakes: 'advancement',  week: 17, day: 'Wednesday' },
  { key: 'R3B', label: '3라운드', roundCol: 3, recordGroup: '1-1', format: 'Bo1', stakes: 'non-decisive', week: 17, day: 'Thursday'  },
  { key: 'R3C', label: '3라운드', roundCol: 3, recordGroup: '0-2', format: 'Bo3', stakes: 'elimination',  week: 17, day: 'Friday'    },
  { key: 'R4A', label: '4라운드', roundCol: 4, recordGroup: '2-1', format: 'Bo3', stakes: 'advancement',  week: 17, day: 'Saturday'  },
  { key: 'R4B', label: '4라운드', roundCol: 4, recordGroup: '1-2', format: 'Bo3', stakes: 'elimination',  week: 17, day: 'Sunday'    },
  { key: 'R5',  label: '5라운드', roundCol: 5, recordGroup: '2-2', format: 'Bo3', stakes: 'decisive',     week: 18, day: 'Monday'    },
];

const KO_SCHEDULE: Record<string, { week: number; day: string; side: 'A' | 'B' | null }> = {
  QF1: { week: 18, day: 'Wednesday', side: 'A' },
  QF2: { week: 18, day: 'Thursday',  side: 'A' },
  QF3: { week: 18, day: 'Friday',    side: 'B' },
  QF4: { week: 18, day: 'Saturday',  side: 'B' },
  SF1: { week: 19, day: 'Tuesday',   side: 'A' },
  SF2: { week: 19, day: 'Thursday',  side: 'B' },
  GF:  { week: 19, day: 'Sunday',    side: null },
};

const DAY_INDEX: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
  Friday: 4, Saturday: 5, Sunday: 6,
};

// ─── Date helper ──────────────────────────────────────────────────────────────

export function mmMatchDate(week: number, day: string, seasonStart: string): string {
  const weekOffset = (week - 1) * 7;
  const dayOffset  = DAY_INDEX[day] ?? 0;
  return addDays(seasonStart, weekOffset + dayOffset);
}

export function subRoundDate(key: string, seasonStart: string): string {
  const def = SUBROUNDS.find(d => d.key === key);
  if (!def) return addDays(seasonStart, 999);
  return mmMatchDate(def.week, def.day, seasonStart);
}

export function knockoutMatchDate(slot: string, seasonStart: string): string {
  const sch = KO_SCHEDULE[slot];
  if (!sch) return addDays(seasonStart, 999);
  return mmMatchDate(sch.week, sch.day, seasonStart);
}

// ─── League representative helpers ───────────────────────────────────────────

function getMmRep(state: LeagueSimState): string | null {
  if (state.mmQualifier?.mmRepresentative) return state.mmQualifier.mmRepresentative;
  if (state.meafMMQual?.champion)          return state.meafMMQual.champion;
  return state.springChampion ?? null;
}

function getQualResult(state: LeagueSimState, repId: string): MMParticipant['qualResult'] {
  // Spring playoffs GF series (most leagues)
  const spGF = state.springPlayoffs?.series?.find(s => s.stage === 'grandfinal');
  if (spGF?.winner) {
    const isA = spGF.teamA === repId;
    return {
      repScore: isA ? spGF.winsA : spGF.winsB,
      oppScore: isA ? spGF.winsB : spGF.winsA,
      opponent: isA ? spGF.teamB : spGF.teamA,
      isSeries: true,
    };
  }
  // MM qualifier bracket (L_NA, L_CN)
  if (state.mmQualifier?.completed) {
    const ms = state.mmQualifier.matches;
    const last = ms[ms.length - 1];
    if (last?.winner && last.result) {
      const isA = last.teamA === repId;
      return {
        repScore: isA ? last.result.scoreA : last.result.scoreB,
        oppScore: isA ? last.result.scoreB : last.result.scoreA,
        opponent: isA ? last.teamB : last.teamA,
        isSeries: false,
      };
    }
  }
  // MEAF MM qualifier PlayoffState
  if (state.meafMMQual?.completed) {
    const gf = state.meafMMQual.series?.find(
      s => s.stage === 'grandfinal' || (s as { id?: string }).id === 'gf',
    );
    if (gf?.winner) {
      const isA = gf.teamA === repId;
      return {
        repScore: isA ? gf.winsA : gf.winsB,
        oppScore: isA ? gf.winsB : gf.winsA,
        opponent: isA ? gf.teamB : gf.teamA,
        isSeries: true,
      };
    }
  }
  return null;
}

function getCurrentElo(state: LeagueSimState, repId: string, clubMap: Map<string, Club>): number {
  const rec = state.standings.find(r => r.clubId === repId);
  if (rec) return rec.elo;
  return clubMap.get(repId)?.elo_rating ?? 1000;
}

// ─── Shuffle ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Pairing ──────────────────────────────────────────────────────────────────

function matchupKey(a: string, b: string): string {
  return [a, b].sort().join('::');
}

function swissPairGreedy(
  teams: MMParticipant[],
  allPriorOpponents: Map<string, Set<string>>,
): [string, string][] {
  const pool = [...teams].sort((a, b) => b.w16Elo - a.w16Elo);
  const pairs: [string, string][] = [];

  while (pool.length >= 2) {
    const teamA = pool.shift()!;
    const prior = allPriorOpponents.get(teamA.clubId) ?? new Set();
    let partnerIdx = pool.findIndex(t => !prior.has(t.clubId));
    if (partnerIdx === -1) partnerIdx = 0; // fallback: allow rematch
    const [teamB] = pool.splice(partnerIdx, 1);
    pairs.push([teamA.clubId, teamB.clubId]);
  }

  return pairs;
}

function getPriorOpponentsMap(participants: MMParticipant[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const p of participants) {
    m.set(p.clubId, new Set(p.priorOpponents));
  }
  return m;
}

function generateR1Pairs(participants: MMParticipant[]): [string, string][] {
  const byBand = ([1, 2, 3, 4] as const).map(b =>
    participants.filter(p => p.seedBand === b),
  );
  const s1 = shuffle(byBand[0]);
  const s4 = shuffle(byBand[3]);
  const s2 = shuffle(byBand[1]);
  const s3 = shuffle(byBand[2]);
  const pairs: [string, string][] = [];
  for (let i = 0; i < Math.min(s1.length, s4.length); i++) pairs.push([s1[i].clubId, s4[i].clubId]);
  for (let i = 0; i < Math.min(s2.length, s3.length); i++) pairs.push([s2[i].clubId, s3[i].clubId]);
  return pairs;
}

// ─── Odds helpers ─────────────────────────────────────────────────────────────

export function calcMMOdds(eloA: number, eloB: number) {
  const pA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  return {
    oddsA: Math.round(Math.max(1.01, 0.95 / pA) * 100) / 100,
    oddsB: Math.round(Math.max(1.01, 0.95 / (1 - pA)) * 100) / 100,
  };
}

export function calcChampionshipOdds(participants: MMParticipant[]): Record<string, number> {
  if (participants.length === 0) return {};
  const shares = participants.map(p => ({ id: p.clubId, share: Math.pow(10, p.w16Elo / 400) }));
  const total = shares.reduce((s, x) => s + x.share, 0);
  const result: Record<string, number> = {};
  for (const s of shares) {
    const prob = s.share / total;
    result[s.id] = Math.round(Math.max(1.01, 0.90 / prob) * 100) / 100;
  }
  return result;
}

// ─── Sub-round creation ───────────────────────────────────────────────────────

function makeMMMatch(id: string, teamA: string, teamB: string, format: 'Bo1' | 'Bo3' | 'Bo5', participants: MMParticipant[]): MMMatch {
  const pA = participants.find(p => p.clubId === teamA);
  const pB = participants.find(p => p.clubId === teamB);
  const odds = calcMMOdds(pA?.w16Elo ?? 1000, pB?.w16Elo ?? 1000);
  return { id, teamA, teamB, format, scoreA: 0, scoreB: 0, winner: null, oddsA: odds.oddsA, oddsB: odds.oddsB };
}

function createSubRound(key: string, participants: MMParticipant[]): MMSubRound | null {
  const def = SUBROUNDS.find(d => d.key === key);
  if (!def) return null;

  const [wStr, lStr] = def.recordGroup.split('-');
  const wins   = parseInt(wStr, 10);
  const losses = parseInt(lStr, 10);
  const eligible = participants.filter(
    p => p.swissWins === wins && p.swissLosses === losses && !p.qualified && !p.eliminated,
  );
  if (eligible.length < 2) return null;

  let pairs: [string, string][];
  if (key === 'R1') {
    pairs = generateR1Pairs(eligible);
  } else {
    pairs = swissPairGreedy(eligible, getPriorOpponentsMap(participants));
  }

  const matches = pairs.map(([a, b], i) =>
    makeMMMatch(`${key}_m${i}`, a, b, def.format, participants),
  );

  return {
    key: def.key,
    label: def.label,
    roundCol: def.roundCol,
    recordGroup: def.recordGroup,
    format: def.format,
    stakes: def.stakes,
    week: def.week,
    day: def.day,
    matches,
    completed: false,
  };
}

// ─── Next sub-round generation ────────────────────────────────────────────────

function tryGenerateSubRounds(state: MMState): MMState {
  const existing  = new Set(state.swissRounds.map(r => r.key));
  const completed = new Set(state.swissRounds.filter(r => r.completed).map(r => r.key));
  const newRounds = [...state.swissRounds];

  const tryAdd = (key: string, prereqs: string[]) => {
    if (existing.has(key)) return;
    if (!prereqs.every(p => completed.has(p))) return;
    const sr = createSubRound(key, state.participants);
    if (sr) { newRounds.push(sr); existing.add(key); }
  };

  tryAdd('R2W', ['R1']);
  tryAdd('R2L', ['R1']);
  tryAdd('R3A', ['R2W']);
  tryAdd('R3B', ['R2W', 'R2L']);
  tryAdd('R3C', ['R2L']);
  tryAdd('R4A', ['R3A', 'R3B']);
  tryAdd('R4B', ['R3B', 'R3C']);
  tryAdd('R5',  ['R4A', 'R4B']);

  return { ...state, swissRounds: newRounds };
}

// ─── Match simulation ─────────────────────────────────────────────────────────

function winsNeeded(format: 'Bo1' | 'Bo3' | 'Bo5'): number {
  return format === 'Bo1' ? 1 : format === 'Bo3' ? 2 : 3;
}

function simMatch(
  match: MMMatch,
  meta: string[],
  clubMap: Map<string, Club>,
  participants: MMParticipant[],
): { played: MMMatch; eloChangeA: number } {
  if (match.winner) return { played: match, eloChangeA: 0 };
  const pA = participants.find(p => p.clubId === match.teamA);
  const pB = participants.find(p => p.clubId === match.teamB);
  const baseA = clubMap.get(match.teamA);
  const baseB = clubMap.get(match.teamB);
  if (!baseA || !baseB) return { played: match, eloChangeA: 0 };
  const ca = { ...baseA, elo_rating: pA?.w16Elo ?? baseA.elo_rating };
  const cb = { ...baseB, elo_rating: pB?.w16Elo ?? baseB.elo_rating };
  const r = simulateMatch(ca, cb, meta, winsNeeded(match.format));
  return {
    played: {
      ...match,
      scoreA: r.scoreA,
      scoreB: r.scoreB,
      oddsA:  r.oddsA,
      oddsB:  r.oddsB,
      winner: r.scoreA > r.scoreB ? match.teamA : match.teamB,
    },
    eloChangeA: r.eloChangeA,
  };
}

// ─── Apply match result to state ──────────────────────────────────────────────

function applySwissMatchResult(state: MMState, roundKey: string, matchId: string, played: MMMatch, eloChangeA: number): MMState {
  // Update sub-round
  const newRounds = state.swissRounds.map(sr => {
    if (sr.key !== roundKey) return sr;
    const newMatches = sr.matches.map(m => m.id === matchId ? played : m);
    const completed  = newMatches.every(m => m.winner !== null);
    return { ...sr, matches: newMatches, completed };
  });

  // Update participant records + Elo
  const winner = played.winner!;
  const loser  = winner === played.teamA ? played.teamB : played.teamA;
  const wGames = winner === played.teamA ? played.scoreA : played.scoreB;
  const lGames = winner === played.teamA ? played.scoreB : played.scoreA;
  const eloW = played.teamA === winner ? eloChangeA : -eloChangeA;

  const newParticipants = state.participants.map(p => {
    if (p.clubId !== winner && p.clubId !== loser) return p;
    if (p.clubId === winner) {
      const wins = p.swissWins + 1;
      return {
        ...p,
        w16Elo:       p.w16Elo + eloW,
        swissWins:    wins,
        swissGameDiff: p.swissGameDiff + wGames - lGames,
        qualified:    wins >= 3,
        priorOpponents: [...p.priorOpponents, loser],
      };
    }
    // loser
    const losses = p.swissLosses + 1;
    return {
      ...p,
      w16Elo:       p.w16Elo - eloW,
      swissLosses:  losses,
      swissGameDiff: p.swissGameDiff + lGames - wGames,
      eliminated:   losses >= 3,
      priorOpponents: [...p.priorOpponents, winner],
    };
  });

  let s: MMState = { ...state, swissRounds: newRounds, participants: newParticipants };

  // Try generating next sub-rounds
  s = tryGenerateSubRounds(s);

  // Check if all 8 qualified → generate knockout
  const qualified = s.participants.filter(p => p.qualified);
  if (qualified.length >= 8 && s.knockoutMatches.length === 0 && s.phase === 'swiss') {
    s = generateKnockout(s);
  }

  return s;
}

// ─── Knockout bracket generation ──────────────────────────────────────────────

function knockoutSeedOrder(participants: MMParticipant[]): MMParticipant[] {
  return [...participants].sort((a, b) => {
    // Swiss record (3-0 > 3-1 > 3-2)
    const aLoss = a.swissLosses, bLoss = b.swissLosses;
    if (aLoss !== bLoss) return aLoss - bLoss;
    // Game differential
    if (b.swissGameDiff !== a.swissGameDiff) return b.swissGameDiff - a.swissGameDiff;
    // W16 Elo
    return b.w16Elo - a.w16Elo;
  });
}

function generateKnockout(state: MMState): MMState {
  const qualified = state.participants.filter(p => p.qualified);
  if (qualified.length < 8) return state;

  const seeded = knockoutSeedOrder(qualified);

  // PRD bracket template:
  // QF1 (Side A): 3-0 A vs 3-2 C   (seed 1 vs seed 8)
  // QF2 (Side A): 3-1 B vs 3-1 C   (seed 4 vs seed 5)
  // QF3 (Side B): 3-1 A vs 3-2 A   (seed 3 vs seed 6)
  // QF4 (Side B): 3-0 B vs 3-2 B   (seed 2 vs seed 7)
  const [s1, s2, s3, s4, s5, s6, s7, s8] = seeded;

  const pMap = new Map(seeded.map(p => [p.clubId, p]));
  const makeKO = (slot: string, teamA: string | null, teamB: string | null): MMKnockoutMatch => {
    const sch = KO_SCHEDULE[slot];
    let oddsA = 0, oddsB = 0;
    if (teamA && teamB) {
      const o = calcMMOdds(pMap.get(teamA)?.w16Elo ?? 1000, pMap.get(teamB)?.w16Elo ?? 1000);
      oddsA = o.oddsA; oddsB = o.oddsB;
    }
    return {
      slot: slot as MMKnockoutMatch['slot'],
      side: sch?.side ?? null,
      teamA, teamB,
      scoreA: 0, scoreB: 0, winner: null, oddsA, oddsB,
    };
  };

  const knockoutMatches: MMKnockoutMatch[] = [
    makeKO('QF1', s1?.clubId ?? null, s8?.clubId ?? null),
    makeKO('QF2', s4?.clubId ?? null, s5?.clubId ?? null),
    makeKO('QF3', s3?.clubId ?? null, s6?.clubId ?? null),
    makeKO('QF4', s2?.clubId ?? null, s7?.clubId ?? null),
    makeKO('SF1', null, null),
    makeKO('SF2', null, null),
    makeKO('GF',  null, null),
  ];

  return { ...state, knockoutMatches, phase: 'knockout' };
}

// ─── Apply knockout match result ──────────────────────────────────────────────

function recalcOddsIfReady(m: MMKnockoutMatch, participants: MMParticipant[]): MMKnockoutMatch {
  if (!m.teamA || !m.teamB || m.winner) return m;
  const pA = participants.find(p => p.clubId === m.teamA);
  const pB = participants.find(p => p.clubId === m.teamB);
  const o = calcMMOdds(pA?.w16Elo ?? 1000, pB?.w16Elo ?? 1000);
  return { ...m, oddsA: o.oddsA, oddsB: o.oddsB };
}

function applyKnockoutResult(state: MMState, slot: string, played: MMKnockoutMatch): MMState {
  const newKO = state.knockoutMatches.map(m => m.slot === slot ? played : m);
  let s = { ...state, knockoutMatches: newKO };
  const pList = state.participants;

  const w = played.winner;
  if (!w) return s;

  const feedWinner = (targetSlot: string, isTeamA: boolean) => {
    s = {
      ...s, knockoutMatches: s.knockoutMatches.map(m => {
        if (m.slot !== targetSlot) return m;
        const updated = { ...m, ...(isTeamA ? { teamA: w } : { teamB: w }) };
        return recalcOddsIfReady(updated, pList);
      }),
    };
  };

  if (slot === 'QF1') feedWinner('SF1', true);
  if (slot === 'QF2') feedWinner('SF1', false);
  if (slot === 'QF3') feedWinner('SF2', true);
  if (slot === 'QF4') feedWinner('SF2', false);
  if (slot === 'SF1') feedWinner('GF',  true);
  if (slot === 'SF2') feedWinner('GF',  false);
  if (slot === 'GF')  s = { ...s, champion: w, phase: 'completed' };

  return s;
}

// ─── Public: advance single match ─────────────────────────────────────────────

export function advanceMMSingleMatch(
  state: MMState,
  matchId: string,
  meta: string[],
  clubMap: Map<string, Club>,
): MMState {
  // Search Swiss rounds
  for (const sr of state.swissRounds) {
    const match = sr.matches.find(m => m.id === matchId);
    if (match) {
      const { played, eloChangeA } = simMatch(match, meta, clubMap, state.participants);
      return applySwissMatchResult(state, sr.key, matchId, played, eloChangeA);
    }
  }

  // Search knockout
  for (const km of state.knockoutMatches) {
    if (`ko_${km.slot}` === matchId) {
      if (!km.teamA || !km.teamB || km.winner) return state;
      const pA = state.participants.find(p => p.clubId === km.teamA);
      const pB = state.participants.find(p => p.clubId === km.teamB);
      const baseA = clubMap.get(km.teamA!);
      const baseB = clubMap.get(km.teamB!);
      if (!baseA || !baseB) return state;
      const ca = { ...baseA, elo_rating: pA?.w16Elo ?? baseA.elo_rating };
      const cb = { ...baseB, elo_rating: pB?.w16Elo ?? baseB.elo_rating };
      const r = simulateMatch(ca, cb, meta, 3); // Bo5
      const winner = r.scoreA > r.scoreB ? km.teamA! : km.teamB!;
      const played: MMKnockoutMatch = {
        ...km,
        scoreA: r.scoreA, scoreB: r.scoreB,
        oddsA: r.oddsA, oddsB: r.oddsB,
        winner,
      };
      // Apply Elo change to participants
      let s2 = applyKnockoutResult(state, km.slot, played);
      const eloW = km.teamA === winner ? r.eloChangeA : -r.eloChangeA;
      s2 = { ...s2, participants: s2.participants.map(p => {
        if (p.clubId === winner) return { ...p, w16Elo: p.w16Elo + eloW };
        if (p.clubId === (winner === km.teamA ? km.teamB! : km.teamA!)) return { ...p, w16Elo: p.w16Elo - eloW };
        return p;
      })};
      return s2;
    }
  }

  return state;
}

// ─── Initialization ───────────────────────────────────────────────────────────

export function initMM(season: number): MMState {
  return {
    season,
    participants: [],
    swissRounds: [],
    knockoutMatches: [],
    champion: null,
    phase: 'pre',
  };
}

// ─── Refresh from league states ───────────────────────────────────────────────

export function refreshMMState(
  state: MMState,
  leagueStates: Record<string, LeagueSimState>,
  gameDate: string,
  clubMap: Map<string, Club>,
): MMState {
  if (state.phase !== 'pre') return state; // already initialized

  // Collect reps from leagues
  const knownIds = new Set(state.participants.map(p => p.clubId));
  const newParticipants = [...state.participants];

  for (const leagueId of MM_LEAGUES) {
    const ls = leagueStates[leagueId];
    if (!ls) continue;
    const rep = getMmRep(ls);
    if (!rep || knownIds.has(rep)) continue;
    knownIds.add(rep);
    newParticipants.push({
      clubId: rep,
      leagueId,
      w16Elo: getCurrentElo(ls, rep, clubMap),
      seedBand: 1, // placeholder, reassigned below
      swissWins: 0,
      swissLosses: 0,
      swissGameDiff: 0,
      qualified: false,
      eliminated: false,
      priorOpponents: [],
      qualResult: getQualResult(ls, rep),
    });
  }

  // Still waiting for participants
  if (newParticipants.length < 16) {
    return { ...state, participants: newParticipants };
  }

  // All 16 known — check if we're in W17+
  const week = getWeekNum(gameDate);
  if (week < 17) {
    return { ...state, participants: newParticipants };
  }

  // Assign seed bands by W16 Elo
  const sorted = [...newParticipants].sort((a, b) => b.w16Elo - a.w16Elo);
  const seededParticipants: MMParticipant[] = sorted.map((p, i) => ({
    ...p,
    seedBand: (Math.floor(i / 4) + 1) as 1 | 2 | 3 | 4,
  }));

  // Generate R1
  const r1 = createSubRound('R1', seededParticipants);
  if (!r1) return { ...state, participants: seededParticipants };

  return {
    ...state,
    participants: seededParticipants,
    swissRounds: [r1],
    phase: 'swiss',
  };
}

// ─── Auto-advance (for advanceTo) ─────────────────────────────────────────────

export function autoAdvanceMM(
  state: MMState,
  targetDate: string,
  seasonStart: string,
  meta: string[],
  clubMap: Map<string, Club>,
): MMState {
  if (state.phase === 'pre' || state.phase === 'completed') return state;

  let s = state;
  let changed = true;
  while (changed) {
    changed = false;
    // Swiss
    if (s.phase === 'swiss') {
      for (const sr of s.swissRounds) {
        if (sr.completed) continue;
        const srDate = subRoundDate(sr.key, seasonStart);
        if (targetDate < srDate) continue;
        for (const match of sr.matches) {
          if (match.winner) continue;
          s = advanceMMSingleMatch(s, match.id, meta, clubMap);
          changed = true;
        }
      }
    }
    // Knockout
    if (s.phase === 'knockout') {
      for (const km of s.knockoutMatches) {
        if (km.winner || !km.teamA || !km.teamB) continue;
        const koDate = knockoutMatchDate(km.slot, seasonStart);
        if (targetDate < koDate) continue;
        s = advanceMMSingleMatch(s, `ko_${km.slot}`, meta, clubMap);
        changed = true;
      }
    }
  }
  return s;
}

// ─── Exported helpers for UI ──────────────────────────────────────────────────

export function getSubRoundDef(key: string): SubRoundDef | undefined {
  return SUBROUNDS.find(d => d.key === key);
}

export function getKOSchedule(): Record<string, { week: number; day: string; side: 'A' | 'B' | null }> {
  return KO_SCHEDULE;
}

export { matchupKey };
