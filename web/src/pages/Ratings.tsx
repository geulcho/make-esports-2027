import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { allClubs, leagueConfigs } from '../data/clubs';
import { TierBadge } from '../components/ui/TierBadge';
import { TeamDot } from '../components/ui/TeamDot';

type SortKey = 'elo' | 'MAC' | 'DRF' | 'TMF' | 'LAN' | 'MEC';

function statColor(v: number) {
  if (v >= 90) return 'text-tier-s';
  if (v >= 80) return 'text-tier-a';
  if (v >= 65) return 'text-white';
  return 'text-tier-c';
}

export function Ratings() {
  const leagueStates = useStore(s => s.leagueStates);
  const [sortKey, setSortKey] = useState<SortKey>('elo');
  const [regionFilter, setRegionFilter] = useState('ALL');

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

  const REGIONS = ['ALL', 'APAC', 'EMEA', 'AMER'];
  const STAT_COLS: SortKey[] = ['elo', 'MAC', 'DRF', 'TMF', 'LAN', 'MEC'];

  return (
    <div className="p-4">
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
  );
}
