import { useStore, getWeekInfo } from '../store/store';

const CALENDAR = [
  { weeks: [1], event: 'PP (Preseason Palooza)', type: 'international' },
  { weeks: [2, 7], event: 'Regional Leagues Split 1', type: 'regional' },
  { weeks: [8, 9], event: 'Intermatch', type: 'international' },
  { weeks: [10, 13], event: 'Regional Leagues Split 2', type: 'regional' },
  { weeks: [14, 15], event: 'RTM (Road to Mayhem)', type: 'international' },
  { weeks: [16], event: 'Rest Week', type: 'break' },
  { weeks: [17, 19], event: 'MM (Midseason Mayhem)', type: 'international' },
  { weeks: [20], event: 'Rest Week', type: 'break' },
  { weeks: [21, 25], event: 'Regional Leagues Split 3', type: 'regional' },
  { weeks: [26, 27], event: 'Intermatch', type: 'international' },
  { weeks: [28, 32], event: 'Regional Leagues Split 4', type: 'regional' },
  { weeks: [33, 34], event: 'Intermatch', type: 'international' },
  { weeks: [35, 36], event: 'Playoffs', type: 'playoff' },
  { weeks: [37, 40], event: 'Rest / WT Prep', type: 'break' },
  { weeks: [41, 45], event: 'WT (World Tournament)', type: 'world' },
  { weeks: [46], event: 'Rest Week', type: 'break' },
  { weeks: [47, 49], event: 'WE (World Event)', type: 'world' },
  { weeks: [50, 52], event: 'Off Season', type: 'offseason' },
];

const typeColor: Record<string, string> = {
  regional: 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue',
  international: 'bg-tier-a/20 border-tier-a/50 text-tier-a',
  world: 'bg-tier-s/20 border-tier-s/50 text-tier-s',
  playoff: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
  break: 'bg-bg-card border-bg-border text-slate-500',
  offseason: 'bg-bg-card border-bg-border text-slate-600',
};

export function Schedule() {
  const gameDate = useStore(s => s.gameDate);
  const week = getWeekInfo(gameDate);
  const currentWeek = week.weekNum;

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-white mb-1">Season {week.season} Calendar</h2>
      <p className="text-sm text-slate-500 mb-6">52-week esports season schedule · currently W{currentWeek}</p>

      <div className="space-y-2">
        {CALENDAR.map((entry, idx) => {
          const [start, end] = entry.weeks.length === 2 ? entry.weeks : [entry.weeks[0], entry.weeks[0]];
          const isActive = currentWeek >= start && currentWeek <= end;
          const isPast = currentWeek > end;
          const colors = typeColor[entry.type] ?? typeColor.break;

          return (
            <div
              key={idx}
              className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${colors} ${
                isActive ? 'ring-2 ring-tier-s' : ''
              } ${isPast ? 'opacity-40' : ''}`}
            >
              <div className="text-xs font-mono w-20 text-center">
                W{start}{end !== start ? `–W${end}` : ''}
              </div>
              <div className="flex-1 font-medium text-sm">{entry.event}</div>
              {isActive && (
                <span className="text-xs font-bold text-tier-s animate-pulse">NOW</span>
              )}
              {isPast && (
                <span className="text-xs text-slate-600">DONE</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
