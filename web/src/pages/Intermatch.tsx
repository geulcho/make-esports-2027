import { useState } from 'react';
import { useStore, getWeekInfo } from '../store/store';
import { nationById, allNations, regionLabel } from '../data/nations';
import { sortGroupRecords } from '../engine/intermatch';
import type { NatGroup, NatGroupRecord, NatBracketMatch, WEQualRegion, MEAFQualState, IntermatchState } from '../types';

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
  const allRanked = [...allNations].sort((a, b) => b.elo_rating - a.elo_rating);
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
                <td className="py-1.5 text-center text-slate-300 font-mono">{nat.elo_rating}</td>
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

function BracketMatchRow({ m }: { m: NatBracketMatch }) {
  const winA = m.winner === m.teamA;
  const winB = m.winner === m.teamB;
  return (
    <div className="flex items-center gap-1 py-0.5 text-xs">
      <NatChip nationId={m.teamA} small />
      <span className={`w-3 text-center font-bold ${winA ? 'text-emerald-400' : 'text-slate-600'}`}>
        {m.winner ? m.scoreA : ''}
      </span>
      <span className="text-slate-700">:</span>
      <span className={`w-3 text-center font-bold ${winB ? 'text-emerald-400' : 'text-slate-600'}`}>
        {m.winner ? m.scoreB : ''}
      </span>
      <NatChip nationId={m.teamB} small />
      <span className="text-[9px] text-slate-600 ml-1">{m.format}</span>
    </div>
  );
}

function MEAFQualTab({ meaf }: { meaf: MEAFQualState }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: ACCENT }}>MEAF Qualifier</h2>

      {meaf.weQualified && (
        <div className="rounded border border-blue-500/30 bg-blue-500/5 p-3 mb-4">
          <div className="text-[10px] font-bold text-blue-400 uppercase mb-1">WE 직행</div>
          <NatChip nationId={meaf.weQualified} />
          {meaf.iqQualified && (
            <span className="ml-3">
              <span className="text-[10px] text-emerald-400 mr-1">IQ →</span>
              <NatChip nationId={meaf.iqQualified} />
            </span>
          )}
        </div>
      )}

      {meaf.firstQual.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-400 mb-2">1st Qualifier (하위 8국 → 4 Bo5)</div>
          {meaf.firstQual.map(m => <BracketMatchRow key={m.id} m={m} />)}
        </div>
      )}

      {meaf.secondQual.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-400 mb-2">2nd Qualifier (16국 → 8 Bo5)</div>
          {meaf.secondQual.map(m => <BracketMatchRow key={m.id} m={m} />)}
        </div>
      )}

      {meaf.finalQual.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-400 mb-2">Final Qualifier (8국 DE)</div>
          {['UB R1', 'UB SF', 'UB Final', 'LB R1', 'LB R2', 'LB R3', 'LB Final', 'Grand Final'].map(stage => {
            const matches = meaf.finalQual.filter(m => m.stage === stage);
            if (matches.length === 0) return null;
            return (
              <div key={stage} className="mb-2">
                <div className="text-[10px] text-slate-500 font-bold mb-0.5">{stage}</div>
                {matches.map(m => <BracketMatchRow key={m.id} m={m} />)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Placeholder tabs ─────────────────────────────────────────────────────────

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
        {active === 'IQ'      && <PlaceholderTab title="Interregional Qualifier (W31~32)" />}
        {active === 'EEC'     && <PlaceholderTab title="European Esports Championship (W31~32)" />}
        {active === 'TPC'     && <PlaceholderTab title="Trans-Pacific Championship (W31~32)" />}
        {active === 'WE'      && <PlaceholderTab title="World Event (W45~48)" />}
      </div>
    </div>
  );
}
