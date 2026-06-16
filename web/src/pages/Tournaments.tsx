import { Link } from 'react-router-dom';
import { Trophy, Globe } from 'lucide-react';
import { useStore, getWeekInfo } from '../store/store';

function TournamentCard({
  to,
  title,
  subtitle,
  status,
  weeks,
}: {
  to: string;
  title: string;
  subtitle: string;
  status: string;
  weeks: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-bg-border bg-bg-panel hover:bg-bg-hover transition-colors p-5 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg font-bold text-slate-100 group-hover:text-tier-s transition-colors">
            {title}
          </div>
          <div className="text-sm text-slate-400">{subtitle}</div>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-bg-base border border-bg-border text-slate-400">
          {status}
        </span>
      </div>
      <div className="text-xs text-slate-500">{weeks}</div>
    </Link>
  );
}

export function Tournaments() {
  const gameDate = useStore(s => s.gameDate);
  const week = getWeekInfo(gameDate);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Tournaments</h1>
        <p className="text-sm text-slate-400 mt-1">Season {week.season} · W{week.weekNum}</p>
      </div>

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-tier-s" />
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Clubs</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TournamentCard
            to="/tournaments/mm"
            title="Midseason Mayhem"
            subtitle="16 teams · Swiss + SE Knockout"
            status="W17–19"
            weeks="Swiss R1–5 → QF/SF/GF"
          />
          <TournamentCard
            to="/tournaments/wt"
            title="World Tournament"
            subtitle="32 teams · Group + SE Knockout"
            status="W39–43"
            weeks="8 Groups Bo1 DRR → R16/QF/SF/GF"
          />
          <TournamentCard
            to="/tournaments/vsc"
            title="Viktor Sandberg Cup"
            subtitle="16 teams · Regional Qualifiers"
            status="W39–43"
            weeks="Regional Quals → SE Knockout"
          />
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Nations</h2>
        </div>
        <div className="rounded-lg border border-bg-border bg-bg-panel p-6 text-center text-slate-500 text-sm">
          Nations tournaments coming soon
        </div>
      </section>
    </div>
  );
}
