import type {
  Club, LeagueSimState, WTState,
  VSCState, VSCPath, VSCPathMatch, VSCKnockoutMatch, VSCParticipant,
} from '../types';
import { simulateMatch } from './combat';
import { getWeekNum, getDayOfWeek } from './calendar';
import { allClubs } from '../data/clubs';
import { sortWTGroupRecords } from './wt';

const clubMap = new Map(allClubs.map(c => [c.id, c]));

// ─── VSC slot allocation (fixed per PRD) ──────────────────────────────────────

const VSC_SLOTS: Record<string, { count: number; region: string }> = {
  L_CN:  { count: 3, region: 'APAC' },
  L_KR:  { count: 2, region: 'APAC' },
  L_TW:  { count: 1, region: 'APAC' },
  L_JP:  { count: 1, region: 'APAC' },
  L_SEA: { count: 1, region: 'APAC' },
  L_NEU: { count: 2, region: 'EMEA' },
  L_WEU: { count: 2, region: 'EMEA' },
  L_DE:  { count: 2, region: 'EMEA' },
  L_SEU: { count: 2, region: 'EMEA' },
  L_EEU: { count: 2, region: 'EMEA' },
  L_RU:  { count: 2, region: 'EMEA' },
  L_TR:  { count: 2, region: 'EMEA' },
  L_MEAF:{ count: 2, region: 'EMEA' },
  L_NA:  { count: 4, region: 'AMER' },
  L_SA:  { count: 2, region: 'AMER' },
  L_BR:  { count: 2, region: 'AMER' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function calcOdds(eloA: number, eloB: number) {
  const pA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  return {
    oddsA: Math.round(Math.max(1.01, 0.95 / pA) * 100) / 100,
    oddsB: Math.round(Math.max(1.01, 0.95 / (1 - pA)) * 100) / 100,
  };
}

function getClubElo(clubId: string, leagueStates: Record<string, LeagueSimState>): number {
  for (const state of Object.values(leagueStates)) {
    const rec = state.standings.find(r => r.clubId === clubId);
    if (rec) return rec.elo;
  }
  return clubMap.get(clubId)?.elo_rating ?? 1200;
}

// ─── VSC Qualification (teams just below WT cutoff) ───────────────────────────

function qualifyVSCTeams(
  leagueStates: Record<string, LeagueSimState>,
  wtParticipantIds: Set<string>,
): Array<{ clubId: string; leagueId: string; region: string }> {
  const result: Array<{ clubId: string; leagueId: string; region: string }> = [];

  for (const [leagueId, slotInfo] of Object.entries(VSC_SLOTS)) {
    const state = leagueStates[leagueId];
    if (!state) continue;
    const sorted = [...state.standings].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.setsFor - b.setsAgainst) - (a.setsFor - a.setsAgainst);
    });
    let count = 0;
    for (const rec of sorted) {
      if (count >= slotInfo.count) break;
      if (wtParticipantIds.has(rec.clubId)) continue;
      result.push({ clubId: rec.clubId, leagueId, region: slotInfo.region });
      count++;
    }
  }

  return result;
}

// ─── Path draw ────────────────────────────────────────────────────────────────

