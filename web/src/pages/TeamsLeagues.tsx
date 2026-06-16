import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useStore } from '../store/store';
import { leagueConfigs, clubsByLeague, clubsByDivision, clubById, leagueConfigById } from '../data/clubs';
import { TierBadge } from '../components/ui/TierBadge';
import { TeamDot } from '../components/ui/TeamDot';
import { SeriesScore } from '../components/ui/SeriesScore';
import type { TeamRecord, BracketMatch, QualifierState, PlayoffSeries, PlayoffState, LeagueSimState } from '../types';
import { meafRanksFromSplit } from '../engine/bracket';

const REGIONS = ['APAC', 'EMEA', 'AMER'];
type TabKey = 'standings' | 'qualifier' | 'playoffs' | 'results' | 'teams' | 'season_review';

const REGION_CUP: Record<string, { id: string; label: string; color: string }> = {
  APAC: { id: 'APEX', label: 'APEX', color: 'text-amber-400 hover:text-amber-300' },
  EMEA: { id: 'EGT',  label: 'EGT',  color: 'text-blue-400 hover:text-blue-300'  },
  AMER: { id: 'COPA', label: 'COPA', color: 'text-green-400 hover:text-green-300' },
};

// ─── Odds helpers ─────────────────────────────────────────────────────────────

/** Red-shade class for an upset winner's odds. Returns '' when not applicable. */
function upsetOddsClass(winnerOdds: number, isWinner: boolean, isUpset: boolean): string {
  if (!isWinner || !isUpset) return 'text-slate-600';
  if (winnerOdds >= 5.0) return 'text-red-500 font-bold';
  if (winnerOdds >= 3.0) return 'text-red-400';
  if (winnerOdds >= 2.0) return 'text-orange-400';
  return 'text-yellow-400';
}

function calcOdds(eloA: number, eloB: number) {
  const pA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  return {
    oddsA: Math.round(Math.max(1.01, 0.95 / pA) * 100) / 100,
    oddsB: Math.round(Math.max(1.01, 0.95 / (1 - pA)) * 100) / 100,
  };
}

function getTeamElo(id: string | null, state?: LeagueSimState): number {
  if (!id || !state) return 1000;
  const fromFull = state.fullLeagueState?.standings.find(r => r.clubId === id)?.elo;
  if (fromFull) return fromFull;
  for (const div of Object.values(state.divisionStates ?? {})) {
    const hit = div.standings.find(r => r.clubId === id)?.elo;
    if (hit) return hit;
  }
  return state.standings.find(r => r.clubId === id)?.elo ?? 1000;
}

// ─── Phase badge ──────────────────────────────────────────────────────────────

