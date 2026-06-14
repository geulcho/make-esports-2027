import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../store/store';
import { clubById, leagueConfigs } from '../data/clubs';
import { TierBadge } from '../components/ui/TierBadge';
import { SeriesScore } from '../components/ui/SeriesScore';

const STAT_LABELS: Record<string, string> = {
  MAC: 'Macro', DRF: 'Draft', TMF: 'Teamfight', LAN: 'Laning', MEC: 'Mechanics',
};

function StatBar({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? '#00FFCC' : value >= 75 ? '#FFD700' : value >= 60 ? '#ffffff' : '#666666';
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 text-slate-400 text-xs">{label}</span>
      <div className="flex-1 bg-bg-border rounded-full h-1.5">
        <div className="h-1.5 rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="w-8 text-right text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

export function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const leagueStates = useStore(s => s.leagueStates);

  const club = clubById(id ?? '');
  if (!club) return (
    <div className="p-8 text-center text-slate-500">
      <p>Team not found.</p>
      <Link to="/teams" className="text-tier-s hover:underline mt-2 inline-block">← Back</Link>
    </div>
  );

  const lc = leagueConfigs.find(l => l.id === club.league_id);
  const state = leagueStates[club.league_id];
  const rec = state?.standings.find(s => s.clubId === club.id);
  const currentElo = rec?.elo ?? club.elo_rating;

  const teamMatches = Object.values(leagueStates)
    .flatMap(s => s.results)
    .flatMap(pr => pr.matches)
    .filter(m => m.teamA === club.id || m.teamB === club.id)
    .slice(-20)
    .reverse();

  return (
    <div className="p-6 max-w-4xl">
      <Link to="/teams" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4">
        <ArrowLeft size={16} /> Back to Leagues
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-16 h-16 rounded-lg flex items-center justify-center text-xl font-black"
          style={{ background: club.colors.bg, color: club.colors.text }}
        >
          {club.abbr}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{club.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-slate-400">{club.abbr}</span>
            <TierBadge tier={club.tier} />
            <Link to="/teams" className="text-xs text-accent-blue hover:underline">
              {lc?.name ?? club.league_id}
            </Link>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold text-accent-blue">{currentElo}</div>
          <div className="text-xs text-slate-500">ELO Rating</div>
          {rec && (
            <div className="text-sm text-slate-300 mt-1">
              {rec.wins}W – {rec.losses}L
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Stats */}
        <div className="bg-bg-card rounded-lg p-4">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Team Stats</h3>
          <div className="space-y-3">
            {Object.entries(club.stats).map(([k, v]) => (
              <StatBar key={k} label={STAT_LABELS[k] ?? k} value={v} />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-bg-border">
            <div className="text-xs text-slate-500 mb-2">Preferred Combos</div>
            <div className="flex gap-1 flex-wrap">
              {club.preferred_combos.map(c => (
                <span key={c} className="px-2 py-0.5 rounded text-xs bg-tier-s/10 text-tier-s border border-tier-s/20">{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Matches */}
        <div className="bg-bg-card rounded-lg p-4">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Recent Matches</h3>
          {teamMatches.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No matches yet</p>
          ) : (
            <div className="space-y-2">
              {teamMatches.map((m, i) => (
                <div key={i} className="border-b border-bg-border/50 pb-2 last:border-0">
                  <SeriesScore match={m} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
