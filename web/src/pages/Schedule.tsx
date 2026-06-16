import { useMemo } from 'react';
import { useStore, getWeekInfo } from '../store/store';
import { addDays, SEASON_START, SEASON_LENGTH_DAYS, getSeasonIndex } from '../engine/calendar';

// Cup blackout weeks (Mon/Tue/Wed blocked for regional leagues)
const CUP_WEEKS = new Set([5, 9, 11, 22, 24, 28, 30]);

interface WeekBlock {
  startWeek: number;
  endWeek: number;
  type: string;
  label: string;
  isInternational: boolean;
  cupWeeks: number[];   // cup weeks within this block
  naMatchDays?: string; // L_NA match schedule summary
}

const NA_MATCH_SCHEDULE: Record<number, string> = {
  1:  'Thu · Sun',  2:  'Thu · Sun',  3:  'Thu · Sun',  4:  'Thu · Sun',
  5:  'Thu · Sun ⚠',6:  'Thu · Sun',
  9:  'Thu · Sun ⚠',10: 'Thu · Sun', 11: 'Thu · Sun ⚠',12: 'Thu · Sun',
  13: 'Thu · Sat',
  14: 'MM Qualifier (SF)',
  15: 'MM Qualifier (F)',
  21: 'Thu · Sat · Sun', 22: 'Thu · Sun ⚠', 23: 'Thu · Sun',
  24: 'Thu · Sun ⚠',
  27: 'Thu · Sat · Sun', 28: 'Thu · Sun ⚠', 29: 'Thu · Sun',
  30: 'Thu · Sun ⚠',
  33: 'Thu · Sat · Sun', 34: 'Thu · Sat',
  35: 'QF + SF', 36: 'Division Finals', 37: 'Grand Final',
};

function buildBlocks(seasonStart: string): WeekBlock[] {
  const blocks: WeekBlock[] = [];
  let cur: WeekBlock | null = null;

  for (let w = 1; w <= 52; w++) {
    const date = addDays(seasonStart, (w - 1) * 7);
    const info = getWeekInfo(date);
    const key = `${info.type}::${info.label}`;

    if (!cur || `${cur.type}::${cur.label}` !== key) {
      if (cur) blocks.push(cur);
      cur = {
        startWeek: w,
        endWeek: w,
        type: info.type,
        label: info.label,
        isInternational: info.isInternational,
        cupWeeks: CUP_WEEKS.has(w) ? [w] : [],
        naMatchDays: NA_MATCH_SCHEDULE[w],
      };
    } else {
      cur.endWeek = w;
      if (CUP_WEEKS.has(w)) cur.cupWeeks.push(w);
      if (!cur.naMatchDays && NA_MATCH_SCHEDULE[w]) cur.naMatchDays = NA_MATCH_SCHEDULE[w];
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

const TYPE_STYLE: Record<string, string> = {
  regional:    'bg-accent-blue/10 border-accent-blue/30 text-accent-blue',
  intermatch:  'bg-tier-a/10 border-tier-a/30 text-tier-a',
  mm:          'bg-orange-500/10 border-orange-500/30 text-orange-400',
  wt:          'bg-purple-500/10 border-purple-500/30 text-purple-400',
  we:          'bg-tier-s/10 border-tier-s/30 text-tier-s',
  break:       'bg-bg-card border-bg-border text-slate-500',
  offseason:   'bg-bg-card border-bg-border/50 text-slate-600',
};

const TYPE_DOT: Record<string, string> = {
  regional:   'bg-accent-blue',
  intermatch: 'bg-tier-a',
  mm:         'bg-orange-400',
  wt:         'bg-purple-400',
  we:         'bg-tier-s',
  break:      'bg-slate-600',
  offseason:  'bg-slate-700',
};

export function Schedule() {
  const gameDate = useStore(s => s.gameDate);
  const week = getWeekInfo(gameDate);
  const currentWeek = week.weekNum;
  const currentSeason = week.season;

  const seasonStart = useMemo(() => {
    const idx = getSeasonIndex(gameDate);
    return addDays(SEASON_START, idx * SEASON_LENGTH_DAYS);
  }, [gameDate]);

  const blocks = useMemo(() => buildBlocks(seasonStart), [seasonStart]);

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-end gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Season {currentSeason} Calendar</h2>
          <p className="text-sm text-slate-500 mt-0.5">52-week global esports calendar</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Current</div>
          <div className="text-sm font-bold text-tier-s">W{currentWeek} · {week.label}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-5 text-xs">
        {(['regional','intermatch','mm','wt','we','break','offseason'] as const).map(t => (
          <div key={t} className="flex items-center gap-1.5 text-slate-400">
            <div className={`w-2 h-2 rounded-full ${TYPE_DOT[t]}`} />
            <span className="capitalize">{t}</span>
          </div>
        ))}
      </div>

      {/* Blocks */}
      <div className="space-y-1.5">
        {blocks.map((block, i) => {
          const isActive = currentWeek >= block.startWeek && currentWeek <= block.endWeek;
          const isPast = currentWeek > block.endWeek;
          const base = TYPE_STYLE[block.type] ?? TYPE_STYLE.break;
          const weekLabel = block.startWeek === block.endWeek
            ? `W${block.startWeek}`
            : `W${block.startWeek}–${block.endWeek}`;

          return (
            <div
              key={i}
              className={`
                flex items-start gap-4 px-4 py-2.5 rounded-lg border transition-all
                ${base}
                ${isActive ? 'ring-2 ring-tier-s ring-offset-1 ring-offset-bg-base' : ''}
                ${isPast ? 'opacity-40' : ''}
              `}
            >
              {/* Week badge */}
              <div className="font-mono text-xs w-20 flex-shrink-0 pt-0.5 opacity-80">
                {weekLabel}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{block.label}</span>
                  {isActive && (
                    <span className="text-xs font-bold text-tier-s animate-pulse">NOW</span>
                  )}
                  {isPast && (
                    <span className="text-xs text-slate-600">DONE</span>
                  )}
                  {block.cupWeeks.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                      Cup W{block.cupWeeks.join(',')}
                    </span>
                  )}
                </div>

                {/* L_NA match days */}
                {block.naMatchDays && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    NA: {block.naMatchDays}
                  </div>
                )}
              </div>

              {/* Type tag */}
              <div className={`text-xs font-bold uppercase tracking-wider flex-shrink-0 pt-0.5 opacity-60`}>
                {block.type === 'regional' ? 'REG' :
                 block.type === 'intermatch' ? 'IM' :
                 block.type === 'break' ? '—' :
                 block.type === 'offseason' ? 'OFF' :
                 block.type.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