function drawPaths(
  teams: Array<{ clubId: string; leagueId: string; region: string }>,
  region: string,
  numPaths: number,
  leagueStates: Record<string, LeagueSimState>,
): VSCPath[] {
  const regionTeams = teams.filter(t => t.region === region);
  const sorted = regionTeams.sort((a, b) => getClubElo(b.clubId, leagueStates) - getClubElo(a.clubId, leagueStates));

  // Distribute into paths, trying to avoid same-league within a path
  const paths: Array<{ clubId: string; leagueId: string }[]> = Array.from({ length: numPaths }, () => []);
  const pathLeagues: Set<string>[] = Array.from({ length: numPaths }, () => new Set());

  // Pot-based distribution
  const teamsPerPath = Math.floor(sorted.length / numPaths);
  for (let pot = 0; pot < teamsPerPath; pot++) {
    const potTeams = shuffle(sorted.slice(pot * numPaths, (pot + 1) * numPaths));
    for (let pi = 0; pi < numPaths && potTeams.length > 0; pi++) {
      // Try to find a team that doesn't conflict
      let placed = false;
      for (let ti = 0; ti < potTeams.length; ti++) {
        if (!pathLeagues[pi].has(potTeams[ti].leagueId)) {
          const team = potTeams.splice(ti, 1)[0];
          paths[pi].push(team);
          pathLeagues[pi].add(team.leagueId);
          placed = true;
          break;
        }
      }
      if (!placed && potTeams.length > 0) {
        const team = potTeams.splice(0, 1)[0];
        paths[pi].push(team);
        pathLeagues[pi].add(team.leagueId);
      }
    }
  }

  const labels = 'ABCDEFGH';
  return paths.map((teamList, i) => {
    const teamIds = teamList.map(t => t.clubId);
    // SF: 1v4, 2v3 within path
    const [t1, t2, t3, t4] = teamIds;
    const sf1Odds = calcOdds(getClubElo(t1, leagueStates), getClubElo(t4 ?? t1, leagueStates));
    const sf2Odds = calcOdds(getClubElo(t2 ?? t1, leagueStates), getClubElo(t3 ?? t1, leagueStates));
    const matches: VSCPathMatch[] = [
      { id: `${region}_${labels[i]}_SF1`, stage: 'SF', teamA: t1, teamB: t4 ?? null, scoreA: 0, scoreB: 0, winner: null, oddsA: sf1Odds.oddsA, oddsB: sf1Odds.oddsB, format: 'Bo3' },
      { id: `${region}_${labels[i]}_SF2`, stage: 'SF', teamA: t2 ?? null, teamB: t3 ?? null, scoreA: 0, scoreB: 0, winner: null, oddsA: sf2Odds.oddsA, oddsB: sf2Odds.oddsB, format: 'Bo3' },
      { id: `${region}_${labels[i]}_F`, stage: 'Final', teamA: null, teamB: null, scoreA: 0, scoreB: 0, winner: null, oddsA: 0, oddsB: 0, format: 'Bo5' },
    ];
    return {
      id: `${region}_${labels[i]}`,
      region,
      teams: teamIds,
      matches,
      winner: null,
      completed: false,
    };
  });
}

// ─── Path simulation ──────────────────────────────────────────────────────────

function simPathMatch(m: VSCPathMatch, meta: string[], eloMap: Map<string, number>): VSCPathMatch {
  if (m.winner || !m.teamA || !m.teamB) return m;
  const bA = clubMap.get(m.teamA), bB = clubMap.get(m.teamB);
  if (!bA || !bB) return m;
  const cA = { ...bA, elo_rating: eloMap.get(m.teamA) ?? bA.elo_rating };
  const cB = { ...bB, elo_rating: eloMap.get(m.teamB) ?? bB.elo_rating };
  const winsNeeded = m.format === 'Bo3' ? 2 : 3;
  const r = simulateMatch(cA, cB, meta, winsNeeded, 1.5); // VSC prelims: 1.5x K
  eloMap.set(m.teamA, (eloMap.get(m.teamA) ?? 1200) + r.eloChangeA);
  eloMap.set(m.teamB, (eloMap.get(m.teamB) ?? 1200) - r.eloChangeA);
  return {
    ...m,
    scoreA: r.scoreA, scoreB: r.scoreB,
    oddsA: r.oddsA, oddsB: r.oddsB,
    winner: r.scoreA > r.scoreB ? m.teamA : m.teamB,
  };
}

function advancePath(path: VSCPath, meta: string[], eloMap: Map<string, number>): VSCPath {
  if (path.completed) return path;
  let ms = [...path.matches];

  // Sim SFs
  ms[0] = simPathMatch(ms[0], meta, eloMap);
  ms[1] = simPathMatch(ms[1], meta, eloMap);

  // Feed to Final
  if (ms[0].winner && !ms[2].teamA) {
    ms[2] = { ...ms[2], teamA: ms[0].winner };
  }
  if (ms[1].winner && !ms[2].teamB) {
    ms[2] = { ...ms[2], teamB: ms[1].winner };
    if (ms[2].teamA && ms[2].teamB) {
      const o = calcOdds(eloMap.get(ms[2].teamA) ?? 1200, eloMap.get(ms[2].teamB) ?? 1200);
      ms[2] = { ...ms[2], oddsA: o.oddsA, oddsB: o.oddsB };
    }
  }
  ms[2] = simPathMatch(ms[2], meta, eloMap);

  const winner = ms[2].winner ?? null;
  return { ...path, matches: ms, winner, completed: winner !== null };
}

// ─── Final bracket generation ─────────────────────────────────────────────────

