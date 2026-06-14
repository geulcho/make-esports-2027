import { NavLink } from 'react-router-dom';
import {
  Home, Users, Globe, Flag, TrendingUp, BarChart2,
  Trophy, Calendar, BookOpen,
} from 'lucide-react';
import { useStore, getWeekInfo } from '../store/store';

const NAV = [
  { to: '/', label: 'Home', Icon: Home, exact: true },
  { to: '/players', label: 'Players', Icon: Users },
  { to: '/teams', label: 'Teams & Leagues', Icon: Globe },
  { to: '/intermatch', label: 'Intermatch', Icon: Flag },
  { to: '/ratings', label: 'Ratings', Icon: TrendingUp },
  { to: '/meta', label: 'Meta', Icon: BarChart2 },
  { to: '/tournaments', label: 'Tournaments', Icon: Trophy },
  { to: '/schedule', label: 'Schedule', Icon: Calendar },
  { to: '/history', label: 'History', Icon: BookOpen },
];

export function Sidebar() {
  const gameDate = useStore(s => s.gameDate);
  const week = getWeekInfo(gameDate);

  return (
    <aside className="w-48 flex-shrink-0 flex flex-col bg-bg-panel border-r border-bg-border h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-bg-border">
        <span className="text-xl font-black text-tier-s">MAKE</span>
        <span className="text-xl font-bold text-slate-300"> Esports</span>
      </div>

      <nav className="flex-1 py-2">
        {NAV.map(({ to, label, Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'border-r-2 border-tier-s text-tier-s bg-bg-hover'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-bg-border text-xs text-slate-500">
        <div>Season {week.season}</div>
        <div className="text-slate-600">W{week.weekNum}</div>
      </div>
    </aside>
  );
}
