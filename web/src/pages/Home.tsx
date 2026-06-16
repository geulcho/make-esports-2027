import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { clubById, featuredLeagues, leagueConfigs } from '../data/clubs';
import { TeamDot } from '../components/ui/TeamDot';
import { SeriesScore } from '../components/ui/SeriesScore';
import type { MatchResult } from '../types';

const LEAGUE_LABELS: Record<string, string> = {
  L_KR: 'KR', L_NEU: 'WEU', L_SEA: 'SEA', L_BR: 'BR',
};

export function Home() {
  const leagueStates = useStore(s => s.leagueStates);
  const [activeTab, setActiveTab] = useState(featuredLeagues[0]);
  const [rightTab, setRightTab] = useState<'results' | 'upcoming'>('results');

  const activeState = leagueStates[activeTab];

  const allRecentMatches: MatchResult[] = [];
  for (const state of Object.values(leagueStates)) {
    if (!state?.results?.length) continue;
    const last = state.results[state.results.length - 1];
    if (last) allRecentMatches.push(...last.matches);
  }

  return (
    <div className="flex gap-0 h-full">
      {/* News Panel */}
      <aside className="w-64 border-r border-bg-border p-4 overflow-y-auto flex-shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Live Feed</h3>
        {allRecentMatches.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">
            Advance time to start the season
          </div>
        ) : (
          <div className="space-y-2">
            {allRecentMatches.slice(0, 12).map((m, i) => {
              const ca = clubById(m.teamA);
              const cb = clubById(m.teamB);
              const winA = m.scoreA > m.scoreB;
              return (
                <div key={i} className="bg-bg-card rounded p-2 text-xs">
                  <div className="flex items-center justify-between gap-1">
                    <span className={winA ? 'text-white font-bold' : 'text-slate-400'}>
                      {ca?.abbr ?? m.teamA}
                    </span>
                    <span className="text-slate-500">{m.scoreA}:{m.scoreB}</span>
                    <span className={!winA ? 'text-white font-bold' : 'text-slate-400'}>
                      {cb?.abbr ?? m.teamB}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {m.meta.map(x => (
                      <span key={x} className="px-1 rounded-sm bg-tier-s/10 text-tier-s">{x}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      {/* Center: League Standings */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-bg-border px-4 pt-4 gap-1">
          {featuredLeagues.map(lid => (
            <button
              key={lid}
              onClick={() => setActiveTab(lid)}
              className={`px-4 py-2 text-sm rounded-t transition-colors ${
                activeTab === lid
                  ? 'bg-bg-card text-tier-s border border-bg-border border-b-bg-card'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {LEAGUE_LABELS[lid] ?? lid}
            </button>
          ))}
          <Link
            to="/teams"
            className="ml-auto text-xs text-accent-blue hover:underline self-center pb-2"
          >
            All Leagues →
          </Link>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {!activeState || activeState.standings.length === 0 ? (
            <div className="text-center text-slate-500 py-16">
              Simulate a phase to see standings
            </div>
          ) : (
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
                {activeState.standings.map((rec, idx) => {
                  const club = clubById(rec.clubId);
                  if (!club) return null;
                  const sd = rec.setsFor - rec.setsAgainst;
                  const scd = rec.momFor - rec.momAgainst;
                  return (
                    <tr
                      key={rec.clubId}
                      className="border-b border-bg-border/50 hover:bg-bg-hover transition-colors"
                    >
                      <td className="py-2 text-slate-500 text-xs">{idx + 1}</td>
                      <td className="py-2">
                        <Link to={`/teams/${club.id}`} className="flex items-center gap-2 hover:text-tier-s transition-colors">
                          <TeamDot club={club} showAbbr={false} />
                          <span className="text-slate-300">{club.name}</span>
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
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <aside className="w-72 border-l border-bg-border flex flex-col flex-shrink-0">
        <div className="flex border-b border-bg-border">
          {(['results', 'upcoming'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setRightTab(tab)}
              className={`flex-1 py-2.5 text-sm capitalize transition-colors ${
                rightTab === tab ? 'text-tier-s border-b-2 border-tier-s' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {rightTab === 'results' ? (
            allRecentMatches.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No results yet</p>
            ) : (
              allRecentMatches.map((m, i) => (
                <div key={i} className="bg-bg-card rounded p-2">
                  <SeriesScore match={m} />
                </div>
              ))
            )
          ) : (
            <div className="text-sm text-slate-500 text-center py-8">
              Upcoming matches after simulation
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
