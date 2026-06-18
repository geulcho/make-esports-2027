import { useState } from 'react';
import { useStore, getWeekInfo } from '../store/store';
import { clubById, leagueConfigs } from '../data/clubs';
import { getCurrentSeasonStart } from '../engine/calendar';
import {
  subRoundDate, knockoutMatchDate, getSubRoundDef,
  calcChampionshipOdds, calcMMOdds,
} from '../engine/mm';
import { sortWTGroupRecords } from '../engine/wt';
import type { MMMatch, MMSubRound, MMKnockoutMatch, MMParticipant, MMState, WTState, WTParticipant, WTGroup, WTGroupRecord, WTKnockoutMatch } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIME = '#00FF00';
const GOLD = '#FFD700';
const LEAGUE_NAMES: Record<string, string> = Object.fromEntries(
  leagueConfigs.map(l => [l.id, l.name]),
);

type TournamentId = 'mm' | 'wt' | 'vsc';
type MMTab = 'teams' | 'swiss' | 'knockout' | 'results';
type WTTab = 'participants' | 'predictions' | 'groups' | 'knockouts' | 'review';

// ─── Odds helpers ─────────────────────────────────────────────────────────────

function upsetClass(winnerOdds: number): string {
  if (winnerOdds >= 5.0) return 'text-red-500 font-bold';
  if (winnerOdds >= 3.0) return 'text-red-400 font-semibold';
  if (winnerOdds >= 2.0) return 'text-orange-400';
  return 'text-slate-500';
}

function oddsTag(odds: number, isWinner: boolean, isUpset: boolean) {
  const cls = isWinner && isUpset ? upsetClass(odds) : 'text-slate-600';
  return <span className={`text-[10px] ${cls}`}>{odds.toFixed(2)}</span>;
}

// ─── Team chip ────────────────────────────────────────────────────────────────

