import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { allClubs, leagueConfigs } from '../data/clubs';
import { TierBadge } from '../components/ui/TierBadge';
import { TeamDot } from '../components/ui/TeamDot';
import { computeLeagueCoefficients } from '../engine/leagueCoeff';

type SortKey = 'elo' | 'MAC' | 'DRF' | 'TMF' | 'LAN' | 'MEC';
type RatingsTab = 'clubs' | 'leagues';

function statColor(v: number) {
  if (v >= 90) return 'text-tier-s';
  if (v >= 80) return 'text-tier-a';
  if (v >= 65) return 'text-white';
  return 'text-tier-c';
}

const LEAGUE_NAMES: Record<string, string> = Object.fromEntries(
  leagueConfigs.map(l => [l.id, l.name]),
);

export function Ratings() {
  const leagueStates = useStore(s => s.leagueStates);
  const [sortKey, setSortKey] = useState<SortKey>('elo');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [tab, setTab] = useState<RatingsTab>('clubs');

  // ─── Clubs tab data ─────
  const clubs = allClubs.filter(c => {
    if (regionFilter === 'ALL') return true;
    const lc = leagueConfigs.find(l => l.id === c.league_id);
    return lc?.region === regionFilter;
  });

  const clubsWithElo = clubs.map(c => {
    const state = leagueStates[c.league_id];
    const rec = state?.standings.find(s => s.clubId === c.id);
    return { ...c, currentElo: rec?.elo ?? c.elo_rating };
  });

  const sorted = [...clubsWithElo].sort((a, b) => {
    if (sortKey === 'elo') return b.currentElo - a.currentElo;
    return (b.stats[sortKey as keyof typeof b.stats] as number) -
           (a.stats[sortKey as keyof typeof a.stats] as number);
  });

  // ─── Leagues tab data ─────
  const coefficients = computeLeagueCoefficients(leagueStates);

  const REGIONS = ['ALL', 'APAC', 'EMEA', 'AMER'];
  const STAT_COLS: SortKey[] = ['elo', 'MAC', 'DRF', 'TMF', 'LAN', 'MEC'];

  return (
    <div className="p-4">
      {/* Tab bar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1">
          {(['clubs', 'leagues'] as RatingsTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs rounded font-medium transition-colors ${
                tab === t ? 'bg-tier-s text-black font-bold' : 'bg-bg-card text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'clubs' ? 'Club Ratings' : 'League Coefficients'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'clubs' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-bold text-white">Club Ratings</h2>
            <div className="flex gap-1">
              {REGIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(r)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    regionFilter === r ? 'bg-tier-s text-black font-bold' : 'bg-bg-card text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-bg-border">
                <th className="text-left py-2 w-6">#</th>
                <th className="text-left py-2">Club</th>
                <th className="text-left py-2 w-24">League</th>
                <th className="text-center py-2 w-14">Tier</th>
                {STAT_COLS.map(k => (
                  <th
                    key={k}
                    onClick={() => setSortKey(k)}
                    className={`text-center py-2 w-14 cursor-pointer hover:text-slate-200 transition-colors ${
                      sortKey === k ? 'text-tier-s' : ''
                    }`}
                  >
                    {k.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((club, idx) => {
                const lc = leagueConfigs.find(l => l.id === club.league_id);
                return (
                  <tr key={club.id} className="border-b border-bg-border/50 hover:bg-bg-hover transition-colors">
                    <td className="py-2 text-slate-500 text-xs">{idx + 1}</td>
                    <td className="py-2">
                      <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s transition-colors">
                        <TeamDot club={club} showAbbr={false} />
                        <span className="text-slate-300">{club.name}</span>
                      </Link>
                    </td>
                    <td className="py-2 text-xs text-slate-500">{lc?.name ?? club.league_id}</td>
                    <td className="py-2 text-center"><TierBadge tier={club.tier} /></td>
                    <td className={`py-2 text-center font-bold ${sortKey === 'elo' ? 'text-accent-blue' : 'text-slate-400'}`}>
                      {club.currentElo}
                    </td>
                    {(['MAC', 'DRF', 'TMF', 'LAN', 'MEC'] as SortKey[]).map(k => (
                      <td key={k} className={`py-2 text-center ${statColor(club.stats[k as keyof typeof club.stats] as number)}`}>
                        {club.stats[k as keyof typeof club.stats]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'leagues' && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">League Coefficients</h2>
          <p className="text-xs text-slate-500 mb-4">계수 = 리그 평균 Elo + 상위 4팀 Elo 합계 (실시간 반영)</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-bg-border">
                <th className="text-center py-2 w-10">Rank</th>
                <th className="text-left py-2">리그</th>
                <th className="text-left py-2 w-16">권역</th>
                <th className="text-center py-2 w-16">팀 수</th>
                <th className="text-center py-2 w-20">평균 Elo</th>
                <th className="text-center py-2 w-20">Top4 합계</th>
                <th className="text-center py-2 w-20">계수 점수</th>
                <th className="text-center py-2 w-16">WT 슬롯</th>
              </tr>
            </thead>
            <tbody>
              {coefficients.map(c => {
                const lc = leagueConfigs.find(l => l.id === c.leagueId);
                const teamCount = leagueStates[c.leagueId]?.standings.length ?? 0;
                const wtSlots = c.rank <= 4 ? 3 : c.rank <= 8 ? 2 : 1;
                const rankCls = c.rank <= 4 ? 'text-amber-400 font-bold' :
                  c.rank <= 8 ? 'text-blue-400 font-bold' : 'text-slate-400';
                return (
                  <tr key={c.leagueId} className="border-b border-bg-border/50 hover:bg-bg-hover transition-colors">
                    <td className={`py-2 text-center ${rankCls}`}>{c.rank}</td>
                    <td className="py-2 text-slate-200 font-medium">{LEAGUE_NAMES[c.leagueId] ?? c.leagueId}</td>
                    <td className="py-2 text-xs text-slate-500">{lc?.region ?? ''}</td>
                    <td className="py-2 text-center text-slate-400">{teamCount}</td>
                    <td className="py-2 text-center text-slate-300 font-mono">{c.avgElo}</td>
                    <td className="py-2 text-center text-slate-300 font-mono">{c.top4Sum}</td>
                    <td className="py-2 text-center font-bold text-accent-blue">{c.points}</td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        wtSlots === 3 ? 'bg-amber-500/20 text-amber-300' :
                        wtSlots === 2 ? 'bg-blue-500/20 text-blue-300' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>{wtSlots}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
