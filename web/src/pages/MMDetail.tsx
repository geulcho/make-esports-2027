import { useStore, getWeekInfo } from '../store/store';
import { clubById, leagueConfigs } from '../data/clubs';
import { getCurrentSeasonStart } from '../engine/calendar';
import { subRoundDate, knockoutMatchDate, getSubRoundDef } from '../engine/mm';
import type { MMMatch, MMSubRound, MMKnockoutMatch, MMParticipant } from '../types';

// ─── Small helpers ────────────────────────────────────────────────────────────

const LEAGUE_NAMES: Record<string, string> = Object.fromEntries(
  leagueConfigs.map(l => [l.id, l.name]),
);

function teamChip(clubId: string | null, highlight?: 'win' | 'ko') {
  if (!clubId) return <span className="w-20 h-7 rounded bg-bg-border inline-block opacity-40" />;
  const club = clubById(clubId);
  const cls = highlight === 'win'
    ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
    : highlight === 'ko'
    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
    : 'bg-bg-base border-bg-border text-slate-300';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold truncate max-w-[80px] ${cls}`}
      style={highlight ? {} : { borderColor: club?.colors.bg + '55', color: club?.colors.text }}
      title={club?.name ?? clubId}
    >
      {club?.abbr ?? clubId.slice(0, 4)}
    </span>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({
  match,
  seasonStart,
  gameDate,
  onPlay,
}: {
  match: MMMatch;
  seasonStart: string;
  gameDate: string;
  onPlay: (id: string) => void;
}) {
  const srDef = getSubRoundDef(match.id.split('_m')[0]);
  const matchDate = srDef ? subRoundDate(srDef.key, seasonStart) : '9999-99-99';
  const available = !match.winner && gameDate >= matchDate;
  const winA = match.winner === match.teamA;
  const winB = match.winner === match.teamB;

  return (
    <div className={`rounded border px-2 py-1.5 text-xs mb-1 ${match.winner ? 'border-bg-border' : 'border-bg-border/50'}`}>
      <div className="flex items-center gap-1 mb-0.5">
        {teamChip(match.teamA, winA ? 'win' : undefined)}
        <span className={`w-4 text-center font-bold ${winA ? 'text-emerald-400' : 'text-slate-500'}`}>
          {match.winner ? match.scoreA : ''}
        </span>
        <span className="text-slate-600 text-[10px]">:</span>
        <span className={`w-4 text-center font-bold ${winB ? 'text-emerald-400' : 'text-slate-500'}`}>
          {match.winner ? match.scoreB : ''}
        </span>
        {teamChip(match.teamB, winB ? 'win' : undefined)}
      </div>
      {!match.winner && (
        <button
          onClick={() => onPlay(match.id)}
          disabled={!available}
          className={`mt-1 w-full text-[10px] px-1 py-0.5 rounded transition-colors ${
            available
              ? 'bg-tier-s/20 text-tier-s hover:bg-tier-s/30 border border-tier-s/30 cursor-pointer'
              : 'bg-bg-base text-slate-600 border border-bg-border cursor-not-allowed'
          }`}
        >
          {available ? '▶ Play' : '⏳ Waiting'}
        </button>
      )}
    </div>
  );
}

// ─── Swiss sub-round block ────────────────────────────────────────────────────

function SubRoundBlock({
  subRound,
  seasonStart,
  gameDate,
  participants,
  onPlay,
}: {
  subRound: MMSubRound;
  seasonStart: string;
  gameDate: string;
  participants: MMParticipant[];
  onPlay: (id: string) => void;
}) {
  const date = subRoundDate(subRound.key, seasonStart);

  const stakesColor = {
    advancement:   'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    elimination:   'text-red-400    border-red-500/40    bg-red-500/10',
    decisive:      'text-orange-400 border-orange-500/40 bg-orange-500/10',
    'non-decisive': 'text-slate-400 border-bg-border bg-transparent',
  }[subRound.stakes];

  const qualifiedIds = new Set(participants.filter(p => p.qualified).map(p => p.clubId));

  return (
    <div className={`rounded-lg border p-2 mb-2 ${stakesColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase">{subRound.recordGroup} ({subRound.format})</span>
        <span className="text-[10px] opacity-60">{date.slice(5)}</span>
      </div>
      {subRound.matches.map(match => {
        const aQual = qualifiedIds.has(match.teamA) && match.winner === match.teamA;
        const bQual = qualifiedIds.has(match.teamB) && match.winner === match.teamB;
        return (
          <div key={match.id} className={`${(aQual || bQual) ? 'relative' : ''}`}>
            {(aQual || bQual) && (
              <span className="absolute -right-1 -top-1 text-[8px] bg-blue-500 text-white rounded px-1">
                진출
              </span>
            )}
            <MatchCard
              match={match}
              seasonStart={seasonStart}
              gameDate={gameDate}
              onPlay={onPlay}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Swiss stage (5 columns) ──────────────────────────────────────────────────

const ROUND_LABELS = ['1라운드', '2라운드', '3라운드', '4라운드', '5라운드'];

function SwissStage({
  swissRounds,
  participants,
  seasonStart,
  gameDate,
  onPlay,
}: {
  swissRounds: MMSubRound[];
  participants: MMParticipant[];
  seasonStart: string;
  gameDate: string;
  onPlay: (id: string) => void;
}) {
  const byCol = [1, 2, 3, 4, 5].map(col =>
    swissRounds.filter(r => r.roundCol === col),
  );

  const colDates = byCol.map(col => {
    if (col.length === 0) return null;
    const dates = col.map(sr => subRoundDate(sr.key, seasonStart)).sort();
    return `${dates[0].slice(5)}${dates.length > 1 && dates[dates.length - 1] !== dates[0] ? `~${dates[dates.length - 1].slice(5)}` : ''}`;
  });

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 min-w-max pb-2">
        {[0, 1, 2, 3, 4].map(colIdx => (
          <div key={colIdx} className="w-52 flex-shrink-0">
            <div className="text-xs font-bold text-slate-300 mb-1 text-center">
              {ROUND_LABELS[colIdx]}
              {colDates[colIdx] && (
                <span className="ml-1 text-slate-500 font-normal">({colDates[colIdx]})</span>
              )}
            </div>
            <div className="border-t border-bg-border pt-2">
              {byCol[colIdx].length === 0 ? (
                <div className="h-16 flex items-center justify-center text-slate-600 text-[10px]">
                  대기 중
                </div>
              ) : (
                byCol[colIdx].map(sr => (
                  <SubRoundBlock
                    key={sr.key}
                    subRound={sr}
                    seasonStart={seasonStart}
                    gameDate={gameDate}
                    participants={participants}
                    onPlay={onPlay}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Knockout bracket ─────────────────────────────────────────────────────────

function KOMatchCard({
  km,
  participants,
  seasonStart,
  gameDate,
  onPlay,
}: {
  km: MMKnockoutMatch;
  participants: MMParticipant[];
  seasonStart: string;
  gameDate: string;
  onPlay: (id: string) => void;
}) {
  const matchDate = knockoutMatchDate(km.slot, seasonStart);
  const available = !km.winner && km.teamA !== null && km.teamB !== null && gameDate >= matchDate;
  const winA = km.winner === km.teamA;
  const winB = km.winner === km.teamB;

  return (
    <div className="rounded border border-bg-border bg-bg-panel px-2 py-2 w-44">
      <div className="text-[10px] text-slate-500 mb-1.5 font-bold">{km.slot}</div>
      <div className="flex items-center gap-1 mb-0.5">
        {teamChip(km.teamA, winA ? 'win' : km.winner === null && km.teamA ? undefined : undefined)}
        <span className={`w-4 text-center text-xs font-bold ${winA ? 'text-emerald-400' : 'text-slate-500'}`}>
          {km.winner ? km.scoreA : ''}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {teamChip(km.teamB, winB ? 'win' : undefined)}
        <span className={`w-4 text-center text-xs font-bold ${winB ? 'text-emerald-400' : 'text-slate-500'}`}>
          {km.winner ? km.scoreB : ''}
        </span>
      </div>
      {!km.winner && (
        <button
          onClick={() => onPlay(`ko_${km.slot}`)}
          disabled={!available}
          className={`mt-1.5 w-full text-[10px] px-1 py-0.5 rounded transition-colors ${
            available
              ? 'bg-tier-s/20 text-tier-s hover:bg-tier-s/30 border border-tier-s/30 cursor-pointer'
              : 'bg-bg-base text-slate-600 border border-bg-border cursor-not-allowed'
          }`}
        >
          {available ? '▶ Play' : km.teamA && km.teamB ? '⏳ Waiting' : '─'}
        </button>
      )}
    </div>
  );
}

function KnockoutBracket({
  knockoutMatches,
  participants,
  seasonStart,
  gameDate,
  onPlay,
}: {
  knockoutMatches: MMKnockoutMatch[];
  participants: MMParticipant[];
  seasonStart: string;
  gameDate: string;
  onPlay: (id: string) => void;
}) {
  const get = (slot: string) => knockoutMatches.find(m => m.slot === slot);

  const qf1 = get('QF1'), qf2 = get('QF2'), qf3 = get('QF3'), qf4 = get('QF4');
  const sf1 = get('SF1'), sf2 = get('SF2');
  const gf  = get('GF');

  if (!qf1) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-500 text-sm border border-bg-border rounded-lg">
        스위스 스테이지 완료 후 대진표 공개
      </div>
    );
  }

  const koProps = (km: MMKnockoutMatch | undefined) =>
    km ? { km, participants, seasonStart, gameDate, onPlay } : null;

  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-6 min-w-max py-2">
        {/* QF column - Side A */}
        <div className="flex flex-col gap-4">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Quarterfinals</div>
          <div className="flex flex-col gap-6">
            {qf1 && <KOMatchCard {...koProps(qf1)!} />}
            {qf2 && <KOMatchCard {...koProps(qf2)!} />}
          </div>
        </div>

        {/* SF1 */}
        <div className="flex flex-col justify-center mt-8">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Semifinals</div>
          {sf1 && <KOMatchCard {...koProps(sf1)!} />}
        </div>

        {/* GF */}
        <div className="flex flex-col justify-center mt-8">
          <div className="text-[10px] font-bold text-amber-500 uppercase mb-1">Grand Final</div>
          {gf && <KOMatchCard {...koProps(gf)!} />}
        </div>

        {/* SF2 */}
        <div className="flex flex-col justify-center mt-8">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Semifinals</div>
          {sf2 && <KOMatchCard {...koProps(sf2)!} />}
        </div>

        {/* QF column - Side B */}
        <div className="flex flex-col gap-4">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Quarterfinals</div>
          <div className="flex flex-col gap-6">
            {qf3 && <KOMatchCard {...koProps(qf3)!} />}
            {qf4 && <KOMatchCard {...koProps(qf4)!} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Qualification panel ──────────────────────────────────────────────────────

function QualCard({ p }: { p: MMParticipant }) {
  const club = clubById(p.clubId);
  const leagueName = LEAGUE_NAMES[p.leagueId] ?? p.leagueId;

  let result = '';
  if (p.qualResult) {
    const score = `${p.qualResult.repScore}-${p.qualResult.oppScore}`;
    const oppClub = p.qualResult.opponent ? clubById(p.qualResult.opponent) : null;
    const oppName = oppClub?.abbr ?? p.qualResult.opponent?.slice(0, 4) ?? '?';
    result = `${score} vs ${oppName}`;
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded border border-bg-border bg-bg-base text-xs"
      style={{ borderLeftColor: club?.colors.bg ?? '#334155', borderLeftWidth: 3 }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="font-bold truncate"
          style={{ color: club?.colors.text ?? '#e2e8f0' }}
        >
          {club?.abbr ?? p.clubId}
        </div>
        <div className="text-slate-500 truncate">{leagueName}</div>
        {result && <div className="text-slate-400 truncate">{result}</div>}
      </div>
      <div className="text-[10px] text-slate-600">
        {Math.round(p.w16Elo)}
      </div>
    </div>
  );
}

function QualPanel({ participants }: { participants: MMParticipant[] }) {
  const byBand = ([1, 2, 3, 4] as const).map(band =>
    participants.filter(p => p.seedBand === band).sort((a, b) => b.w16Elo - a.w16Elo),
  );

  // If not yet seeded, show unsorted list
  if (participants.length > 0 && participants[0].seedBand === 1 && participants.every(p => p.seedBand >= 1)) {
    // properly seeded
  } else if (participants.length > 0 && participants.every(p => p.seedBand === 1)) {
    // all defaulted to band 1 = not yet seeded, just show flat list
  }

  const allSeeded = participants.length === 16;
  const seedBandLabel = (band: number) => `${band}시드 (Seed ${band})`;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">진출 현황</h2>
      {participants.length === 0 ? (
        <div className="text-slate-500 text-sm">W17 이전 — 리그 전반기 진행 중</div>
      ) : !allSeeded ? (
        <div>
          <div className="text-slate-500 text-xs mb-2">확정된 팀 ({participants.length}/16)</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {participants.map(p => <QualCard key={p.clubId} p={p} />)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {([1, 2, 3, 4] as const).map((band, idx) => (
            <div key={band}>
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-2">
                {seedBandLabel(band)}
              </div>
              <div className="flex flex-col gap-1">
                {byBand[idx].length > 0
                  ? byBand[idx].map(p => <QualCard key={p.clubId} p={p} />)
                  : Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-10 rounded border border-bg-border/40 bg-bg-base opacity-30" />
                    ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Champion banner ──────────────────────────────────────────────────────────

function ChampionBanner({ championId }: { championId: string }) {
  const club = clubById(championId);
  return (
    <div
      className="rounded-lg border p-4 mb-6 flex items-center gap-3"
      style={{ borderColor: club?.colors.bg + '60', backgroundColor: club?.colors.bg + '15' }}
    >
      <span className="text-2xl">🏆</span>
      <div>
        <div className="text-xs text-slate-400 uppercase font-bold">MM Champion</div>
        <div
          className="text-xl font-black"
          style={{ color: club?.colors.text ?? '#e2e8f0' }}
        >
          {club?.name ?? championId}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MMDetail() {
  const mmState    = useStore(s => s.mmState);
  const gameDate   = useStore(s => s.gameDate);
  const advanceMMMatch = useStore(s => s.advanceMMMatch);
  const week = getWeekInfo(gameDate);
  const seasonStart = getCurrentSeasonStart(gameDate);

  const phase = mmState.phase;

  return (
    <div className="p-6 max-w-full">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-100">Midseason Mayhem</h1>
          <span className="text-xs px-2 py-1 rounded border border-bg-border text-slate-400">
            W17–19 · Season {week.season}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          16팀 스위스 스테이지 → 녹아웃 8강/4강/결승 (Bo5)
        </p>
      </div>

      {mmState.champion && <ChampionBanner championId={mmState.champion} />}

      {/* Qualification panel */}
      <div className="mb-8">
        <QualPanel participants={mmState.participants} />
      </div>

      {phase === 'pre' && mmState.participants.length < 16 && (
        <div className="text-slate-500 text-sm text-center py-8 border border-bg-border rounded-lg">
          W17 시작 전 — 전반기 리그 진행 중 ({mmState.participants.length}/16 팀 확정)
        </div>
      )}

      {/* Swiss stage */}
      {(phase === 'swiss' || phase === 'knockout' || phase === 'completed') && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            스위스 스테이지
          </h2>
          <SwissStage
            swissRounds={mmState.swissRounds}
            participants={mmState.participants}
            seasonStart={seasonStart}
            gameDate={gameDate}
            onPlay={advanceMMMatch}
          />
        </div>
      )}

      {/* Knockout bracket */}
      {(phase === 'knockout' || phase === 'completed') && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            녹아웃 스테이지
          </h2>
          <KnockoutBracket
            knockoutMatches={mmState.knockoutMatches}
            participants={mmState.participants}
            seasonStart={seasonStart}
            gameDate={gameDate}
            onPlay={advanceMMMatch}
          />
        </div>
      )}

      {/* Swiss complete, knockout not yet generated */}
      {phase === 'swiss' && mmState.participants.filter(p => p.qualified).length === 8 && mmState.knockoutMatches.length === 0 && (
        <div className="text-slate-500 text-sm text-center py-4 border border-bg-border rounded-lg">
          녹아웃 브래킷 생성 중...
        </div>
      )}
    </div>
  );
}