function TeamChip({
  clubId,
  isWinner,
  isEliminated,
  small,
}: {
  clubId: string | null;
  isWinner?: boolean;
  isEliminated?: boolean;
  small?: boolean;
}) {
  if (!clubId) return <span className={`${small ? 'w-12 h-5' : 'w-16 h-6'} rounded bg-bg-border/30 inline-block`} />;
  const club = clubById(clubId);
  const bg   = club?.colors.bg ?? '#334155';
  const text = club?.colors.text ?? '#e2e8f0';
  const borderCls = isWinner
    ? 'ring-1 ring-emerald-400'
    : '';
  const elimCls = isEliminated ? 'opacity-50 line-through' : 'font-bold';
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 ${small ? 'text-[10px] h-5' : 'text-xs h-6'} ${borderCls} ${elimCls}`}
      style={{ backgroundColor: bg, color: text }}
      title={club?.name ?? clubId}
    >
      {club?.abbr ?? clubId.slice(0, 4)}
    </span>
  );
}

// ─── Swiss match row ──────────────────────────────────────────────────────────

function SwissMatchRow({
  match,
  participants,
  seasonStart,
  gameDate,
  onPlay,
}: {
  match: MMMatch;
  participants: MMParticipant[];
  seasonStart: string;
  gameDate: string;
  onPlay: (id: string) => void;
}) {
  const srKey = match.id.split('_m')[0];
  const srDef = getSubRoundDef(srKey);
  const matchDate = srDef ? subRoundDate(srDef.key, seasonStart) : '9999-99-99';
  const available = !match.winner && gameDate >= matchDate;
  const winA = match.winner === match.teamA;
  const winB = match.winner === match.teamB;
  const elimA = participants.find(p => p.clubId === match.teamA)?.eliminated;
  const elimB = participants.find(p => p.clubId === match.teamB)?.eliminated;
  const isUpset = match.winner !== null && (
    (winA && match.oddsA > match.oddsB) || (winB && match.oddsB > match.oddsA)
  );
  const winnerOdds = winA ? match.oddsA : match.oddsB;

  return (
    <div className={`flex items-center gap-1 py-0.5 px-1 rounded text-xs ${match.winner ? '' : 'opacity-80'}`}>
      {match.winner && <span className="w-6">{oddsTag(match.oddsA, winA, isUpset)}</span>}
      <TeamChip clubId={match.teamA} isWinner={winA} isEliminated={elimA} small />
      <span className={`w-3 text-center font-bold ${winA ? 'text-emerald-400' : 'text-slate-600'}`}>
        {match.winner ? match.scoreA : ''}
      </span>
      <span className="text-slate-700 text-[10px]">:</span>
      <span className={`w-3 text-center font-bold ${winB ? 'text-emerald-400' : 'text-slate-600'}`}>
        {match.winner ? match.scoreB : ''}
      </span>
      <TeamChip clubId={match.teamB} isWinner={winB} isEliminated={elimB} small />
      {match.winner && <span className="w-6">{oddsTag(match.oddsB, winB, isUpset)}</span>}
      {!match.winner && (
        <button
          onClick={() => onPlay(match.id)}
          disabled={!available}
          className={`ml-1 text-[9px] px-1.5 py-0.5 rounded ${
            available
              ? 'text-black font-bold cursor-pointer hover:brightness-110'
              : 'bg-bg-base text-slate-600 border border-bg-border cursor-not-allowed'
          }`}
          style={available ? { backgroundColor: LIME } : {}}
        >
          {available ? '▶' : '⏳'}
        </button>
      )}
    </div>
  );
}

// ─── Swiss sub-round block ────────────────────────────────────────────────────

function SwissBlock({
  sr,
  participants,
  seasonStart,
  gameDate,
  onPlay,
}: {
  sr: MMSubRound;
  participants: MMParticipant[];
  seasonStart: string;
  gameDate: string;
  onPlay: (id: string) => void;
}) {
  const date = subRoundDate(sr.key, seasonStart);
  const bgMap: Record<string, string> = {
    advancement:   'border-emerald-600/40 bg-emerald-950/30',
    elimination:   'border-red-600/40    bg-red-950/30',
    decisive:      'border-amber-600/40  bg-amber-950/30',
    'non-decisive': 'border-bg-border     bg-transparent',
  };
  const labelMap: Record<string, string> = {
    advancement: '진출전', elimination: '탈락전', decisive: '최종전', 'non-decisive': '',
  };

  return (
    <div className={`rounded border p-1.5 mb-1.5 ${bgMap[sr.stakes]}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-200">{sr.recordGroup}</span>
          <span className="text-[9px] text-slate-500">({sr.format})</span>
          {labelMap[sr.stakes] && (
            <span className={`text-[9px] px-1 rounded ${sr.stakes === 'advancement' ? 'text-emerald-400' : sr.stakes === 'elimination' ? 'text-red-400' : 'text-amber-400'}`}>
              {labelMap[sr.stakes]}
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-600">{date.slice(5)}</span>
      </div>
      {sr.matches.map(m => (
        <SwissMatchRow key={m.id} match={m} participants={participants} seasonStart={seasonStart} gameDate={gameDate} onPlay={onPlay} />
      ))}
    </div>
  );
}

// ─── Swiss stage (5 columns, mirror layout) ──────────────────────────────────

const COL_LABELS = ['1라운드', '2라운드', '3라운드', '4라운드', '5라운드'];

function SwissTab({ mm, seasonStart, gameDate, onPlay }: { mm: MMState; seasonStart: string; gameDate: string; onPlay: (id: string) => void }) {
  const byCol = [1, 2, 3, 4, 5].map(col => mm.swissRounds.filter(r => r.roundCol === col));
  const colDates = byCol.map(col => {
    if (col.length === 0) return '';
    const dates = col.map(sr => subRoundDate(sr.key, seasonStart)).sort();
    if (dates.length === 1 || dates[0] === dates[dates.length - 1]) return dates[0].slice(5);
    return `${dates[0].slice(5)}~${dates[dates.length - 1].slice(5)}`;
  });

  // Check if Swiss complete
  const qualifiedTeams = mm.participants.filter(p => p.qualified);
  const swissComplete = qualifiedTeams.length >= 8;

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: LIME }}>스위스 스테이지</h2>
      <div className="overflow-x-auto mb-6">
        <div className="flex gap-2 min-w-max pb-2">
          {[0, 1, 2, 3, 4].map(ci => (
            <div key={ci} className="w-56 flex-shrink-0">
              <div className="text-xs font-bold text-slate-300 mb-1 text-center">
                {COL_LABELS[ci]}
                {colDates[ci] && <span className="ml-1 text-slate-600 font-normal">({colDates[ci]})</span>}
              </div>
              <div className="border-t border-bg-border pt-1.5">
                {byCol[ci].length === 0 ? (
                  <div className="h-10 flex items-center justify-center text-slate-700 text-[10px]">대기 중</div>
                ) : byCol[ci].map(sr => (
                  <SwissBlock key={sr.key} sr={sr} participants={mm.participants} seasonStart={seasonStart} gameDate={gameDate} onPlay={onPlay} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Qualified summary */}
      {swissComplete && (
        <div className="border rounded-lg p-4" style={{ borderColor: LIME + '40' }}>
          <h3 className="text-xs font-bold uppercase mb-3" style={{ color: LIME }}>녹아웃 스테이지 진출팀</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['3-0', '3-1', '3-2'] as const).map(rec => {
              const [w, l] = rec.split('-').map(Number);
              const teams = mm.participants.filter(p => p.qualified && p.swissWins === w && p.swissLosses === l);
              return (
                <div key={rec}>
                  <div className="text-[11px] font-bold text-blue-400 mb-1">{rec} ({teams.length}팀)</div>
                  {teams.sort((a, b) => b.swissGameDiff - a.swissGameDiff).map(t => (
                    <div key={t.clubId} className="flex items-center gap-1 mb-0.5">
                      <TeamChip clubId={t.clubId} small />
                      <span className="text-[9px] text-slate-500">GD {t.swissGameDiff >= 0 ? '+' : ''}{t.swissGameDiff}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Knockout bracket ─────────────────────────────────────────────────────────

function KOCard({ km, participants, seasonStart, gameDate, onPlay }: {
  km: MMKnockoutMatch; participants: MMParticipant[]; seasonStart: string; gameDate: string; onPlay: (id: string) => void;
}) {
  const matchDate = knockoutMatchDate(km.slot, seasonStart);
  const available = !km.winner && km.teamA !== null && km.teamB !== null && gameDate >= matchDate;
  const winA = km.winner === km.teamA;
  const winB = km.winner === km.teamB;
  const isUpset = km.winner !== null && (
    (winA && km.oddsA > km.oddsB) || (winB && km.oddsB > km.oddsA)
  );

  return (
    <div className="rounded border border-bg-border bg-bg-panel p-2 w-48">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-slate-500">{km.slot}</span>
        {km.teamA && km.teamB && !km.winner && (
          <span className="text-[9px] text-slate-600">{km.oddsA.toFixed(2)} / {km.oddsB.toFixed(2)}</span>
        )}
      </div>
      <div className="flex items-center gap-1 mb-0.5">
        {km.winner && <span className="w-6">{oddsTag(km.oddsA, winA, isUpset)}</span>}
        <TeamChip clubId={km.teamA} isWinner={winA} />
        <span className={`w-4 text-center text-xs font-bold ${winA ? 'text-emerald-400' : 'text-slate-600'}`}>
          {km.winner ? km.scoreA : ''}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {km.winner && <span className="w-6">{oddsTag(km.oddsB, winB, isUpset)}</span>}
        <TeamChip clubId={km.teamB} isWinner={winB} />
        <span className={`w-4 text-center text-xs font-bold ${winB ? 'text-emerald-400' : 'text-slate-600'}`}>
          {km.winner ? km.scoreB : ''}
        </span>
      </div>
      {!km.winner && (
        <button
          onClick={() => onPlay(`ko_${km.slot}`)}
          disabled={!available}
          className={`mt-1.5 w-full text-[10px] px-1 py-0.5 rounded transition-colors ${
            available
              ? 'text-black font-bold cursor-pointer hover:brightness-110'
              : 'bg-bg-base text-slate-600 border border-bg-border cursor-not-allowed'
          }`}
          style={available ? { backgroundColor: LIME } : {}}
        >
          {available ? '▶ Play' : km.teamA && km.teamB ? '⏳ Waiting' : '─'}
        </button>
      )}
    </div>
  );
}

function KnockoutTab({ mm, seasonStart, gameDate, onPlay }: { mm: MMState; seasonStart: string; gameDate: string; onPlay: (id: string) => void }) {
  const get = (slot: string) => mm.knockoutMatches.find(m => m.slot === slot);
  const qf1 = get('QF1'), qf2 = get('QF2'), qf3 = get('QF3'), qf4 = get('QF4');
  const sf1 = get('SF1'), sf2 = get('SF2'), gf = get('GF');

  if (!qf1) {
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: LIME }}>녹아웃 스테이지</h2>
        <div className="text-slate-500 text-sm text-center py-8 border border-bg-border rounded-lg">
          스위스 스테이지 완료 후 대진표 공개
        </div>
      </div>
    );
  }

  const props = (km: MMKnockoutMatch) => ({ km, participants: mm.participants, seasonStart, gameDate, onPlay });

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: LIME }}>녹아웃 스테이지</h2>
      {mm.champion && (
        <div className="rounded-lg border p-3 mb-4 flex items-center gap-3" style={{ borderColor: LIME + '50', backgroundColor: LIME + '08' }}>
          <span className="text-xl">🏆</span>
          <div>
            <div className="text-[10px] uppercase font-bold" style={{ color: LIME }}>MM Champion</div>
            <TeamChip clubId={mm.champion} />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="flex items-start gap-6 min-w-max py-2">
          <div className="flex flex-col gap-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Quarterfinals</div>
            {qf1 && <KOCard {...props(qf1)} />}
            {qf2 && <KOCard {...props(qf2)} />}
          </div>
          <div className="flex flex-col justify-center mt-12">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Semifinals</div>
            {sf1 && <KOCard {...props(sf1)} />}
          </div>
          <div className="flex flex-col justify-center mt-12">
            <div className="text-[10px] font-bold uppercase mb-1" style={{ color: LIME }}>Grand Final</div>
            {gf && <KOCard {...props(gf)} />}
          </div>
          <div className="flex flex-col justify-center mt-12">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Semifinals</div>
            {sf2 && <KOCard {...props(sf2)} />}
          </div>
          <div className="flex flex-col gap-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Quarterfinals</div>
            {qf3 && <KOCard {...props(qf3)} />}
            {qf4 && <KOCard {...props(qf4)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Teams tab ────────────────────────────────────────────────────────────────

function TeamsTab({ mm }: { mm: MMState }) {
  const champOdds = calcChampionshipOdds(mm.participants);
  const allSeeded = mm.participants.length === 16;

  if (mm.participants.length === 0) {
    return <div className="text-slate-500 text-sm py-8">리그 전반기 진행 중 — 아직 확정된 팀이 없습니다.</div>;
  }

  const byBand = ([1, 2, 3, 4] as const).map(b =>
    mm.participants.filter(p => p.seedBand === b).sort((a, b) => b.w16Elo - a.w16Elo),
  );

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: LIME }}>
        진출 팀 ({mm.participants.length}/16)
      </h2>
      {!allSeeded ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {mm.participants.map(p => <TeamRow key={p.clubId} p={p} champOdds={champOdds[p.clubId]} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {([1, 2, 3, 4] as const).map((band, idx) => (
            <div key={band} className="border rounded-lg p-3" style={{ borderColor: LIME + '20' }}>
              <div className="text-[11px] font-bold uppercase mb-2" style={{ color: LIME }}>
                Seed {band}
              </div>
              <div className="flex flex-col gap-1.5">
                {byBand[idx].map(p => <TeamRow key={p.clubId} p={p} champOdds={champOdds[p.clubId]} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamRow({ p, champOdds }: { p: MMParticipant; champOdds?: number }) {
  const club = clubById(p.clubId);
  const league = LEAGUE_NAMES[p.leagueId] ?? p.leagueId;

  // Swiss status color
  let statusCls = 'text-slate-500';
  let statusText = '';
  if (p.qualified) {
    statusCls = 'text-blue-400 font-bold';
    statusText = `${p.swissWins}-${p.swissLosses}`;
  } else if (p.eliminated) {
    statusCls = 'text-red-400';
    statusText = `${p.swissWins}-${p.swissLosses}`;
  } else if (p.swissWins > 0 || p.swissLosses > 0) {
    statusText = `${p.swissWins}-${p.swissLosses}`;
  }

  let qualScoreText = '';
  if (p.qualResult) {
    const opp = p.qualResult.opponent ? clubById(p.qualResult.opponent) : null;
    qualScoreText = `${p.qualResult.repScore}-${p.qualResult.oppScore} vs ${opp?.abbr ?? '?'}`;
  }

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${p.eliminated ? 'opacity-50' : ''}`}
      style={{ backgroundColor: (club?.colors.bg ?? '#334155') + '15' }}
    >
      <TeamChip clubId={p.clubId} isEliminated={p.eliminated} />
      <div className="flex-1 min-w-0">
        <div className="text-slate-400 text-[10px] truncate">{league}</div>
        {qualScoreText && <div className="text-slate-500 text-[9px] truncate">{qualScoreText}</div>}
      </div>
      {statusText && <span className={`text-[10px] ${statusCls}`}>{statusText}</span>}
      {champOdds !== undefined && (
        <span className="text-[10px] text-slate-600" title="우승 배당">{champOdds.toFixed(1)}</span>
      )}
      <span className="text-[9px] text-slate-700">{Math.round(p.w16Elo)}</span>
    </div>
  );
}

// ─── Results tab ──────────────────────────────────────────────────────────────

function ResultsTab({ mm }: { mm: MMState }) {
  if (mm.phase !== 'completed') {
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: LIME }}>Results</h2>
        <div className="text-slate-500 text-sm py-8 text-center">대회 진행 중...</div>
      </div>
    );
  }

  // Compute final placements
  const placements: Array<{ rank: string; clubId: string; leagueId: string; setsPlayed: number; setsWon: number; setsLost: number; scoreDiff: number }> = [];

  // Champion & Runner-up from GF
  const gf = mm.knockoutMatches.find(m => m.slot === 'GF');
  if (gf?.winner) {
    const loser = gf.winner === gf.teamA ? gf.teamB! : gf.teamA!;
    placements.push({ rank: '🏆 우승', clubId: gf.winner, leagueId: '', setsPlayed: 0, setsWon: 0, setsLost: 0, scoreDiff: 0 });
    placements.push({ rank: '2위 준우승', clubId: loser, leagueId: '', setsPlayed: 0, setsWon: 0, setsLost: 0, scoreDiff: 0 });
  }

  // 3-4th from SF losers
  const sf1 = mm.knockoutMatches.find(m => m.slot === 'SF1');
  const sf2 = mm.knockoutMatches.find(m => m.slot === 'SF2');
  const sfLosers: string[] = [];
  if (sf1?.winner) sfLosers.push(sf1.winner === sf1.teamA ? sf1.teamB! : sf1.teamA!);
  if (sf2?.winner) sfLosers.push(sf2.winner === sf2.teamA ? sf2.teamB! : sf2.teamA!);
  sfLosers.forEach(id => placements.push({ rank: '3~4위', clubId: id, leagueId: '', setsPlayed: 0, setsWon: 0, setsLost: 0, scoreDiff: 0 }));

  // 5-8th from QF losers
  const qfLosers: string[] = [];
  for (const slot of ['QF1', 'QF2', 'QF3', 'QF4']) {
    const qf = mm.knockoutMatches.find(m => m.slot === slot);
    if (qf?.winner) qfLosers.push(qf.winner === qf.teamA ? qf.teamB! : qf.teamA!);
  }
  qfLosers.forEach(id => placements.push({ rank: '5~8위', clubId: id, leagueId: '', setsPlayed: 0, setsWon: 0, setsLost: 0, scoreDiff: 0 }));

  // 9-16th: eliminated from Swiss
  const eliminated = mm.participants.filter(p => p.eliminated).sort((a, b) => {
    if (b.swissWins !== a.swissWins) return b.swissWins - a.swissWins;
    return b.swissGameDiff - a.swissGameDiff;
  });
  eliminated.forEach(p => placements.push({ rank: '9~16위', clubId: p.clubId, leagueId: '', setsPlayed: 0, setsWon: 0, setsLost: 0, scoreDiff: 0 }));

  // Compute per-team stats from all matches
  const stats = new Map<string, { played: number; won: number; lost: number; diff: number }>();
  const initStats = (id: string) => { if (!stats.has(id)) stats.set(id, { played: 0, won: 0, lost: 0, diff: 0 }); };

  // Swiss matches
  for (const sr of mm.swissRounds) {
    for (const m of sr.matches) {
      if (!m.winner) continue;
      initStats(m.teamA); initStats(m.teamB);
      const sA = stats.get(m.teamA)!;
      const sB = stats.get(m.teamB)!;
      sA.played += m.scoreA + m.scoreB;
      sA.won += m.scoreA; sA.lost += m.scoreB; sA.diff += m.scoreA - m.scoreB;
      sB.played += m.scoreA + m.scoreB;
      sB.won += m.scoreB; sB.lost += m.scoreA; sB.diff += m.scoreB - m.scoreA;
    }
  }
  // Knockout matches
  for (const km of mm.knockoutMatches) {
    if (!km.winner || !km.teamA || !km.teamB) continue;
    initStats(km.teamA); initStats(km.teamB);
    const sA = stats.get(km.teamA)!;
    const sB = stats.get(km.teamB)!;
    sA.played += km.scoreA + km.scoreB;
    sA.won += km.scoreA; sA.lost += km.scoreB; sA.diff += km.scoreA - km.scoreB;
    sB.played += km.scoreA + km.scoreB;
    sB.won += km.scoreB; sB.lost += km.scoreA; sB.diff += km.scoreB - km.scoreA;
  }

  // Fill in stats
  const filled = placements.map(p => {
    const s = stats.get(p.clubId);
    const part = mm.participants.find(pp => pp.clubId === p.clubId);
    return { ...p, leagueId: part?.leagueId ?? '', setsPlayed: s?.played ?? 0, setsWon: s?.won ?? 0, setsLost: s?.lost ?? 0, scoreDiff: s?.diff ?? 0 };
  });

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: LIME }}>Results</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-bg-border text-slate-500">
            <th className="text-left py-1.5 px-2 w-20">순위</th>
            <th className="text-left py-1.5 px-2">팀</th>
            <th className="text-left py-1.5 px-2">리그</th>
            <th className="text-center py-1.5 px-2">세트</th>
            <th className="text-center py-1.5 px-2">승</th>
            <th className="text-center py-1.5 px-2">패</th>
            <th className="text-center py-1.5 px-2">득실</th>
          </tr>
        </thead>
        <tbody>
          {filled.map((row, i) => (
            <tr key={row.clubId} className="border-b border-bg-border/50 hover:bg-bg-hover/40">
              <td className="py-1.5 px-2 text-slate-400 font-bold">{row.rank}</td>
              <td className="py-1.5 px-2"><TeamChip clubId={row.clubId} /></td>
              <td className="py-1.5 px-2 text-slate-500">{LEAGUE_NAMES[row.leagueId] ?? ''}</td>
              <td className="py-1.5 px-2 text-center text-slate-400">{row.setsPlayed}</td>
              <td className="py-1.5 px-2 text-center text-emerald-400">{row.setsWon}</td>
              <td className="py-1.5 px-2 text-center text-red-400">{row.setsLost}</td>
              <td className={`py-1.5 px-2 text-center font-bold ${row.scoreDiff > 0 ? 'text-emerald-400' : row.scoreDiff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                {row.scoreDiff > 0 ? '+' : ''}{row.scoreDiff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Tournaments page ────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// WT TABS
// ═══════════════════════════════════════════════════════════════════════════════

function WTParticipantsTab({ wt }: { wt: WTState }) {
  const [sortKey, setSortKey] = useState<'winRate' | 'elo' | 'pot'>('pot');
  const [sortAsc, setSortAsc] = useState(true);

  if (wt.participants.length === 0) {
    return <div className="text-slate-500 text-sm text-center py-16">W38 이후 WT 참가팀 확정 예정</div>;
  }

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'pot'); }
  };

  const sorted = [...wt.participants].sort((a, b) => {
    let diff = 0;
    if (sortKey === 'pot') diff = a.seedPool - b.seedPool || b.elo - a.elo;
    else if (sortKey === 'elo') diff = b.elo - a.elo;
    else {
      const rA = a.seasonSetsWon / Math.max(1, a.seasonSetsWon + a.seasonSetsLost);
      const rB = b.seasonSetsWon / Math.max(1, b.seasonSetsWon + b.seasonSetsLost);
      diff = rB - rA;
    }
    return sortAsc ? diff : -diff;
  });

  const sortIcon = (key: typeof sortKey) => sortKey === key ? (sortAsc ? '▼' : '▲') : '';
  const thCls = 'py-1 px-2 cursor-pointer hover:text-slate-200 select-none';

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: GOLD }}>WT Participants (32)</h2>
      <table className="w-full text-xs">
        <thead><tr className="border-b border-bg-border text-slate-500">
          <th className="text-left py-1 px-2 w-10">시드</th>
          <th className="text-left py-1 px-2">팀</th>
          <th className="text-left py-1 px-2">리그</th>
          <th className="text-center py-1 px-2">세트 승</th>
          <th className="text-center py-1 px-2">세트 패</th>
          <th className={thCls + ' text-center'} onClick={() => toggleSort('winRate')}>승률 {sortIcon('winRate')}</th>
          <th className={thCls + ' text-center'} onClick={() => toggleSort('elo')}>Elo {sortIcon('elo')}</th>
          <th className={thCls + ' text-center w-12'} onClick={() => toggleSort('pot')}>Pot {sortIcon('pot')}</th>
          <th className="text-left py-1 px-2">컵 성적</th>
        </tr></thead>
        <tbody>
          {sorted.map(p => {
            const club = clubById(p.clubId);
            const wr = p.seasonSetsWon + p.seasonSetsLost > 0
              ? ((p.seasonSetsWon / (p.seasonSetsWon + p.seasonSetsLost)) * 100).toFixed(1) : '-';
            const isChamp = p.cupResult.includes('우승');
            return (
              <tr key={p.clubId} className="border-b border-bg-border/30 hover:bg-bg-hover/30">
                <td className="py-1 px-2 font-bold text-slate-400">{p.seedTag}</td>
                <td className="py-1 px-2">
                  <span className="inline-flex items-center px-1.5 rounded text-[11px] font-bold h-5"
                    style={{ backgroundColor: club?.colors.bg, color: club?.colors.text }}>
                    {club?.abbr ?? p.clubId}
                  </span>
                </td>
                <td className="py-1 px-2 text-slate-500">{LEAGUE_NAMES[p.leagueId]}</td>
                <td className="py-1 px-2 text-center text-emerald-400">{p.seasonSetsWon}</td>
                <td className="py-1 px-2 text-center text-red-400">{p.seasonSetsLost}</td>
                <td className="py-1 px-2 text-center text-slate-300">{wr}%</td>
                <td className="py-1 px-2 text-center text-slate-300 font-mono">{Math.round(p.elo)}</td>
                <td className="py-1 px-2 text-center font-bold" style={{ color: GOLD }}>{p.seedPool}</td>
                <td className={`py-1 px-2 text-[10px] ${isChamp ? 'font-bold' : 'text-slate-400'}`} style={isChamp ? { color: GOLD } : {}}>
                  {p.cupResult}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WTPredictionsTab({ wt }: { wt: WTState }) {
  if (wt.participants.length === 0) return <div className="text-slate-500 text-sm text-center py-16">참가팀 확정 후 배당 생성</div>;
  const shares = wt.participants.map(p => ({ id: p.clubId, share: Math.pow(10, p.elo / 400) }));
  const total = shares.reduce((s, x) => s + x.share, 0);
  const odds = shares.map(s => ({ id: s.id, odds: Math.round(Math.max(1.01, 0.90 / (s.share / total)) * 100) / 100 }))
    .sort((a, b) => a.odds - b.odds);
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: GOLD }}>Championship Odds</h2>
      <table className="w-full text-xs">
        <thead><tr className="border-b border-bg-border text-slate-500">
          <th className="text-center py-1 w-8">#</th>
          <th className="text-left py-1">팀</th>
          <th className="text-left py-1">리그</th>
          <th className="text-center py-1">Elo</th>
          <th className="text-center py-1 w-20">배당</th>
        </tr></thead>
        <tbody>
          {odds.map((o, i) => {
            const p = wt.participants.find(pp => pp.clubId === o.id)!;
            const club = clubById(o.id);
            return (
              <tr key={o.id} className="border-b border-bg-border/30 hover:bg-bg-hover/30">
                <td className="py-1 text-center text-slate-500">{i + 1}</td>
                <td className="py-1">
                  <span className="inline-flex items-center px-1.5 rounded text-[11px] font-bold h-5"
                    style={{ backgroundColor: club?.colors.bg, color: club?.colors.text }}>
                    {club?.abbr}
                  </span>
                </td>
                <td className="py-1 text-slate-500">{LEAGUE_NAMES[p.leagueId]}</td>
                <td className="py-1 text-center text-slate-300 font-mono">{Math.round(p.elo)}</td>
                <td className="py-1 text-center">
                  <span className={`font-bold ${o.odds <= 5 ? 'text-amber-400' : o.odds <= 15 ? 'text-slate-200' : 'text-slate-500'}`}>
                    {o.odds.toFixed(1)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WTGroupsTab({ wt }: { wt: WTState }) {
  const [showResults, setShowResults] = useState<string | null>(null);

  if (wt.groups.length === 0) return <div className="text-slate-500 text-sm text-center py-16">조추첨 대기 중</div>;
  const pMap = new Map(wt.participants.map(p => [p.clubId, p]));
  const allDone = wt.groups.every(g => g.completed);

  // Group placement for draw grid coloring
  const placementOf = (teamId: string, g: WTGroup): number => {
    if (!g.completed) return 99;
    const sorted = sortWTGroupRecords(g.records);
    return sorted.findIndex(r => r.clubId === teamId) + 1;
  };
  const drawCellBg = (place: number): string => {
    if (!allDone) return '';
    if (place <= 2) return 'bg-amber-500/15';
    if (place === 3) return 'bg-purple-500/15';
    return 'bg-red-500/10';
  };

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: GOLD }}>Group Draw</h2>
      {/* Pot × Group grid */}
      <div className="overflow-x-auto mb-6">
        <table className="text-xs w-full">
          <thead><tr className="border-b border-bg-border text-slate-500">
            <th className="py-1 px-2 w-12">Pot</th>
            {wt.groups.map(g => <th key={g.id} className="py-1 px-2 text-center">Group {g.id}</th>)}
          </tr></thead>
          <tbody>
            {[1, 2, 3, 4].map(pool => (
              <tr key={pool} className="border-b border-bg-border/30">
                <td className="py-1.5 px-2 font-bold" style={{ color: GOLD }}>{pool}</td>
                {wt.groups.map(g => {
                  const teamId = g.teams.find(id => pMap.get(id)?.seedPool === pool);
                  const p = teamId ? pMap.get(teamId) : null;
                  const club = teamId ? clubById(teamId) : null;
                  const place = teamId ? placementOf(teamId, g) : 99;
                  return (
                    <td key={g.id} className={`py-1.5 px-2 text-center ${drawCellBg(place)}`}>
                      {club ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="inline-flex items-center px-1.5 rounded text-[10px] font-bold h-5"
                            style={{ backgroundColor: club.colors.bg, color: club.colors.text }}>
                            {club.abbr}
                          </span>
                          <span className="text-[9px] text-slate-600">{p?.seedTag}</span>
                        </div>
                      ) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Group standings */}
      <h3 className="text-xs font-bold text-slate-300 uppercase mb-3">Group Standings</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {wt.groups.map(g => {
          const sorted = sortWTGroupRecords(g.records);
          const isOpen = showResults === g.id;
          const playedMatches = g.matches.filter(m => m.winner);
          return (
            <div key={g.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300">Group {g.id}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600">MD {g.matchdaysCompleted}/12</span>
                  {playedMatches.length > 0 && (
                    <button
                      onClick={() => setShowResults(isOpen ? null : g.id)}
                      className="text-[9px] px-1.5 py-0.5 rounded border border-bg-border text-slate-400 hover:text-slate-200 hover:border-slate-400"
                    >
                      {isOpen ? '순위표' : 'Match Results'}
                    </button>
                  )}
                </div>
              </div>
              {isOpen ? (
                <div className="text-[10px] space-y-0.5 max-h-40 overflow-y-auto">
                  {playedMatches.map(m => {
                    const winA = m.winner === m.teamA;
                    const cA = clubById(m.teamA), cB = clubById(m.teamB);
                    return (
                      <div key={m.id} className="flex items-center gap-1 py-0.5">
                        <span className="w-4 text-slate-600 text-[9px]">M{m.matchday}</span>
                        <span className={`inline-flex items-center px-1 rounded font-bold h-4 text-[9px] ${winA ? 'ring-1 ring-emerald-500' : ''}`}
                          style={{ backgroundColor: cA?.colors.bg, color: cA?.colors.text }}>{cA?.abbr}</span>
                        <span className={`font-bold ${winA ? 'text-emerald-400' : 'text-slate-600'}`}>{m.scoreA}</span>
                        <span className="text-slate-700">:</span>
                        <span className={`font-bold ${!winA ? 'text-emerald-400' : 'text-slate-600'}`}>{m.scoreB}</span>
                        <span className={`inline-flex items-center px-1 rounded font-bold h-4 text-[9px] ${!winA ? 'ring-1 ring-emerald-500' : ''}`}
                          style={{ backgroundColor: cB?.colors.bg, color: cB?.colors.text }}>{cB?.abbr}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-bg-border text-slate-600">
                    <th className="w-5 py-0.5">#</th>
                    <th className="text-left py-0.5">팀</th>
                    <th className="text-center py-0.5 w-6">W</th>
                    <th className="text-center py-0.5 w-6">L</th>
                    <th className="text-center py-0.5 w-8">ScD</th>
                  </tr></thead>
                  <tbody>
                    {sorted.map((rec, idx) => {
                      const club = clubById(rec.clubId);
                      const diff = rec.scoreFor - rec.scoreAgainst;
                      const rowCls = idx <= 1
                        ? 'border-l-2 border-l-amber-500 bg-amber-500/5'
                        : idx === 2
                        ? 'border-l-2 border-l-purple-400 bg-purple-400/5'
                        : '';
                      return (
                        <tr key={rec.clubId} className={`border-b border-bg-border/20 ${rowCls}`}>
                          <td className={`text-center py-0.5 ${idx <= 1 ? 'text-amber-400 font-bold' : idx === 2 ? 'text-purple-400 font-bold' : 'text-slate-500'}`}>{idx + 1}</td>
                          <td className="py-0.5">
                            <span className="inline-flex items-center px-1 rounded text-[10px] font-bold h-4"
                              style={{ backgroundColor: club?.colors.bg, color: club?.colors.text }}>{club?.abbr}</span>
                          </td>
                          <td className="text-center py-0.5 text-emerald-400">{rec.wins}</td>
                          <td className="text-center py-0.5 text-red-400">{rec.losses}</td>
                          <td className={`text-center py-0.5 font-bold ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WTKOCard({ km }: { km: WTKnockoutMatch }) {
  const winA = km.winner === km.teamA;
  const winB = km.winner === km.teamB;
  const isUpset = km.winner !== null && ((winA && km.oddsA > km.oddsB) || (winB && km.oddsB > km.oddsA));
  const wOdds = winA ? km.oddsA : winB ? km.oddsB : 0;
  const upCls = (isW: boolean) => isW && isUpset
    ? (wOdds >= 5 ? 'text-red-500 font-bold' : wOdds >= 3 ? 'text-red-400' : 'text-orange-400')
    : 'text-slate-600';

  return (
    <div className="rounded border border-bg-border bg-bg-panel w-44">
      {/* Team A */}
      <div className={`flex items-center gap-1 px-2 py-1 ${winA ? 'bg-emerald-500/10' : km.winner ? 'opacity-40' : ''}`}>
        <TeamChip clubId={km.teamA} small />
        <span className="flex-1" />
        {km.winner && <span className={`text-[10px] ${upCls(winA)}`}>{km.oddsA.toFixed(2)}</span>}
        <span className={`w-4 text-center text-xs font-bold ${winA ? 'text-emerald-400' : 'text-slate-600'}`}>{km.winner ? km.scoreA : ''}</span>
      </div>
      <div className="border-t border-bg-border/30" />
      {/* Team B */}
      <div className={`flex items-center gap-1 px-2 py-1 ${winB ? 'bg-emerald-500/10' : km.winner ? 'opacity-40' : ''}`}>
        <TeamChip clubId={km.teamB} small />
        <span className="flex-1" />
        {km.winner && <span className={`text-[10px] ${upCls(winB)}`}>{km.oddsB.toFixed(2)}</span>}
        <span className={`w-4 text-center text-xs font-bold ${winB ? 'text-emerald-400' : 'text-slate-600'}`}>{km.winner ? km.scoreB : ''}</span>
      </div>
      {/* Pre-match odds footer */}
      {km.teamA && km.teamB && !km.winner && (
        <div className="border-t border-bg-border/30 px-2 py-0.5 flex justify-between text-[9px] text-slate-600">
          <span>{km.oddsA.toFixed(2)}</span><span>odds</span><span>{km.oddsB.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

function WTKnockoutsTab({ wt }: { wt: WTState }) {
  if (wt.knockoutMatches.length === 0) return <div className="text-slate-500 text-sm text-center py-16">조별리그 완료 후 대진표 생성</div>;
  const get = (id: string) => wt.knockoutMatches.find(m => m.id === id)!;

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: GOLD }}>Knockout Stage</h2>
      {wt.champion && (
        <div className="rounded-lg border p-3 mb-4 flex items-center gap-3" style={{ borderColor: GOLD + '50', backgroundColor: GOLD + '08' }}>
          <span className="text-2xl">🏆</span>
          <div>
            <div className="text-[10px] uppercase font-bold" style={{ color: GOLD }}>WT Champion</div>
            <TeamChip clubId={wt.champion} />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="flex items-start gap-4 min-w-max py-2">
          {/* R16 column */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Round of 16</div>
            <div className="flex flex-col gap-3">
              {['R16_1','R16_2','R16_3','R16_4','R16_5','R16_6','R16_7','R16_8'].map(id => <WTKOCard key={id} km={get(id)} />)}
            </div>
          </div>
          {/* QF column */}
          <div className="pt-8">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Quarterfinals</div>
            <div className="flex flex-col gap-[76px]">
              {['QF1','QF2','QF3','QF4'].map(id => <WTKOCard key={id} km={get(id)} />)}
            </div>
          </div>
          {/* SF column */}
          <div className="pt-24">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Semifinals</div>
            <div className="flex flex-col gap-[180px]">
              {['SF1','SF2'].map(id => <WTKOCard key={id} km={get(id)} />)}
            </div>
          </div>
          {/* GF column */}
          <div className="pt-48">
            <div className="text-[10px] font-bold uppercase mb-2" style={{ color: GOLD }}>Grand Final</div>
            <WTKOCard km={get('GF')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WTReviewTab({ wt }: { wt: WTState }) {
  const [hoverCell, setHoverCell] = useState<string | null>(null);

  if (wt.phase === 'pre') return <div className="text-slate-500 text-sm text-center py-16">대회 시작 전</div>;

  const allLeagues = [...new Set(wt.participants.map(p => p.leagueId))];
  const pByLeague = (lid: string) => wt.participants.filter(p => p.leagueId === lid);

  // Stage sets for survival counting
  const r16Set = new Set(wt.knockoutMatches.filter(m => m.stage === 'R16').flatMap(m => [m.teamA, m.teamB].filter(Boolean) as string[]));
  const qfSet  = new Set(wt.knockoutMatches.filter(m => m.stage === 'QF').flatMap(m => [m.teamA, m.teamB].filter(Boolean) as string[]));
  const sfSet  = new Set(wt.knockoutMatches.filter(m => m.stage === 'SF').flatMap(m => [m.teamA, m.teamB].filter(Boolean) as string[]));
  const gfSet  = new Set(wt.knockoutMatches.filter(m => m.stage === 'GF').flatMap(m => [m.teamA, m.teamB].filter(Boolean) as string[]));

  const stageTeams = (lid: string, stageSet: Set<string>) => pByLeague(lid).filter(p => stageSet.has(p.clubId));
  const survivalData = allLeagues.map(lid => ({
    lid,
    gs: pByLeague(lid).length,
    r16: stageTeams(lid, r16Set),
    qf: stageTeams(lid, qfSet),
    sf: stageTeams(lid, sfSet),
    f: stageTeams(lid, gfSet),
  })).sort((a, b) => b.r16.length - a.r16.length);

  // Final rankings
  const finalRanks: Array<{ rank: string; clubId: string }> = [];
  const gf = wt.knockoutMatches.find(m => m.id === 'GF');
  if (gf?.winner) {
    finalRanks.push({ rank: '🏆 우승', clubId: gf.winner });
    finalRanks.push({ rank: '2위 준우승', clubId: gf.winner === gf.teamA ? gf.teamB! : gf.teamA! });
  }
  const sfLosers = wt.knockoutMatches.filter(m => m.stage === 'SF' && m.winner).map(m => m.winner === m.teamA ? m.teamB! : m.teamA!);
  sfLosers.forEach(id => finalRanks.push({ rank: '3~4위', clubId: id }));
  const qfLosers = wt.knockoutMatches.filter(m => m.stage === 'QF' && m.winner).map(m => m.winner === m.teamA ? m.teamB! : m.teamA!);
  qfLosers.forEach(id => finalRanks.push({ rank: '5~8위', clubId: id }));
  const r16Losers = wt.knockoutMatches.filter(m => m.stage === 'R16' && m.winner).map(m => m.winner === m.teamA ? m.teamB! : m.teamA!);
  r16Losers.forEach(id => finalRanks.push({ rank: '9~16위', clubId: id }));
  // Group 3rd/4th
  for (const g of wt.groups) {
    if (!g.completed) continue;
    const sorted = sortWTGroupRecords(g.records);
    if (sorted[2]) finalRanks.push({ rank: '조 3위', clubId: sorted[2].clubId });
    if (sorted[3]) finalRanks.push({ rank: '조 4위', clubId: sorted[3].clubId });
  }

  const hoverTeams = hoverCell ? (() => {
    const [lid, stage] = hoverCell.split('::');
    const set = stage === 'r16' ? r16Set : stage === 'qf' ? qfSet : stage === 'sf' ? sfSet : gfSet;
    return pByLeague(lid).filter(p => set.has(p.clubId)).map(p => p.clubId);
  })() : [];

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: GOLD }}>Results</h2>

      {/* Final rankings */}
      {finalRanks.length > 0 && (
        <div className="mb-6">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-bg-border text-slate-500">
              <th className="text-left py-1 px-2 w-24">순위</th>
              <th className="text-left py-1 px-2">팀</th>
              <th className="text-left py-1 px-2">리그</th>
              <th className="text-center py-1 px-2">세트</th>
              <th className="text-center py-1 px-2">승</th>
              <th className="text-center py-1 px-2">패</th>
              <th className="text-center py-1 px-2">득실</th>
            </tr></thead>
            <tbody>
              {finalRanks.map((r, i) => {
                const p = wt.participants.find(pp => pp.clubId === r.clubId);
                const club = clubById(r.clubId);
                const change = p ? Math.round(p.elo - p.preWTElo) : 0;
                // Count WT-only sets from group + knockout matches
                let sw = 0, sl = 0;
                for (const g of wt.groups) for (const m of g.matches) {
                  if (m.winner && m.teamA === r.clubId) { sw += m.scoreA; sl += m.scoreB; }
                  else if (m.winner && m.teamB === r.clubId) { sw += m.scoreB; sl += m.scoreA; }
                }
                for (const km of wt.knockoutMatches) {
                  if (km.winner && km.teamA === r.clubId) { sw += km.scoreA; sl += km.scoreB; }
                  else if (km.winner && km.teamB === r.clubId) { sw += km.scoreB; sl += km.scoreA; }
                }
                const diff = sw - sl;
                return (
                  <tr key={r.clubId + i} className="border-b border-bg-border/30 hover:bg-bg-hover/30">
                    <td className="py-1.5 px-2 text-slate-400 font-bold">{r.rank}</td>
                    <td className="py-1.5 px-2">
                      <span className="inline-flex items-center px-1.5 rounded text-[10px] font-bold h-5"
                        style={{ backgroundColor: club?.colors.bg, color: club?.colors.text }}>{club?.abbr}</span>
                    </td>
                    <td className="py-1.5 px-2 text-slate-500">{LEAGUE_NAMES[p?.leagueId ?? '']}</td>
                    <td className="py-1.5 px-2 text-center text-slate-400">{sw + sl}</td>
                    <td className="py-1.5 px-2 text-center text-emerald-400">{sw}</td>
                    <td className="py-1.5 px-2 text-center text-red-400">{sl}</td>
                    <td className={`py-1.5 px-2 text-center font-bold ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {diff > 0 ? '+' : ''}{diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Survival by league (with hover) */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">리그별 생존 현황</h3>
        <div className="relative">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-bg-border text-slate-500">
              <th className="text-left py-1">리그</th>
              <th className="text-center py-1 w-10">GS</th>
              <th className="text-center py-1 w-10">R16</th>
              <th className="text-center py-1 w-10">QF</th>
              <th className="text-center py-1 w-10">SF</th>
              <th className="text-center py-1 w-10">F</th>
            </tr></thead>
            <tbody>
              {survivalData.map(s => (
                <tr key={s.lid} className="border-b border-bg-border/20">
                  <td className="py-1 text-slate-300">{LEAGUE_NAMES[s.lid]}</td>
                  <td className="py-1 text-center text-slate-400">{s.gs}</td>
                  {(['r16', 'qf', 'sf', 'f'] as const).map(stage => {
                    const teams = stage === 'r16' ? s.r16 : stage === 'qf' ? s.qf : stage === 'sf' ? s.sf : s.f;
                    const cellKey = `${s.lid}::${stage}`;
                    return (
                      <td key={stage} className="py-1 text-center relative"
                        onMouseEnter={() => teams.length > 0 ? setHoverCell(cellKey) : undefined}
                        onMouseLeave={() => setHoverCell(null)}>
                        <span className={teams.length > 0 ? (stage === 'f' ? 'font-bold cursor-help' : 'text-slate-300 cursor-help') : 'text-slate-600'}
                          style={stage === 'f' && teams.length > 0 ? { color: GOLD } : stage === 'sf' && teams.length > 0 ? { color: '#fbbf24' } : {}}>
                          {teams.length || '-'}
                        </span>
                        {hoverCell === cellKey && teams.length > 0 && (
                          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-bg-panel border border-bg-border rounded p-1.5 shadow-lg flex gap-1 whitespace-nowrap">
                            {teams.map(p => <TeamChip key={p.clubId} clubId={p.clubId} small />)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Elo changes */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Elo 변동</h3>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-bg-border text-slate-500">
            <th className="text-left py-1 w-24">순위</th>
            <th className="text-left py-1">팀</th>
            <th className="text-left py-1">리그</th>
            <th className="text-center py-1">변화</th>
          </tr></thead>
          <tbody>
            {finalRanks.map((r, i) => {
              const p = wt.participants.find(pp => pp.clubId === r.clubId);
              const club = clubById(r.clubId);
              const change = p ? Math.round(p.elo - p.preWTElo) : 0;
              return (
                <tr key={r.clubId + i} className="border-b border-bg-border/20">
                  <td className="py-1 text-slate-500 text-[10px]">{r.rank}</td>
                  <td className="py-1">
                    <span className="inline-flex items-center px-1 rounded text-[10px] font-bold h-4"
                      style={{ backgroundColor: club?.colors.bg, color: club?.colors.text }}>{club?.abbr}</span>
                  </td>
                  <td className="py-1 text-slate-500">{LEAGUE_NAMES[p?.leagueId ?? '']}</td>
                  <td className={`py-1 text-center font-bold ${change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                    {change > 0 ? '+' : ''}{change}
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

const TOURNAMENTS: Array<{ id: TournamentId; label: string; sub: string }> = [
  { id: 'mm',  label: 'Midseason Mayhem', sub: 'W17–19' },
  { id: 'wt',  label: 'World Tournament',  sub: 'W39–43' },
  { id: 'vsc', label: 'Viktor Sandberg Cup', sub: 'W39–43' },
];

const MM_TABS: Array<{ key: MMTab; label: string }> = [
  { key: 'teams',    label: 'Teams'    },
  { key: 'swiss',    label: 'Swiss'    },
  { key: 'knockout', label: 'Knockout' },
  { key: 'results',  label: 'Results'  },
];

export function Tournaments() {
  const mmState = useStore(s => s.mmState);
  const wtState = useStore(s => s.wtState);
  const gameDate = useStore(s => s.gameDate);
  const advanceMMMatch = useStore(s => s.advanceMMMatch);
  const week = getWeekInfo(gameDate);
  const seasonStart = getCurrentSeasonStart(gameDate);

  const [activeTournament, setActiveTournament] = useState<TournamentId>('mm');
  const [mmTab, setMmTab] = useState<MMTab>('teams');
  const [wtTab, setWtTab] = useState<WTTab>('participants');

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-52 border-r border-bg-border overflow-y-auto flex-shrink-0 py-2">
        <div className="px-4 py-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clubs</span>
        </div>
        {TOURNAMENTS.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTournament(t.id)}
            className={`flex items-center justify-between px-4 py-2 cursor-pointer text-sm transition-colors ${
              activeTournament === t.id
                ? 'border-r-2 bg-bg-hover'
                : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
            }`}
            style={activeTournament === t.id ? { borderRightColor: t.id === 'mm' ? LIME : '#f59e0b', color: t.id === 'mm' ? LIME : '#f59e0b' } : {}}
          >
            <span className="font-medium">{t.label}</span>
            <span className="text-[10px] text-slate-600">{t.sub}</span>
          </div>
        ))}

        <div className="px-4 py-1 mt-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nations</span>
        </div>
        <div className="px-4 py-2 text-xs text-slate-600">Coming soon</div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {activeTournament === 'mm' && (
          <div>
            {/* MM Header */}
            <div className="border-b border-bg-border px-6 pt-4 pb-0">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-xl font-bold" style={{ color: LIME }}>Midseason Mayhem</h1>
                <span className="text-xs px-2 py-0.5 rounded border text-slate-400" style={{ borderColor: LIME + '30' }}>
                  Season {week.season} · W{week.weekNum}
                </span>
              </div>
              {/* Sub-tabs */}
              <div className="flex gap-1">
                {MM_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setMmTab(tab.key)}
                    className={`px-4 py-2 text-xs font-medium rounded-t border-b-2 transition-colors ${
                      mmTab === tab.key
                        ? 'border-current'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                    style={mmTab === tab.key ? { color: LIME, borderBottomColor: LIME } : {}}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="p-6">
              {mmTab === 'teams'    && <TeamsTab mm={mmState} />}
              {mmTab === 'swiss'    && <SwissTab mm={mmState} seasonStart={seasonStart} gameDate={gameDate} onPlay={advanceMMMatch} />}
              {mmTab === 'knockout' && <KnockoutTab mm={mmState} seasonStart={seasonStart} gameDate={gameDate} onPlay={advanceMMMatch} />}
              {mmTab === 'results'  && <ResultsTab mm={mmState} />}
            </div>
          </div>
        )}

        {activeTournament === 'wt' && (
          <div>
            <div className="border-b border-bg-border px-6 pt-4 pb-0">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-xl font-bold" style={{ color: GOLD }}>World Tournaments</h1>
                <span className="text-xs px-2 py-0.5 rounded border text-slate-400" style={{ borderColor: GOLD + '30' }}>
                  Season {week.season} · W{week.weekNum}
                </span>
              </div>
              <div className="flex gap-1">
                {([
                  { key: 'participants', label: 'Participants' },
                  { key: 'predictions', label: 'Predictions' },
                  { key: 'groups', label: 'Groups' },
                  { key: 'knockouts', label: 'Knockouts' },
                  { key: 'review', label: 'Review' },
                ] as Array<{ key: WTTab; label: string }>).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setWtTab(tab.key)}
                    className={`px-4 py-2 text-xs font-medium rounded-t border-b-2 transition-colors ${
                      wtTab === tab.key ? 'border-current' : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                    style={wtTab === tab.key ? { color: GOLD, borderBottomColor: GOLD } : {}}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6">
              {wtTab === 'participants' && <WTParticipantsTab wt={wtState} />}
              {wtTab === 'predictions' && <WTPredictionsTab wt={wtState} />}
              {wtTab === 'groups' && <WTGroupsTab wt={wtState} />}
              {wtTab === 'knockouts' && <WTKnockoutsTab wt={wtState} />}
              {wtTab === 'review' && <WTReviewTab wt={wtState} />}
            </div>
          </div>
        )}

        {activeTournament === 'vsc' && (
          <div className="p-6 text-center text-slate-500 text-sm pt-16">
            Viktor Sandberg Cup — W39–43<br />Coming soon
          </div>
        )}
      </div>
    </div>
  );
}
