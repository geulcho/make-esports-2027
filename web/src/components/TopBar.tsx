import { useStore, getWeekInfo } from '../store/store';

export function TopBar() {
  const gameDate = useStore(s => s.gameDate);
  const activeMeta = useStore(s => s.activeMeta);

  const week = getWeekInfo(gameDate);

  return (
    <header className="h-12 flex items-center px-4 border-b border-bg-border bg-bg-panel gap-4">
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Meta:</span>
        {activeMeta.map(m => (
          <span key={m} className="px-2 py-0.5 rounded text-xs font-bold bg-bg-card text-tier-s border border-tier-s/30">
            {m}
          </span>
        ))}
      </div>

      <div className="text-xs text-slate-500">
        Season {week.season} · W{week.weekNum}
      </div>

      <div className="text-xs text-slate-400">{gameDate}</div>
    </header>
  );
}
