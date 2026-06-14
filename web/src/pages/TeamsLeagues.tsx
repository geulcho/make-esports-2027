import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useStore } from '../store/store';
import { leagueConfigs, clubsByLeague, clubsByDivision, clubById, leagueConfigById } from '../data/clubs';
import { TierBadge } from '../components/ui/TierBadge';
import { TeamDot } from '../components/ui/TeamDot';
import { SeriesScore } from '../components/ui/SeriesScore';
import type { TeamRecord } from '../types';

const REGIONS = ['APAC', 'EMEA', 'AMER'];

function StandingsTable({ records, showDivBadge = false }: {
  records: TeamRecord[];
  showDivBadge?: boolean;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-500 border-b border-bg-border">
          <th className="text-left py-2 w-6">#</th>
          <th className="text-left py-2">Team</th>
          {showDivBadge && <th className="text-left py-2 w-20">Div</th>}
          <th className="text-center py-2 w-10">MP</th>
          <th className="text-center py-2 w-10">W</th>
          <th className="text-center py-2 w-10">L</th>
          <th className="text-center py-2 w-14">SD</th>
          <th className="text-center py-2 w-16">ELO</th>
        </tr>
      </thead>
      <tbody>
        {records.map((rec, idx) => {
          const club = clubById(rec.clubId);
          if (!club) return null;
          const sd = rec.setsFor - rec.setsAgainst;
          return (
            <tr key={rec.clubId} className="border-b border-bg-border/50 hover:bg-bg-hover">
              <td className="py-2 text-slate-500 text-xs">{idx + 1}</td>
              <td className="py-2">
                <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s">
                  <TeamDot club={club} />
                  <span className="text-slate-200">{club.name}</span>
                </Link>
              </td>
              {showDivBadge && (
                <td className="py-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-bg-border text-slate-400">
                    {rec.divisionId}
                  </span>
                </td>
              )}
              <td className="py-2 text-center text-slate-400">{rec.wins + rec.losses}</td>
              <td className="py-2 text-center text-status-up font-bold">{rec.wins}</td>
              <td className="py-2 text-center text-status-down">{rec.losses}</td>
              <td className={`py-2 text-center text-xs ${sd >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                {sd >= 0 ? '+' : ''}{sd}
              </td>
              <td className="py-2 text-center text-xs text-accent-blue">{rec.elo}</td>
            </tr>
          );
        })}
        {records.length === 0 && (
          <tr><td colSpan={8} className="py-8 text-center text-slate-500">Simulate a phase to see standings</td></tr>
        )}
      </tbody>
    </table>
  );
}

export function TeamsLeagues() {
  const leagueStates = useStore(s => s.leagueStates);
  const followedLeagues = useStore(s => s.followedLeagues);
  const toggleFollowLeague = useStore(s => s.toggleFollowLeague);

  const availableLeagues = leagueConfigs.filter(l => leagueStates[l.id]);
  const [activeLeague, setActiveLeague] = useState(availableLeagues[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<'standings' | 'results' | 'teams'>('standings');
  const [activeDivision, setActiveDivision] = useState<string | null>(null);

  const state = leagueStates[activeLeague];
  const lc = leagueConfigById(activeLeague);
  const clubs = clubsByLeague(activeLeague);
  const hasDivisions = (lc?.divisions?.length ?? 0) > 0;

  // When switching league, reset division filter
  function switchLeague(id: string) {
    setActiveLeague(id);
    setActiveDivision(null);
  }

  // What to show in standings
  function getStandingsToShow(): TeamRecord[] {
    if (!state) return [];
    if (!hasDivisions || activeDivision === null) return state.standings;
    return state.divisionStates?.[activeDivision]?.standings ?? [];
  }

  return (
    <div className="flex h-full">
      {/* League Sidebar */}
      <aside className="w-52 border-r border-bg-border overflow-y-auto flex-shrink-0 py-2">
        {REGIONS.map(region => {
          const regionLeagues = availableLeagues.filter(l => l.region === region);
          if (regionLeagues.length === 0) return null;
          return (
            <div key={region} className="mb-2">
              <div className="px-4 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                {region}
              </div>
              {regionLeagues.map(l => (
                <div
                  key={l.id}
                  onClick={() => switchLeague(l.id)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors cursor-pointer ${
                    activeLeague === l.id
                      ? 'bg-bg-hover text-tier-s'
                      : 'text-slate-400 hover:bg-bg-hover hover:text-slate-200'
                  }`}
                >
                  <span>{l.name}</span>
                  <div className="flex items-center gap-1">
                    {l.divisions && (
                      <span className="text-xs text-slate-600">div</span>
                    )}
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
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-bold text-white">{lc?.name}</h2>
            <span className="text-xs text-slate-500">{clubs.length} teams</span>
            {hasDivisions && (
              <span className="text-xs px-2 py-0.5 rounded bg-tier-a/10 text-tier-a border border-tier-a/20">
                Division League
              </span>
            )}
          </div>

          {/* Division filter (only for division leagues) */}
          {hasDivisions && (
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setActiveDivision(null)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  activeDivision === null
                    ? 'bg-tier-s text-black font-bold'
                    : 'bg-bg-card text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              {lc?.divisions?.map(div => (
                <button
                  key={div}
                  onClick={() => setActiveDivision(div)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    activeDivision === div
                      ? 'bg-tier-s text-black font-bold'
                      : 'bg-bg-card text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1">
            {(['standings', 'results', 'teams'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm capitalize rounded-t transition-colors ${
                  activeTab === tab
                    ? 'bg-bg-base text-tier-s border border-bg-border border-b-bg-base'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Standings Tab */}
          {activeTab === 'standings' && (
            hasDivisions && activeDivision === null ? (
              // Show each division in its own block
              <div className="space-y-6">
                {lc?.divisions?.map(div => {
                  const divStandings = state?.divisionStates?.[div]?.standings ?? [];
                  return (
                    <div key={div}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-bold text-slate-300">{div} Division</h3>
                        <span className="text-xs text-slate-500">
                          {clubsByDivision(activeLeague, div).length} teams
                        </span>
                      </div>
                      <StandingsTable records={divStandings} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <StandingsTable records={getStandingsToShow()} />
            )
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {!state || state.results.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No results yet</p>
              ) : (
                [...state.results].reverse().map((pr, i) => {
                  // Filter by division if selected
                  const matches = hasDivisions && activeDivision !== null
                    ? state.divisionStates?.[activeDivision]?.results
                        .find(r => r.phase === pr.phase)?.matches ?? []
                    : pr.matches;

                  if (matches.length === 0) return null;

                  return (
                    <div key={i} className="bg-bg-card rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-slate-400">Phase {pr.phase}</span>
                        <span className="text-xs text-slate-500">Split {pr.splitNum}</span>
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

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            hasDivisions ? (
              <div className="space-y-6">
                {lc?.divisions?.map(div => {
                  const divClubs = clubsByDivision(activeLeague, div);
                  return (
                    <div key={div}>
                      <h3 className="text-sm font-bold text-slate-300 mb-3">{div} Division</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {divClubs.map(club => {
                          const rec = state?.divisionStates?.[div]?.standings.find(s => s.clubId === club.id);
                          return (
                            <Link
                              key={club.id}
                              to={`/teams/${club.id}`}
                              className="bg-bg-card rounded-lg p-4 hover:bg-bg-hover transition-colors"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div
                                  className="w-10 h-10 rounded flex items-center justify-center font-bold text-sm flex-shrink-0"
                                  style={{ background: club.colors.bg, color: club.colors.text }}
                                >
                                  {club.abbr.slice(0, 3)}
                                </div>
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
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {clubs.map(club => {
                  const rec = state?.standings.find(s => s.clubId === club.id);
                  return (
                    <Link
                      key={club.id}
                      to={`/teams/${club.id}`}
                      className="bg-bg-card rounded-lg p-4 hover:bg-bg-hover transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-10 h-10 rounded flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: club.colors.bg, color: club.colors.text }}
                        >
                          {club.abbr.slice(0, 3)}
                        </div>
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
