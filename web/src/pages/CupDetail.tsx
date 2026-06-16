import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useStore } from '../store/store';
import { clubById } from '../data/clubs';
import { TeamDot } from '../components/ui/TeamDot';
import type { CupMatch, CupRound, CupState } from '../types';
import { CUP_LEAGUE_TOTALS, getSurvivorsAfterRound } from '../engine/cup';

// ─── Cup metadata ─────────────────────────────────────────────────────────────

const CUP_META: Record<string, { name: string; region: string; color: string }> = {
  EGT:  { name: 'EGT',  region: 'Europe · Middle East · Africa', color: 'text-blue-400'   },
  COPA: { name: 'COPA', region: 'Americas',                       color: 'text-green-400'  },
  APEX: { name: 'APEX', region: 'Asia-Pacific',                   color: 'text-amber-400'  },
};

const STAGE_WEEK_LABEL: Record<string, string> = {
  r1: 'W5', r1s: 'W5', r2: 'W9', r2n: 'W9', r2s: 'W9',
  r64: 'W9', r32: 'W11', r16: 'W22', qf: 'W24', sf: 'W28', final: 'W30',
};

// ─── Cup match card ───────────────────────────────────────────────────────────

function CupMatchCard({ match, format }: { match: CupMatch; format: 'Bo3' | 'Bo5' }) {
  const [hover, setHover] = useState(false);
  const clubA = match.teamA ? clubById(match.teamA) : null;
  const clubB = match.teamB ? clubById(match.teamB) : null;
  const winA = match.winner === match.teamA;
  const winB = match.winner === match.teamB;
  const pending = !match.winner && match.teamA && match.teamB;
  const isUpset = match.winner && match.oddsA > 0 && match.oddsB > 0
    ? (winA ? match.oddsA > match.oddsB : match.oddsB > match.oddsA)
    : false;

  return (
    <div
      className="relative border border-bg-border rounded bg-bg-base text-xs w-44 select-none"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Header */}
      <div className="px-2 py-0.5 flex justify-between border-b border-bg-border/50 bg-bg-panel/40">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{format}</span>
        {pending && match.oddsA > 0 && (
          <span className="text-[9px] text-slate-600">{match.oddsA.toFixed(2)} / {match.oddsB.toFixed(2)}</span>
        )}
      </div>
      {/* Team A */}
      <div className={`px-2 py-1.5 flex items-center gap-1.5 ${winA ? 'bg-tier-s/10' : match.winner ? 'opacity-40' : ''}`}>
        {clubA ? <TeamDot club={clubA} showAbbr={false} /> : <span className="w-3 h-3 rounded-full bg-slate-700" />}
        <span className={`truncate flex-1 font-medium ${winA ? 'text-white' : 'text-slate-300'}`}>
          {clubA?.abbr ?? (match.teamA ? '???' : 'TBD')}
        </span>
        {match.winner && (
          <span className={`font-bold tabular-nums ${winA ? 'text-tier-s' : 'text-slate-500'}`}>{match.scoreA}</span>
        )}
      </div>
      <div className="border-t border-bg-border/30" />
      {/* Team B */}
      <div className={`px-2 py-1.5 flex items-center gap-1.5 ${winB ? 'bg-tier-s/10' : match.winner ? 'opacity-40' : ''}`}>
        {clubB ? <TeamDot club={clubB} showAbbr={false} /> : <span className="w-3 h-3 rounded-full bg-slate-700" />}
        <span className={`truncate flex-1 font-medium ${winB ? 'text-white' : 'text-slate-300'}`}>
          {clubB?.abbr ?? (match.teamB ? '???' : 'TBD')}
        </span>
        {match.winner && (
          <span className={`font-bold tabular-nums ${winB ? 'text-tier-s' : 'text-slate-500'}`}>{match.scoreB}</span>
        )}
      </div>
      {/* Upset badge */}
      {match.winner && isUpset && (
        <div className="px-2 py-0.5 border-t border-bg-border/30 text-[9px] text-red-400 font-bold">UPSET</div>
      )}
      {/* Hover: winner banner */}
      {hover && match.winner && (
        <div className="absolute left-full top-0 ml-1.5 bg-bg-panel border border-bg-border rounded px-2 py-1.5 z-50 w-32 shadow-xl text-[11px]">
          <div className="text-slate-500 mb-1">Series · {format}</div>
          <div className="font-bold text-tier-s">{clubById(match.winner)?.name ?? match.winner}</div>
          <div className="text-slate-400">{match.scoreA}–{match.scoreB}</div>
          {match.oddsA > 0 && (
            <div className="text-slate-600 text-[10px] mt-1">
              odds {match.oddsA.toFixed(2)} / {match.oddsB.toFixed(2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── League survivor row ──────────────────────────────────────────────────────

function SurvivorRow({ state, afterRoundIdx }: { state: CupState; afterRoundIdx: number }) {
  const totals = CUP_LEAGUE_TOTALS[state.cupId] ?? {};
  const survivors = getSurvivorsAfterRound(state, afterRoundIdx);
  const [hoveredLeague, setHoveredLeague] = useState<string | null>(null);

  const entries = Object.entries(totals);
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-bg-border/30">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">League Survival</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map(([leagueId, total]) => {
          const aliveSurv = [...survivors].filter(id => clubById(id)?.league_id === leagueId);
          const count = aliveSurv.length;
          const eliminated = count === 0 && total > 0;
          return (
            <div
              key={leagueId}
              className="relative"
              onMouseEnter={() => setHoveredLeague(leagueId)}
              onMouseLeave={() => setHoveredLeague(null)}
            >
              <span className={`text-xs cursor-default ${eliminated ? 'text-slate-600 line-through' : count === total ? 'text-slate-300' : 'text-slate-400'}`}>
                <span className="font-mono text-[10px] text-slate-500">{leagueId.replace('L_', '')} </span>
                <span className={`font-bold ${count === 0 ? 'text-slate-600' : count > total / 2 ? 'text-status-up' : 'text-status-down'}`}>
                  {count}
                </span>
                <span className="text-slate-600">/{total}</span>
              </span>
              {hoveredLeague === leagueId && aliveSurv.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1.5 flex flex-wrap gap-1 z-50 bg-bg-panel border border-bg-border rounded p-2 shadow-xl w-max max-w-xs">
                  {aliveSurv.map(id => {
                    const club = clubById(id);
                    if (!club) return null;
                    return (
                      <span
                        key={id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: club.colors.bg, color: club.colors.text }}
                      >
                        {club.abbr}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pre-R16 round section ────────────────────────────────────────────────────

function RoundSection({
  round, roundIdx, state,
}: {
  round: CupRound;
  roundIdx: number;
  state: CupState;
}) {
  const isBo5 = round.stage === 'qf' || round.stage === 'sf' || round.stage === 'final';
  const format: 'Bo3' | 'Bo5' = isBo5 ? 'Bo5' : 'Bo3';
  const weekLabel = STAGE_WEEK_LABEL[round.stage] ?? '';

  // For APEX R2: split North and South
  const isApexR2N = round.stage === 'r2n';
  const isApexR2S = round.stage === 'r2s';

  const slots = round.matchesPerSlot;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  let matchCursor = 0;
  const bySlot: CupMatch[][] = slots.map(count => {
    const group = round.matches.slice(matchCursor, matchCursor + count);
    matchCursor += count;
    return group;
  });

  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-sm font-bold text-white">{round.label}</h3>
        <span className="text-xs text-slate-500">{weekLabel}</span>
        {isApexR2N && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">North</span>}
        {isApexR2S && <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">South</span>}
        {!round.completed && round.slotsCompleted > 0 && (
          <span className="text-[10px] text-amber-400/70">Day {round.slotsCompleted}/{round.slotsTotal}</span>
        )}
        {round.completed && <span className="text-[10px] text-slate-600">Complete</span>}
      </div>

      <div className="space-y-3">
        {bySlot.map((slotMatches, slotIdx) => {
          const played = slotIdx < round.slotsCompleted;
          return (
            <div key={slotIdx}>
              <div className="text-[10px] text-slate-600 mb-1.5">
                {weekLabel} {days[slotIdx] ?? `Day ${slotIdx + 1}`} · {slotMatches.length} matches
              </div>
              <div className="flex flex-wrap gap-2">
                {slotMatches.map(m => (
                  <CupMatchCard key={m.id} match={m} format={format} />
                ))}
                {!played && slotMatches.length === 0 && (
                  <span className="text-slate-600 text-xs italic">TBD</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SurvivorRow state={state} afterRoundIdx={roundIdx} />
    </section>
  );
}

// ─── R16 bracket (single elimination 16→1) ───────────────────────────────────

const BRACKET_CW  = 176;  // card width
const BRACKET_CH  = 52;   // card height
const BRACKET_GAP = 40;   // gap between columns
const BRACKET_VS  = 60;   // vertical spacing between R16 cards

function BracketMatchCard({ match, format, x, y }: {
  match: CupMatch; format: 'Bo3' | 'Bo5'; x: number; y: number;
}) {
  const [hover, setHover] = useState(false);
  const clubA = match.teamA ? clubById(match.teamA) : null;
  const clubB = match.teamB ? clubById(match.teamB) : null;
  const winA = match.winner === match.teamA;
  const winB = match.winner === match.teamB;

  return (
    <foreignObject x={x} y={y} width={BRACKET_CW} height={BRACKET_CH}>
      <div
        className="border border-bg-border rounded bg-bg-base text-xs h-full overflow-hidden select-none relative"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className={`px-2 py-1.5 flex items-center gap-1.5 h-1/2 ${winA ? 'bg-tier-s/10' : match.winner ? 'opacity-40' : ''}`}>
          {clubA ? <TeamDot club={clubA} showAbbr={false} /> : <span className="w-3 h-3 rounded-full bg-slate-700 shrink-0" />}
          <span className={`truncate flex-1 font-medium text-[11px] ${winA ? 'text-white' : 'text-slate-300'}`}>
            {clubA?.abbr ?? (match.teamA ? '???' : 'TBD')}
          </span>
          {match.winner && <span className={`font-bold ${winA ? 'text-tier-s' : 'text-slate-600'}`}>{match.scoreA}</span>}
        </div>
        <div className="border-t border-bg-border/30" />
        <div className={`px-2 py-1.5 flex items-center gap-1.5 h-1/2 ${winB ? 'bg-tier-s/10' : match.winner ? 'opacity-40' : ''}`}>
          {clubB ? <TeamDot club={clubB} showAbbr={false} /> : <span className="w-3 h-3 rounded-full bg-slate-700 shrink-0" />}
          <span className={`truncate flex-1 font-medium text-[11px] ${winB ? 'text-white' : 'text-slate-300'}`}>
            {clubB?.abbr ?? (match.teamB ? '???' : 'TBD')}
          </span>
          {match.winner && <span className={`font-bold ${winB ? 'text-tier-s' : 'text-slate-600'}`}>{match.scoreB}</span>}
        </div>
        {hover && match.winner && (
          <div className="absolute left-full top-0 ml-1 bg-bg-panel border border-bg-border rounded px-2 py-1.5 z-50 w-28 shadow-xl text-[11px]">
            <div className="font-bold text-tier-s">{clubById(match.winner)?.abbr}</div>
            <div className="text-slate-400">{match.scoreA}–{match.scoreB} {format}</div>
          </div>
        )}
      </div>
    </foreignObject>
  );
}

function R16Bracket({ state }: { state: CupState }) {
  const r16Round = state.rounds.find(r => r.stage === 'r16');
  const qfRound  = state.rounds.find(r => r.stage === 'qf');
  const sfRound  = state.rounds.find(r => r.stage === 'sf');
  const finRound = state.rounds.find(r => r.stage === 'final');

  if (!r16Round) return null;

  const r16 = r16Round.matches; // 8 matches
  const qf  = qfRound?.matches ?? Array.from({ length: 4 }, (_, i) =>
    ({ id: `qf_ph${i}`, teamA: null, teamB: null, scoreA: 0, scoreB: 0, winner: null, oddsA: 0, oddsB: 0 })
  );
  const sf  = sfRound?.matches ?? Array.from({ length: 2 }, (_, i) =>
    ({ id: `sf_ph${i}`, teamA: null, teamB: null, scoreA: 0, scoreB: 0, winner: null, oddsA: 0, oddsB: 0 })
  );
  const fin = finRound?.matches ?? [
    { id: 'fin_ph0', teamA: null, teamB: null, scoreA: 0, scoreB: 0, winner: null, oddsA: 0, oddsB: 0 },
  ];

  const COL = [0, BRACKET_CW + BRACKET_GAP, 2 * (BRACKET_CW + BRACKET_GAP), 3 * (BRACKET_CW + BRACKET_GAP)];
  const TW = COL[3] + BRACKET_CW;

  // R16: 8 cards at y = 0, BRACKET_VS, 2*BRACKET_VS, ... (spacing = BRACKET_VS)
  const r16Y = (i: number) => i * BRACKET_VS;
  // QF: centered between pair i*2 and i*2+1 of R16
  const qfY  = (i: number) => r16Y(i * 2) + (BRACKET_VS - BRACKET_CH) / 2 + BRACKET_CH / 2;
  // SF: centered between pair of QF
  const sfY  = (i: number) => qfY(i * 2) + (qfY(i * 2 + 1) - qfY(i * 2)) / 2;
  // Final: centered
  const finY = sfY(0) + (sfY(1) - sfY(0)) / 2;

  const TH = r16Y(7) + BRACKET_CH + 16;
  const LINE = '#334155';
  const midY = (y: number) => y + BRACKET_CH / 2;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg width={TW} height={TH} style={{ display: 'block' }}>
          {/* Connector lines R16→QF */}
          {[0,1,2,3].map(qi => {
            const m1 = r16Y(qi * 2);
            const m2 = r16Y(qi * 2 + 1);
            const qy = qfY(qi);
            const midX = COL[0] + BRACKET_CW;
            const qStartX = COL[1];
            return (
              <g key={`r16qf${qi}`}>
                <line x1={midX} y1={midY(m1)} x2={midX + BRACKET_GAP / 2} y2={midY(m1)} stroke={LINE} strokeWidth={1} />
                <line x1={midX} y1={midY(m2)} x2={midX + BRACKET_GAP / 2} y2={midY(m2)} stroke={LINE} strokeWidth={1} />
                <line x1={midX + BRACKET_GAP / 2} y1={midY(m1)} x2={midX + BRACKET_GAP / 2} y2={midY(m2)} stroke={LINE} strokeWidth={1} />
                <line x1={midX + BRACKET_GAP / 2} y1={midY(qy + BRACKET_CH / 2)} x2={qStartX} y2={midY(qy + BRACKET_CH / 2)} stroke={LINE} strokeWidth={1} />
              </g>
            );
          })}
          {/* Connector lines QF→SF */}
          {[0,1].map(si => {
            const q1 = qfY(si * 2);
            const q2 = qfY(si * 2 + 1);
            const sy = sfY(si);
            const midX = COL[1] + BRACKET_CW;
            return (
              <g key={`qfsf${si}`}>
                <line x1={midX} y1={midY(q1 + BRACKET_CH / 2)} x2={midX + BRACKET_GAP / 2} y2={midY(q1 + BRACKET_CH / 2)} stroke={LINE} strokeWidth={1} />
                <line x1={midX} y1={midY(q2 + BRACKET_CH / 2)} x2={midX + BRACKET_GAP / 2} y2={midY(q2 + BRACKET_CH / 2)} stroke={LINE} strokeWidth={1} />
                <line x1={midX + BRACKET_GAP / 2} y1={midY(q1 + BRACKET_CH / 2)} x2={midX + BRACKET_GAP / 2} y2={midY(q2 + BRACKET_CH / 2)} stroke={LINE} strokeWidth={1} />
                <line x1={midX + BRACKET_GAP / 2} y1={midY(sy + BRACKET_CH / 2)} x2={COL[2]} y2={midY(sy + BRACKET_CH / 2)} stroke={LINE} strokeWidth={1} />
              </g>
            );
          })}
          {/* Connector lines SF→Final */}
          {[0,1].map(si => {
            const sy = sfY(si);
            const midX = COL[2] + BRACKET_CW;
            return (
              <g key={`sffin${si}`}>
                <line x1={midX} y1={midY(sy + BRACKET_CH / 2)} x2={midX + BRACKET_GAP / 2} y2={midY(sy + BRACKET_CH / 2)} stroke={LINE} strokeWidth={1} />
              </g>
            );
          })}
          {(() => {
            const midX = COL[2] + BRACKET_CW + BRACKET_GAP / 2;
            return (
              <>
                <line x1={midX} y1={midY(sfY(0) + BRACKET_CH / 2)} x2={midX} y2={midY(sfY(1) + BRACKET_CH / 2)} stroke={LINE} strokeWidth={1} />
                <line x1={midX} y1={midY(finY + BRACKET_CH / 2)} x2={COL[3]} y2={midY(finY + BRACKET_CH / 2)} stroke={LINE} strokeWidth={1} />
              </>
            );
          })()}

          {/* R16 cards */}
          {r16.map((m, i) => (
            <BracketMatchCard key={m.id} match={m} format="Bo3" x={COL[0]} y={r16Y(i)} />
          ))}

          {/* QF cards */}
          {qf.map((m, i) => (
            <BracketMatchCard key={m.id} match={m} format="Bo5" x={COL[1]} y={qfY(i)} />
          ))}

          {/* SF cards */}
          {sf.map((m, i) => (
            <BracketMatchCard key={m.id} match={m} format="Bo5" x={COL[2]} y={sfY(i)} />
          ))}

          {/* Final card */}
          <BracketMatchCard match={fin[0]} format="Bo5" x={COL[3]} y={finY} />

          {/* Column labels */}
          {(['Round of 16', 'Quarterfinals', 'Semifinals', 'Grand Final'] as const).map((lbl, i) => (
            <text key={lbl} x={COL[i] + BRACKET_CW / 2} y={TH - 4} textAnchor="middle"
              fill="#475569" fontSize={9} fontWeight="bold">
              {lbl}
            </text>
          ))}
        </svg>
      </div>

      {/* Survivor rows for R16+ */}
      {state.rounds.map((round, idx) => {
        if (!['r16', 'qf', 'sf', 'final'].includes(round.stage)) return null;
        if (!round.completed && round.slotsCompleted === 0) return null;
        return (
          <div key={round.stage} className="mt-4">
            <div className="text-xs font-bold text-slate-400 mb-1">After {round.label}</div>
            <SurvivorRow state={state} afterRoundIdx={idx} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CupDetail() {
  const { cupId } = useParams<{ cupId: string }>();
  const cupStates = useStore(s => s.cupStates);
  const state = cupId ? cupStates[cupId] : undefined;
  const meta = cupId ? CUP_META[cupId] : undefined;

  if (!state || !meta) {
    return (
      <div className="p-8 text-slate-500">Cup not found: {cupId}</div>
    );
  }

  const hasR16 = state.rounds.some(r => r.stage === 'r16');
  const preR16Rounds = state.rounds.filter(r => !['r16', 'qf', 'sf', 'final'].includes(r.stage));

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-bg-border">
        <Link to="/teams" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3 w-fit">
          <ChevronLeft size={14} />
          Back to Teams & Leagues
        </Link>
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className={`text-2xl font-black tracking-tight ${meta.color}`}>{meta.name}</h1>
          <span className="text-sm text-slate-500">{meta.region}</span>
          {state.champion && (
            <span className="px-2 py-0.5 rounded bg-tier-s/10 text-tier-s border border-tier-s/20 text-xs font-bold">
              🏆 {clubById(state.champion)?.name ?? state.champion}
            </span>
          )}
          {!state.completed && state.rounds.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-bg-panel text-slate-400 border border-bg-border text-xs">
              {state.rounds[state.rounds.length - 1]?.label}
              {!state.rounds[state.rounds.length - 1]?.completed ? ' (live)' : ''}
            </span>
          )}
          {state.rounds.length === 0 && (
            <span className="text-xs text-slate-600">Season not started</span>
          )}
        </div>
      </div>

      <div className="px-6 py-5">
        {state.rounds.length === 0 ? (
          <p className="text-slate-600 text-sm">Matches begin Week 5.</p>
        ) : (
          <>
            {/* Pre-R16 rounds — most recent first */}
            {[...preR16Rounds].reverse().map(round => (
              <RoundSection
                key={round.stage}
                round={round}
                roundIdx={state.rounds.indexOf(round)}
                state={state}
              />
            ))}

            {/* R16+ bracket */}
            {hasR16 && (
              <section className="mb-8">
                <div className="flex items-baseline gap-3 mb-4">
                  <h3 className="text-sm font-bold text-white">Knockout Bracket</h3>
                  <span className="text-xs text-slate-500">W22 – W30</span>
                </div>
                <R16Bracket state={state} />
              </section>
            )}

            {/* Not yet reached R16 but all pre-R16 done — waiting for next cup week */}
            {!hasR16 && preR16Rounds.length > 0 && preR16Rounds.every(r => r.completed) && (
              <p className="text-slate-600 text-sm italic">Round of 16 bracket will be drawn Week 22.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