const PHASE_BADGES: Record<string, { label: string; cls: string }> = {
  first_half:          { label: '1st Half – DRR',    cls: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' },
  qualifier:           { label: 'MM Qualifier',      cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  qualifier_done:      { label: 'Qualifier ✓',       cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  second_half:         { label: '2nd Half – SRR',    cls: 'bg-tier-s/10 text-tier-s border-tier-s/20' },
  playoffs:            { label: 'Playoffs',           cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  complete:            { label: 'Season Done',        cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  spring:              { label: 'Spring Regular',     cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  spring_playoffs:     { label: 'Spring Playoffs',   cls: 'bg-green-500/10 text-green-300 border-green-500/20' },
  spring_playoffs_done:{ label: 'Spring Done',       cls: 'bg-green-500/10 text-green-300 border-green-500/20' },
  summer:              { label: 'Summer Regular',     cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  summer_playoffs:     { label: 'Summer Playoffs',   cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  // L_MEAF
  split1:              { label: 'Split 1',            cls: 'bg-tier-a/10 text-tier-a border-tier-a/20' },
  split2:              { label: 'Split 2',            cls: 'bg-tier-a/10 text-tier-a border-tier-a/20' },
  split3:              { label: 'Split 3',            cls: 'bg-tier-a/10 text-tier-a border-tier-a/20' },
  mm_qualifier:        { label: 'MM Qualifier',       cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  mm_qualifier_done:   { label: 'MM Qual ✓',          cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  split4:              { label: 'Split 4',            cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  split5:              { label: 'Split 5',            cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  final_playoff:       { label: 'Final Playoff',      cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
};

// ─── Standings table ──────────────────────────────────────────────────────────

function StandingsTable({ records }: { records: TeamRecord[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-500 border-b border-bg-border">
          <th className="text-left py-2 w-6">#</th>
          <th className="text-left py-2">Team</th>
          <th className="text-center py-2 w-10">G</th>
          <th className="text-center py-2 w-10">W</th>
          <th className="text-center py-2 w-10">L</th>
          <th className="text-center py-2 w-14">SD</th>
          <th className="text-center py-2 w-14">ScD</th>
        </tr>
      </thead>
      <tbody>
        {records.map((rec, idx) => {
          const club = clubById(rec.clubId);
          if (!club) return null;
          const sd  = rec.setsFor - rec.setsAgainst;
          const scd = rec.momFor  - rec.momAgainst;
          return (
            <tr key={rec.clubId} className="border-b border-bg-border/50 hover:bg-bg-hover">
              <td className="py-2 text-slate-500 text-xs">{idx + 1}</td>
              <td className="py-2">
                <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s">
                  <TeamDot club={club} showAbbr={false} />
                  <span className="text-slate-200">{club.name}</span>
                </Link>
              </td>
              <td className="py-2 text-center text-slate-400">{rec.wins + rec.losses}</td>
              <td className="py-2 text-center text-status-up font-bold">{rec.wins}</td>
              <td className="py-2 text-center text-status-down">{rec.losses}</td>
              <td className={`py-2 text-center text-xs ${sd >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                {sd >= 0 ? '+' : ''}{sd}
              </td>
              <td className={`py-2 text-center text-xs ${scd >= 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                {scd >= 0 ? '+' : ''}{scd}
              </td>
            </tr>
          );
        })}
        {records.length === 0 && (
          <tr><td colSpan={7} className="py-8 text-center text-slate-500">Simulate a phase to see standings</td></tr>
        )}
      </tbody>
    </table>
  );
}

function StandingsTableNEUWEU({ records }: { records: TeamRecord[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-500 border-b border-bg-border">
          <th className="text-left py-2 w-6">#</th>
          <th className="text-left py-2">Team</th>
          <th className="text-center py-2 w-10">G</th>
          <th className="text-center py-2 w-10">W</th>
          <th className="text-center py-2 w-10">L</th>
          <th className="text-center py-2 w-14">ScD</th>
          <th className="text-center py-2 w-14">ScG</th>
        </tr>
      </thead>
      <tbody>
        {records.map((rec, idx) => {
          const club = clubById(rec.clubId);
          if (!club) return null;
          const scd = rec.momFor - rec.momAgainst;
          return (
            <tr key={rec.clubId} className="border-b border-bg-border/50 hover:bg-bg-hover">
              <td className="py-2 text-slate-500 text-xs">{idx + 1}</td>
              <td className="py-2">
                <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s">
                  <TeamDot club={club} showAbbr={false} />
                  <span className="text-slate-200">{club.name}</span>
                </Link>
              </td>
              <td className="py-2 text-center text-slate-400">{rec.wins + rec.losses}</td>
              <td className="py-2 text-center text-status-up font-bold">{rec.wins}</td>
              <td className="py-2 text-center text-status-down">{rec.losses}</td>
              <td className={`py-2 text-center text-xs ${scd >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                {scd >= 0 ? '+' : ''}{scd}
              </td>
              <td className="py-2 text-center text-xs text-slate-400">{rec.momFor}</td>
            </tr>
          );
        })}
        {records.length === 0 && (
          <tr><td colSpan={7} className="py-8 text-center text-slate-500">Simulate a phase to see standings</td></tr>
        )}
      </tbody>
    </table>
  );
}

// ─── Season Review ────────────────────────────────────────────────────────────

// WT slots per league (coeff ranks 1–4: 3 slots, 5–8: 2 slots, 9–16: 1 slot)
const WT_SLOTS: Record<string, number> = {
  L_KR: 3, L_NA: 3, L_CN: 3, L_NEU: 3,
  L_WEU: 2, L_DE: 2, L_SEU: 2, L_TW: 2,
  L_RU: 1, L_BR: 1, L_SEA: 1, L_JP: 1,
  L_EEU: 1, L_SA: 1, L_TR: 1, L_MEAF: 1,
};

// VSC regional qualifier slots per league
const VSC_SLOTS: Record<string, number> = {
  L_CN: 3, L_KR: 2, L_NA: 4, L_BR: 2, L_SA: 2,
  L_TW: 1, L_JP: 1, L_SEA: 1,
  L_NEU: 2, L_WEU: 2, L_DE: 2, L_SEU: 2,
  L_EEU: 2, L_RU: 2, L_TR: 2, L_MEAF: 2,
};

// Compute dynamic WT/VSC badge map applying cup champion cascade
function computeLeagueBadges(
  leagueId: string,
  orderedTeamIds: string[],
  cupChampions: Record<string, string | null | undefined>,
): Record<string, string[]> {
  const wtBase  = WT_SLOTS[leagueId]  ?? 0;
  const vscBase = VSC_SLOTS[leagueId] ?? 0;
  if (wtBase === 0 && vscBase === 0) return {};

  const wtSet = new Set<string>(orderedTeamIds.slice(0, wtBase));

  for (const cupId of ['MM', 'APEX', 'EGT', 'COPA']) {
    const champion = cupChampions[cupId];
    if (!champion) continue;
    if (clubById(champion)?.league_id !== leagueId) continue;
    if (wtSet.has(champion)) {
      for (const id of orderedTeamIds) {
        if (!wtSet.has(id)) { wtSet.add(id); break; }
      }
    } else {
      wtSet.add(champion);
    }
  }

  const result: Record<string, string[]> = {};
  let vscLeft = vscBase;
  for (const id of orderedTeamIds) {
    if (wtSet.has(id)) result[id] = ['WT'];
    else if (vscLeft > 0) { result[id] = ['VSC']; vscLeft--; }
  }
  return result;
}

const STAGE_LABELS: Record<string, string> = {
  champion: 'Champion',
  finalist: 'Runner-up',
  divfinal: 'Div Final',
  sf:       'Semifinal',
  qf:       'Quarterfinal',
  playin:   'Play-In',
  upper:    'Upper Final',
  lower:    'Lower',
  finalq:   'Final Qualifier',
  regular:  '',
};

interface FinalEntry {
  rank: number;
  clubId: string;
  stage: string;
  record: TeamRecord | undefined;
  badges: string[];
}

function computeFinalRankings(leagueId: string, state: LeagueSimState): FinalEntry[] {
  const regStandings = state.fullLeagueState?.standings ?? state.standings;

  const getRecord = (id: string): TeamRecord | undefined =>
    regStandings.find(r => r.clubId === id) ??
    state.standings.find(r => r.clubId === id);

  const regRankOf = (id: string) => regStandings.findIndex(r => r.clubId === id);
  const sortByReg = (ids: string[]) => [...ids].sort((a, b) => regRankOf(a) - regRankOf(b));
  const loserOf = (s: PlayoffSeries | undefined): string | null =>
    !s?.winner ? null : (s.winner === s.teamA ? s.teamB : s.teamA);

  const make = (id: string, rank: number, stage: string): FinalEntry => ({
    rank, clubId: id, stage,
    record: getRecord(id),
    badges: [],
  });

  const po = state.playoffs;

  if (!po?.completed) {
    return regStandings.map((r, i) => make(r.clubId, i + 1, 'regular'));
  }

  const entries: FinalEntry[] = [];
  const gf = po.series.find(s => s.stage === 'grandfinal');
  const dfSeries = po.series.filter(s => s.stage === 'divfinal');
  const sfSeries = po.series.filter(s => s.stage === 'sf');
  const qfSeries = po.series.filter(s => s.stage === 'qf');

  if (gf?.winner) entries.push(make(gf.winner, 1, 'champion'));
  const gfLoser = loserOf(gf);
  if (gfLoser)    entries.push(make(gfLoser, 2, 'finalist'));

  const dfLosers = sortByReg(dfSeries.map(loserOf).filter(Boolean) as string[]);
  dfLosers.forEach((id, i) => entries.push(make(id, 3 + i, 'divfinal')));

  const sfLosers = sortByReg(sfSeries.map(loserOf).filter(Boolean) as string[]);
  sfLosers.forEach((id, i) => entries.push(make(id, 3 + dfLosers.length + i, 'sf')));

  const qfLosers = sortByReg(qfSeries.map(loserOf).filter(Boolean) as string[]);
  qfLosers.forEach((id, i) => entries.push(make(id, 3 + dfLosers.length + sfLosers.length + i, 'qf')));

  const playinSeries = po.series.filter(s => s.stage === 'playin');
  const playinLosers = sortByReg(playinSeries.map(loserOf).filter(Boolean) as string[]);
  playinLosers.forEach((id, i) =>
    entries.push(make(id, 3 + dfLosers.length + sfLosers.length + qfLosers.length + i, 'playin'))
  );

  const ranked = new Set(entries.map(e => e.clubId));
  const startRank = entries.length + 1;
  regStandings
    .filter(r => !ranked.has(r.clubId))
    .forEach((r, i) => entries.push(make(r.clubId, startRank + i, 'regular')));

  return entries;
}

function SeasonReview({ leagueId, state }: { leagueId: string; state: LeagueSimState }) {
  const cupStates = useStore(s => s.cupStates);
  const entries = computeFinalRankings(leagueId, state);

  if (entries.length === 0) {
    return <p className="text-center text-slate-500 py-12 text-sm">Season not yet started</p>;
  }

  const orderedTeamIds = entries.map(e => e.clubId);
  const cupChampions = {
    APEX: cupStates['APEX']?.champion,
    EGT:  cupStates['EGT']?.champion,
    COPA: cupStates['COPA']?.champion,
  };
  const badgeMap = computeLeagueBadges(leagueId, orderedTeamIds, cupChampions);

  return (
    <div>
      {state.playoffs && !state.playoffs.completed && (
        <p className="text-xs text-amber-500/80 mb-3 px-1">Season in progress — rankings reflect current standings</p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-bg-border">
            <th className="text-left py-2 w-6">#</th>
            <th className="text-left py-2">Team</th>
            <th className="text-left py-2 w-28">Result</th>
            <th className="text-center py-2 w-12">SW</th>
            <th className="text-center py-2 w-12">SL</th>
            <th className="text-center py-2 w-14">SD</th>
            <th className="text-center py-2 w-14">ScD</th>
            <th className="text-left py-2 w-24">Int'l</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => {
            const club = clubById(e.clubId);
            if (!club) return null;
            const r = e.record;
            const sd  = r ? r.setsFor - r.setsAgainst : null;
            const scd = r ? r.momFor  - r.momAgainst  : null;
            const isChamp = e.stage === 'champion';
            return (
              <tr
                key={e.clubId}
                className={`border-b border-bg-border/50 hover:bg-bg-hover ${isChamp ? 'bg-tier-s/5' : ''}`}
              >
                <td className="py-2 text-slate-500 text-xs font-mono">{e.rank}</td>
                <td className="py-2">
                  <Link to={`/teams/${e.clubId}`} className="flex items-center gap-2 hover:text-tier-s">
                    <TeamDot club={club} showAbbr={false} />
                    <span className={isChamp ? 'text-tier-s font-bold' : 'text-slate-200'}>{club.name}</span>
                    {isChamp && <span className="text-sm leading-none">🏆</span>}
                  </Link>
                </td>
                <td className="py-2 text-xs text-slate-500">{STAGE_LABELS[e.stage] ?? ''}</td>
                <td className="py-2 text-center text-xs text-status-up">{r?.setsFor ?? '—'}</td>
                <td className="py-2 text-center text-xs text-status-down">{r?.setsAgainst ?? '—'}</td>
                <td className={`py-2 text-center text-xs ${sd != null && sd >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                  {sd != null ? `${sd >= 0 ? '+' : ''}${sd}` : '—'}
                </td>
                <td className={`py-2 text-center text-xs ${scd != null && scd >= 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                  {scd != null ? `${scd >= 0 ? '+' : ''}${scd}` : '—'}
                </td>
                <td className="py-2">
                  <div className="flex gap-1 flex-wrap">
                    {(badgeMap[e.clubId] ?? []).map(b => (
                      <span key={b} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        b === 'WT'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      }`}>
                        {b}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Bracket match card ───────────────────────────────────────────────────────

function BracketMatchCard({ m, state }: { m: BracketMatch; state?: LeagueSimState }) {
  const clubA = m.teamA ? clubById(m.teamA) : null;
  const clubB = m.teamB ? clubById(m.teamB) : null;
  const pending = !m.result && m.teamA && m.teamB;
  const odds = pending ? calcOdds(getTeamElo(m.teamA, state), getTeamElo(m.teamB, state)) : null;

  // Odds footer data (pre-match computed OR post-match stored)
  const footerOddsA = odds?.oddsA ?? m.result?.oddsA;
  const footerOddsB = odds?.oddsB ?? m.result?.oddsB;
  const showOddsFooter = footerOddsA !== undefined && footerOddsB !== undefined;
  const winnerIsA = m.winner === m.teamA;
  const winnerIsB = m.winner === m.teamB;
  const bmcWinnerOdds = winnerIsA ? footerOddsA : winnerIsB ? footerOddsB : undefined;
  const bmcLoserOdds  = winnerIsA ? footerOddsB : winnerIsB ? footerOddsA : undefined;
  const bmcIsUpset = bmcWinnerOdds !== undefined && bmcLoserOdds !== undefined && bmcWinnerOdds > bmcLoserOdds;

  return (
    <div className="border border-bg-border rounded bg-bg-base w-48 shadow-sm text-xs overflow-hidden select-none">
      {/* Stage label */}
      <div className="px-2 py-0.5 text-center text-slate-600 border-b border-bg-border/50 uppercase tracking-wider text-[10px]">
        {m.stage}
      </div>

      {/* Team A */}
      <div className={`px-2 py-1.5 flex items-center justify-between gap-1 ${m.winner === m.teamA ? 'bg-tier-s/10' : m.winner ? 'opacity-40' : ''}`}>
        <span className={`font-medium truncate ${m.winner === m.teamA ? 'text-white' : 'text-slate-300'}`}>
          {clubA?.abbr ?? m.teamA ?? '???'}
        </span>
        {m.result ? (
          <span className={`font-bold tabular-nums ${m.result.scoreA > m.result.scoreB ? 'text-tier-s' : 'text-slate-500'}`}>
            {m.result.scoreA}
          </span>
        ) : odds ? (
          <span className="text-slate-500 tabular-nums">{odds.oddsA.toFixed(2)}</span>
        ) : (
          <span className="text-slate-700">—</span>
        )}
      </div>

      <div className="border-t border-bg-border/30" />

      {/* Team B */}
      <div className={`px-2 py-1.5 flex items-center justify-between gap-1 ${m.winner === m.teamB ? 'bg-tier-s/10' : m.winner ? 'opacity-40' : ''}`}>
        <span className={`font-medium truncate ${m.winner === m.teamB ? 'text-white' : 'text-slate-300'}`}>
          {clubB?.abbr ?? m.teamB ?? '???'}
        </span>
        {m.result ? (
          <span className={`font-bold tabular-nums ${m.result.scoreB > m.result.scoreA ? 'text-tier-s' : 'text-slate-500'}`}>
            {m.result.scoreB}
          </span>
        ) : odds ? (
          <span className="text-slate-500 tabular-nums">{odds.oddsB.toFixed(2)}</span>
        ) : (
          <span className="text-slate-700">—</span>
        )}
      </div>

      {/* Odds footer: always shown when available */}
      {showOddsFooter && (
        <div className="px-2 py-0.5 border-t border-bg-border/30 flex justify-between text-[10px]">
          <span className={upsetOddsClass(footerOddsA!, winnerIsA, bmcIsUpset)}>{footerOddsA!.toFixed(2)}</span>
          <span className="text-slate-700">{pending ? 'pre-odds' : 'odds'}</span>
          <span className={upsetOddsClass(footerOddsB!, winnerIsB, bmcIsUpset)}>{footerOddsB!.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Qualifier bracket (SVG-based) ────────────────────────────────────────────

const CARD_H = 76;
const SLOT_H = 120;
const COL_W = 196;
const COL_GAP = 44;
const LINE_CLR = '#334155';

function QualBracket({ q, state }: { q: QualifierState; state?: LeagueSimState }) {
  const m = q.matches;
  const totalH = 4 * SLOT_H;
  const totalW = 3 * COL_W + 2 * COL_GAP;

  // Y centers per column
  const c0y = [0, 1, 2, 3].map(i => SLOT_H * i + SLOT_H / 2);
  const c1y = [SLOT_H * 1.0, SLOT_H * 3.0];
  const c2y = SLOT_H * 2.0;

  // X left edges per column
  const c0x = 0;
  const c1x = COL_W + COL_GAP;
  const c2x = 2 * (COL_W + COL_GAP);

  const mx1 = c0x + COL_W + COL_GAP / 2; // midpoint between col0 and col1
  const mx2 = c1x + COL_W + COL_GAP / 2; // midpoint between col1 and col2

  // Card top = center - CARD_H/2
  function top(cy: number) { return cy - CARD_H / 2; }

  return (
    <div className="relative overflow-auto" style={{ minHeight: totalH + 20, minWidth: totalW + 20 }}>
      {/* SVG connector lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={totalW}
        height={totalH}
      >
        {/* col0 → col1: W group (m[0], m[2]) → m[4] */}
        <line x1={c0x + COL_W} y1={c0y[0]} x2={mx1} y2={c0y[0]} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={mx1} y1={c0y[0]} x2={mx1} y2={c1y[0]} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={mx1} y1={c1y[0]} x2={c1x} y2={c1y[0]} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={c0x + COL_W} y1={c0y[1]} x2={mx1} y2={c0y[1]} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={mx1} y1={c0y[1]} x2={mx1} y2={c1y[0]} stroke={LINE_CLR} strokeWidth="1.5" />

        {/* col0 → col1: E group (m[1], m[3]) → m[5] */}
        <line x1={c0x + COL_W} y1={c0y[2]} x2={mx1} y2={c0y[2]} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={mx1} y1={c0y[2]} x2={mx1} y2={c1y[1]} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={mx1} y1={c1y[1]} x2={c1x} y2={c1y[1]} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={c0x + COL_W} y1={c0y[3]} x2={mx1} y2={c0y[3]} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={mx1} y1={c0y[3]} x2={mx1} y2={c1y[1]} stroke={LINE_CLR} strokeWidth="1.5" />

        {/* col1 → col2: m[4], m[5] → m[6] */}
        <line x1={c1x + COL_W} y1={c1y[0]} x2={mx2} y2={c1y[0]} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={mx2} y1={c1y[0]} x2={mx2} y2={c2y} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={mx2} y1={c2y} x2={c2x} y2={c2y} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={c1x + COL_W} y1={c1y[1]} x2={mx2} y2={c1y[1]} stroke={LINE_CLR} strokeWidth="1.5" />
        <line x1={mx2} y1={c1y[1]} x2={mx2} y2={c2y} stroke={LINE_CLR} strokeWidth="1.5" />
      </svg>

      {/* Column labels */}
      {[
        { label: 'W14 Semifinals', x: c0x },
        { label: 'W15 Division Finals', x: c1x },
        { label: 'W15 Sun · Grand Final', x: c2x },
      ].map(({ label, x }) => (
        <div
          key={x}
          className="absolute top-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider"
          style={{ left: x, width: COL_W, textAlign: 'center' }}
        >
          {label}
        </div>
      ))}

      {/* Column 0: SFs (order: W-SF-A, W-SF-B, E-SF-A, E-SF-B) */}
      {[m[0], m[2], m[1], m[3]].map((match, i) => (
        <div key={match.id} className="absolute" style={{ left: c0x, top: top(c0y[i]), width: COL_W }}>
          <BracketMatchCard m={match} state={state} />
        </div>
      ))}

      {/* Column 1: Finals */}
      {[m[4], m[5]].map((match, i) => (
        <div key={match.id} className="absolute" style={{ left: c1x, top: top(c1y[i]), width: COL_W }}>
          <BracketMatchCard m={match} state={state} />
        </div>
      ))}

      {/* Column 2: Grand Final */}
      <div className="absolute" style={{ left: c2x, top: top(c2y), width: COL_W }}>
        <BracketMatchCard m={m[6]} state={state} />
      </div>

      {/* MM Rep banner */}
      {q.mmRepresentative && (
        <div
          className="absolute flex items-center gap-2 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-lg text-sm"
          style={{ right: 0, top: top(c2y) - 48, minWidth: COL_W }}
        >
          <span className="text-orange-400 text-xs font-bold">MM →</span>
          <span className="text-white font-bold">{clubById(q.mmRepresentative)?.name ?? q.mmRepresentative}</span>
        </div>
      )}
    </div>
  );
}

// ─── Playoff series card (with hover tooltip for game scores) ─────────────────

function PlayoffSeriesCard({ s, state }: { s: PlayoffSeries; state?: LeagueSimState }) {
  const [hover, setHover] = useState(false);
  const clubA = s.teamA ? clubById(s.teamA) : null;
  const clubB = s.teamB ? clubById(s.teamB) : null;
  const totalA = s.startWinsA + s.winsA;
  const totalB = s.winsB;
  const pending = !s.winner && s.matches.length === 0 && s.teamA && s.teamB;
  const odds = pending ? calcOdds(getTeamElo(s.teamA, state), getTeamElo(s.teamB, state)) : null;

  // Odds footer: use computed odds pre-match, stored first-game odds post-match
  const firstGame = s.matches[0];
  const footerOddsA = odds?.oddsA ?? firstGame?.oddsA;
  const footerOddsB = odds?.oddsB ?? firstGame?.oddsB;
  const showOddsFooter = footerOddsA !== undefined && footerOddsB !== undefined;
  const seriesWinnerIsA = s.winner === s.teamA;
  const seriesWinnerIsB = s.winner === s.teamB;
  const seriesWinnerOdds = seriesWinnerIsA ? footerOddsA : seriesWinnerIsB ? footerOddsB : undefined;
  const seriesLoserOdds  = seriesWinnerIsA ? footerOddsB : seriesWinnerIsB ? footerOddsA : undefined;
  const seriesIsUpset = seriesWinnerOdds !== undefined && seriesLoserOdds !== undefined && seriesWinnerOdds > seriesLoserOdds;

  return (
    <div
      className="relative border border-bg-border rounded bg-bg-base w-48 shadow-sm text-xs overflow-visible select-none"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Team A */}
      <div className={`px-2 py-1.5 flex items-center justify-between gap-1 ${s.winner === s.teamA ? 'bg-tier-s/10' : s.winner ? 'opacity-40' : ''}`}>
        <span className={`font-medium truncate ${s.winner === s.teamA ? 'text-white' : 'text-slate-300'}`}>
          {clubA?.abbr ?? s.teamA ?? 'TBD'}
        </span>
        <div className="flex items-center gap-1">
          {s.startWinsA > 0 && !s.winner && (
            <span className="text-tier-a text-[10px]">+{s.startWinsA}</span>
          )}
          <span className={`font-bold tabular-nums ${s.winner === s.teamA ? 'text-tier-s' : 'text-slate-400'}`}>
            {totalA}
          </span>
        </div>
      </div>

      <div className="border-t border-bg-border/30" />

      {/* Team B */}
      <div className={`px-2 py-1.5 flex items-center justify-between gap-1 ${s.winner === s.teamB ? 'bg-tier-s/10' : s.winner ? 'opacity-40' : ''}`}>
        <span className={`font-medium truncate ${s.winner === s.teamB ? 'text-white' : 'text-slate-300'}`}>
          {clubB?.abbr ?? s.teamB ?? 'TBD'}
        </span>
        <span className={`font-bold tabular-nums ${s.winner === s.teamB ? 'text-tier-s' : 'text-slate-400'}`}>
          {totalB}
        </span>
      </div>

      {/* Odds footer: always shown (pre-match computed, post-match stored) */}
      {showOddsFooter && (
        <div className="px-2 py-0.5 border-t border-bg-border/30 flex justify-between text-[10px]">
          <span className={upsetOddsClass(footerOddsA!, seriesWinnerIsA, seriesIsUpset)}>{footerOddsA!.toFixed(2)}</span>
          <span className="text-slate-700">odds</span>
          <span className={upsetOddsClass(footerOddsB!, seriesWinnerIsB, seriesIsUpset)}>{footerOddsB!.toFixed(2)}</span>
        </div>
      )}

      {/* Hover tooltip: game-by-game scores */}
      {hover && (s.matches.length > 0 || s.startWinsA > 0) && (
        <div className="absolute left-full top-0 ml-2 bg-bg-panel border border-bg-border rounded p-2.5 z-50 w-40 shadow-xl">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">
            Game Log · {s.matches.some(m => Math.max(m.scoreA, m.scoreB) >= 3) || s.winsToAdvance >= 3 ? 'Bo5' : 'Bo3'} match
          </div>
          {s.startWinsA > 0 && (
            <div className="flex justify-between text-[11px] text-tier-a mb-0.5">
              <span>Seed adv.</span>
              <span>+{s.startWinsA} – 0</span>
            </div>
          )}
          {s.matches.map((m, i) => {
            const aWon = m.scoreA > m.scoreB;
            return (
              <div key={i} className="flex justify-between text-[11px]">
                <span className="text-slate-500">Game {i + 1 + (s.startWinsA > 0 ? 0 : 0)}</span>
                <span className={aWon ? 'text-status-up font-bold' : 'text-status-down font-bold'}>
                  {m.scoreA}–{m.scoreB}
                </span>
              </div>
            );
          })}
          {s.winner && (
            <div className="mt-1.5 pt-1.5 border-t border-bg-border/50 text-[11px] text-tier-s font-bold text-center">
              {clubById(s.winner)?.abbr ?? s.winner} wins
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Playoff bracket (SVG-based, 4 rounds) ────────────────────────────────────

const PO_SLOT_H = 100;
const PO_COL_W = 196;
const PO_GAP = 40;
const PO_LINE = '#334155';

// Shared geometry constants
const PO_DF_CENTER_Y = PO_SLOT_H * 2; // y-center of DivFinal card = 200
const PO_TOTAL_H    = 4 * PO_SLOT_H;  // bracket height = 400
const PO_TOTAL_W    = 3 * PO_COL_W + 2 * PO_GAP; // bracket width = 668

function PlayoffHalfBracket({
  qfIds, sfIds, dfId,
  series, state,
  reversed = false,
}: {
  qfIds: string[]; sfIds: string[]; dfId: string;
  series: PlayoffSeries[]; state?: LeagueSimState;
  reversed?: boolean;
}) {
  const byId = (id: string) => series.find(s => s.id === id)!;
  const qf = qfIds.map(byId);
  const sf = sfIds.map(byId);
  const df = byId(dfId);

  const qfy     = [0, 1, 2, 3].map(i => PO_SLOT_H * i + PO_SLOT_H / 2);
  const sfy     = [PO_SLOT_H * 1, PO_SLOT_H * 3];
  const dfCenter = PO_DF_CENTER_Y;

  const c0x = 0;
  const c1x = PO_COL_W + PO_GAP;
  const c2x = 2 * (PO_COL_W + PO_GAP);

  // reversed=false (West): QF at c0 → SF at c1 → DF at c2 (left→right)
  // reversed=true  (East): DF at c0 ← SF at c1 ← QF at c2 (right→left)
  const qfX      = reversed ? c2x               : c0x;
  const dfX      = reversed ? c0x               : c2x;
  const mQfSf   = reversed ? c1x + PO_COL_W + PO_GAP / 2 : c0x + PO_COL_W + PO_GAP / 2;
  const mSfDf   = reversed ? c0x + PO_COL_W + PO_GAP / 2 : c1x + PO_COL_W + PO_GAP / 2;
  const qfEdge   = reversed ? c2x               : c0x + PO_COL_W;
  const sfEdgeQF = reversed ? c1x + PO_COL_W   : c1x;
  const sfEdgeDF = reversed ? c1x               : c1x + PO_COL_W;
  const dfEdge   = reversed ? c0x + PO_COL_W   : c2x;

  function top(cy: number) { return cy - CARD_H / 2; }

  return (
    <div className="flex-shrink-0 relative" style={{ height: PO_TOTAL_H, width: PO_TOTAL_W }}>
      <svg className="absolute inset-0 pointer-events-none" width={PO_TOTAL_W} height={PO_TOTAL_H}>
        {[0, 1].map(i => {
          const sfY = sfy[i];
          const q1y = qfy[i * 2];
          const q2y = qfy[i * 2 + 1];
          return (
            <g key={i}>
              <line x1={qfEdge} y1={q1y} x2={mQfSf} y2={q1y} stroke={PO_LINE} strokeWidth="1.5" />
              <line x1={mQfSf} y1={q1y} x2={mQfSf} y2={sfY} stroke={PO_LINE} strokeWidth="1.5" />
              <line x1={mQfSf} y1={sfY} x2={sfEdgeQF} y2={sfY} stroke={PO_LINE} strokeWidth="1.5" />
              <line x1={qfEdge} y1={q2y} x2={mQfSf} y2={q2y} stroke={PO_LINE} strokeWidth="1.5" />
              <line x1={mQfSf} y1={q2y} x2={mQfSf} y2={sfY} stroke={PO_LINE} strokeWidth="1.5" />
            </g>
          );
        })}
        {sfy.map(sy => (
          <g key={sy}>
            <line x1={sfEdgeDF} y1={sy} x2={mSfDf} y2={sy} stroke={PO_LINE} strokeWidth="1.5" />
            <line x1={mSfDf} y1={sy} x2={mSfDf} y2={dfCenter} stroke={PO_LINE} strokeWidth="1.5" />
          </g>
        ))}
        <line x1={mSfDf} y1={dfCenter} x2={dfEdge} y2={dfCenter} stroke={PO_LINE} strokeWidth="1.5" />
      </svg>

      {qf.map((s, i) => (
        <div key={s.id} className="absolute" style={{ left: qfX, top: top(qfy[i]), width: PO_COL_W }}>
          <PlayoffSeriesCard s={s} state={state} />
        </div>
      ))}
      {sf.map((s, i) => (
        <div key={s.id} className="absolute" style={{ left: c1x, top: top(sfy[i]), width: PO_COL_W }}>
          <PlayoffSeriesCard s={s} state={state} />
        </div>
      ))}
      <div className="absolute" style={{ left: dfX, top: top(dfCenter), width: PO_COL_W }}>
        <PlayoffSeriesCard s={df} state={state} />
      </div>
    </div>
  );
}

const GF_COL_W = PO_COL_W + 48; // grand final center column width

function FullPlayoffBracket({ po, state }: { po: PlayoffState; state?: LeagueSimState }) {
  const gf = po.series.find(s => s.id === 'grand_final');
  const gfTop = PO_DF_CENTER_Y - CARD_H / 2; // align with DivFinal cards = 162

  return (
    <div className="overflow-x-auto">
      {/* Column headers */}
      <div className="flex items-end mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider select-none">
        <div className="flex-shrink-0 flex justify-between px-0.5" style={{ width: PO_TOTAL_W }}>
          <span>QF</span><span>SF</span><span>Div Final</span>
        </div>
        <div className="flex-shrink-0 text-center" style={{ width: GF_COL_W }}>
          Grand Final · W37
        </div>
        <div className="flex-shrink-0 flex justify-between px-0.5" style={{ width: PO_TOTAL_W }}>
          <span>Div Final</span><span>SF</span><span>QF</span>
        </div>
      </div>

      {/* Division label row */}
      <div className="flex items-center mb-1 text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
        <div className="flex-shrink-0 text-left pl-1" style={{ width: PO_TOTAL_W }}>West</div>
        <div className="flex-shrink-0" style={{ width: GF_COL_W }} />
        <div className="flex-shrink-0 text-right pr-1" style={{ width: PO_TOTAL_W }}>East</div>
      </div>

      <div className="flex items-start">
        {/* West half (normal, QF on left) */}
        <PlayoffHalfBracket
          qfIds={['w_qf_1','w_qf_2','w_qf_3','w_qf_4']}
          sfIds={['w_sf_1','w_sf_2']}
          dfId="w_final"
          series={po.series}
          state={state}
          reversed={false}
        />

        {/* Grand Final center column */}
        <div
          className="flex-shrink-0 flex flex-col items-center px-3"
          style={{ width: GF_COL_W, paddingTop: gfTop }}
        >
          {gf ? (
            <PlayoffSeriesCard s={gf} state={state} />
          ) : (
            <div className="border border-bg-border rounded bg-bg-base flex items-center justify-center text-xs text-slate-600"
              style={{ width: PO_COL_W, height: CARD_H }}>TBD</div>
          )}
          {gf?.winner && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-tier-s/10 border border-tier-s/30 rounded-lg w-full">
              <span className="text-base">🏆</span>
              <div className="min-w-0">
                <div className="text-[10px] text-tier-s font-bold uppercase leading-none mb-0.5">Champion</div>
                <div className="text-white font-bold text-xs truncate">{clubById(gf.winner)?.name ?? gf.winner}</div>
              </div>
            </div>
          )}
        </div>

        {/* East half (reversed, QF on right) */}
        <PlayoffHalfBracket
          qfIds={['e_qf_1','e_qf_2','e_qf_3','e_qf_4']}
          sfIds={['e_sf_1','e_sf_2']}
          dfId="e_final"
          series={po.series}
          state={state}
          reversed={true}
        />
      </div>

      {!po.series.some(s => s.matches.length > 0 || s.startWinsA > 0) && (
        <p className="text-center text-slate-500 text-sm py-4 mt-2">
          Playoffs start W35 Mon — advance time to see bracket unfold
        </p>
      )}
    </div>
  );
}

// ─── L_CN Playoff bracket (Play-In → DivSF → DivFinal, Dragon/Phoenix) ───────
// Dragon: col0=PlayIn, col1=DivSF×2, col2=DivFinal (left→right)
// Phoenix: col2=PlayIn, col1=DivSF×2, col0=DivFinal (right→left, reversed)

const LCN_PI_Y  = 100;  // Play-In / SF1 center Y (aligned → straight horizontal connect)
const LCN_SF2_Y = 300;  // DivSF bottom center Y
const LCN_DF_Y  = 200;  // DivFinal center Y = (PI_Y + SF2_Y) / 2
const LCN_TOTAL_H = 4 * PO_SLOT_H; // 400

function LCNPlayoffHalfBracket({
  playInId, sfIds, dfId,
  series, state,
  reversed = false,
}: {
  playInId: string; sfIds: string[]; dfId: string;
  series: PlayoffSeries[]; state?: LeagueSimState;
  reversed?: boolean;
}) {
  const byId = (id: string) => series.find(s => s.id === id)!;
  const pi = byId(playInId);
  const sf = sfIds.map(byId);
  const df = byId(dfId);

  const sfY = [LCN_PI_Y, LCN_SF2_Y];

  const c0x = 0;
  const c1x = PO_COL_W + PO_GAP;
  const c2x = 2 * (PO_COL_W + PO_GAP);

  const piX  = reversed ? c2x : c0x;
  const dfX  = reversed ? c0x : c2x;

  // PlayIn card edge that connects to SF col
  const piEdge   = reversed ? c2x               : c0x + PO_COL_W;
  const sfEdgePi = reversed ? c1x + PO_COL_W   : c1x;
  // SF card edge that connects to DF col
  const sfEdgeDf = reversed ? c1x               : c1x + PO_COL_W;
  const mSfDf    = reversed ? c0x + PO_COL_W + PO_GAP / 2 : c1x + PO_COL_W + PO_GAP / 2;
  const dfEdge   = reversed ? c0x + PO_COL_W   : c2x;

  function top(cy: number) { return cy - CARD_H / 2; }

  return (
    <div className="flex-shrink-0 relative" style={{ height: LCN_TOTAL_H, width: PO_TOTAL_W }}>
      <svg className="absolute inset-0 pointer-events-none" width={PO_TOTAL_W} height={LCN_TOTAL_H}>
        {/* PlayIn → DivSF1 (straight horizontal, same Y) */}
        <line x1={piEdge} y1={LCN_PI_Y} x2={sfEdgePi} y2={LCN_PI_Y} stroke={PO_LINE} strokeWidth="1.5" />
        {/* DivSF1 + DivSF2 → DivFinal */}
        {sfY.map(sy => (
          <g key={sy}>
            <line x1={sfEdgeDf} y1={sy} x2={mSfDf} y2={sy} stroke={PO_LINE} strokeWidth="1.5" />
            <line x1={mSfDf} y1={sy} x2={mSfDf} y2={LCN_DF_Y} stroke={PO_LINE} strokeWidth="1.5" />
          </g>
        ))}
        <line x1={mSfDf} y1={LCN_DF_Y} x2={dfEdge} y2={LCN_DF_Y} stroke={PO_LINE} strokeWidth="1.5" />
      </svg>

      {/* Play-In */}
      <div className="absolute" style={{ left: piX, top: top(LCN_PI_Y), width: PO_COL_W }}>
        <PlayoffSeriesCard s={pi} state={state} />
      </div>
      {/* DivSF ×2 */}
      {sf.map((s, i) => (
        <div key={s.id} className="absolute" style={{ left: c1x, top: top(sfY[i]), width: PO_COL_W }}>
          <PlayoffSeriesCard s={s} state={state} />
        </div>
      ))}
      {/* DivFinal */}
      <div className="absolute" style={{ left: dfX, top: top(LCN_DF_Y), width: PO_COL_W }}>
        <PlayoffSeriesCard s={df} state={state} />
      </div>
    </div>
  );
}

function LCNFullPlayoffBracket({ po, state }: { po: PlayoffState; state?: LeagueSimState }) {
  const gf    = po.series.find(s => s.id === 'grand_final');
  const gfTop = LCN_DF_Y - CARD_H / 2;

  return (
    <div className="overflow-x-auto">
      {/* Column headers */}
      <div className="flex items-end mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider select-none">
        <div className="flex-shrink-0 flex justify-between px-0.5" style={{ width: PO_TOTAL_W }}>
          <span>Play-In</span><span>Div SF</span><span>Div Final</span>
        </div>
        <div className="flex-shrink-0 text-center" style={{ width: GF_COL_W }}>
          Grand Final · W37
        </div>
        <div className="flex-shrink-0 flex justify-between px-0.5" style={{ width: PO_TOTAL_W }}>
          <span>Div Final</span><span>Div SF</span><span>Play-In</span>
        </div>
      </div>

      {/* Division label row */}
      <div className="flex items-center mb-1 text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
        <div className="flex-shrink-0 text-left pl-1" style={{ width: PO_TOTAL_W }}>Dragon</div>
        <div className="flex-shrink-0" style={{ width: GF_COL_W }} />
        <div className="flex-shrink-0 text-right pr-1" style={{ width: PO_TOTAL_W }}>Phoenix</div>
      </div>

      <div className="flex items-start">
        {/* Dragon side (PlayIn on left) */}
        <LCNPlayoffHalfBracket
          playInId="d_playin"
          sfIds={['d_sf_1', 'd_sf_2']}
          dfId="d_final"
          series={po.series}
          state={state}
          reversed={false}
        />

        {/* Grand Final center column */}
        <div
          className="flex-shrink-0 flex flex-col items-center px-3"
          style={{ width: GF_COL_W, paddingTop: gfTop }}
        >
          {gf ? (
            <PlayoffSeriesCard s={gf} state={state} />
          ) : (
            <div className="border border-bg-border rounded bg-bg-base flex items-center justify-center text-xs text-slate-600"
              style={{ width: PO_COL_W, height: CARD_H }}>TBD</div>
          )}
          {gf?.winner && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-tier-s/10 border border-tier-s/30 rounded-lg w-full">
              <span className="text-base">🏆</span>
              <div className="min-w-0">
                <div className="text-[10px] text-tier-s font-bold uppercase leading-none mb-0.5">Champion</div>
                <div className="text-white font-bold text-xs truncate">{clubById(gf.winner)?.name ?? gf.winner}</div>
              </div>
            </div>
          )}
        </div>

        {/* Phoenix side (PlayIn on right, reversed) */}
        <LCNPlayoffHalfBracket
          playInId="p_playin"
          sfIds={['p_sf_1', 'p_sf_2']}
          dfId="p_final"
          series={po.series}
          state={state}
          reversed={true}
        />
      </div>

      {!po.series.some(s => s.matches.length > 0 || s.startWinsA > 0) && (
        <p className="text-center text-slate-500 text-sm py-4 mt-2">
          Playoffs start W35 Tue — advance time to see bracket unfold
        </p>
      )}
    </div>
  );
}

// ─── L_KR Season Review ───────────────────────────────────────────────────────

const LKR_SPRING_PTS = [9, 7, 5, 3, 1, 1, 0, 0, 0, 0, 0, 0];
const LKR_SUMMER_PTS = [20, 10, 8, 5, 2, 2, 0, 0, 0, 0, 0, 0];

function lkrSplitRanks(po: PlayoffState, regStandings: { clubId: string }[]): Map<string, { rank: number; stage: string }> {
  const loserOf = (s: PlayoffSeries) => s.winner === s.teamA ? s.teamB : s.teamA;
  const out = new Map<string, { rank: number; stage: string }>();
  if (!po.completed) return out;

  const gf     = po.series.find(s => s.id === 'kr_m8');
  const finalq = po.series.find(s => s.id === 'kr_m7');
  const lower  = po.series.find(s => s.id === 'kr_m6');
  const qf1    = po.series.find(s => s.id === 'kr_m1');
  const qf2    = po.series.find(s => s.id === 'kr_m2');

  if (gf?.winner)         out.set(gf.winner,              { rank: 1, stage: 'champion' });
  const gfL = gf   ? loserOf(gf)    : null;
  if (gfL)               out.set(gfL,                     { rank: 2, stage: 'finalist' });
  const fqL = finalq ? loserOf(finalq) : null;
  if (fqL)               out.set(fqL,                     { rank: 3, stage: 'finalq' });
  const lL  = lower  ? loserOf(lower)  : null;
  if (lL)                out.set(lL,                      { rank: 4, stage: 'lower' });

  const qfLosers = [qf1, qf2]
    .map(s => (s ? loserOf(s) : null))
    .filter(Boolean) as string[];
  qfLosers.sort((a, b) =>
    regStandings.findIndex(r => r.clubId === a) - regStandings.findIndex(r => r.clubId === b),
  );
  qfLosers.forEach((id, i) => out.set(id, { rank: 5 + i, stage: 'qf' }));

  let nextRank = out.size + 1;
  for (const { clubId } of regStandings) {
    if (!out.has(clubId)) out.set(clubId, { rank: nextRank++, stage: 'regular' });
  }
  return out;
}

function LKRSeasonReview({ state }: { state: LeagueSimState }) {
  const cupStates = useStore(s => s.cupStates);
  const allClubs = clubsByLeague('L_KR');

  const springReg  = state.springStandings ?? [];
  const summerReg  = state.fullLeagueState?.standings ?? state.standings;
  const springPO   = state.springPlayoffs;
  const summerPO   = state.playoffs;

  const springRanks = springPO?.completed ? lkrSplitRanks(springPO, springReg) : new Map<string, { rank: number; stage: string }>(springReg.map((r, i) => [r.clubId, { rank: i + 1, stage: 'regular' }]));
  const summerRanks = summerPO?.completed ? lkrSplitRanks(summerPO, summerReg) : new Map<string, { rank: number; stage: string }>(summerReg.map((r, i) => [r.clubId, { rank: i + 1, stage: 'regular' }]));

  // Combine records (spring + summer sets/wins)
  const recordMap = new Map<string, { wins: number; losses: number; setsFor: number; setsAgainst: number }>();
  for (const r of springReg) recordMap.set(r.clubId, { wins: r.wins, losses: r.losses, setsFor: r.setsFor, setsAgainst: r.setsAgainst });
  for (const r of summerReg) {
    const ex = recordMap.get(r.clubId);
    if (ex) recordMap.set(r.clubId, { wins: ex.wins + r.wins, losses: ex.losses + r.losses, setsFor: ex.setsFor + r.setsFor, setsAgainst: ex.setsAgainst + r.setsAgainst });
    else     recordMap.set(r.clubId, { wins: r.wins, losses: r.losses, setsFor: r.setsFor, setsAgainst: r.setsAgainst });
  }

  const combined = allClubs.map(club => {
    const sRank = springRanks.get(club.id)?.rank ?? allClubs.length;
    const uRank = summerRanks.get(club.id)?.rank ?? allClubs.length;
    const sPts  = LKR_SPRING_PTS[sRank - 1] ?? 0;
    const uPts  = LKR_SUMMER_PTS[uRank - 1] ?? 0;
    return { clubId: club.id, sPts, uPts, total: sPts + uPts, summerRank: uRank };
  });
  combined.sort((a, b) => b.total !== a.total ? b.total - a.total : a.summerRank - b.summerRank);

  const lkrOrderedIds = combined.map(c => c.clubId);
  const lkrCupChampions = {
    APEX: cupStates['APEX']?.champion,
    EGT:  cupStates['EGT']?.champion,
    COPA: cupStates['COPA']?.champion,
  };
  const lkrBadgeMap = computeLeagueBadges('L_KR', lkrOrderedIds, lkrCupChampions);

  return (
    <div>
      {springReg.length === 0 && <p className="text-xs text-amber-500/80 mb-3 px-1">Spring not yet played — showing summer only</p>}
      {(!!state.playoffs && !state.playoffs.completed) && (
        <p className="text-xs text-amber-500/80 mb-3 px-1">Season in progress — rankings reflect current standings</p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-bg-border">
            <th className="text-left py-2 w-6">#</th>
            <th className="text-left py-2">Team</th>
            <th className="text-center py-2 w-14">Spr Pts</th>
            <th className="text-center py-2 w-14">Sum Pts</th>
            <th className="text-center py-2 w-14">Total</th>
            <th className="text-center py-2 w-12">SW</th>
            <th className="text-center py-2 w-12">SL</th>
            <th className="text-center py-2 w-14">SD</th>
            <th className="text-left py-2 w-24">Int'l</th>
          </tr>
        </thead>
        <tbody>
          {combined.map((c, idx) => {
            const club = clubById(c.clubId);
            if (!club) return null;
            const rank     = idx + 1;
            const rec      = recordMap.get(c.clubId);
            const sd       = rec ? rec.setsFor - rec.setsAgainst : null;
            const isChamp  = summerRanks.get(c.clubId)?.stage === 'champion';
            const badges   = lkrBadgeMap[c.clubId] ?? [];
            return (
              <tr key={c.clubId} className={`border-b border-bg-border/50 hover:bg-bg-hover ${isChamp ? 'bg-tier-s/5' : ''}`}>
                <td className="py-2 text-slate-500 text-xs font-mono">{rank}</td>
                <td className="py-2">
                  <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s">
                    <TeamDot club={club} showAbbr={false} />
                    <span className={isChamp ? 'text-tier-s font-bold' : 'text-slate-200'}>{club.name}</span>
                    {isChamp && <span className="text-sm leading-none">🏆</span>}
                  </Link>
                </td>
                <td className="py-2 text-center text-xs text-slate-400">{c.sPts > 0 ? c.sPts : <span className="text-slate-600">—</span>}</td>
                <td className="py-2 text-center text-xs text-slate-400">{c.uPts > 0 ? c.uPts : <span className="text-slate-600">—</span>}</td>
                <td className="py-2 text-center text-xs font-bold text-white">{c.total > 0 ? c.total : <span className="text-slate-500">0</span>}</td>
                <td className="py-2 text-center text-xs text-status-up">{rec?.setsFor ?? '—'}</td>
                <td className="py-2 text-center text-xs text-status-down">{rec?.setsAgainst ?? '—'}</td>
                <td className={`py-2 text-center text-xs ${sd != null && sd >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                  {sd != null ? `${sd >= 0 ? '+' : ''}${sd}` : '—'}
                </td>
                <td className="py-2">
                  <div className="flex gap-1 flex-wrap">
                    {badges.map(b => (
                      <span key={b} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${b === 'WT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-tier-a/10 text-tier-a border-tier-a/20'}`}>{b}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── L_BR / L_SA Season Review ────────────────────────────────────────────────

function BRSASeasonReview({ leagueId, state }: { leagueId: string; state: LeagueSimState }) {
  const cupStates = useStore(s => s.cupStates);
  const allClubs = clubsByLeague(leagueId);

  const springReg  = state.springStandings ?? [];
  const summerReg  = state.fullLeagueState?.standings ?? state.standings;
  const springPO   = state.springPlayoffs;
  const summerPO   = state.playoffs;

  const springRanks = springPO?.completed ? lkrSplitRanks(springPO, springReg) : new Map<string, { rank: number; stage: string }>(springReg.map((r, i) => [r.clubId, { rank: i + 1, stage: 'regular' }]));
  const summerRanks = summerPO?.completed ? lkrSplitRanks(summerPO, summerReg) : new Map<string, { rank: number; stage: string }>(summerReg.map((r, i) => [r.clubId, { rank: i + 1, stage: 'regular' }]));

  const recordMap = new Map<string, { wins: number; losses: number; setsFor: number; setsAgainst: number }>();
  for (const r of springReg) recordMap.set(r.clubId, { wins: r.wins, losses: r.losses, setsFor: r.setsFor, setsAgainst: r.setsAgainst });
  for (const r of summerReg) {
    const ex = recordMap.get(r.clubId);
    if (ex) recordMap.set(r.clubId, { wins: ex.wins + r.wins, losses: ex.losses + r.losses, setsFor: ex.setsFor + r.setsFor, setsAgainst: ex.setsAgainst + r.setsAgainst });
    else     recordMap.set(r.clubId, { wins: r.wins, losses: r.losses, setsFor: r.setsFor, setsAgainst: r.setsAgainst });
  }

  const combined = allClubs.map(club => {
    const sRank = springRanks.get(club.id)?.rank ?? allClubs.length;
    const uRank = summerRanks.get(club.id)?.rank ?? allClubs.length;
    const sPts  = LKR_SPRING_PTS[sRank - 1] ?? 0;
    const uPts  = LKR_SUMMER_PTS[uRank - 1] ?? 0;
    return { clubId: club.id, sPts, uPts, total: sPts + uPts, summerRank: uRank };
  });
  combined.sort((a, b) => b.total !== a.total ? b.total - a.total : a.summerRank - b.summerRank);

  const brsaOrderedIds = combined.map(c => c.clubId);
  const brsaCupChampions = {
    APEX: cupStates['APEX']?.champion,
    EGT:  cupStates['EGT']?.champion,
    COPA: cupStates['COPA']?.champion,
  };
  const brsaBadgeMap = computeLeagueBadges(leagueId, brsaOrderedIds, brsaCupChampions);

  return (
    <div>
      {springReg.length === 0 && <p className="text-xs text-amber-500/80 mb-3 px-1">Spring not yet played — showing summer only</p>}
      {(!!state.playoffs && !state.playoffs.completed) && (
        <p className="text-xs text-amber-500/80 mb-3 px-1">Season in progress — rankings reflect current standings</p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-bg-border">
            <th className="text-left py-2 w-6">#</th>
            <th className="text-left py-2">Team</th>
            <th className="text-center py-2 w-14">Spr Pts</th>
            <th className="text-center py-2 w-14">Sum Pts</th>
            <th className="text-center py-2 w-14">Total</th>
            <th className="text-center py-2 w-12">MW</th>
            <th className="text-center py-2 w-12">ML</th>
            <th className="text-center py-2 w-14">GD</th>
            <th className="text-left py-2 w-24">Int'l</th>
          </tr>
        </thead>
        <tbody>
          {combined.map((c, idx) => {
            const club = clubById(c.clubId);
            if (!club) return null;
            const rank     = idx + 1;
            const rec      = recordMap.get(c.clubId);
            const gd       = rec ? rec.setsFor - rec.setsAgainst : null;
            const isChamp  = summerRanks.get(c.clubId)?.stage === 'champion';
            const badges   = brsaBadgeMap[c.clubId] ?? [];
            return (
              <tr key={c.clubId} className={`border-b border-bg-border/50 hover:bg-bg-hover ${isChamp ? 'bg-tier-s/5' : ''}`}>
                <td className="py-2 text-slate-500 text-xs font-mono">{rank}</td>
                <td className="py-2">
                  <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s">
                    <TeamDot club={club} showAbbr={false} />
                    <span className={isChamp ? 'text-tier-s font-bold' : 'text-slate-200'}>{club.name}</span>
                    {isChamp && <span className="text-sm leading-none">🏆</span>}
                  </Link>
                </td>
                <td className="py-2 text-center text-xs text-slate-400">{c.sPts > 0 ? c.sPts : <span className="text-slate-600">—</span>}</td>
                <td className="py-2 text-center text-xs text-slate-400">{c.uPts > 0 ? c.uPts : <span className="text-slate-600">—</span>}</td>
                <td className="py-2 text-center text-xs font-bold text-white">{c.total > 0 ? c.total : <span className="text-slate-500">0</span>}</td>
                <td className="py-2 text-center text-xs text-status-up">{rec?.wins ?? '—'}</td>
                <td className="py-2 text-center text-xs text-status-down">{rec?.losses ?? '—'}</td>
                <td className={`py-2 text-center text-xs ${gd != null && gd >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                  {gd != null ? `${gd >= 0 ? '+' : ''}${gd}` : '—'}
                </td>
                <td className="py-2">
                  <div className="flex gap-1 flex-wrap">
                    {badges.map(b => (
                      <span key={b} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${b === 'WT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-tier-a/10 text-tier-a border-tier-a/20'}`}>{b}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── L_KR Playoff Bracket ─────────────────────────────────────────────────────

// LCK-style SVG bracket for L_KR playoffs
// Layout: 5 columns — 1라운드 | 2라운드 | 3라운드 | 4라운드 | 결승
function LKRFullPlayoffBracket({ po, state }: { po: PlayoffState; state?: LeagueSimState }) {
  const g = (id: string) => po.series.find(s => s.id === id);

  const CW = 192;  // card width (matches PlayoffSeriesCard w-48)
  const CH = 66;   // card height (approx with odds footer)
  const GAP = 32;  // horizontal gap between columns for connectors
  const COL = [0, CW + GAP, (CW + GAP) * 2, (CW + GAP) * 3, (CW + GAP) * 4];
  // COL = [0, 224, 448, 672, 896]

  // Card top positions
  const Y = { m1: 16, m2: 330, m3: 80, m4: 256, m5: 80, m6: 256, m7: 168, m8: 168 };
  const cy = (top: number) => top + CH / 2;
  const rx = (col: number) => COL[col] + CW;   // right edge of card in column

  const TW = COL[4] + CW;
  const TH = 430;

  // SVG elbow path: right-center of source → left-center of target
  const elbow = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2;
    if (Math.abs(y1 - y2) < 2) return `M ${x1} ${y1} H ${x2}`;
    return `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`;
  };

  const cardEl = (id: string) => {
    const s = g(id);
    if (!s) return (
      <div className="border border-dashed border-bg-border/40 rounded bg-bg-base flex items-center justify-center text-[10px] text-slate-600"
        style={{ width: CW, height: CH }}>TBD</div>
    );
    return <PlayoffSeriesCard s={s} state={state} />;
  };

  // Column header labels
  const COLS_INFO: [string, number][] = [
    ['1라운드', 0], ['2라운드', 1], ['3라운드', 2], ['4라운드', 3], ['결승', 4],
  ];
  return (
    <div className="overflow-x-auto">
      {/* Column headers */}
      <div className="flex mb-3 select-none" style={{ width: TW }}>
        {COLS_INFO.map(([label, col]) => (
          <div key={label} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center"
            style={{ width: CW, marginLeft: col === 0 ? 0 : GAP }}>
            {label}
          </div>
        ))}
      </div>

      <div className="relative" style={{ width: TW, height: TH }}>
        {/* SVG connector lines */}
        <svg className="absolute inset-0 pointer-events-none" width={TW} height={TH}>
          <g fill="none" strokeWidth="1.5">
            {/* R1 → R2 (winners) */}
            <path stroke="#475569" d={elbow(rx(0), cy(Y.m1), COL[1], cy(Y.m3))} />
            <path stroke="#475569" d={elbow(rx(0), cy(Y.m2), COL[1], cy(Y.m4))} />
            {/* R2W → R3 Upper (solid) */}
            <path stroke="#475569" d={elbow(rx(1), cy(Y.m3), COL[2], cy(Y.m5))} />
            <path stroke="#475569" d={elbow(rx(1), cy(Y.m4), COL[2], cy(Y.m5))} />
            {/* R2L → R3 Lower (dashed) */}
            <path stroke="#334155" strokeDasharray="5 3" d={elbow(rx(1), cy(Y.m3), COL[2], cy(Y.m6))} />
            <path stroke="#334155" strokeDasharray="5 3" d={elbow(rx(1), cy(Y.m4), COL[2], cy(Y.m6))} />
            {/* R3 Upper W → GF (long winner path) */}
            <path stroke="#475569" d={elbow(rx(2), cy(Y.m5), COL[4], cy(Y.m8))} />
            {/* R3 Upper L → R4 (dashed loser) */}
            <path stroke="#334155" strokeDasharray="5 3" d={elbow(rx(2), cy(Y.m5), COL[3], cy(Y.m7))} />
            {/* R3 Lower W → R4 (solid) */}
            <path stroke="#475569" d={elbow(rx(2), cy(Y.m6), COL[3], cy(Y.m7))} />
            {/* R4W → GF */}
            <path stroke="#475569" d={elbow(rx(3), cy(Y.m7), COL[4], cy(Y.m8))} />
          </g>
        </svg>

        {/* Match cards */}
        {([
          ['kr_m1', 0, Y.m1], ['kr_m2', 0, Y.m2],
          ['kr_m3', 1, Y.m3], ['kr_m4', 1, Y.m4],
          ['kr_m5', 2, Y.m5], ['kr_m6', 2, Y.m6],
          ['kr_m7', 3, Y.m7], ['kr_m8', 4, Y.m8],
        ] as [string, number, number][]).map(([id, col, top]) => (
          <div key={id} className="absolute" style={{ left: COL[col], top, width: CW }}>
            {cardEl(id)}
          </div>
        ))}

        {/* Small match label tags */}
        {([
          ['M1', 0, Y.m1], ['M2', 0, Y.m2],
          ['M3', 1, Y.m3], ['M4', 1, Y.m4],
          ['M5 · 승자조', 2, Y.m5], ['M6 · 패자조', 2, Y.m6],
          ['M7 · 진출전', 3, Y.m7], ['M8 · 결승', 4, Y.m8],
        ] as [string, number, number][]).map(([label, col, top]) => (
          <div key={`lbl-${label}`} className="absolute text-[9px] text-slate-600 select-none font-medium"
            style={{ left: COL[col], top: top - 14 }}>
            {label}
          </div>
        ))}

        {/* Champion badge */}
        {g('kr_m8')?.winner && (
          <div className="absolute flex items-center gap-2 px-2.5 py-2 bg-tier-s/10 border border-tier-s/30 rounded-lg"
            style={{ left: COL[4], top: Y.m8 + CH + 10, width: CW }}>
            <span className="text-base">🏆</span>
            <div className="min-w-0">
              <div className="text-[9px] text-tier-s font-bold uppercase leading-none mb-0.5">Champion</div>
              <div className="text-white font-bold text-xs truncate">{clubById(g('kr_m8')!.winner!)?.name}</div>
            </div>
          </div>
        )}
      </div>

      {!po.series.some(s => s.matches.length > 0) && (
        <p className="text-center text-slate-500 text-sm py-4 mt-4">
          Playoffs start W14 · advance time to see bracket unfold
        </p>
      )}
    </div>
  );
}

// ─── L_KR Playoffs tab (spring/summer sub-tab) ────────────────────────────────

function LKRPlayoffsTab({ state }: { state: LeagueSimState }) {
  // Default to summer if available, otherwise spring
  const hasSummer = !!state.playoffs;
  const hasSpring = !!state.springPlayoffs;
  const [split, setSplit] = useState<'spring' | 'summer'>(() =>
    hasSummer ? 'summer' : 'spring',
  );

  // Whenever state changes (e.g. summer playoffs becomes available), auto-switch
  useEffect(() => {
    if (hasSummer) setSplit('summer');
  }, [hasSummer]);

  const po = split === 'summer' ? state.playoffs : state.springPlayoffs;

  return (
    <div className="pt-2">
      {/* Sub-tab: Spring / Summer */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSplit('spring')}
          disabled={!hasSpring}
          className={`px-3 py-1 text-xs rounded border transition-colors ${
            split === 'spring'
              ? 'bg-green-500/20 text-green-300 border-green-500/30 font-bold'
              : hasSpring
                ? 'text-slate-400 border-bg-border hover:text-slate-200 hover:border-slate-500'
                : 'text-slate-600 border-bg-border/30 cursor-not-allowed'
          }`}
        >
          🌸 Spring Playoffs
        </button>
        <button
          onClick={() => setSplit('summer')}
          disabled={!hasSummer}
          className={`px-3 py-1 text-xs rounded border transition-colors ${
            split === 'summer'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
              : hasSummer
                ? 'text-slate-400 border-bg-border hover:text-slate-200 hover:border-slate-500'
                : 'text-slate-600 border-bg-border/30 cursor-not-allowed'
          }`}
        >
          ☀️ Summer Playoffs
        </button>
        {split === 'spring' && !hasSpring && (
          <span className="text-xs text-slate-500 self-center">Spring playoffs start W14</span>
        )}
        {split === 'summer' && !hasSummer && (
          <span className="text-xs text-slate-500 self-center">Summer playoffs start W36</span>
        )}
      </div>

      {po ? (
        <LKRFullPlayoffBracket po={po} state={state} />
      ) : (
        <p className="text-center text-slate-500 py-12 text-sm">
          {split === 'spring'
            ? 'Spring playoffs start W14 · advance time to W14 Tue'
            : 'Summer playoffs start W36 · advance time to W36 Tue'}
        </p>
      )}
    </div>
  );
}

// ─── NEU/WEU Double-Elimination Bracket ──────────────────────────────────────
//
// Layout (horizontal, left→right):
//   Col 0: UBR1 (ub1-ub4, Bo3)         Col 1: UBR2+LBR1 (ub5,ub6,lb1,lb2)
//   Col 2: LBR2+UBF+LB Semi            Col 3: LBF+GF
//
// Rendered as SVG connector lines with PlayoffSeriesCard overlays.

const DE_CW  = 192;
const DE_CH  = 66;
const DE_GAP = 36;
const DE_SH  = 96;
const DE_HDR = 18;  // header row height added to NEU/WEU cards
const NEU_DE_CH = DE_CH + DE_HDR;

const SERIES_DATES: Record<string, string> = {
  ub1: 'W13 Thu', ub2: 'W13 Thu', ub3: 'W13 Fri', ub4: 'W13 Fri',
  ub5: 'W13 Sat', ub6: 'W13 Sun',
  lb1: 'W14 Tue', lb2: 'W14 Wed', lb3: 'W14 Thu', lb4: 'W14 Fri',
  ubf: 'W14 Sat', lb5: 'W14 Sun', lbf: 'W15 Sat', gf: 'W15 Sun',
  mmq_r1: 'W12 Sat', mmq_final: 'W12 Sun',
};

const SERIES_ROUND_LABELS: Record<string, string> = {
  ub1: 'UBR1', ub2: 'UBR1', ub3: 'UBR1', ub4: 'UBR1',
  ub5: 'UBR2', ub6: 'UBR2',
  lb1: 'LBR1', lb2: 'LBR1', lb3: 'LBR2', lb4: 'LBR2',
  ubf: 'UBF', lb5: 'LB Semi', lbf: 'LBF', gf: 'Grand Final',
  mmq_r1: 'R1 · Bo5', mmq_final: 'Final · Bo5',
};

function NEUWEUSeriesCard({ s, state, seedMap }: {
  s: PlayoffSeries;
  state?: LeagueSimState;
  seedMap?: Map<string, number>;
}) {
  const [hover, setHover] = useState(false);
  const clubA = s.teamA ? clubById(s.teamA) : null;
  const clubB = s.teamB ? clubById(s.teamB) : null;
  const totalA = s.startWinsA + s.winsA;
  const totalB = s.winsB;
  const pending = !s.winner && s.matches.length === 0 && s.teamA && s.teamB;
  const odds = pending ? calcOdds(getTeamElo(s.teamA, state), getTeamElo(s.teamB, state)) : null;
  const seedA = s.teamA ? seedMap?.get(s.teamA) : undefined;
  const seedB = s.teamB ? seedMap?.get(s.teamB) : undefined;
  const firstGame = s.matches[0];
  const footerOddsA = odds?.oddsA ?? firstGame?.oddsA;
  const footerOddsB = odds?.oddsB ?? firstGame?.oddsB;
  const showOddsFooter = footerOddsA !== undefined && footerOddsB !== undefined;
  const winA = s.winner === s.teamA;
  const winB = s.winner === s.teamB;
  const winnerOdds = winA ? footerOddsA : winB ? footerOddsB : undefined;
  const loserOdds  = winA ? footerOddsB : winB ? footerOddsA : undefined;
  const isUpset = winnerOdds !== undefined && loserOdds !== undefined && winnerOdds > loserOdds;

  return (
    <div
      className="relative border border-bg-border rounded bg-bg-base shadow-sm text-xs overflow-visible select-none"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Header: round label + date */}
      <div className="px-2 py-0.5 flex justify-between items-center border-b border-bg-border/50 bg-bg-panel/40">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          {SERIES_ROUND_LABELS[s.id] ?? s.id.toUpperCase()}
        </span>
        <span className="text-[9px] text-slate-600">{SERIES_DATES[s.id] ?? ''}</span>
      </div>
      {/* Team A */}
      <div className={`px-2 py-1.5 flex items-center gap-1 ${winA ? 'bg-tier-s/10' : s.winner ? 'opacity-40' : ''}`}>
        {seedA !== undefined && <span className="text-[9px] text-slate-500 w-5 shrink-0 tabular-nums">#{seedA}</span>}
        {clubA && <TeamDot club={clubA} showAbbr={false} />}
        <span className={`font-medium truncate flex-1 ${winA ? 'text-white' : 'text-slate-300'}`}>
          {clubA?.abbr ?? s.teamA ?? 'TBD'}
        </span>
        <div className="flex items-center gap-1">
          {s.startWinsA > 0 && !s.winner && <span className="text-tier-a text-[10px]">+{s.startWinsA}</span>}
          <span className={`font-bold tabular-nums ${winA ? 'text-tier-s' : 'text-slate-400'}`}>{totalA}</span>
        </div>
      </div>
      <div className="border-t border-bg-border/30" />
      {/* Team B */}
      <div className={`px-2 py-1.5 flex items-center gap-1 ${winB ? 'bg-tier-s/10' : s.winner ? 'opacity-40' : ''}`}>
        {seedB !== undefined && <span className="text-[9px] text-slate-500 w-5 shrink-0 tabular-nums">#{seedB}</span>}
        {clubB && <TeamDot club={clubB} showAbbr={false} />}
        <span className={`font-medium truncate flex-1 ${winB ? 'text-white' : 'text-slate-300'}`}>
          {clubB?.abbr ?? s.teamB ?? 'TBD'}
        </span>
        <span className={`font-bold tabular-nums ${winB ? 'text-tier-s' : 'text-slate-400'}`}>{totalB}</span>
      </div>
      {showOddsFooter && (
        <div className="px-2 py-0.5 border-t border-bg-border/30 flex justify-between text-[10px]">
          <span className={upsetOddsClass(footerOddsA!, winA, isUpset)}>{footerOddsA!.toFixed(2)}</span>
          <span className="text-slate-700">odds</span>
          <span className={upsetOddsClass(footerOddsB!, winB, isUpset)}>{footerOddsB!.toFixed(2)}</span>
        </div>
      )}
      {hover && (s.matches.length > 0 || s.startWinsA > 0) && (
        <div className="absolute left-full top-0 ml-2 bg-bg-panel border border-bg-border rounded p-2.5 z-50 w-40 shadow-xl">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">
            Game Log · {s.matches.some(m => Math.max(m.scoreA, m.scoreB) >= 3) || s.winsToAdvance >= 3 ? 'Bo5' : 'Bo3'}
          </div>
          {s.startWinsA > 0 && (
            <div className="flex justify-between text-[11px] text-tier-a mb-0.5">
              <span>Seed adv.</span><span>+{s.startWinsA} – 0</span>
            </div>
          )}
          {s.matches.map((m, i) => {
            const aWon = m.scoreA > m.scoreB;
            return (
              <div key={i} className="flex justify-between text-[11px]">
                <span className="text-slate-500">Game {i + 1}</span>
                <span className={aWon ? 'text-status-up font-bold' : 'text-status-down font-bold'}>{m.scoreA}–{m.scoreB}</span>
              </div>
            );
          })}
          {s.winner && (
            <div className="mt-1.5 pt-1.5 border-t border-bg-border/50 text-[11px] text-tier-s font-bold text-center">
              {clubById(s.winner)?.abbr ?? s.winner} wins
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NEUWEUDEBracket({ po, state, standings }: { po: PlayoffState; state?: LeagueSimState; standings?: TeamRecord[] }) {
  const g = (id: string) => po.series.find(s => s.id === id);

  const seedMap = new Map<string, number>();
  standings?.forEach((r, i) => seedMap.set(r.clubId, i + 1));

  // Column x-origins
  const COL = [0, DE_CW + DE_GAP, 2 * (DE_CW + DE_GAP), 3 * (DE_CW + DE_GAP)];
  const TW  = COL[3] + DE_CW;

  // Card top positions (tuned for readability)
  //   Col 0: ub1 (row0), ub2 (row2), ub3 (row4), ub4 (row6) → y = row*DE_SH
  //   Col 1: ub5 (between ub1/ub2 → row1), ub6 (between ub3/ub4 → row5)
  //          lb1 (between ub1/ub2 → row3), lb2 (between ub3/ub4 → row7)  [but shifted to fit]
  //   Col 2: lb3 (row2), lb4 (row6), ubf (row4)  — we rearrange
  //   Col 3: lb5 (row3), lbf (row4), gf (row4) — only 3 cards

  // Actual layout (row index → top px)
  const Y = {
    ub1:  0   * DE_SH,
    ub2:  2   * DE_SH,
    ub3:  4   * DE_SH,
    ub4:  6   * DE_SH,
    ub5:  1   * DE_SH,
    ub6:  5   * DE_SH,
    lb1:  3   * DE_SH - 20,
    lb2:  7   * DE_SH - 20,
    ubf:  2.5 * DE_SH + 10,
    lb3:  1   * DE_SH,
    lb4:  5   * DE_SH,
    lb5:  3   * DE_SH,
    lbf:  4   * DE_SH,
    gf:   5.5 * DE_SH,
  };

  const TH = 6.5 * DE_SH + NEU_DE_CH + 80;
  const LINE = '#334155';
  const cy = (top: number) => top + NEU_DE_CH / 2;

  const cardEl = (id: string) => {
    const s = g(id);
    if (!s) return null;
    return <NEUWEUSeriesCard s={s} state={state} seedMap={seedMap} />;
  };

  const HEADERS: [string, number][] = [
    ['UBR1 (Bo3)', 0], ['UBR2 / LBR1', 1], ['LBR2 / UBF', 2], ['LB Semi / LBF / GF', 3],
  ];

  return (
    <div className="overflow-x-auto">
      {/* Section legends */}
      <div className="flex gap-3 mb-3 select-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20">
          승자조 Upper Bracket
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20">
          패자조 Lower Bracket
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-tier-s bg-tier-s/10 border border-tier-s/20">
          Finals
        </div>
      </div>
      {/* Column headers */}
      <div className="flex mb-3 select-none" style={{ width: TW }}>
        {HEADERS.map(([label, col]) => (
          <div
            key={label}
            className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center"
            style={{ width: DE_CW, marginLeft: col === 0 ? 0 : DE_GAP }}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="relative" style={{ width: TW, height: TH }}>
        <svg className="absolute inset-0 pointer-events-none" width={TW} height={TH}>
          <g fill="none" strokeWidth="1.5" stroke={LINE}>
            {/* UBR1 → UBR2 (winners: ub1→ub5, ub2→ub5, ub3→ub6, ub4→ub6) */}
            {([[Y.ub1, Y.ub5], [Y.ub2, Y.ub5]] as [number, number][]).map(([sy, ty], i) => {
              const mx = COL[0] + DE_CW + DE_GAP / 2;
              return <g key={`ubr1w-a-${i}`}><line x1={COL[0]+DE_CW} y1={cy(sy)} x2={mx} y2={cy(sy)} /><line x1={mx} y1={cy(sy)} x2={mx} y2={cy(ty)} /><line x1={mx} y1={cy(ty)} x2={COL[1]} y2={cy(ty)} /></g>;
            })}
            {([[Y.ub3, Y.ub6], [Y.ub4, Y.ub6]] as [number, number][]).map(([sy, ty], i) => {
              const mx = COL[0] + DE_CW + DE_GAP / 2;
              return <g key={`ubr1w-b-${i}`}><line x1={COL[0]+DE_CW} y1={cy(sy)} x2={mx} y2={cy(sy)} /><line x1={mx} y1={cy(sy)} x2={mx} y2={cy(ty)} /><line x1={mx} y1={cy(ty)} x2={COL[1]} y2={cy(ty)} /></g>;
            })}
            {/* UBR1 → LBR1 (losers dashed) */}
            {([[Y.ub1, Y.lb1], [Y.ub2, Y.lb1]] as [number, number][]).map(([sy, ty], i) => {
              const mx = COL[0] + DE_CW + DE_GAP * 0.75;
              return <g key={`ubr1l-a-${i}`} strokeDasharray="4 3"><line x1={COL[0]+DE_CW} y1={cy(sy)} x2={mx} y2={cy(sy)} /><line x1={mx} y1={cy(sy)} x2={mx} y2={cy(ty)} /><line x1={mx} y1={cy(ty)} x2={COL[1]} y2={cy(ty)} /></g>;
            })}
            {([[Y.ub3, Y.lb2], [Y.ub4, Y.lb2]] as [number, number][]).map(([sy, ty], i) => {
              const mx = COL[0] + DE_CW + DE_GAP * 0.75;
              return <g key={`ubr1l-b-${i}`} strokeDasharray="4 3"><line x1={COL[0]+DE_CW} y1={cy(sy)} x2={mx} y2={cy(sy)} /><line x1={mx} y1={cy(sy)} x2={mx} y2={cy(ty)} /><line x1={mx} y1={cy(ty)} x2={COL[1]} y2={cy(ty)} /></g>;
            })}
            {/* UBR2 winners → UBF */}
            {([Y.ub5, Y.ub6] as number[]).map((sy, i) => {
              const mx = COL[1] + DE_CW + DE_GAP / 2;
              return <g key={`ubr2-ubf-${i}`}><line x1={COL[1]+DE_CW} y1={cy(sy)} x2={mx} y2={cy(sy)} /><line x1={mx} y1={cy(sy)} x2={mx} y2={cy(Y.ubf)} /><line x1={mx} y1={cy(Y.ubf)} x2={COL[2]} y2={cy(Y.ubf)} /></g>;
            })}
            {/* UBR2 losers → LBR2 (dashed) */}
            <g strokeDasharray="4 3">
              {([[Y.ub5, Y.lb4], [Y.ub6, Y.lb3]] as [number, number][]).map(([sy, ty], i) => {
                const mx = COL[1] + DE_CW + DE_GAP * 0.75;
                return <g key={`ubr2l-${i}`}><line x1={COL[1]+DE_CW} y1={cy(sy)} x2={mx} y2={cy(sy)} /><line x1={mx} y1={cy(sy)} x2={mx} y2={cy(ty)} /><line x1={mx} y1={cy(ty)} x2={COL[2]} y2={cy(ty)} /></g>;
              })}
            </g>
            {/* LBR1 winners → LBR2 */}
            {([[Y.lb1, Y.lb3], [Y.lb2, Y.lb4]] as [number, number][]).map(([sy, ty], i) => {
              const mx2 = COL[1] + DE_CW + DE_GAP / 2;
              return <g key={`lbr1-lbr2-${i}`}><line x1={COL[1]+DE_CW} y1={cy(sy)} x2={mx2} y2={cy(sy)} /><line x1={mx2} y1={cy(sy)} x2={mx2} y2={cy(ty)} /><line x1={mx2} y1={cy(ty)} x2={COL[2]} y2={cy(ty)} /></g>;
            })}
            {/* UBF winner → GF (col2→col3) */}
            {(() => { const mx = COL[2]+DE_CW+DE_GAP/2; return <><line x1={COL[2]+DE_CW} y1={cy(Y.ubf)} x2={mx} y2={cy(Y.ubf)} /><line x1={mx} y1={cy(Y.ubf)} x2={mx} y2={cy(Y.gf)} /><line x1={mx} y1={cy(Y.gf)} x2={COL[3]} y2={cy(Y.gf)} /></>; })()}
            {/* UBF loser → LBF (col2→col3, dashed) */}
            {(() => { const mx = COL[2]+DE_CW+DE_GAP*0.7; return <g strokeDasharray="4 3"><line x1={COL[2]+DE_CW} y1={cy(Y.ubf)} x2={mx} y2={cy(Y.ubf)} /><line x1={mx} y1={cy(Y.ubf)} x2={mx} y2={cy(Y.lbf)} /><line x1={mx} y1={cy(Y.lbf)} x2={COL[3]} y2={cy(Y.lbf)} /></g>; })()}
            {/* LBR2 winners → LB Semi (col2→col3) */}
            {([Y.lb3, Y.lb4] as number[]).map((sy, i) => {
              const mx = COL[2] + DE_CW + DE_GAP / 2;
              return <g key={`lbr2-lb5-${i}`}><line x1={COL[2]+DE_CW} y1={cy(sy)} x2={mx} y2={cy(sy)} /><line x1={mx} y1={cy(sy)} x2={mx} y2={cy(Y.lb5)} /><line x1={mx} y1={cy(Y.lb5)} x2={COL[3]} y2={cy(Y.lb5)} /></g>;
            })}
            {/* LB Semi → LBF (within col3, vertical) */}
            <line x1={COL[3]+DE_CW/2} y1={cy(Y.lb5)+DE_CH/2} x2={COL[3]+DE_CW/2} y2={cy(Y.lbf)-DE_CH/2} />
            {/* LBF winner → GF (within col3, vertical) */}
            <line x1={COL[3]+DE_CW/2} y1={cy(Y.lbf)+DE_CH/2} x2={COL[3]+DE_CW/2} y2={cy(Y.gf)-DE_CH/2} />
          </g>
        </svg>

        {/* Col 0: UBR1 */}
        {(['ub1', 'ub2', 'ub3', 'ub4'] as const).map(id => (
          <div key={id} className="absolute" style={{ left: COL[0], top: Y[id], width: DE_CW }}>
            {cardEl(id)}
          </div>
        ))}
        {/* Col 1: UBR2 + LBR1 */}
        {(['ub5', 'ub6', 'lb1', 'lb2'] as const).map(id => (
          <div key={id} className="absolute" style={{ left: COL[1], top: Y[id], width: DE_CW }}>
            {cardEl(id)}
          </div>
        ))}
        {/* Col 2: UBF + LBR2 */}
        {(['ubf', 'lb3', 'lb4'] as const).map(id => (
          <div key={id} className="absolute" style={{ left: COL[2], top: Y[id], width: DE_CW }}>
            {cardEl(id)}
          </div>
        ))}
        {/* Col 3: LB Semi + LBF + GF */}
        {(['lb5', 'lbf', 'gf'] as const).map(id => (
          <div key={id} className="absolute" style={{ left: COL[3], top: Y[id], width: DE_CW }}>
            {cardEl(id)}
          </div>
        ))}

        {/* Champion badge */}
        {g('gf')?.winner && (
          <div
            className="absolute flex items-center gap-2 px-2.5 py-2 bg-tier-s/10 border border-tier-s/30 rounded-lg"
            style={{ left: COL[3], top: Y.gf + NEU_DE_CH + 10, width: DE_CW }}
          >
            <span className="text-base">🏆</span>
            <div className="min-w-0">
              <div className="text-[9px] text-tier-s font-bold uppercase leading-none mb-0.5">Champion</div>
              <div className="text-white font-bold text-xs truncate">{clubById(g('gf')!.winner!)?.name}</div>
            </div>
          </div>
        )}
      </div>

      {!po.series.some(s => s.matches.length > 0) && (
        <p className="text-center text-slate-500 text-sm py-4 mt-4">
          Playoffs start W13 Thu — advance time to see bracket unfold
        </p>
      )}
    </div>
  );
}

// ─── NEU/WEU Playoffs tab (spring/summer sub-tab) ────────────────────────────

function NEUWEUPlayoffsTab({ state }: { state: LeagueSimState }) {
  const hasSummer = !!state.playoffs;
  const hasSpring = !!state.springPlayoffs;
  const [split, setSplit] = useState<'spring' | 'summer'>(() =>
    hasSummer ? 'summer' : 'spring',
  );

  useEffect(() => {
    if (hasSummer) setSplit('summer');
  }, [hasSummer]);

  const po = split === 'summer' ? state.playoffs : state.springPlayoffs;
  const poStandings = split === 'summer'
    ? (state.fullLeagueState?.standings ?? state.standings)
    : (state.springStandings ?? []);

  return (
    <div className="pt-2">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSplit('spring')}
          disabled={!hasSpring}
          className={`px-3 py-1 text-xs rounded border transition-colors ${
            split === 'spring'
              ? 'bg-green-500/20 text-green-300 border-green-500/30 font-bold'
              : hasSpring
                ? 'text-slate-400 border-bg-border hover:text-slate-200 hover:border-slate-500'
                : 'text-slate-600 border-bg-border/30 cursor-not-allowed'
          }`}
        >
          🌸 Spring Playoffs
        </button>
        <button
          onClick={() => setSplit('summer')}
          disabled={!hasSummer}
          className={`px-3 py-1 text-xs rounded border transition-colors ${
            split === 'summer'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
              : hasSummer
                ? 'text-slate-400 border-bg-border hover:text-slate-200 hover:border-slate-500'
                : 'text-slate-600 border-bg-border/30 cursor-not-allowed'
          }`}
        >
          ☀️ Summer Playoffs
        </button>
      </div>
      {po ? (
        <NEUWEUDEBracket po={po} state={state} standings={poStandings} />
      ) : (
        <p className="text-center text-slate-500 py-12 text-sm">
          {split === 'spring'
            ? 'Spring playoffs start W13 Thu'
            : 'Summer playoffs start W35 Thu'}
        </p>
      )}
    </div>
  );
}

// ─── NEU/WEU Season Review ────────────────────────────────────────────────────

// Playoff points per final split rank
const NEU_SPRING_PO_PTS: Record<number, number> = {
  1: 70, 2: 50, 3: 35, 4: 25, 5: 15, 6: 15,
  // 7th-8th: 0, 9th-12th: 0 (omitted → default 0)
};
const NEU_SUMMER_PO_PTS: Record<number, number> = {
  1: 220, 2: 100, 3: 75, 4: 55, 5: 35, 6: 35, 7: 20, 8: 20,
  // 9th-12th: 0
};

// Final rank from DE bracket:
// 1st GF winner, 2nd GF loser, 3rd LBF loser, 4th LB-Semi loser,
// 5th-6th LBR2 losers, 7th-8th LBR1 losers, 9th-12th non-qualifiers
function neuWEURanksFromPO(po: PlayoffState | undefined, reg: TeamRecord[]): Map<string, { rank: number; stage: string }> {
  const out = new Map<string, { rank: number; stage: string }>();
  if (!po?.completed) {
    reg.forEach((r, i) => out.set(r.clubId, { rank: i + 1, stage: 'regular' }));
    return out;
  }
  const g = (id: string) => po.series.find(s => s.id === id);
  const loser = (s: PlayoffSeries | undefined) => s?.winner ? (s.winner === s.teamA ? s.teamB : s.teamA) : null;
  const regRankOf = (id: string) => reg.findIndex(r => r.clubId === id);
  const sortByReg = (ids: (string | null)[]) =>
    (ids.filter(Boolean) as string[]).sort((a, b) => regRankOf(a) - regRankOf(b));

  const gf = g('gf');
  if (gf?.winner) out.set(gf.winner, { rank: 1, stage: 'champion' });
  const gfL = loser(gf); if (gfL) out.set(gfL, { rank: 2, stage: 'finalist' });
  // 3rd: LBF loser (UBF loser drops to LBF; whoever loses LBF = 3rd)
  const lbfL = loser(g('lbf')); if (lbfL && !out.has(lbfL)) out.set(lbfL, { rank: 3, stage: 'finalq' });
  // 4th: LB Semi loser (eliminated before LBF)
  const lb5L = loser(g('lb5')); if (lb5L && !out.has(lb5L)) out.set(lb5L, { rank: 4, stage: 'lb_semi' });
  // 5th-6th: LBR2 losers
  sortByReg([loser(g('lb3')), loser(g('lb4'))]).forEach((id, i) => {
    if (!out.has(id)) out.set(id, { rank: 5 + i, stage: 'lbr2' });
  });
  // 7th-8th: LBR1 losers
  sortByReg([loser(g('lb1')), loser(g('lb2'))]).forEach((id, i) => {
    if (!out.has(id)) out.set(id, { rank: 7 + i, stage: 'lbr1' });
  });
  // 9th-12th: non-qualifiers by regular season standing
  let nextRank = out.size + 1;
  for (const { clubId } of reg) {
    if (!out.has(clubId)) out.set(clubId, { rank: nextRank++, stage: 'regular' });
  }
  return out;
}

const NEU_STAGE_LABELS: Record<string, string> = {
  champion: '🏆 Champion',
  finalist: 'Finalist',
  finalq:   'LB Final',
  lb_semi:  'LB Semi',
  lbr2:     'LBR2',
  lbr1:     'LBR1',
  regular:  '—',
};

function NEUWEUSeasonReview({ leagueId, state }: { leagueId: string; state: LeagueSimState }) {
  const cupStates = useStore(s => s.cupStates);
  const allClubs = clubsByLeague(leagueId);

  const springReg = state.springStandings ?? [];
  const summerReg = state.fullLeagueState?.standings ?? state.standings;
  const springPO  = state.springPlayoffs;
  const summerPO  = state.playoffs;

  const springRanks = neuWEURanksFromPO(springPO, springReg);
  const summerRanks = neuWEURanksFromPO(summerPO, summerReg);

  const rows = allClubs.map(club => {
    const sInfo  = springRanks.get(club.id);
    const uInfo  = summerRanks.get(club.id);
    const sRank  = sInfo?.rank ?? 12;
    const uRank  = uInfo?.rank ?? 12;
    const sRec   = springReg.find(r => r.clubId === club.id);
    const uRec   = summerReg.find(r => r.clubId === club.id);
    const sRegPts = (sRec?.wins ?? 0) * 10;
    const uRegPts = (uRec?.wins ?? 0) * 10;
    const sPOPts  = NEU_SPRING_PO_PTS[sRank] ?? 0;
    const uPOPts  = NEU_SUMMER_PO_PTS[uRank] ?? 0;
    const total   = sPOPts + sRegPts + uPOPts + uRegPts;
    return {
      clubId: club.id, sRank, uRank, sRec, uRec,
      sRegPts, uRegPts, sPOPts, uPOPts, total,
      sStage: sInfo?.stage ?? 'regular',
      uStage: uInfo?.stage ?? 'regular',
    };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.uRank !== b.uRank) return a.uRank - b.uRank;
    if (b.uRegPts !== a.uRegPts) return b.uRegPts - a.uRegPts;
    return (b.sRegPts + b.uRegPts) - (a.sRegPts + a.uRegPts);
  });

  const neuOrderedIds = rows.map(r => r.clubId);
  const neuCupChampions = {
    APEX: cupStates['APEX']?.champion,
    EGT:  cupStates['EGT']?.champion,
    COPA: cupStates['COPA']?.champion,
  };
  const neuBadgeMap = computeLeagueBadges(leagueId, neuOrderedIds, neuCupChampions);

  const hasSpring = springReg.length > 0;
  const hasSummer = summerReg.length > 0;

  return (
    <div>
      {(!!state.playoffs && !state.playoffs.completed) && (
        <p className="text-xs text-amber-500/80 mb-3 px-1">Season in progress — rankings reflect current standings</p>
      )}
      <div className="overflow-x-auto">
        <table className="text-xs min-w-full">
          <thead>
            <tr className="text-slate-600 border-b border-bg-border/30">
              <th className="text-left py-1.5 w-6" rowSpan={2}>#</th>
              <th className="text-left py-1.5" rowSpan={2}>Team</th>
              {hasSpring && (
                <th colSpan={8} className="text-center py-1 text-[10px] font-bold text-green-400/70 tracking-wider border-b border-green-500/20 border-l border-bg-border/20">
                  🌸 Spring
                </th>
              )}
              {hasSummer && (
                <th colSpan={8} className="text-center py-1 text-[10px] font-bold text-amber-400/70 tracking-wider border-b border-amber-500/20 border-l border-bg-border/20">
                  ☀️ Summer
                </th>
              )}
              <th className="text-center py-1.5 w-16 font-bold text-slate-200 border-l border-bg-border/20" rowSpan={2}>Total</th>
              <th className="text-left py-1.5 w-16" rowSpan={2}>Int'l</th>
            </tr>
            <tr className="text-slate-500 border-b border-bg-border text-[10px]">
              {hasSpring && <>
                <th className="text-left py-1.5 pl-2 w-20 border-l border-bg-border/20">Result</th>
                <th className="text-center py-1.5 w-7">W</th>
                <th className="text-center py-1.5 w-7">L</th>
                <th className="text-center py-1.5 w-12">ScD</th>
                <th className="text-center py-1.5 w-10">ScG</th>
                <th className="text-center py-1.5 w-10 text-slate-600">Reg</th>
                <th className="text-center py-1.5 w-10 text-green-500/60">PO</th>
                <th className="text-center py-1.5 w-12 font-bold text-green-400/80">Spr</th>
              </>}
              {hasSummer && <>
                <th className="text-left py-1.5 pl-2 w-20 border-l border-bg-border/20">Result</th>
                <th className="text-center py-1.5 w-7">W</th>
                <th className="text-center py-1.5 w-7">L</th>
                <th className="text-center py-1.5 w-12">ScD</th>
                <th className="text-center py-1.5 w-10">ScG</th>
                <th className="text-center py-1.5 w-10 text-slate-600">Reg</th>
                <th className="text-center py-1.5 w-10 text-amber-500/60">PO</th>
                <th className="text-center py-1.5 w-12 font-bold text-amber-400/80">Sum</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const club = clubById(row.clubId);
              if (!club) return null;
              const rank = idx + 1;
              const badges = neuBadgeMap[row.clubId] ?? [];
              const isSummerChamp = row.uStage === 'champion';
              const isAnyChamp = isSummerChamp || row.sStage === 'champion';
              const sScD = row.sRec ? row.sRec.momFor - row.sRec.momAgainst : null;
              const uScD = row.uRec ? row.uRec.momFor - row.uRec.momAgainst : null;
              const sTotal = row.sPOPts + row.sRegPts;
              const uTotal = row.uPOPts + row.uRegPts;

              return (
                <tr key={row.clubId} className={`border-b border-bg-border/40 hover:bg-bg-hover ${isSummerChamp ? 'bg-tier-s/5' : ''}`}>
                  <td className="py-1.5 text-slate-500 font-mono">{rank}</td>
                  <td className="py-1.5">
                    <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s">
                      <TeamDot club={club} showAbbr={false} />
                      <span className={isSummerChamp ? 'text-tier-s font-bold' : isAnyChamp ? 'text-slate-100 font-semibold' : 'text-slate-200'}>
                        {club.name}
                      </span>
                    </Link>
                  </td>
                  {hasSpring && <>
                    <td className="py-1.5 pl-2 border-l border-bg-border/20 whitespace-nowrap text-slate-400">
                      {NEU_STAGE_LABELS[row.sStage] ?? '—'}
                    </td>
                    <td className="py-1.5 text-center text-status-up">{row.sRec?.wins ?? '—'}</td>
                    <td className="py-1.5 text-center text-status-down">{row.sRec?.losses ?? '—'}</td>
                    <td className={`py-1.5 text-center ${sScD != null && sScD >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                      {sScD != null ? `${sScD >= 0 ? '+' : ''}${sScD}` : '—'}
                    </td>
                    <td className="py-1.5 text-center text-slate-400">{row.sRec?.momFor ?? '—'}</td>
                    <td className="py-1.5 text-center text-slate-500">{row.sRegPts}</td>
                    <td className="py-1.5 text-center text-green-500/80">{row.sPOPts}</td>
                    <td className="py-1.5 text-center font-bold text-green-400">{sTotal}</td>
                  </>}
                  {hasSummer && <>
                    <td className="py-1.5 pl-2 border-l border-bg-border/20 whitespace-nowrap text-slate-400">
                      {NEU_STAGE_LABELS[row.uStage] ?? '—'}
                    </td>
                    <td className="py-1.5 text-center text-status-up">{row.uRec?.wins ?? '—'}</td>
                    <td className="py-1.5 text-center text-status-down">{row.uRec?.losses ?? '—'}</td>
                    <td className={`py-1.5 text-center ${uScD != null && uScD >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                      {uScD != null ? `${uScD >= 0 ? '+' : ''}${uScD}` : '—'}
                    </td>
                    <td className="py-1.5 text-center text-slate-400">{row.uRec?.momFor ?? '—'}</td>
                    <td className="py-1.5 text-center text-slate-500">{row.uRegPts}</td>
                    <td className="py-1.5 text-center text-amber-500/80">{row.uPOPts}</td>
                    <td className="py-1.5 text-center font-bold text-amber-400">{uTotal}</td>
                  </>}
                  <td className="py-1.5 text-center font-bold text-white border-l border-bg-border/20">{row.total}</td>
                  <td className="py-1.5">
                    <div className="flex gap-1 flex-wrap">
                      {badges.map(b => (
                        <span key={b} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${b === 'WT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── L_TR Season Review ───────────────────────────────────────────────────────

const TR_SPRING_PO_PTS: Record<number, number> = {
  1: 50, 2: 35, 3: 25, 4: 18, 5: 10, 6: 10,
  // 7th-8th: 0
};
const TR_SUMMER_PO_PTS: Record<number, number> = {
  1: 160, 2: 75, 3: 55, 4: 40, 5: 25, 6: 25, 7: 10, 8: 10,
};

function TRSeasonReview({ state }: { state: LeagueSimState }) {
  const cupStates = useStore(s => s.cupStates);
  const allClubs = clubsByLeague('L_TR');

  const springReg = state.springStandings ?? [];
  const summerReg = state.fullLeagueState?.standings ?? state.standings;
  const springPO  = state.springPlayoffs;
  const summerPO  = state.playoffs;

  const springRanks = neuWEURanksFromPO(springPO, springReg);
  const summerRanks = neuWEURanksFromPO(summerPO, summerReg);

  const rows = allClubs.map(club => {
    const sInfo   = springRanks.get(club.id);
    const uInfo   = summerRanks.get(club.id);
    const sRank   = sInfo?.rank ?? 8;
    const uRank   = uInfo?.rank ?? 8;
    const sRec    = springReg.find(r => r.clubId === club.id);
    const uRec    = summerReg.find(r => r.clubId === club.id);
    const sRegPts = (sRec?.wins ?? 0) * 10;
    const uRegPts = (uRec?.wins ?? 0) * 10;
    const sPOPts  = TR_SPRING_PO_PTS[sRank] ?? 0;
    const uPOPts  = TR_SUMMER_PO_PTS[uRank] ?? 0;
    const total   = sPOPts + sRegPts + uPOPts + uRegPts;
    return {
      clubId: club.id, sRank, uRank, sRec, uRec,
      sRegPts, uRegPts, sPOPts, uPOPts, total,
      sStage: sInfo?.stage ?? 'regular',
      uStage: uInfo?.stage ?? 'regular',
    };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.uRank !== b.uRank) return a.uRank - b.uRank;
    if (b.uRegPts !== a.uRegPts) return b.uRegPts - a.uRegPts;
    return (b.sRegPts + b.uRegPts) - (a.sRegPts + a.uRegPts);
  });

  const trOrderedIds = rows.map(r => r.clubId);
  const trCupChampions = {
    APEX: cupStates['APEX']?.champion,
    EGT:  cupStates['EGT']?.champion,
    COPA: cupStates['COPA']?.champion,
  };
  const trBadgeMap = computeLeagueBadges('L_TR', trOrderedIds, trCupChampions);

  const hasSpring = springReg.length > 0;
  const hasSummer = summerReg.length > 0;

  return (
    <div>
      {(!!state.playoffs && !state.playoffs.completed) && (
        <p className="text-xs text-amber-500/80 mb-3 px-1">Season in progress — rankings reflect current standings</p>
      )}
      <div className="overflow-x-auto">
        <table className="text-xs min-w-full">
          <thead>
            <tr className="text-slate-600 border-b border-bg-border/30">
              <th className="text-left py-1.5 w-6" rowSpan={2}>#</th>
              <th className="text-left py-1.5" rowSpan={2}>Team</th>
              {hasSpring && (
                <th colSpan={7} className="text-center py-1 text-[10px] font-bold text-green-400/70 tracking-wider border-b border-green-500/20 border-l border-bg-border/20">
                  🌸 Spring
                </th>
              )}
              {hasSummer && (
                <th colSpan={7} className="text-center py-1 text-[10px] font-bold text-amber-400/70 tracking-wider border-b border-amber-500/20 border-l border-bg-border/20">
                  ☀️ Summer
                </th>
              )}
              <th className="text-center py-1.5 w-16 font-bold text-slate-200 border-l border-bg-border/20" rowSpan={2}>Total</th>
              <th className="text-left py-1.5 w-16" rowSpan={2}>Int'l</th>
            </tr>
            <tr className="text-slate-500 border-b border-bg-border text-[10px]">
              {hasSpring && <>
                <th className="text-left py-1.5 pl-2 w-20 border-l border-bg-border/20">Result</th>
                <th className="text-center py-1.5 w-7">W</th>
                <th className="text-center py-1.5 w-7">L</th>
                <th className="text-center py-1.5 w-10 text-slate-600">Reg</th>
                <th className="text-center py-1.5 w-10 text-green-500/60">PO</th>
                <th className="text-center py-1.5 w-12 font-bold text-green-400/80">Spr</th>
              </>}
              {hasSummer && <>
                <th className="text-left py-1.5 pl-2 w-20 border-l border-bg-border/20">Result</th>
                <th className="text-center py-1.5 w-7">W</th>
                <th className="text-center py-1.5 w-7">L</th>
                <th className="text-center py-1.5 w-10 text-slate-600">Reg</th>
                <th className="text-center py-1.5 w-10 text-amber-500/60">PO</th>
                <th className="text-center py-1.5 w-12 font-bold text-amber-400/80">Sum</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const club = clubById(row.clubId);
              if (!club) return null;
              const rank = idx + 1;
              const badges = trBadgeMap[row.clubId] ?? [];
              const isSummerChamp = row.uStage === 'champion';
              const isAnyChamp = isSummerChamp || row.sStage === 'champion';
              const sTotal = row.sPOPts + row.sRegPts;
              const uTotal = row.uPOPts + row.uRegPts;
              return (
                <tr key={row.clubId} className={`border-b border-bg-border/40 hover:bg-bg-hover ${isSummerChamp ? 'bg-tier-s/5' : ''}`}>
                  <td className="py-1.5 text-slate-500 font-mono">{rank}</td>
                  <td className="py-1.5">
                    <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s">
                      <TeamDot club={club} showAbbr={false} />
                      <span className={isSummerChamp ? 'text-tier-s font-bold' : isAnyChamp ? 'text-slate-100 font-semibold' : 'text-slate-200'}>
                        {club.name}
                      </span>
                    </Link>
                  </td>
                  {hasSpring && <>
                    <td className="py-1.5 pl-2 border-l border-bg-border/20 whitespace-nowrap text-slate-400">
                      {NEU_STAGE_LABELS[row.sStage] ?? '—'}
                    </td>
                    <td className="py-1.5 text-center text-status-up">{row.sRec?.wins ?? '—'}</td>
                    <td className="py-1.5 text-center text-status-down">{row.sRec?.losses ?? '—'}</td>
                    <td className="py-1.5 text-center text-slate-500">{row.sRegPts}</td>
                    <td className="py-1.5 text-center text-green-500/80">{row.sPOPts}</td>
                    <td className="py-1.5 text-center font-bold text-green-400">{sTotal}</td>
                  </>}
                  {hasSummer && <>
                    <td className="py-1.5 pl-2 border-l border-bg-border/20 whitespace-nowrap text-slate-400">
                      {NEU_STAGE_LABELS[row.uStage] ?? '—'}
                    </td>
                    <td className="py-1.5 text-center text-status-up">{row.uRec?.wins ?? '—'}</td>
                    <td className="py-1.5 text-center text-status-down">{row.uRec?.losses ?? '—'}</td>
                    <td className="py-1.5 text-center text-slate-500">{row.uRegPts}</td>
                    <td className="py-1.5 text-center text-amber-500/80">{row.uPOPts}</td>
                    <td className="py-1.5 text-center font-bold text-amber-400">{uTotal}</td>
                  </>}
                  <td className="py-1.5 text-center font-bold text-white border-l border-bg-border/20">{row.total}</td>
                  <td className="py-1.5">
                    <div className="flex gap-1 flex-wrap">
                      {badges.map(b => (
                        <span key={b} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${b === 'WT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-tier-a/10 text-tier-a border-tier-a/20'}`}>{b}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── L_DE / L_EEU / L_SEU / L_RU — 6-team DE Bracket ───────────────────────

const DE6_CW  = 192;
const DE6_CH  = 66;
const DE6_HDR = 18;
const DE6_CARD_H = DE6_CH + DE6_HDR;
const DE6_GAP = 40;
const DE6_SH  = 110;

const DE6_SERIES_DATES_SPRING: Record<string, string> = {
  de_u1: 'W13 Sat', de_u2: 'W13 Sun',
  de_l1: 'W14 Sat', de_l2: 'W14 Sun',
  de_u3: 'W15 Wed', de_l3: 'W15 Fri', de_l4: 'W15 Sat', de_gf: 'W15 Sun',
};
const DE6_SERIES_DATES_SUMMER: Record<string, string> = {
  de_u1: 'W35 Sat', de_u2: 'W35 Sun',
  de_l1: 'W36 Sat', de_l2: 'W36 Sun',
  de_u3: 'W37 Wed', de_l3: 'W37 Fri', de_l4: 'W37 Sat', de_gf: 'W37 Sun',
};
const DE6_ROUND_LABELS: Record<string, string> = {
  de_u1: 'UBR1', de_u2: 'UBR1',
  de_l1: 'LBR1', de_l2: 'LBR1',
  de_u3: 'UBF',  de_l3: 'LBR2', de_l4: 'LBF', de_gf: 'Grand Final',
};

function DE6SeriesCard({ s, state, seedMap, dates }: {
  s: PlayoffSeries; state?: LeagueSimState; seedMap?: Map<string, number>;
  dates: Record<string, string>;
}) {
  const [hover, setHover] = useState(false);
  const clubA = s.teamA ? clubById(s.teamA) : null;
  const clubB = s.teamB ? clubById(s.teamB) : null;
  const totalA = s.startWinsA + s.winsA;
  const totalB = s.winsB;
  const pending = !s.winner && s.matches.length === 0 && s.teamA && s.teamB;
  const odds = pending ? calcOdds(getTeamElo(s.teamA, state), getTeamElo(s.teamB, state)) : null;
  const seedA = s.teamA ? seedMap?.get(s.teamA) : undefined;
  const seedB = s.teamB ? seedMap?.get(s.teamB) : undefined;
  const firstGame = s.matches[0];
  const footerOddsA = odds?.oddsA ?? firstGame?.oddsA;
  const footerOddsB = odds?.oddsB ?? firstGame?.oddsB;
  const showOdds = footerOddsA !== undefined && footerOddsB !== undefined;
  const winA = s.winner === s.teamA;
  const winB = s.winner === s.teamB;
  const winnerOdds = winA ? footerOddsA : winB ? footerOddsB : undefined;
  const loserOdds  = winA ? footerOddsB : winB ? footerOddsA : undefined;
  const isUpset = winnerOdds !== undefined && loserOdds !== undefined && winnerOdds > loserOdds;

  return (
    <div
      className="relative border border-bg-border rounded bg-bg-base shadow-sm text-xs overflow-visible select-none"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="px-2 py-0.5 flex justify-between items-center border-b border-bg-border/50 bg-bg-panel/40">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          {DE6_ROUND_LABELS[s.id] ?? s.id.toUpperCase()}
        </span>
        <span className="text-[9px] text-slate-600">{dates[s.id] ?? ''}</span>
      </div>
      <div className={`px-2 py-1.5 flex items-center gap-1 ${winA ? 'bg-tier-s/10' : s.winner ? 'opacity-40' : ''}`}>
        {seedA !== undefined && <span className="text-[9px] text-slate-500 w-5 shrink-0 tabular-nums">#{seedA}</span>}
        {clubA && <TeamDot club={clubA} showAbbr={false} />}
        <span className={`font-medium truncate flex-1 ${winA ? 'text-white' : 'text-slate-300'}`}>
          {clubA?.abbr ?? s.teamA ?? 'TBD'}
        </span>
        <span className={`font-bold tabular-nums ${winA ? 'text-tier-s' : 'text-slate-400'}`}>{totalA}</span>
      </div>
      <div className="border-t border-bg-border/30" />
      <div className={`px-2 py-1.5 flex items-center gap-1 ${winB ? 'bg-tier-s/10' : s.winner ? 'opacity-40' : ''}`}>
        {seedB !== undefined && <span className="text-[9px] text-slate-500 w-5 shrink-0 tabular-nums">#{seedB}</span>}
        {clubB && <TeamDot club={clubB} showAbbr={false} />}
        <span className={`font-medium truncate flex-1 ${winB ? 'text-white' : 'text-slate-300'}`}>
          {clubB?.abbr ?? s.teamB ?? 'TBD'}
        </span>
        <span className={`font-bold tabular-nums ${winB ? 'text-tier-s' : 'text-slate-400'}`}>{totalB}</span>
      </div>
      {showOdds && (
        <div className="px-2 py-0.5 border-t border-bg-border/30 flex justify-between text-[10px]">
          <span className={upsetOddsClass(footerOddsA!, winA, isUpset)}>{footerOddsA!.toFixed(2)}</span>
          <span className="text-slate-700">odds</span>
          <span className={upsetOddsClass(footerOddsB!, winB, isUpset)}>{footerOddsB!.toFixed(2)}</span>
        </div>
      )}
      {hover && s.matches.length > 0 && (
        <div className="absolute left-full top-0 ml-2 bg-bg-panel border border-bg-border rounded p-2.5 z-50 w-40 shadow-xl">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Game Log · Bo5</div>
          {s.matches.map((m, i) => {
            const aWon = m.scoreA > m.scoreB;
            return (
              <div key={i} className="flex justify-between text-[11px]">
                <span className="text-slate-500">Game {i + 1}</span>
                <span className={aWon ? 'text-status-up font-bold' : 'text-status-down font-bold'}>{m.scoreA}–{m.scoreB}</span>
              </div>
            );
          })}
          {s.winner && (
            <div className="mt-1.5 pt-1.5 border-t border-bg-border/50 text-[11px] text-tier-s font-bold text-center">
              {clubById(s.winner)?.abbr ?? s.winner} wins
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DE6Bracket({ po, state, standings, split }: {
  po: PlayoffState; state?: LeagueSimState; standings?: TeamRecord[]; split: 'spring' | 'summer';
}) {
  const g = (id: string) => po.series.find(s => s.id === id);
  const seedMap = new Map<string, number>();
  standings?.forEach((r, i) => seedMap.set(r.clubId, i + 1));
  const dates = split === 'spring' ? DE6_SERIES_DATES_SPRING : DE6_SERIES_DATES_SUMMER;

  // 3 columns
  const COL = [0, DE6_CW + DE6_GAP, 2 * (DE6_CW + DE6_GAP)];
  const TW  = COL[2] + DE6_CW;

  // Y positions (card tops)
  const Y = {
    u1: 0,
    u2: 2 * DE6_SH,
    l1: 0,
    u3: 1 * DE6_SH,
    l2: 2 * DE6_SH,
    l3: 0.5 * DE6_SH,
    l4: 1.5 * DE6_SH,
    gf: 2.75 * DE6_SH,
  };

  const TH = 2.75 * DE6_SH + DE6_CARD_H + 60;
  const LINE = '#334155';
  const cy = (top: number) => top + DE6_CARD_H / 2;

  const cardEl = (id: string, col: number) => {
    const s = g(id);
    if (!s) return null;
    return (
      <div key={id} className="absolute" style={{ left: COL[col], top: (Y as Record<string, number>)[id.replace('de_', '')], width: DE6_CW }}>
        <DE6SeriesCard s={s} state={state} seedMap={seedMap} dates={dates} />
      </div>
    );
  };

  const mx01 = COL[0] + DE6_CW + DE6_GAP / 2;
  const mx12 = COL[1] + DE6_CW + DE6_GAP / 2;

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 mb-3 select-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20">
          승자조 Upper Bracket
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20">
          패자조 Lower Bracket
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-tier-s bg-tier-s/10 border border-tier-s/20">
          Finals
        </div>
      </div>
      <div className="flex mb-3 select-none" style={{ width: TW }}>
        {[['Week 1 · UBR1', 0], ['Week 2 · LBR1 / UBF', 1], ['Week 3 · Finals', 2]].map(([label, col]) => (
          <div
            key={String(col)}
            className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center"
            style={{ width: DE6_CW, marginLeft: Number(col) === 0 ? 0 : DE6_GAP }}
          >
            {label as string}
          </div>
        ))}
      </div>

      <div className="relative" style={{ width: TW, height: TH }}>
        <svg className="absolute inset-0 pointer-events-none" width={TW} height={TH}>
          <g fill="none" strokeWidth="1.5" stroke={LINE}>
            {/* U1 winner → U3 (col0→col1) */}
            <line x1={COL[0]+DE6_CW} y1={cy(Y.u1)} x2={mx01} y2={cy(Y.u1)} />
            <line x1={mx01} y1={cy(Y.u1)} x2={mx01} y2={cy(Y.u3)} />
            <line x1={mx01} y1={cy(Y.u3)} x2={COL[1]} y2={cy(Y.u3)} />
            {/* U2 winner → U3 */}
            <line x1={COL[0]+DE6_CW} y1={cy(Y.u2)} x2={mx01} y2={cy(Y.u2)} />
            <line x1={mx01} y1={cy(Y.u2)} x2={mx01} y2={cy(Y.u3)} />
            {/* U1 loser → L1 (dashed) */}
            <g strokeDasharray="4 3">
              <line x1={COL[0]+DE6_CW} y1={cy(Y.u1)} x2={COL[0]+DE6_CW+DE6_GAP*0.8} y2={cy(Y.u1)} />
              <line x1={COL[0]+DE6_CW+DE6_GAP*0.8} y1={cy(Y.u1)} x2={COL[0]+DE6_CW+DE6_GAP*0.8} y2={cy(Y.l1)} />
              <line x1={COL[0]+DE6_CW+DE6_GAP*0.8} y1={cy(Y.l1)} x2={COL[1]} y2={cy(Y.l1)} />
            </g>
            {/* U2 loser → L2 (dashed) */}
            <g strokeDasharray="4 3">
              <line x1={COL[0]+DE6_CW} y1={cy(Y.u2)} x2={COL[0]+DE6_CW+DE6_GAP*0.8} y2={cy(Y.u2)} />
              <line x1={COL[0]+DE6_CW+DE6_GAP*0.8} y1={cy(Y.u2)} x2={COL[0]+DE6_CW+DE6_GAP*0.8} y2={cy(Y.l2)} />
              <line x1={COL[0]+DE6_CW+DE6_GAP*0.8} y1={cy(Y.l2)} x2={COL[1]} y2={cy(Y.l2)} />
            </g>
            {/* U3 winner → GF (col1→col2) */}
            <line x1={COL[1]+DE6_CW} y1={cy(Y.u3)} x2={mx12} y2={cy(Y.u3)} />
            <line x1={mx12} y1={cy(Y.u3)} x2={mx12} y2={cy(Y.gf)} />
            <line x1={mx12} y1={cy(Y.gf)} x2={COL[2]} y2={cy(Y.gf)} />
            {/* U3 loser → L4 (dashed) */}
            <g strokeDasharray="4 3">
              <line x1={COL[1]+DE6_CW} y1={cy(Y.u3)} x2={COL[1]+DE6_CW+DE6_GAP*0.8} y2={cy(Y.u3)} />
              <line x1={COL[1]+DE6_CW+DE6_GAP*0.8} y1={cy(Y.u3)} x2={COL[1]+DE6_CW+DE6_GAP*0.8} y2={cy(Y.l4)} />
              <line x1={COL[1]+DE6_CW+DE6_GAP*0.8} y1={cy(Y.l4)} x2={COL[2]} y2={cy(Y.l4)} />
            </g>
            {/* L1 winner → L3 (col1→col2) */}
            <line x1={COL[1]+DE6_CW} y1={cy(Y.l1)} x2={mx12} y2={cy(Y.l1)} />
            <line x1={mx12} y1={cy(Y.l1)} x2={mx12} y2={cy(Y.l3)} />
            <line x1={mx12} y1={cy(Y.l3)} x2={COL[2]} y2={cy(Y.l3)} />
            {/* L2 winner → L3 */}
            <line x1={COL[1]+DE6_CW} y1={cy(Y.l2)} x2={mx12} y2={cy(Y.l2)} />
            <line x1={mx12} y1={cy(Y.l2)} x2={mx12} y2={cy(Y.l3)} />
            {/* L3 winner → L4 (within col2) */}
            <line x1={COL[2]+DE6_CW/2} y1={cy(Y.l3)+DE6_CH/2} x2={COL[2]+DE6_CW/2} y2={cy(Y.l4)-DE6_CH/2} />
            {/* L4 winner → GF (within col2) */}
            <line x1={COL[2]+DE6_CW/2} y1={cy(Y.l4)+DE6_CH/2} x2={COL[2]+DE6_CW/2} y2={cy(Y.gf)-DE6_CH/2} />
          </g>
        </svg>

        {/* Col 0: U1, U2 */}
        {cardEl('de_u1', 0)}
        {cardEl('de_u2', 0)}
        {/* Col 1: L1, U3, L2 */}
        {(['de_l1', 'de_u3', 'de_l2'] as const).map(id => {
          const s = g(id);
          if (!s) return null;
          const yKey = id.replace('de_', '') as keyof typeof Y;
          return (
            <div key={id} className="absolute" style={{ left: COL[1], top: Y[yKey], width: DE6_CW }}>
              <DE6SeriesCard s={s} state={state} seedMap={seedMap} dates={dates} />
            </div>
          );
        })}
        {/* Col 2: L3, L4, GF */}
        {(['de_l3', 'de_l4', 'de_gf'] as const).map(id => {
          const s = g(id);
          if (!s) return null;
          const yKey = id.replace('de_', '') as keyof typeof Y;
          return (
            <div key={id} className="absolute" style={{ left: COL[2], top: Y[yKey], width: DE6_CW }}>
              <DE6SeriesCard s={s} state={state} seedMap={seedMap} dates={dates} />
            </div>
          );
        })}

        {g('de_gf')?.winner && (
          <div
            className="absolute flex items-center gap-2 px-2.5 py-2 bg-tier-s/10 border border-tier-s/30 rounded-lg"
            style={{ left: COL[2], top: Y.gf + DE6_CARD_H + 10, width: DE6_CW }}
          >
            <span className="text-base">🏆</span>
            <div className="min-w-0">
              <div className="text-[9px] text-tier-s font-bold uppercase leading-none mb-0.5">Champion</div>
              <div className="text-white font-bold text-xs truncate">{clubById(g('de_gf')!.winner!)?.name}</div>
            </div>
          </div>
        )}
      </div>

      {!po.series.some(s => s.matches.length > 0) && (
        <p className="text-center text-slate-500 text-sm py-4 mt-4">
          {split === 'spring'
            ? 'Spring playoffs start W13 Sat — advance time to see bracket unfold'
            : 'Summer playoffs start W35 Sat — advance time to see bracket unfold'}
        </p>
      )}
    </div>
  );
}

function DEPlayoffsTab({ state }: { state: LeagueSimState }) {
  const hasSummer = !!state.playoffs;
  const hasSpring = !!state.springPlayoffs;
  const [split, setSplit] = useState<'spring' | 'summer'>(() =>
    hasSummer ? 'summer' : 'spring',
  );

  useEffect(() => {
    if (hasSummer) setSplit('summer');
  }, [hasSummer]);

  const po = split === 'summer' ? state.playoffs : state.springPlayoffs;
  const poStandings = split === 'summer'
    ? (state.fullLeagueState?.standings ?? state.standings)
    : (state.springStandings ?? []);

  return (
    <div className="pt-2">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSplit('spring')}
          disabled={!hasSpring}
          className={`px-3 py-1 text-xs rounded border transition-colors ${
            split === 'spring'
              ? 'bg-green-500/20 text-green-300 border-green-500/30 font-bold'
              : hasSpring
                ? 'text-slate-400 border-bg-border hover:text-slate-200 hover:border-slate-500'
                : 'text-slate-600 border-bg-border/30 cursor-not-allowed'
          }`}
        >
          🌸 Spring Playoffs
        </button>
        <button
          onClick={() => setSplit('summer')}
          disabled={!hasSummer}
          className={`px-3 py-1 text-xs rounded border transition-colors ${
            split === 'summer'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
              : hasSummer
                ? 'text-slate-400 border-bg-border hover:text-slate-200 hover:border-slate-500'
                : 'text-slate-600 border-bg-border/30 cursor-not-allowed'
          }`}
        >
          ☀️ Summer Playoffs
        </button>
      </div>
      {po ? (
        <DE6Bracket po={po} state={state} standings={poStandings} split={split} />
      ) : (
        <p className="text-center text-slate-500 py-12 text-sm">
          {split === 'spring' ? 'Spring playoffs start W13 Sat' : 'Summer playoffs start W35 Sat'}
        </p>
      )}
    </div>
  );
}

// ─── L_TW / L_JP Playoffs tab ────────────────────────────────────────────────

function TWJPStaircaseBracket({ po, state }: { po: PlayoffState; state?: LeagueSimState }) {
  const CW    = 192;        // card width (matches PlayoffSeriesCard w-48)
  const CH    = 66;         // card height (approx with odds footer)
  const COLW  = CW + 28;   // column stride
  const VSTEP = 110;        // vertical step per round

  // Col x-origins: R1=leftmost, Final=rightmost
  const COL = [0, COLW, 2 * COLW, 3 * COLW];
  // Row tops: staircase from bottom-left (R1) to top-right (Final)
  const TOP = [3 * VSTEP, 2 * VSTEP, VSTEP, 0];

  const TW = 3 * COLW + CW;
  const TH = 3 * VSTEP + CH + 20;

  const rounds = [
    { id: 'sl_r1',    label: 'Round 1' },
    { id: 'sl_r2',    label: 'Round 2' },
    { id: 'sl_r3',    label: 'Round 3' },
    { id: 'sl_final', label: 'Final'   },
  ];

  // Elbow connector: right-center of col i → midX → up → left-center of col i+1
  const connectors = [0, 1, 2].map(i => {
    const x1 = COL[i] + CW;
    const y1 = TOP[i] + CH / 2;
    const x2 = COL[i + 1];
    const y2 = TOP[i + 1] + CH / 2;
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`;
  });

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ width: TW, height: TH }}>
        <svg className="absolute inset-0 pointer-events-none" width={TW} height={TH}>
          {connectors.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#334155" strokeWidth="1.5" />
          ))}
        </svg>

        {rounds.map(({ id, label }, i) => {
          const s = po.series.find(x => x.id === id);
          return (
            <div key={id} className="absolute" style={{ left: COL[i], top: TOP[i], width: CW }}>
              <div className="text-[9px] text-slate-600 font-medium mb-1 select-none">{label}</div>
              {s
                ? <PlayoffSeriesCard s={s} state={state} />
                : <div className="border border-dashed border-bg-border/40 rounded bg-bg-base flex items-center justify-center text-[10px] text-slate-600" style={{ height: CH }}>TBD</div>
              }
            </div>
          );
        })}

        {po.champion && (
          <div className="absolute flex items-center gap-2 px-2.5 py-2 bg-tier-s/10 border border-tier-s/30 rounded-lg"
            style={{ left: COL[3], top: TOP[3] + CH + 10, width: CW }}>
            <span className="text-base">🏆</span>
            <div className="min-w-0">
              <div className="text-[9px] text-tier-s font-bold uppercase leading-none mb-0.5">Champion</div>
              <div className="text-white font-bold text-xs truncate">{clubById(po.champion)?.name ?? po.champion}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TWJPPlayoffsTab({ state }: { state: LeagueSimState }) {
  const hasSummer = !!state.playoffs;
  const hasSpring = !!state.springPlayoffs;
  const [split, setSplit] = useState<'spring' | 'summer'>(() =>
    hasSummer ? 'summer' : 'spring',
  );
  useEffect(() => { if (hasSummer) setSplit('summer'); }, [hasSummer]);

  const po = split === 'summer' ? state.playoffs : state.springPlayoffs;

  return (
    <div className="pt-2">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSplit('spring')} disabled={!hasSpring}
          className={`px-3 py-1 text-xs rounded border transition-colors ${split === 'spring' ? 'bg-green-500/20 text-green-300 border-green-500/30 font-bold' : hasSpring ? 'text-slate-400 border-bg-border hover:text-slate-200 hover:border-slate-500' : 'text-slate-600 border-bg-border/30 cursor-not-allowed'}`}>
          🌸 Spring Playoffs
        </button>
        <button onClick={() => setSplit('summer')} disabled={!hasSummer}
          className={`px-3 py-1 text-xs rounded border transition-colors ${split === 'summer' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold' : hasSummer ? 'text-slate-400 border-bg-border hover:text-slate-200 hover:border-slate-500' : 'text-slate-600 border-bg-border/30 cursor-not-allowed'}`}>
          ☀️ Summer Playoffs
        </button>
      </div>
      {po ? (
        <TWJPStaircaseBracket po={po} state={state} />
      ) : (
        <p className="text-center text-slate-500 py-12 text-sm">
          {split === 'spring' ? 'Spring playoffs start W10 Sat' : 'Summer playoffs start W33 Sat'}
        </p>
      )}
    </div>
  );
}

// ─── L_TW / L_JP Season Review ───────────────────────────────────────────────

function twjpRanksFromPO(po: PlayoffState, regStandings: { clubId: string }[]): Map<string, { rank: number; stage: string }> {
  const loserOf = (s: PlayoffSeries) => s.winner === s.teamA ? s.teamB : s.teamA;
  const out = new Map<string, { rank: number; stage: string }>();
  if (!po.completed) return out;

  const final = po.series.find(s => s.id === 'sl_final');
  const r3    = po.series.find(s => s.id === 'sl_r3');
  const r2    = po.series.find(s => s.id === 'sl_r2');
  const r1    = po.series.find(s => s.id === 'sl_r1');

  if (final?.winner)          out.set(final.winner,       { rank: 1, stage: 'champion' });
  const finalL = final ? loserOf(final) : null;
  if (finalL)                 out.set(finalL,              { rank: 2, stage: 'finalist' });
  const r3L = r3 ? loserOf(r3) : null;
  if (r3L)                    out.set(r3L,                 { rank: 3, stage: 'sf' });
  const r2L = r2 ? loserOf(r2) : null;
  if (r2L)                    out.set(r2L,                 { rank: 4, stage: 'qf' });
  const r1L = r1 ? loserOf(r1) : null;
  if (r1L)                    out.set(r1L,                 { rank: 5, stage: 'qf' });

  let nextRank = out.size + 1;
  for (const { clubId } of regStandings) {
    if (!out.has(clubId)) out.set(clubId, { rank: nextRank++, stage: 'regular' });
  }
  return out;
}

function TWJPSeasonReview({ leagueId, state }: { leagueId: string; state: LeagueSimState }) {
  const cupStates = useStore(s => s.cupStates);
  const allClubs = clubsByLeague(leagueId);

  const summerReg = state.fullLeagueState?.standings ?? state.standings;
  const summerPO  = state.playoffs;

  const summerRanks = summerPO?.completed
    ? twjpRanksFromPO(summerPO, summerReg)
    : new Map<string, { rank: number; stage: string }>(summerReg.map((r, i) => [r.clubId, { rank: i + 1, stage: 'regular' }]));

  const recordMap = new Map<string, { wins: number; losses: number; setsFor: number; setsAgainst: number }>();
  for (const r of summerReg) {
    recordMap.set(r.clubId, { wins: r.wins, losses: r.losses, setsFor: r.setsFor, setsAgainst: r.setsAgainst });
  }

  const ranked = allClubs
    .map(club => ({
      clubId: club.id,
      rank:  summerRanks.get(club.id)?.rank  ?? allClubs.length,
      stage: summerRanks.get(club.id)?.stage ?? 'regular',
    }))
    .sort((a, b) => a.rank - b.rank);

  const twjpOrderedIds = ranked.map(r => r.clubId);
  const twjpCupChampions = {
    APEX: cupStates['APEX']?.champion,
    EGT:  cupStates['EGT']?.champion,
    COPA: cupStates['COPA']?.champion,
  };
  const twjpBadgeMap = computeLeagueBadges(leagueId, twjpOrderedIds, twjpCupChampions);

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500 text-xs border-b border-bg-border">
            <th className="text-left py-2 w-8">#</th>
            <th className="text-left py-2">Team</th>
            <th className="text-right py-2 pr-2">MW</th>
            <th className="text-right py-2 pr-2">ML</th>
            <th className="text-right py-2 pr-4">GD</th>
            <th className="text-left py-2">Badges</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map(({ clubId, rank, stage }) => {
            const club = clubById(clubId);
            const rec  = recordMap.get(clubId);
            const gd   = rec ? rec.setsFor - rec.setsAgainst : null;
            const badges = twjpBadgeMap[clubId] ?? [];
            return (
              <tr key={clubId} className="border-b border-bg-border/30 hover:bg-bg-panel/30">
                <td className="py-2 text-slate-400">{rank}</td>
                <td className="py-2">
                  <div className="font-bold text-white text-xs">{club?.name ?? clubId}</div>
                  {stage !== 'regular' && (
                    <div className="text-[10px] text-slate-500">{STAGE_LABELS[stage] ?? stage}</div>
                  )}
                </td>
                <td className="py-2 pr-2 text-right text-slate-300">{rec?.wins ?? '—'}</td>
                <td className="py-2 pr-2 text-right text-slate-400">{rec?.losses ?? '—'}</td>
                <td className="py-2 pr-4 text-right text-slate-400">
                  {gd != null ? `${gd >= 0 ? '+' : ''}${gd}` : '—'}
                </td>
                <td className="py-2">
                  <div className="flex gap-1 flex-wrap">
                    {badges.map(b => (
                      <span key={b} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${b === 'WT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-tier-a/10 text-tier-a border-tier-a/20'}`}>{b}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── L_MEAF ───────────────────────────────────────────────────────────────────

function MEAFStandingsTable({ records }: { records: TeamRecord[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-500 border-b border-bg-border">
          <th className="text-left py-2 w-6">#</th>
          <th className="text-left py-2">Team</th>
          <th className="text-center py-2 w-28">Circuit Pts</th>
        </tr>
      </thead>
      <tbody>
        {records.map((rec, idx) => {
          const club = clubById(rec.clubId);
          if (!club) return null;
          return (
            <tr key={rec.clubId} className="border-b border-bg-border/50 hover:bg-bg-hover">
              <td className="py-2 text-slate-500 text-xs">{idx + 1}</td>
              <td className="py-2">
                <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s">
                  <TeamDot club={club} showAbbr={false} />
                  <span className="text-slate-200">{club.name}</span>
                </Link>
              </td>
              <td className="py-2 text-center font-bold text-tier-s">{rec.wins}</td>
            </tr>
          );
        })}
        {records.length === 0 && (
          <tr><td colSpan={3} className="py-8 text-center text-slate-500">Simulate a split to see standings</td></tr>
        )}
      </tbody>
    </table>
  );
}

function MEAFMMQBracket({ mmq, state }: { mmq: PlayoffState; state?: LeagueSimState }) {
  const r1    = mmq.series.find(s => s.id === 'mmq_r1');
  const final = mmq.series.find(s => s.id === 'mmq_final');
  return (
    <div className="space-y-4 max-w-xs">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">W12 Sat — Seed 2 vs Seed 3</div>
      {r1 && <NEUWEUSeriesCard s={r1} state={state} />}
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">W12 Sun — Seed 1 vs R1 Winner</div>
      {final && <NEUWEUSeriesCard s={final} state={state} />}
      {mmq.champion && (
        <div className="mt-2 px-3 py-2 rounded bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300">
          MM Representative: <span className="font-bold">{clubById(mmq.champion)?.name ?? mmq.champion}</span>
        </div>
      )}
    </div>
  );
}

type MEAFSelKey = 's1' | 's2' | 's3' | 's4' | 's5' | 'mmq' | 'fp';

function MEAFPlayoffsTab({ state }: { state: LeagueSimState }) {
  const splits = state.meafSplits ?? [];
  const phase  = state.currentPhase;

  const defaultSel = (): MEAFSelKey => {
    if (phase === 'final_playoff' || phase === 'complete') return 'fp';
    if (phase === 'mm_qualifier' || phase === 'mm_qualifier_done') return 'mmq';
    if (phase === 'split5') return 's5';
    if (phase === 'split4') return 's4';
    if (phase === 'split3') return 's3';
    if (phase === 'split2') return 's2';
    return 's1';
  };

  const [sel, setSel] = useState<MEAFSelKey>(defaultSel());
  useEffect(() => { setSel(defaultSel()); }, [phase]);

  const getBracket = (key: MEAFSelKey): PlayoffState | null => {
    switch (key) {
      case 's1': return splits[0] ?? (phase === 'split1' ? state.playoffs ?? null : null);
      case 's2': return splits[1] ?? (phase === 'split2' ? state.playoffs ?? null : null);
      case 's3': return splits[2] ?? (phase === 'split3' ? state.playoffs ?? null : null);
      case 's4': return splits[3] ?? (phase === 'split4' ? state.playoffs ?? null : null);
      case 's5': return splits[4] ?? (phase === 'split5' ? state.playoffs ?? null : null);
      case 'mmq': return state.meafMMQual ?? null;
      case 'fp': return (phase === 'final_playoff' || phase === 'complete') ? state.playoffs ?? null : null;
    }
  };

  const tabs: { key: MEAFSelKey; label: string; available: boolean }[] = [
    { key: 's1',  label: 'S1',       available: !!(splits[0] || phase === 'split1') },
    { key: 's2',  label: 'S2',       available: !!(splits[1] || phase === 'split2') },
    { key: 's3',  label: 'S3',       available: !!(splits[2] || phase === 'split3') },
    { key: 'mmq', label: 'MM Qual',  available: !!state.meafMMQual },
    { key: 's4',  label: 'S4',       available: !!(splits[3] || phase === 'split4') },
    { key: 's5',  label: 'S5',       available: !!(splits[4] || phase === 'split5') },
    { key: 'fp',  label: 'Final PO', available: (phase === 'final_playoff' || phase === 'complete') && !!state.playoffs },
  ];

  const bracket = getBracket(sel);

  return (
    <div className="pt-2">
      <div className="flex gap-1 flex-wrap mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => t.available && setSel(t.key)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              sel === t.key
                ? 'bg-tier-a/20 text-tier-a border-tier-a/30 font-bold'
                : t.available
                  ? 'text-slate-400 border-bg-border hover:text-slate-200 hover:border-slate-500'
                  : 'text-slate-600 border-bg-border/30 cursor-not-allowed opacity-40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {bracket ? (
        sel === 'fp'
          ? <TWJPStaircaseBracket po={bracket} state={state} />
          : sel === 'mmq'
            ? <MEAFMMQBracket mmq={bracket} state={state} />
            : <NEUWEUDEBracket po={bracket} state={state} />
      ) : (
        <p className="text-center text-slate-500 py-12 text-sm">
          {sel === 'fp' ? 'Final Playoff starts W33' : sel === 'mmq' ? 'MM Qualifier starts W12' : `Split ${sel.replace('s', '')} not yet started`}
        </p>
      )}
    </div>
  );
}

const MEAF_SEASON_SPLIT_PTS = [8, 5, 4, 3, 1, 1, 0, 0];
const MEAF_SPLIT_PHASE_ORDER = ['split1', 'split2', 'split3', 'split4', 'split5'];

function splitRankCls(rank: number): string {
  if (rank === 1) return 'text-yellow-400 font-bold';
  if (rank === 2) return 'text-slate-300 font-bold';
  if (rank === 3) return 'text-amber-600';
  if (rank === 4) return 'text-sky-400';
  return 'text-slate-500';
}

function MEAFSeasonReview({ state }: { state: LeagueSimState }) {
  const cupStates = useStore(s => s.cupStates);
  const allClubs = clubsByLeague('L_MEAF');

  const finalPO   = (state.currentPhase === 'final_playoff' || state.currentPhase === 'complete')
    ? state.playoffs ?? null : null;
  const champion  = finalPO?.champion ?? null;
  const fpRanks   = finalPO?.completed ? twjpRanksFromPO(finalPO, state.standings) : null;

  const meafSplits    = state.meafSplits ?? [];
  const splitRankMaps = meafSplits.map(sp => meafRanksFromSplit(sp));

  const activeSplitIdx  = MEAF_SPLIT_PHASE_ORDER.indexOf(state.currentPhase);
  const activeSplitRanks = activeSplitIdx >= 0 && state.playoffs
    ? meafRanksFromSplit(state.playoffs) : null;

  const rows = allClubs.map(club => {
    const id      = club.id;
    const rec     = state.standings.find(r => r.clubId === id);
    const totalPts = rec?.wins ?? 0;

    const fpInfo  = fpRanks?.get(id);
    const fpRank  = fpInfo?.rank  ?? null;
    const fpStage = fpInfo?.stage ?? null;

    const splitRanks: (number | null)[] = Array.from({ length: 5 }, (_, i) => {
      if (i < splitRankMaps.length) return splitRankMaps[i][id] ?? null;
      if (i === activeSplitIdx && activeSplitRanks) return activeSplitRanks[id] ?? null;
      return null;
    });

    return { club, clubId: id, totalPts, fpRank, fpStage, splitRanks };
  });

  rows.sort((a, b) => {
    if (a.fpRank !== null && b.fpRank !== null) return a.fpRank - b.fpRank;
    if (a.fpRank !== null) return -1;
    if (b.fpRank !== null) return 1;
    return b.totalPts - a.totalPts;
  });

  const meafOrderedIds = rows.map(r => r.clubId);
  const meafCupChampions = {
    APEX: cupStates['APEX']?.champion,
    EGT:  cupStates['EGT']?.champion,
    COPA: cupStates['COPA']?.champion,
  };
  const meafBadgeMap = computeLeagueBadges('L_MEAF', meafOrderedIds, meafCupChampions);

  const fpLabel = (stage: string | null, rank: number | null): string => {
    if (!stage || rank === null) return '—';
    if (stage === 'champion') return '🏆 Champion';
    if (stage === 'finalist') return '2nd';
    if (stage === 'sf') return '3rd';
    if (rank === 4) return '4th';
    if (rank === 5) return '5th';
    return '—';
  };

  return (
    <div className="overflow-x-auto">
      <table className="text-xs min-w-full">
        <thead>
          <tr className="text-[10px] text-slate-500 border-b border-bg-border">
            <th className="text-left py-2 w-6">#</th>
            <th className="text-left py-2">Team</th>
            <th className="text-center py-2 w-24">Final PO</th>
            {['S1','S2','S3','S4','S5'].map((label, i) => (
              <th key={i} className={`text-center py-2 w-12 ${i === activeSplitIdx ? 'text-amber-400/70' : ''}`}>
                {label}
              </th>
            ))}
            <th className="text-center py-2 w-14 font-bold text-slate-300 border-l border-bg-border/30">Pts</th>
            <th className="text-left py-2 pl-2 w-14">Int'l</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ club, clubId, fpRank, fpStage, splitRanks, totalPts }, idx) => {
              const badges = meafBadgeMap[clubId] ?? [];
            const isChamp = champion === clubId;
            return (
              <tr key={clubId} className={`border-b border-bg-border/30 hover:bg-bg-panel/30 ${isChamp ? 'bg-tier-s/5' : ''}`}>
                <td className="py-1.5 text-slate-500 font-mono">{idx + 1}</td>
                <td className="py-1.5">
                  <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s">
                    <TeamDot club={club} showAbbr={false} />
                    <span className={isChamp ? 'text-tier-s font-bold' : 'text-slate-200'}>{club.name}</span>
                  </Link>
                </td>
                <td className={`py-1.5 text-center ${isChamp ? 'text-tier-s font-bold' : fpRank !== null ? 'text-slate-300' : 'text-slate-600'}`}>
                  {fpLabel(fpStage, fpRank)}
                </td>
                {splitRanks.map((rank, i) => {
                  const pts = rank !== null ? (MEAF_SEASON_SPLIT_PTS[rank - 1] ?? 0) : null;
                  const pending = i === activeSplitIdx && rank === null;
                  return (
                    <td key={i} className={`py-1.5 text-center tabular-nums ${rank !== null ? splitRankCls(rank) : pending ? 'text-amber-400/30' : 'text-slate-700'}`}>
                      {rank !== null ? (
                        <>
                          <div>{rank}</div>
                          <div className="text-[9px] opacity-60">{pts}p</div>
                        </>
                      ) : pending ? '…' : '—'}
                    </td>
                  );
                })}
                <td className="py-1.5 text-center font-bold text-tier-s border-l border-bg-border/30">{totalPts}</td>
                <td className="py-1.5 pl-2">
                  <div className="flex gap-1 flex-wrap">
                    {badges.map(b => (
                      <span key={b} className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-tier-a/10 text-tier-a border-tier-a/20">{b}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── DE Season Review ─────────────────────────────────────────────────────────

const DE_SPRING_PO_PTS: Record<number, number> = { 1: 60, 2: 45, 3: 30, 4: 20, 5: 10, 6: 10 };
const DE_SUMMER_PO_PTS: Record<number, number> = { 1: 200, 2: 90, 3: 65, 4: 45, 5: 25, 6: 25 };

const DE_STAGE_LABELS: Record<string, string> = {
  champion: '🏆 Champion',
  finalist: 'Finalist',
  lbf:      'LBF',
  lbr2:     'LBR2',
  lbr1:     'LBR1',
  regular:  '—',
};

function deRanksFromPO(po: PlayoffState | undefined, reg: TeamRecord[]): Map<string, { rank: number; stage: string }> {
  const out = new Map<string, { rank: number; stage: string }>();
  if (!po?.completed) {
    reg.forEach((r, i) => out.set(r.clubId, { rank: i + 1, stage: 'regular' }));
    return out;
  }
  const g = (id: string) => po.series.find(s => s.id === id);
  const loser = (s: PlayoffSeries | undefined) => s?.winner ? (s.winner === s.teamA ? s.teamB : s.teamA) : null;
  const regRankOf = (id: string) => reg.findIndex(r => r.clubId === id);
  const sortByReg = (ids: (string | null)[]) =>
    (ids.filter(Boolean) as string[]).sort((a, b) => regRankOf(a) - regRankOf(b));

  const gf = g('de_gf');
  if (gf?.winner) out.set(gf.winner, { rank: 1, stage: 'champion' });
  const gfL = loser(gf); if (gfL) out.set(gfL, { rank: 2, stage: 'finalist' });
  const l4L = loser(g('de_l4')); if (l4L && !out.has(l4L)) out.set(l4L, { rank: 3, stage: 'lbf' });
  const l3L = loser(g('de_l3')); if (l3L && !out.has(l3L)) out.set(l3L, { rank: 4, stage: 'lbr2' });
  sortByReg([loser(g('de_l1')), loser(g('de_l2'))]).forEach((id, i) => {
    if (!out.has(id)) out.set(id, { rank: 5 + i, stage: 'lbr1' });
  });
  let nextRank = out.size + 1;
  for (const { clubId } of reg) {
    if (!out.has(clubId)) out.set(clubId, { rank: nextRank++, stage: 'regular' });
  }
  return out;
}

function DESeasonReview({ leagueId, state }: { leagueId: string; state: LeagueSimState }) {
  const cupStates = useStore(s => s.cupStates);
  const allLeagueClubs = clubsByLeague(leagueId);

  const springReg = state.springStandings ?? [];
  const summerReg = state.fullLeagueState?.standings ?? state.standings;
  const springPO  = state.springPlayoffs;
  const summerPO  = state.playoffs;

  const springRanks = deRanksFromPO(springPO, springReg);
  const summerRanks = deRanksFromPO(summerPO, summerReg);

  const rows = allLeagueClubs.map(club => {
    const sInfo  = springRanks.get(club.id);
    const uInfo  = summerRanks.get(club.id);
    const sRank  = sInfo?.rank ?? 10;
    const uRank  = uInfo?.rank ?? 10;
    const sRec   = springReg.find(r => r.clubId === club.id);
    const uRec   = summerReg.find(r => r.clubId === club.id);
    const sRegPts = (sRec?.wins ?? 0) * 10;
    const uRegPts = (uRec?.wins ?? 0) * 10;
    const sPOPts  = DE_SPRING_PO_PTS[sRank] ?? 0;
    const uPOPts  = DE_SUMMER_PO_PTS[uRank] ?? 0;
    const total   = sPOPts + sRegPts + uPOPts + uRegPts;
    return {
      clubId: club.id, sRank, uRank, sRec, uRec,
      sRegPts, uRegPts, sPOPts, uPOPts, total,
      sStage: sInfo?.stage ?? 'regular',
      uStage: uInfo?.stage ?? 'regular',
    };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.uRank !== b.uRank) return a.uRank - b.uRank;
    if (b.uRegPts !== a.uRegPts) return b.uRegPts - a.uRegPts;
    return (b.sRegPts + b.uRegPts) - (a.sRegPts + a.uRegPts);
  });

  const deOrderedIds = rows.map(r => r.clubId);
  const deCupChampions = {
    APEX: cupStates['APEX']?.champion,
    EGT:  cupStates['EGT']?.champion,
    COPA: cupStates['COPA']?.champion,
  };
  const deBadgeMap = computeLeagueBadges(leagueId, deOrderedIds, deCupChampions);

  const hasSpring = springReg.length > 0;
  const hasSummer = summerReg.length > 0;

  return (
    <div>
      {(!!state.playoffs && !state.playoffs.completed) && (
        <p className="text-xs text-amber-500/80 mb-3 px-1">Season in progress — rankings reflect current standings</p>
      )}
      <div className="overflow-x-auto">
        <table className="text-xs min-w-full">
          <thead>
            <tr className="text-slate-600 border-b border-bg-border/30">
              <th className="text-left py-1.5 w-6" rowSpan={2}>#</th>
              <th className="text-left py-1.5" rowSpan={2}>Team</th>
              {hasSpring && (
                <th colSpan={8} className="text-center py-1 text-[10px] font-bold text-green-400/70 tracking-wider border-b border-green-500/20 border-l border-bg-border/20">
                  🌸 Spring
                </th>
              )}
              {hasSummer && (
                <th colSpan={8} className="text-center py-1 text-[10px] font-bold text-amber-400/70 tracking-wider border-b border-amber-500/20 border-l border-bg-border/20">
                  ☀️ Summer
                </th>
              )}
              <th className="text-center py-1.5 w-16 font-bold text-slate-200 border-l border-bg-border/20" rowSpan={2}>Total</th>
              <th className="text-left py-1.5 w-16" rowSpan={2}>Int'l</th>
            </tr>
            <tr className="text-slate-500 border-b border-bg-border text-[10px]">
              {hasSpring && <>
                <th className="text-left py-1.5 pl-2 w-20 border-l border-bg-border/20">Result</th>
                <th className="text-center py-1.5 w-7">W</th>
                <th className="text-center py-1.5 w-7">L</th>
                <th className="text-center py-1.5 w-12">ScD</th>
                <th className="text-center py-1.5 w-10">ScG</th>
                <th className="text-center py-1.5 w-10 text-slate-600">Reg</th>
                <th className="text-center py-1.5 w-10 text-green-500/60">PO</th>
                <th className="text-center py-1.5 w-12 font-bold text-green-400/80">Spr</th>
              </>}
              {hasSummer && <>
                <th className="text-left py-1.5 pl-2 w-20 border-l border-bg-border/20">Result</th>
                <th className="text-center py-1.5 w-7">W</th>
                <th className="text-center py-1.5 w-7">L</th>
                <th className="text-center py-1.5 w-12">ScD</th>
                <th className="text-center py-1.5 w-10">ScG</th>
                <th className="text-center py-1.5 w-10 text-slate-600">Reg</th>
                <th className="text-center py-1.5 w-10 text-amber-500/60">PO</th>
                <th className="text-center py-1.5 w-12 font-bold text-amber-400/80">Sum</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const club = clubById(row.clubId);
              if (!club) return null;
              const rank = idx + 1;
              const badges = deBadgeMap[row.clubId] ?? [];
              const isSummerChamp = row.uStage === 'champion';
              const isAnyChamp = isSummerChamp || row.sStage === 'champion';
              const sScD = row.sRec ? row.sRec.momFor - row.sRec.momAgainst : null;
              const uScD = row.uRec ? row.uRec.momFor - row.uRec.momAgainst : null;
              const sTotal = row.sPOPts + row.sRegPts;
              const uTotal = row.uPOPts + row.uRegPts;
              return (
                <tr key={row.clubId} className={`border-b border-bg-border/40 hover:bg-bg-hover ${isSummerChamp ? 'bg-tier-s/5' : ''}`}>
                  <td className="py-1.5 text-slate-500 font-mono">{rank}</td>
                  <td className="py-1.5">
                    <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s">
                      <TeamDot club={club} showAbbr={false} />
                      <span className={isSummerChamp ? 'text-tier-s font-bold' : isAnyChamp ? 'text-slate-100 font-semibold' : 'text-slate-200'}>
                        {club.name}
                      </span>
                    </Link>
                  </td>
                  {hasSpring && <>
                    <td className="py-1.5 pl-2 border-l border-bg-border/20 whitespace-nowrap text-slate-400">
                      {DE_STAGE_LABELS[row.sStage] ?? '—'}
                    </td>
                    <td className="py-1.5 text-center text-status-up">{row.sRec?.wins ?? '—'}</td>
                    <td className="py-1.5 text-center text-status-down">{row.sRec?.losses ?? '—'}</td>
                    <td className={`py-1.5 text-center ${sScD != null && sScD >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                      {sScD != null ? `${sScD >= 0 ? '+' : ''}${sScD}` : '—'}
                    </td>
                    <td className="py-1.5 text-center text-slate-400">{row.sRec?.momFor ?? '—'}</td>
                    <td className="py-1.5 text-center text-slate-500">{row.sRegPts}</td>
                    <td className="py-1.5 text-center text-green-500/80">{row.sPOPts}</td>
                    <td className="py-1.5 text-center font-bold text-green-400">{sTotal}</td>
                  </>}
                  {hasSummer && <>
                    <td className="py-1.5 pl-2 border-l border-bg-border/20 whitespace-nowrap text-slate-400">
                      {DE_STAGE_LABELS[row.uStage] ?? '—'}
                    </td>
                    <td className="py-1.5 text-center text-status-up">{row.uRec?.wins ?? '—'}</td>
                    <td className="py-1.5 text-center text-status-down">{row.uRec?.losses ?? '—'}</td>
                    <td className={`py-1.5 text-center ${uScD != null && uScD >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                      {uScD != null ? `${uScD >= 0 ? '+' : ''}${uScD}` : '—'}
                    </td>
                    <td className="py-1.5 text-center text-slate-400">{row.uRec?.momFor ?? '—'}</td>
                    <td className="py-1.5 text-center text-slate-500">{row.uRegPts}</td>
                    <td className="py-1.5 text-center text-amber-500/80">{row.uPOPts}</td>
                    <td className="py-1.5 text-center font-bold text-amber-400">{uTotal}</td>
                  </>}
                  <td className="py-1.5 text-center font-bold text-white border-l border-bg-border/20">{row.total}</td>
                  <td className="py-1.5">
                    <div className="flex gap-1 flex-wrap">
                      {badges.map(b => (
                        <span key={b} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${b === 'WT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TeamsLeagues() {
  const leagueStates = useStore(s => s.leagueStates);
  const followedLeagues = useStore(s => s.followedLeagues);
  const toggleFollowLeague = useStore(s => s.toggleFollowLeague);

  const availableLeagues = leagueConfigs.filter(l => leagueStates[l.id]);
  const [activeLeague, setActiveLeague] = useState(availableLeagues[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<TabKey>('standings');
  const [activeDivision, setActiveDivision] = useState<string | null>(null);
  const prevPhaseRef = useRef<string>('');

  const state = leagueStates[activeLeague];
  const lc = leagueConfigById(activeLeague);
  const clubs = clubsByLeague(activeLeague);
  const hasDivisions  = (lc?.divisions?.length ?? 0) > 0;
  const hasQualifier  = !!state?.mmQualifier;
  const isLKR         = activeLeague === 'L_KR';
  const isNEUWEU      = activeLeague === 'L_NEU' || activeLeague === 'L_WEU';
  const isDE          = ['L_DE', 'L_EEU', 'L_SEU', 'L_RU'].includes(activeLeague);
  const isBRSA        = activeLeague === 'L_BR' || activeLeague === 'L_SA';
  const isTR          = activeLeague === 'L_TR';
  const isTWJP        = activeLeague === 'L_TW' || activeLeague === 'L_JP';
  const isMEAF        = activeLeague === 'L_MEAF';
  const hasPlayoffs   = !!state?.playoffs || ((isLKR || isNEUWEU || isDE || isBRSA || isTR || isTWJP) && !!state?.springPlayoffs) || isMEAF;

  // Auto-switch tab when entering qualifier or playoff phase
  useEffect(() => {
    const phase = state?.currentPhase ?? '';
    if (phase === prevPhaseRef.current) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (phase === 'qualifier' && prev !== 'qualifier' && hasQualifier) {
      setActiveTab('qualifier');
    } else if ((phase === 'playoffs' || phase === 'spring_playoffs' || phase === 'spring_playoffs_done' || phase === 'summer_playoffs') && hasPlayoffs) {
      setActiveTab('playoffs');
    } else if (isMEAF && phase !== 'complete' && hasPlayoffs) {
      setActiveTab('playoffs');
    } else if (phase === 'complete' && prev !== 'complete') {
      setActiveTab('season_review');
    }
  }, [state?.currentPhase, hasQualifier, hasPlayoffs, isMEAF]);

  // Reset on league change
  function switchLeague(id: string) {
    setActiveLeague(id);
    setActiveDivision(null);
    setActiveTab('standings');
    prevPhaseRef.current = '';
  }

  function getStandingsToShow(): TeamRecord[] {
    if (!state) return [];
    const phase = state.currentPhase;
    if (phase === 'second_half' || phase === 'playoffs' || phase === 'complete' ||
        phase === 'summer' || phase === 'summer_playoffs' ||
        phase === 'spring_playoffs_done') {
      if (activeDivision) {
        return (state.fullLeagueState ?? state).standings.filter(r => r.divisionId === activeDivision);
      }
      return (state.fullLeagueState ?? state).standings;
    }
    if (!hasDivisions || activeDivision === null) return state.standings;
    return state.divisionStates?.[activeDivision]?.standings ?? [];
  }

  const phaseBadge = state?.currentPhase ? PHASE_BADGES[state.currentPhase] : null;

  const hasSeasonReview = !!state && state.standings.length > 0;

  const TABS: { key: TabKey; label: string; show: boolean }[] = [
    { key: 'standings',     label: 'Standings',      show: true },
    { key: 'qualifier',     label: 'MM Qualifier',   show: hasQualifier },
    { key: 'playoffs',      label: 'Playoffs',       show: hasPlayoffs },
    { key: 'results',       label: 'Results',        show: true },
    { key: 'teams',         label: 'Teams',          show: true },
    { key: 'season_review', label: 'Season Review',  show: hasSeasonReview },
  ];

  return (
    <div className="flex h-full">
      {/* League Sidebar */}
      <aside className="w-52 border-r border-bg-border overflow-y-auto flex-shrink-0 py-2">
        {REGIONS.map(region => {
          const regionLeagues = availableLeagues.filter(l => l.region === region);
          if (regionLeagues.length === 0) return null;
          return (
            <div key={region} className="mb-2">
              <div className="px-4 py-1 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{region}</span>
                {REGION_CUP[region] && (
                  <Link
                    to={`/cups/${REGION_CUP[region].id}`}
                    className={`text-[10px] font-bold uppercase tracking-wider ${REGION_CUP[region].color} transition-colors`}
                    onClick={e => e.stopPropagation()}
                  >
                    {REGION_CUP[region].label}
                  </Link>
                )}
              </div>
              {regionLeagues.map(l => (
                <div
                  key={l.id}
                  onClick={() => switchLeague(l.id)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors cursor-pointer ${
                    activeLeague === l.id ? 'bg-bg-hover text-tier-s' : 'text-slate-400 hover:bg-bg-hover hover:text-slate-200'
                  }`}
                >
                  <span>{l.name}</span>
                  <div className="flex items-center gap-1">
                    {l.divisions && <span className="text-xs text-slate-600">div</span>}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFollowLeague(l.id); }}
                      className={followedLeagues.includes(l.id) ? 'text-tier-a' : 'text-slate-600'}
                    >
                      <Star size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </aside>

      {/* League Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-0 border-b border-bg-border">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="text-lg font-bold text-white">{lc?.name}</h2>
            <span className="text-xs text-slate-500">{clubs.length} teams</span>
            {hasDivisions && (
              <span className="text-xs px-2 py-0.5 rounded bg-tier-a/10 text-tier-a border border-tier-a/20">Division</span>
            )}
            {phaseBadge && (
              <span className={`text-xs px-2 py-0.5 rounded border ${phaseBadge.cls}`}>{phaseBadge.label}</span>
            )}
            {state?.mmQualifier?.mmRepresentative && (
              <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">
                MM → {clubById(state.mmQualifier.mmRepresentative)?.abbr}
              </span>
            )}
            {state?.springChampion && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-300 border border-green-500/20">
                🌸 {clubById(state.springChampion)?.abbr} Spring
              </span>
            )}
            {state?.playoffs?.champion && (
              <span className="text-xs px-2 py-0.5 rounded bg-tier-s/10 text-tier-s border border-tier-s/20">
                🏆 {clubById(state.playoffs.champion)?.name}
              </span>
            )}
          </div>

          {hasDivisions && (
            <div className="flex gap-1 mb-3">
              <button onClick={() => setActiveDivision(null)} className={`px-3 py-1 text-xs rounded transition-colors ${activeDivision === null ? 'bg-tier-s text-black font-bold' : 'bg-bg-card text-slate-400 hover:text-slate-200'}`}>All</button>
              {lc?.divisions?.map(div => (
                <button key={div} onClick={() => setActiveDivision(div)} className={`px-3 py-1 text-xs rounded transition-colors ${activeDivision === div ? 'bg-tier-s text-black font-bold' : 'bg-bg-card text-slate-400 hover:text-slate-200'}`}>{div}</button>
              ))}
            </div>
          )}

          <div className="flex gap-1">
            {TABS.filter(t => t.show).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm capitalize rounded-t transition-colors ${
                  activeTab === tab.key
                    ? 'bg-bg-base text-tier-s border border-bg-border border-b-bg-base'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">

          {/* Standings */}
          {activeTab === 'standings' && (
            hasDivisions && activeDivision === null && (state?.currentPhase === 'first_half' || state?.currentPhase === 'qualifier' || state?.currentPhase === 'qualifier_done') ? (
              <div className="space-y-6">
                {lc?.divisions?.map(div => (
                  <div key={div}>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-bold text-slate-300">{div} Division</h3>
                      <span className="text-xs text-slate-500">{clubsByDivision(activeLeague, div).length} teams</span>
                    </div>
                    <StandingsTable records={state?.divisionStates?.[div]?.standings ?? []} />
                  </div>
                ))}
              </div>
            ) : (isNEUWEU || isDE || isTR) ? (
              <StandingsTableNEUWEU records={getStandingsToShow()} />
            ) : isMEAF ? (
              <MEAFStandingsTable records={getStandingsToShow()} />
            ) : (
              <StandingsTable records={getStandingsToShow()} />
            )
          )}

          {/* MM Qualifier */}
          {activeTab === 'qualifier' && (
            state?.mmQualifier
              ? <div className="pt-2"><QualBracket q={state.mmQualifier} state={state} /></div>
              : <p className="text-center text-slate-500 py-12 text-sm">Qualifier starts at W14 · advance time past W14 Thu</p>
          )}

          {/* Playoffs */}
          {activeTab === 'playoffs' && (
            isLKR || isBRSA ? (
              state ? <LKRPlayoffsTab state={state} /> : null
            ) : isNEUWEU || isTR ? (
              state ? <NEUWEUPlayoffsTab state={state} /> : null
            ) : isTWJP ? (
              state ? <TWJPPlayoffsTab state={state} /> : null
            ) : isMEAF ? (
              state ? <MEAFPlayoffsTab state={state} /> : null
            ) : isDE ? (
              state ? <DEPlayoffsTab state={state} /> : null
            ) : state?.playoffs
              ? <div className="pt-2">
                  {activeLeague === 'L_CN'
                    ? <LCNFullPlayoffBracket po={state.playoffs} state={state} />
                    : <FullPlayoffBracket    po={state.playoffs} state={state} />}
                </div>
              : <p className="text-center text-slate-500 py-12 text-sm">Playoffs start at W35 · advance time past W34</p>
          )}

          {/* Results */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {!state || state.results.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No results yet</p>
              ) : (
                [...state.results].reverse().map((pr, i) => {
                  const matches = hasDivisions && activeDivision !== null
                    ? state.divisionStates?.[activeDivision]?.results.find(r => r.phase === pr.phase)?.matches ?? []
                    : pr.matches;
                  if (matches.length === 0) return null;
                  return (
                    <div key={i} className="bg-bg-card rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-slate-400">Phase {pr.phase}</span>
                        {pr.matches[0]?.meta.map(m => (
                          <span key={m} className="px-1.5 py-0.5 rounded text-xs bg-tier-s/10 text-tier-s border border-tier-s/20">{m}</span>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {matches.map((m, j) => (
                          <div key={j} className="border-b border-bg-border/50 pb-2 last:border-0 last:pb-0">
                            <SeriesScore match={m} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Season Review */}
          {activeTab === 'season_review' && state && (
            isLKR
              ? <LKRSeasonReview state={state} />
              : isNEUWEU
                ? <NEUWEUSeasonReview leagueId={activeLeague} state={state} />
              : isDE
                ? <DESeasonReview leagueId={activeLeague} state={state} />
              : isBRSA
                ? <BRSASeasonReview leagueId={activeLeague} state={state} />
              : isTR
                ? <TRSeasonReview state={state} />
              : isTWJP
                ? <TWJPSeasonReview leagueId={activeLeague} state={state} />
              : isMEAF
                ? <MEAFSeasonReview state={state} />
                : <SeasonReview leagueId={activeLeague} state={state} />
          )}

          {/* Teams */}
          {activeTab === 'teams' && (
            hasDivisions ? (
              <div className="space-y-6">
                {lc?.divisions?.map(div => (
                  <div key={div}>
                    <h3 className="text-sm font-bold text-slate-300 mb-3">{div} Division</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {clubsByDivision(activeLeague, div).map(club => {
                        const rec = state?.divisionStates?.[div]?.standings.find(s => s.clubId === club.id);
                        return (
                          <Link key={club.id} to={`/teams/${club.id}`} className="bg-bg-card rounded-lg p-4 hover:bg-bg-hover transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: club.colors.bg, color: club.colors.text }}>{club.abbr.slice(0, 3)}</div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white truncate">{club.name}</div>
                                <TierBadge tier={club.tier} />
                              </div>
                            </div>
                            <div className="text-xs text-accent-blue">ELO: {rec?.elo ?? club.elo_rating}</div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {clubs.map(club => {
                  const rec = state?.standings.find(s => s.clubId === club.id);
                  return (
                    <Link key={club.id} to={`/teams/${club.id}`} className="bg-bg-card rounded-lg p-4 hover:bg-bg-hover transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: club.colors.bg, color: club.colors.text }}>{club.abbr.slice(0, 3)}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{club.name}</div>
                          <TierBadge tier={club.tier} />
                        </div>
                      </div>
                      <div className="text-xs text-accent-blue">ELO: {rec?.elo ?? club.elo_rating}</div>
                    </Link>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
