import { useState } from 'react';
import { useStore, getWeekInfo } from '../store/store';
import { nationById, allNations, regionLabel } from '../data/nations';
import { sortGroupRecords } from '../engine/intermatch';
import type { NatGroup, NatGroupRecord, NatBracketMatch, WEQualRegion, MEAFQualState, SideEventState, IntermatchState } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

type SidebarItem = 'ranking' | 'EU' | 'APAC' | 'AMERICA' | 'MEAF' | 'IQ' | 'EEC' | 'TPC' | 'WE';
type RankFilter = 'ALL' | 'EU' | 'APAC' | 'AMERICA' | 'MEAF';

const ACCENT = '#60A5FA'; // blue for intermatch

// ─── Team chip ────────────────────────────────────────────────────────────────

function NatChip({ nationId, small }: { nationId: string | null; small?: boolean }) {
  if (!nationId) return <span className={`${small ? 'w-10 h-5' : 'w-14 h-6'} rounded bg-bg-border/30 inline-block`} />;
  const nat = nationById(nationId);
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 font-bold ${small ? 'text-[10px] h-5' : 'text-xs h-6'}`}
      style={{ backgroundColor: nat?.colors.bg ?? '#334155', color: nat?.colors.text ?? '#e2e8f0' }}
      title={nat?.name ?? nationId}
    >
      {nat?.abbr ?? nationId.slice(4)}
    </span>
  );
}

// ─── Ranking tab ──────────────────────────────────────────────────────────────

function RankingTab({ state }: { state: IntermatchState }) {
  const [filter, setFilter] = useState<RankFilter>('ALL');
  const elos = state.nationElos;
  const allRanked = [...allNations].sort((a, b) => (elos[b.id] ?? b.elo_rating) - (elos[a.id] ?? a.elo_rating));
  const filtered = filter === 'ALL' ? allRanked : allRanked.filter(n => n.region === filter);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>National Team Ranking</h2>
      </div>
      <div className="flex gap-1 mb-4">
        {(['ALL', 'EU', 'APAC', 'AMERICA', 'MEAF'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              filter === f ? 'text-white font-bold' : 'text-slate-500 hover:text-slate-300 bg-bg-base'
            }`}
            style={filter === f ? { backgroundColor: ACCENT } : {}}
          >
            {f === 'ALL' ? 'All' : regionLabel(f)}
          </button>
        ))}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-bg-border text-slate-500">
            <th className="text-center py-1.5 w-10">#</th>
            <th className="text-left py-1.5">국가</th>
            <th className="text-left py-1.5">권역</th>
            <th className="text-center py-1.5">Tier</th>
            <th className="text-center py-1.5">Elo</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((nat, idx) => {
            const globalRank = allRanked.findIndex(n => n.id === nat.id) + 1;
            return (
              <tr key={nat.id} className="border-b border-bg-border/30 hover:bg-bg-hover/40">
                <td className="text-center py-1.5 text-slate-500 font-mono">{globalRank}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <NatChip nationId={nat.id} small />
                    <span className="text-slate-300">{nat.name}</span>
                  </div>
                </td>
                <td className="py-1.5 text-slate-500">{regionLabel(nat.region)}</td>
                <td className="py-1.5 text-center">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    nat.tier === 'S' ? 'bg-amber-500/20 text-amber-300' :
                    nat.tier.startsWith('A') ? 'bg-purple-500/20 text-purple-300' :
                    nat.tier.startsWith('B') ? 'bg-blue-500/20 text-blue-300' :
                    nat.tier.startsWith('C') ? 'bg-green-500/20 text-green-300' :
                    nat.tier.startsWith('D') ? 'bg-slate-500/20 text-slate-300' :
                    'bg-slate-600/20 text-slate-400'
                  }`}>{nat.tier}</span>
                </td>
                <td className="py-1.5 text-center text-slate-300 font-mono">{Math.round(elos[nat.id] ?? nat.elo_rating)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Group standings table ────────────────────────────────────────────────────

function GroupTable({ group }: { group: NatGroup }) {
  const sorted = sortGroupRecords(group.records);
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-slate-300">{group.label}</span>
        <span className="text-[10px] text-slate-600">MD {group.matchdaysCompleted}/{group.matchdaysTotal}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-bg-border text-slate-600">
            <th className="text-center w-6 py-1">#</th>
            <th className="text-left py-1">국가</th>
            <th className="text-center py-1 w-8">W</th>
            <th className="text-center py-1 w-8">L</th>
            <th className="text-center py-1 w-10">SF</th>
            <th className="text-center py-1 w-10">SA</th>
            <th className="text-center py-1 w-10">SD</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((rec, idx) => {
            const rank = idx + 1;
            // 1-2위 → WE direct (blue), 3-4위 → PO (green)
            const rowCls = rank <= 2
              ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
              : rank <= 4
              ? 'bg-emerald-500/8 border-l-2 border-l-emerald-500'
              : '';
            const rankCls = rank <= 2 ? 'text-blue-400 font-bold' : rank <= 4 ? 'text-emerald-400 font-bold' : 'text-slate-500';
            const diff = rec.setsFor - rec.setsAgainst;
            return (
              <tr key={rec.nationId} className={`border-b border-bg-border/30 ${rowCls}`}>
                <td className={`text-center py-1 ${rankCls}`}>{rank}</td>
                <td className="py-1">
                  <div className="flex items-center gap-1.5">
                    <NatChip nationId={rec.nationId} small />
                    <span className="text-slate-300 text-[11px]">{nationById(rec.nationId)?.name ?? ''}</span>
                  </div>
                </td>
                <td className="text-center py-1 text-emerald-400">{rec.wins}</td>
                <td className="text-center py-1 text-red-400">{rec.losses}</td>
                <td className="text-center py-1 text-slate-400">{rec.setsFor}</td>
                <td className="text-center py-1 text-slate-400">{rec.setsAgainst}</td>
                <td className={`text-center py-1 font-bold ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {diff > 0 ? '+' : ''}{diff}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── PO match card ────────────────────────────────────────────────────────────

function POMatchCard({ m }: { m: NatBracketMatch }) {
  const winA = m.winner === m.teamA;
  const winB = m.winner === m.teamB;
  const isUpset = m.winner !== null && (
    (winA && m.oddsA > m.oddsB) || (winB && m.oddsB > m.oddsA)
  );
  const winnerOdds = winA ? m.oddsA : winB ? m.oddsB : 0;

  function oddsColor(odds: number, isW: boolean) {
    if (!isW || !isUpset) return 'text-slate-600';
    if (odds >= 5.0) return 'text-red-500 font-bold';
    if (odds >= 3.0) return 'text-red-400';
    if (odds >= 2.0) return 'text-orange-400';
    return 'text-slate-500';
  }

  return (
    <div className="rounded border border-bg-border bg-bg-panel p-2.5 w-52">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-slate-600 font-bold">{m.format}</span>
        {!m.winner && m.teamA && m.teamB && (
          <span className="text-[9px] text-slate-600">{m.oddsA.toFixed(2)} / {m.oddsB.toFixed(2)}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-0.5">
        {m.winner && <span className={`text-[9px] w-7 ${oddsColor(m.oddsA, winA)}`}>{m.oddsA.toFixed(2)}</span>}
        <NatChip nationId={m.teamA} small />
        <span className="text-slate-400 text-[11px]">{nationById(m.teamA ?? '')?.name ?? ''}</span>
        <span className={`ml-auto w-4 text-center text-xs font-bold ${winA ? 'text-emerald-400' : 'text-slate-600'}`}>
          {m.winner ? m.scoreA : ''}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {m.winner && <span className={`text-[9px] w-7 ${oddsColor(m.oddsB, winB)}`}>{m.oddsB.toFixed(2)}</span>}
        <NatChip nationId={m.teamB} small />
        <span className="text-slate-400 text-[11px]">{nationById(m.teamB ?? '')?.name ?? ''}</span>
        <span className={`ml-auto w-4 text-center text-xs font-bold ${winB ? 'text-emerald-400' : 'text-slate-600'}`}>
          {m.winner ? m.scoreB : ''}
        </span>
      </div>
    </div>
  );
}

// ─── Regional qualifier tab ───────────────────────────────────────────────────

function RegionQualTab({ region, label }: { region: WEQualRegion; label: string }) {
  const poLabel = region.regionId === 'EU' ? 'European' : region.regionId === 'APAC' ? 'Asia-Pacific' : 'American';
  const hasPO = region.playoffMatches.length > 0;
  const groupsDone = region.groups.every(g => g.completed);

  // Collect PO participating teams for display
  const thirds: string[] = [];
  const fourths: string[] = [];
  if (groupsDone) {
    for (const g of region.groups) {
      const sorted = sortGroupRecords(g.records);
      if (sorted.length >= 3) thirds.push(sorted[2].nationId);
      if (sorted.length >= 4) fourths.push(sorted[3].nationId);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: ACCENT }}>{label} Qualifier</h2>

      {/* WE direct qualified */}
      {region.weQualified.length > 0 && (
        <div className="rounded border border-blue-500/30 bg-blue-500/5 p-3 mb-4">
          <div className="text-[10px] font-bold text-blue-400 uppercase mb-2">WE 직행 ({region.weQualified.length}팀)</div>
          <div className="flex flex-wrap gap-1">
            {region.weQualified.map(id => <NatChip key={id} nationId={id} />)}
          </div>
        </div>
      )}

      {/* Group tables */}
      <div className={`grid gap-4 mb-6 ${region.groups.length <= 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'}`}>
        {region.groups.map(g => <GroupTable key={g.id} group={g} />)}
      </div>

      {/* PO section */}
      {groupsDone && (
        <div className="border-t border-bg-border pt-4">
          <h3 className="text-xs font-bold uppercase text-slate-300 mb-3">{poLabel} PO</h3>

          {/* PO participants */}
          {!hasPO && (
            <div className="mb-3">
              <div className="text-[10px] text-slate-500 mb-1">진출팀</div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                <span>조 3위</span>
                <div className="flex gap-1">{thirds.map(id => <NatChip key={id} nationId={id} small />)}</div>
                <span className="ml-3">조 4위</span>
                <div className="flex gap-1">{fourths.map(id => <NatChip key={id} nationId={id} small />)}</div>
              </div>
              <div className="text-slate-600 text-[10px] mt-2">대진 추첨 대기 중...</div>
            </div>
          )}

          {/* PO matches */}
          {hasPO && (
            <div className="flex flex-wrap gap-3 mb-4">
              {region.playoffMatches.map(m => <POMatchCard key={m.id} m={m} />)}
            </div>
          )}

          {/* IQ qualified */}
          {region.iqQualified.length > 0 && (
            <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="text-[10px] font-bold text-emerald-400 uppercase mb-2">IQ 진출 ({region.iqQualified.length}팀)</div>
              <div className="flex flex-wrap gap-1">
                {region.iqQualified.map(id => <NatChip key={id} nationId={id} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MEAF qualifier tab ───────────────────────────────────────────────────────

function MEAFQualTab({ meaf }: { meaf: MEAFQualState }) {
  const DE_STAGES = ['UB R1', 'LB R1', 'UB SF', 'LB R2', 'LB R3', 'UB Final', 'LB Final', 'Grand Final'];

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: ACCENT }}>MEAF Qualifier</h2>

      {meaf.weQualified && (
        <div className="rounded border border-blue-500/30 bg-blue-500/5 p-3 mb-4 flex items-center gap-4">
          <div>
            <div className="text-[10px] font-bold text-blue-400 uppercase mb-1">WE 직행</div>
            <NatChip nationId={meaf.weQualified} />
          </div>
          {meaf.iqQualified && (
            <div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">IQ 진출</div>
              <NatChip nationId={meaf.iqQualified} />
            </div>
          )}
        </div>
      )}

      {/* 1st Qualifier */}
      {meaf.firstQual.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 mb-2">1st Qualifier · 하위 8국, Bo5</div>
          <div className="flex flex-wrap gap-2">
            {meaf.firstQual.map(m => <POMatchCard key={m.id} m={m} />)}
          </div>
        </div>
      )}

      {/* 2nd Qualifier */}
      {meaf.secondQual.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 mb-2">2nd Qualifier · 상위 12 + 1차 4 = 16국, Bo5</div>
          <div className="flex flex-wrap gap-2">
            {meaf.secondQual.map(m => <POMatchCard key={m.id} m={m} />)}
          </div>
        </div>
      )}

      {/* Final Qualifier DE bracket */}
      {meaf.finalQual.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-400 mb-3">Final Qualifier · 8국 Double Elimination</div>
          <div className="overflow-x-auto">
            {/* Upper bracket */}
            <div className="mb-4">
              <div className="text-[10px] font-bold text-amber-400 uppercase mb-2">Upper Bracket</div>
              <div className="flex gap-6 items-start">
                {['UB R1', 'UB SF', 'UB Final'].map(stage => {
                  const matches = meaf.finalQual.filter(m => m.stage === stage);
                  if (matches.length === 0) return null;
                  return (
                    <div key={stage} className="flex flex-col gap-2">
                      <div className="text-[9px] text-slate-500 font-bold uppercase">{stage}</div>
                      {matches.map(m => <POMatchCard key={m.id} m={m} />)}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Lower bracket */}
            <div className="mb-4">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Lower Bracket</div>
              <div className="flex gap-6 items-start">
                {['LB R1', 'LB R2', 'LB R3', 'LB Final'].map(stage => {
                  const matches = meaf.finalQual.filter(m => m.stage === stage);
                  if (matches.length === 0) return null;
                  return (
                    <div key={stage} className="flex flex-col gap-2">
                      <div className="text-[9px] text-slate-500 font-bold uppercase">{stage}</div>
                      {matches.map(m => <POMatchCard key={m.id} m={m} />)}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Grand Final */}
            {meaf.finalQual.filter(m => m.stage === 'Grand Final').length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-amber-400 uppercase mb-2">Grand Final</div>
                <div className="flex gap-2">
                  {meaf.finalQual.filter(m => m.stage === 'Grand Final').map(m => <POMatchCard key={m.id} m={m} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IQ tab ───────────────────────────────────────────────────────────────────

function IQTab({ state }: { state: IntermatchState }) {
  const iq = state.iq;

  // Collect all IQ-bound teams from regions
  const allIQTeams = [
    ...state.europe.iqQualified,
    ...state.asiaPacific.iqQualified,
    ...state.americas.iqQualified,
    ...(state.meaf.iqQualified ? [state.meaf.iqQualified] : []),
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: ACCENT }}>Interregional Qualifier</h2>
      <p className="text-xs text-slate-500 mb-4">10개국 · 같은 권역 대결 금지 · Bo5 단판 5경기 · W31~32</p>

      {/* IQ participants */}
      {allIQTeams.length > 0 && (
        <div className="rounded border border-bg-border p-3 mb-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">IQ 참가국 ({allIQTeams.length}/10)</div>
          <div className="grid grid-cols-2 gap-1">
            {['EU', 'APAC', 'AMERICA', 'MEAF'].map(region => {
              const teams = region === 'EU' ? state.europe.iqQualified :
                region === 'APAC' ? state.asiaPacific.iqQualified :
                region === 'AMERICA' ? state.americas.iqQualified :
                state.meaf.iqQualified ? [state.meaf.iqQualified] : [];
              if (teams.length === 0) return null;
              return (
                <div key={region} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="w-14">{region}</span>
                  <div className="flex gap-1">{teams.map(id => <NatChip key={id} nationId={id} small />)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IQ matches */}
      {iq ? (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            {iq.matches.map((m, i) => {
              const bm: NatBracketMatch = {
                id: m.id, stage: `Match ${i + 1}`, format: 'Bo5',
                teamA: m.teamA, teamB: m.teamB,
                scoreA: m.scoreA, scoreB: m.scoreB,
                winner: m.winner, oddsA: m.oddsA, oddsB: m.oddsB,
              };
              return <POMatchCard key={m.id} m={bm} />;
            })}
          </div>

          {/* WE wildcard qualified */}
          {iq.weQualified.length > 0 && (
            <div className="rounded border border-blue-500/30 bg-blue-500/5 p-3">
              <div className="text-[10px] font-bold text-blue-400 uppercase mb-2">WE 와일드카드 ({iq.weQualified.length}/5)</div>
              <div className="flex flex-wrap gap-1">
                {iq.weQualified.map(id => <NatChip key={id} nationId={id} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-slate-600 text-sm text-center py-8 border border-bg-border rounded-lg">
          권역별 예선 완료 후 IQ 대진 생성
        </div>
      )}
    </div>
  );
}

// ─── EEC / TPC bracket tab ────────────────────────────────────────────────────

function calcNatChampOdds(teamIds: string[], elos: Record<string, number>): Record<string, number> {
  if (teamIds.length === 0) return {};
  const shares = teamIds.map(id => ({ id, share: Math.pow(10, (elos[id] ?? 1000) / 400) }));
  const total = shares.reduce((s, x) => s + x.share, 0);
  const result: Record<string, number> = {};
  for (const s of shares) result[s.id] = Math.round(Math.max(1.01, 0.90 / (s.share / total)) * 100) / 100;
  return result;
}

function BracketTab({ event, title, subtitle, elos }: { event: SideEventState | null; title: string; subtitle: string; elos: Record<string, number> }) {
  if (!event) {
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: ACCENT }}>{title}</h2>
        <p className="text-[10px] text-slate-500 mb-4">{subtitle}</p>
        <div className="text-slate-600 text-sm text-center py-8 border border-bg-border rounded-lg">
          권역별 예선 완료 후 대진 생성 (W31~)
        </div>
      </div>
    );
  }

  const hasPlayIn = event.playInMatches.length > 0;
  const qfMatches = event.mainMatches.filter(m => m.stage === 'QF');
  const sfMatches = event.mainMatches.filter(m => m.stage === 'SF');
  const finalMatch = event.mainMatches.find(m => m.stage === 'Final');

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: ACCENT }}>{title}</h2>
      <p className="text-[10px] text-slate-500 mb-4">{subtitle}</p>

      {event.champion && (
        <div className="rounded-lg border p-3 mb-4 flex items-center gap-3" style={{ borderColor: ACCENT + '50', backgroundColor: ACCENT + '08' }}>
          <span className="text-xl">🏆</span>
          <div>
            <div className="text-[10px] uppercase font-bold" style={{ color: ACCENT }}>Champion</div>
            <div className="flex items-center gap-2">
              <NatChip nationId={event.champion} />
              <span className="text-slate-300 text-sm">{nationById(event.champion)?.name}</span>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="flex items-start gap-6 min-w-max py-2">
          {/* Play-In (TPC only) */}
          {hasPlayIn && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Play-In</div>
              {event.playInMatches.map(m => <POMatchCard key={m.id} m={m} />)}
            </div>
          )}

          {/* QF */}
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Quarterfinals</div>
            {qfMatches.map(m => <POMatchCard key={m.id} m={m} />)}
          </div>

          {/* SF */}
          <div className="flex flex-col gap-2 mt-10">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Semifinals</div>
            {sfMatches.map(m => <POMatchCard key={m.id} m={m} />)}
          </div>

          {/* Final */}
          {finalMatch && (
            <div className="flex flex-col gap-2 mt-16">
              <div className="text-[10px] font-bold uppercase" style={{ color: ACCENT }}>Final</div>
              <POMatchCard m={finalMatch} />
            </div>
          )}
        </div>
      </div>

      {/* Participants with championship odds */}
      {event.participants.length > 0 && (
        <div className="mt-4 rounded border border-bg-border p-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">참가국 ({event.participants.length})</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-bg-border/50 text-slate-600">
                <th className="text-center py-1 w-8">#</th>
                <th className="text-left py-1">국가</th>
                <th className="text-center py-1 w-14">Elo</th>
                <th className="text-center py-1 w-16">우승 배당</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const champOdds = calcNatChampOdds(event.participants, elos);
                const sorted = [...event.participants].sort((a, b) => (elos[b] ?? 0) - (elos[a] ?? 0));
                return sorted.map((id, i) => {
                  const nat = nationById(id);
                  const odds = champOdds[id];
                  return (
                    <tr key={id} className="border-b border-bg-border/20 hover:bg-bg-hover/30">
                      <td className="text-center py-1 text-slate-500">{i + 1}</td>
                      <td className="py-1">
                        <div className="flex items-center gap-1.5">
                          <NatChip nationId={id} small />
                          <span className="text-slate-300">{nat?.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-1 text-slate-400 font-mono">{Math.round(elos[id] ?? nat?.elo_rating ?? 0)}</td>
                      <td className="text-center py-1">
                        <span className={`font-bold ${odds <= 3 ? 'text-amber-400' : odds <= 8 ? 'text-slate-300' : 'text-slate-500'}`}>
                          {odds?.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Placeholder tab ──────────────────────────────────────────────────────────

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="text-slate-500 text-sm text-center py-16">
      {title} — Coming soon
    </div>
  );
}

// ─── Main Intermatch page ─────────────────────────────────────────────────────

const SIDEBAR_ITEMS: Array<{ id: SidebarItem; label: string; section: 'ranking' | 'qualifier' | 'tournament' }> = [
  { id: 'ranking', label: 'Ranking', section: 'ranking' },
  { id: 'EU',      label: 'Europe', section: 'qualifier' },
  { id: 'APAC',    label: 'Asia-Pacific', section: 'qualifier' },
  { id: 'AMERICA', label: 'Americas', section: 'qualifier' },
  { id: 'MEAF',    label: 'MEAF', section: 'qualifier' },
  { id: 'IQ',      label: 'Interregional', section: 'qualifier' },
  { id: 'EEC',     label: 'EEC', section: 'tournament' },
  { id: 'TPC',     label: 'TPC', section: 'tournament' },
  { id: 'WE',      label: 'World Event', section: 'tournament' },
];

export function Intermatch() {
  const intermatchState = useStore(s => s.intermatchState);
  const gameDate = useStore(s => s.gameDate);
  const week = getWeekInfo(gameDate);
  const [active, setActive] = useState<SidebarItem>('ranking');

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-52 border-r border-bg-border overflow-y-auto flex-shrink-0 py-2">
        <div className="px-4 py-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ranking</span>
        </div>
        {SIDEBAR_ITEMS.filter(i => i.section === 'ranking').map(item => (
          <div
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
              active === item.id ? 'border-r-2 bg-bg-hover font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
            }`}
            style={active === item.id ? { borderRightColor: ACCENT, color: ACCENT } : {}}
          >
            {item.label}
          </div>
        ))}

        <div className="px-4 py-1 mt-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">WE Qualifier</span>
        </div>
        {SIDEBAR_ITEMS.filter(i => i.section === 'qualifier').map(item => (
          <div
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
              active === item.id ? 'border-r-2 bg-bg-hover font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
            }`}
            style={active === item.id ? { borderRightColor: ACCENT, color: ACCENT } : {}}
          >
            {item.label}
          </div>
        ))}

        <div className="px-4 py-1 mt-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tournament</span>
        </div>
        {SIDEBAR_ITEMS.filter(i => i.section === 'tournament').map(item => (
          <div
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
              active === item.id ? 'border-r-2 bg-bg-hover font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
            }`}
            style={active === item.id ? { borderRightColor: ACCENT, color: ACCENT } : {}}
          >
            {item.label}
          </div>
        ))}
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto p-6">
        {active === 'ranking' && <RankingTab state={intermatchState} />}
        {active === 'EU'      && <RegionQualTab region={intermatchState.europe} label="Europe" />}
        {active === 'APAC'    && <RegionQualTab region={intermatchState.asiaPacific} label="Asia-Pacific" />}
        {active === 'AMERICA' && <RegionQualTab region={intermatchState.americas} label="Americas" />}
        {active === 'MEAF'    && <MEAFQualTab meaf={intermatchState.meaf} />}
        {active === 'IQ'      && <IQTab state={intermatchState} />}
        {active === 'EEC'     && <BracketTab event={intermatchState.eec} title="European Esports Championship" subtitle="유럽 WE 직행 8개국 · Bo5 싱글 엘리미네이션 · W31~32" elos={intermatchState.nationElos} />}
        {active === 'TPC'     && <BracketTab event={intermatchState.tpc} title="Trans-Pacific Championship" subtitle="APAC 6 + Americas 4 + MEAF 1 = 11개국 · 플레이인 + Bo5 SE · W31~32" elos={intermatchState.nationElos} />}
        {active === 'WE'      && <PlaceholderTab title="World Event (W45~48)" />}
      </div>
    </div>
  );
}