function generateVSCKnockout(
  pathWinners: Array<{ clubId: string; source: string }>,
  wt3rdTeams: Array<{ clubId: string; source: string }>,
  eloMap: Map<string, number>,
): { participants: VSCParticipant[]; matches: VSCKnockoutMatch[] } {
  // Sort path winners and WT 3rd by Elo
  const pwSorted = [...pathWinners].sort((a, b) => (eloMap.get(b.clubId) ?? 0) - (eloMap.get(a.clubId) ?? 0));
  const wtSorted = [...wt3rdTeams].sort((a, b) => (eloMap.get(b.clubId) ?? 0) - (eloMap.get(a.clubId) ?? 0));

  // R16 pairing: path winner vs WT 3rd (seeded)
  const r16: VSCKnockoutMatch[] = [];
  for (let i = 0; i < 8; i++) {
    const pw = pwSorted[i];
    const wt = wtSorted[7 - i]; // best path vs worst WT 3rd
    if (!pw || !wt) continue;
    const o = calcOdds(eloMap.get(pw.clubId) ?? 1200, eloMap.get(wt.clubId) ?? 1200);
    r16.push({
      id: `VSC_R16_${i + 1}`, stage: 'R16',
      teamA: pw.clubId, teamB: wt.clubId,
      scoreA: 0, scoreB: 0, winner: null,
      oddsA: o.oddsA, oddsB: o.oddsB,
      qualTag: '#Path vs #WT',
    });
  }

  // QF/SF/GF placeholders
  const mk = (id: string, stage: VSCKnockoutMatch['stage']): VSCKnockoutMatch => ({
    id, stage, teamA: null, teamB: null, scoreA: 0, scoreB: 0, winner: null, oddsA: 0, oddsB: 0, qualTag: '',
  });
  const qf = [mk('VSC_QF1', 'QF'), mk('VSC_QF2', 'QF'), mk('VSC_QF3', 'QF'), mk('VSC_QF4', 'QF')];
  const sf = [mk('VSC_SF1', 'SF'), mk('VSC_SF2', 'SF')];
  const gf = [mk('VSC_GF', 'GF')];

  const allMatches = [...r16, ...qf, ...sf, ...gf];

  // Build participants
  const participants: VSCParticipant[] = [
    ...pwSorted.map(pw => ({
      clubId: pw.clubId,
      leagueId: clubMap.get(pw.clubId)?.league_id ?? '',
      source: 'path' as const,
      sourceDetail: pw.source,
      elo: eloMap.get(pw.clubId) ?? 1200,
      preVSCElo: eloMap.get(pw.clubId) ?? 1200,
    })),
    ...wtSorted.map(wt => ({
      clubId: wt.clubId,
      leagueId: clubMap.get(wt.clubId)?.league_id ?? '',
      source: 'wt3rd' as const,
      sourceDetail: wt.source,
      elo: eloMap.get(wt.clubId) ?? 1200,
      preVSCElo: eloMap.get(wt.clubId) ?? 1200,
    })),
  ];

  return { participants, matches: allMatches };
}

// ─── Knockout simulation ──────────────────────────────────────────────────────

function simVSCKOMatch(m: VSCKnockoutMatch, meta: string[], eloMap: Map<string, number>): VSCKnockoutMatch {
  if (m.winner || !m.teamA || !m.teamB) return m;
  const bA = clubMap.get(m.teamA), bB = clubMap.get(m.teamB);
  if (!bA || !bB) return m;
  const cA = { ...bA, elo_rating: eloMap.get(m.teamA) ?? bA.elo_rating };
  const cB = { ...bB, elo_rating: eloMap.get(m.teamB) ?? bB.elo_rating };
  const winsNeeded = m.stage === 'R16' ? 2 : 3; // R16 Bo3, QF+ Bo5
  const r = simulateMatch(cA, cB, meta, winsNeeded, 3); // VSC KO: 3x K
  eloMap.set(m.teamA, (eloMap.get(m.teamA) ?? 1200) + r.eloChangeA);
  eloMap.set(m.teamB, (eloMap.get(m.teamB) ?? 1200) - r.eloChangeA);
  return {
    ...m,
    scoreA: r.scoreA, scoreB: r.scoreB,
    oddsA: r.oddsA, oddsB: r.oddsB,
    winner: r.scoreA > r.scoreB ? m.teamA : m.teamB,
  };
}

function feedVSCKnockout(ko: VSCKnockoutMatch[], eloMap: Map<string, number>): VSCKnockoutMatch[] {
  const ms = [...ko];
  const set = (id: string, field: 'teamA' | 'teamB', val: string) => {
    const idx = ms.findIndex(m => m.id === id);
    if (idx >= 0 && !ms[idx][field]) {
      ms[idx] = { ...ms[idx], [field]: val };
      if (ms[idx].teamA && ms[idx].teamB) {
        const o = calcOdds(eloMap.get(ms[idx].teamA!) ?? 1200, eloMap.get(ms[idx].teamB!) ?? 1200);
        ms[idx] = { ...ms[idx], oddsA: o.oddsA, oddsB: o.oddsB };
      }
    }
  };
  const w = (id: string) => ms.find(m => m.id === id)?.winner;
  // R16 → QF
  if (w('VSC_R16_1')) set('VSC_QF1', 'teamA', w('VSC_R16_1')!);
  if (w('VSC_R16_2')) set('VSC_QF1', 'teamB', w('VSC_R16_2')!);
  if (w('VSC_R16_3')) set('VSC_QF2', 'teamA', w('VSC_R16_3')!);
  if (w('VSC_R16_4')) set('VSC_QF2', 'teamB', w('VSC_R16_4')!);
  if (w('VSC_R16_5')) set('VSC_QF3', 'teamA', w('VSC_R16_5')!);
  if (w('VSC_R16_6')) set('VSC_QF3', 'teamB', w('VSC_R16_6')!);
  if (w('VSC_R16_7')) set('VSC_QF4', 'teamA', w('VSC_R16_7')!);
  if (w('VSC_R16_8')) set('VSC_QF4', 'teamB', w('VSC_R16_8')!);
  // QF → SF
  if (w('VSC_QF1')) set('VSC_SF1', 'teamA', w('VSC_QF1')!);
  if (w('VSC_QF2')) set('VSC_SF1', 'teamB', w('VSC_QF2')!);
  if (w('VSC_QF3')) set('VSC_SF2', 'teamA', w('VSC_QF3')!);
  if (w('VSC_QF4')) set('VSC_SF2', 'teamB', w('VSC_QF4')!);
  // SF → GF
  if (w('VSC_SF1')) set('VSC_GF', 'teamA', w('VSC_SF1')!);
  if (w('VSC_SF2')) set('VSC_GF', 'teamB', w('VSC_SF2')!);
  return ms;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

// Paths: SFs at W39 Tue-Thu, Finals at W40 Mon-Thu
function pathsReady(gameDate: string): boolean {
  const week = getWeekNum(gameDate);
  const dow = getDayOfWeek(gameDate);
  return week > 39 || (week === 39 && dow >= 1);
}

// VSC KO schedule
function vscKOReady(gameDate: string, stage: string, matchIdx: number): boolean {
  const week = getWeekNum(gameDate);
  const dow = getDayOfWeek(gameDate);
  // R16 Day1: W41 Mon (4 Bo3), R16 Day2: W41 Sat (4 Bo3)
  if (stage === 'R16') return matchIdx < 4
    ? (week > 41 || (week === 41 && dow >= 0))
    : (week > 41 || (week === 41 && dow >= 5));
  // QF: W41 Sun, W42 Mon-Wed
  if (stage === 'QF') {
    const days = [{ w: 41, d: 6 }, { w: 42, d: 0 }, { w: 42, d: 1 }, { w: 42, d: 2 }];
    const slot = days[matchIdx];
    return slot ? (week > slot.w || (week === slot.w && dow >= slot.d)) : false;
  }
  // SF: W43 Mon, W43 Wed
  if (stage === 'SF') return week > 43 || (week === 43 && dow >= (matchIdx === 0 ? 0 : 2));
  // GF: W43 Sat
  if (stage === 'GF') return week > 43 || (week === 43 && dow >= 5);
  return false;
}

// ─── Initialization ───────────────────────────────────────────────────────────

export function initVSC(season: number): VSCState {
  return {
    season,
    paths: [],
    pathParticipants: [],
    finalParticipants: [],
    frozenParticipants: [],
    knockoutMatches: [],
    champion: null,
    phase: 'pre',
  };
}

// ─── Auto-advance ─────────────────────────────────────────────────────────────

export function autoAdvanceVSC(
  state: VSCState,
  targetDate: string,
  meta: string[],
  leagueStates: Record<string, LeagueSimState>,
  wtState: WTState,
): VSCState {
  const week = getWeekNum(targetDate);
  if (week < 38) return state;

  let s = { ...state };
  const eloMap = new Map<string, number>();
  // Init eloMap from league standings
  for (const ls of Object.values(leagueStates)) {
    for (const rec of ls.standings) eloMap.set(rec.clubId, rec.elo);
  }

  // Initialize paths at W38+
  if (s.phase === 'pre' && week >= 38 && wtState.participants.length >= 32) {
    const wtIds = new Set(wtState.participants.map(p => p.clubId));
    const vscTeams = qualifyVSCTeams(leagueStates, wtIds);
    if (vscTeams.length < 32) return s;

    const emeaPaths = drawPaths(vscTeams, 'EMEA', 4, leagueStates);
    const apacPaths = drawPaths(vscTeams, 'APAC', 2, leagueStates);
    const amerPaths = drawPaths(vscTeams, 'AMER', 2, leagueStates);

    s = {
      ...s,
      pathParticipants: vscTeams,
      paths: [...emeaPaths, ...apacPaths, ...amerPaths],
      phase: 'paths',
    };
  }

  // Advance paths (W39-40)
  if (s.phase === 'paths' && pathsReady(targetDate)) {
    const newPaths = s.paths.map(p => advancePath(p, meta, eloMap));
    const allDone = newPaths.every(p => p.completed);
    s = { ...s, paths: newPaths, phase: allDone ? 'paths_done' : 'paths' };
  }

  // Generate final bracket after paths done + WT groups done
  if (s.phase === 'paths_done' && s.knockoutMatches.length === 0) {
    const wtGroupsDone = wtState.groups.length > 0 && wtState.groups.every(g => g.completed);
    if (wtGroupsDone) {
      const pathWinners = s.paths.filter(p => p.winner).map(p => ({
        clubId: p.winner!,
        source: `${p.region} Path ${p.id.split('_')[1]}`,
      }));

      const wt3rdTeams: Array<{ clubId: string; source: string }> = [];
      for (const g of wtState.groups) {
        const sorted = sortWTGroupRecords(g.records);
        if (sorted[2]) wt3rdTeams.push({ clubId: sorted[2].clubId, source: `WT Group ${g.id} 3rd` });
      }

      if (pathWinners.length >= 8 && wt3rdTeams.length >= 8) {
        const { participants, matches } = generateVSCKnockout(pathWinners, wt3rdTeams, eloMap);
        s = {
          ...s,
          finalParticipants: participants,
          frozenParticipants: participants.map(p => ({ ...p })),
          knockoutMatches: matches,
          phase: 'knockout_r16',
        };
      }
    }
  }

  // Advance knockout
  if (s.phase.startsWith('knockout_')) {
    let ko = [...s.knockoutMatches];
    let changed = false;

    // R16 (8 matches)
    for (let i = 0; i < 8; i++) {
      if (!ko[i].winner && ko[i].teamA && ko[i].teamB && vscKOReady(targetDate, 'R16', i)) {
        ko = [...ko]; ko[i] = simVSCKOMatch(ko[i], meta, eloMap); changed = true;
      }
    }
    // QF (4 matches, idx 8-11)
    for (let i = 0; i < 4; i++) {
      const idx = 8 + i;
      if (!ko[idx].winner && ko[idx].teamA && ko[idx].teamB && vscKOReady(targetDate, 'QF', i)) {
        ko = [...ko]; ko[idx] = simVSCKOMatch(ko[idx], meta, eloMap); changed = true;
      }
    }
    // SF (2 matches, idx 12-13)
    for (let i = 0; i < 2; i++) {
      const idx = 12 + i;
      if (!ko[idx].winner && ko[idx].teamA && ko[idx].teamB && vscKOReady(targetDate, 'SF', i)) {
        ko = [...ko]; ko[idx] = simVSCKOMatch(ko[idx], meta, eloMap); changed = true;
      }
    }
    // GF (idx 14)
    if (ko[14] && !ko[14].winner && ko[14].teamA && ko[14].teamB && vscKOReady(targetDate, 'GF', 0)) {
      ko = [...ko]; ko[14] = simVSCKOMatch(ko[14], meta, eloMap); changed = true;
    }

    if (changed) {
      ko = feedVSCKnockout(ko, eloMap);
      const champion = ko[14]?.winner ?? null;
      const phase = champion ? 'completed' as const :
        ko.slice(0, 8).every(m => m.winner) ? (
          ko.slice(8, 12).every(m => m.winner) ? (
            ko.slice(12, 14).every(m => m.winner) ? 'knockout_gf' as const : 'knockout_sf' as const
          ) : 'knockout_qf' as const
        ) : 'knockout_r16' as const;
      s = { ...s, knockoutMatches: ko, champion, phase };
    }

    // Write back Elo to participants
    s = { ...s, finalParticipants: s.finalParticipants.map(p => ({
      ...p, elo: eloMap.get(p.clubId) ?? p.elo,
    }))};
  }

  return s;
}
