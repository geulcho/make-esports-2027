import { useStore, getWeekInfo } from '../store/store';
import type { WeekEventType } from '../engine/calendar';

const INTERNATIONAL_TYPES = new Set(['mm', 'wt', 'we']);

function getWeekType(weekNum: number): WeekEventType {
  const SPECIAL: Record<number, WeekEventType> = {
    7: 'intermatch', 8: 'intermatch',
    16: 'break',
    17: 'mm', 18: 'mm', 19: 'mm',
    20: 'break',
    25: 'intermatch', 26: 'intermatch',
    31: 'intermatch', 32: 'intermatch',
    38: 'break',
    39: 'wt', 40: 'wt', 41: 'wt', 42: 'wt', 43: 'wt',
    44: 'break',
    45: 'we', 46: 'we', 47: 'we', 48: 'we',
    49: 'offseason', 50: 'offseason', 51: 'offseason', 52: 'offseason',
  };
  return SPECIAL[weekNum] ?? 'regional';
}

const DOT_COLORS: Record<WeekEventType, string> = {
  regional:    'bg-slate-600',
  intermatch:  'bg-orange-500',
  mm:          'bg-amber-400',
  wt:          'bg-blue-400',
  we:          'bg-emerald-400',
  break:       'bg-slate-500',
  offseason:   'bg-slate-700',
};

const DOT_UNPLAYED: Record<WeekEventType, string> = {
  regional:    'bg-slate-800',
  intermatch:  'bg-orange-900/50',
  mm:          'bg-amber-900/50',
  wt:          'bg-blue-900/50',
  we:          'bg-emerald-900/50',
  break:       'bg-slate-800',
  offseason:   'bg-slate-800/50',
};

const PERIOD_LABELS: Record<WeekEventType, string> = {
  regional:    'Regional Leagues',
  intermatch:  'Intermatch',
  mm:          'Midseason Mayhem',
  wt:          'World Tournament',
  we:          'World Event',
  break:       'Break',
  offseason:   'Off Season',
};

const PERIOD_COLORS: Record<WeekEventType, string> = {
  regional:    'text-slate-400',
  intermatch:  'text-orange-400',
  mm:          'text-amber-400',
  wt:          'text-blue-400',
  we:          'text-emerald-400',
  break:       'text-slate-500',
  offseason:   'text-slate-600',
};

function findNextPeriod(currentWeek: number): { type: WeekEventType; startWeek: number } | null {
  const currentType = getWeekType(currentWeek);
  for (let w = currentWeek + 1; w <= 52; w++) {
    const t = getWeekType(w);
    if (t !== currentType) return { type: t, startWeek: w };
  }
  return null;
}

function SeasonDots({ currentWeek }: { currentWeek: number }) {
  return (
    <div className="flex items-center gap-[2px]" title="Season Progress">
      {Array.from({ length: 52 }, (_, i) => {
        const w = i + 1;
        const type = getWeekType(w);
        const played = w <= currentWeek;
        const isCurrent = w === currentWeek;
        const dotCls = played ? DOT_COLORS[type] : DOT_UNPLAYED[type];
        return (
          <div
            key={w}
            className={`h-2 rounded-full transition-all ${dotCls} ${
              isCurrent ? 'w-2.5 ring-1 ring-white ring-offset-1 ring-offset-bg-card' : 'w-[5px]'
            }`}
            title={`W${w} · ${PERIOD_LABELS[type]}`}
          />
        );
      })}
    </div>
  );
}

export function PhaseStrip() {
  const gameDate = useStore(s => s.gameDate);
  const advanceOneDay = useStore(s => s.advanceOneDay);
  const advanceThreeDays = useStore(s => s.advanceThreeDays);
  const advanceToNextMonday = useStore(s => s.advanceToNextMonday);
  const resetSeason = useStore(s => s.resetSeason);

  const week = getWeekInfo(gameDate);
  const isIntl = INTERNATIONAL_TYPES.has(week.type);
  const next = findNextPeriod(week.weekNum);

  const intlBtnClass = isIntl
    ? 'px-3 py-1.5 text-xs rounded font-bold bg-tier-a text-black hover:opacity-90 transition-opacity'
    : 'px-3 py-1.5 text-xs rounded font-bold bg-bg-border text-slate-600 cursor-not-allowed opacity-50';

  const btnClass = 'px-3 py-1.5 text-xs rounded bg-tier-s text-black font-bold hover:opacity-90 transition-opacity';

  return (
    <div className="flex flex-col border-b border-bg-border bg-bg-card">
      {/* Row 1: 52-dot progress bar */}
      <div className="px-4 pt-2 pb-1 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Current period */}
          <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">W{week.weekNum}</span>
          <span className={`text-[10px] font-bold whitespace-nowrap ${PERIOD_COLORS[week.type]}`}>
            {PERIOD_LABELS[week.type]}
          </span>
          {next && (
            <>
              <span className="text-[10px] text-slate-700">→</span>
              <span className={`text-[10px] whitespace-nowrap ${PERIOD_COLORS[next.type]}`}>
                W{next.startWeek} {PERIOD_LABELS[next.type]}
              </span>
            </>
          )}
        </div>
        <SeasonDots currentWeek={week.weekNum} />
      </div>

      {/* Row 2: Week info + controls */}
      <div className="h-10 flex items-center px-4 gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
            S{week.season} W{week.weekNum}
          </span>
          <span className={`text-xs truncate ${PERIOD_COLORS[week.type]}`}>
            {week.label}
          </span>
          {isIntl && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-tier-a/15 text-tier-a border border-tier-a/30 whitespace-nowrap">
              INTL
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={resetSeason}
            className="px-3 py-1 text-xs rounded border border-bg-border text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-colors"
          >
            Reset
          </button>

          <div className="w-px h-5 bg-bg-border" />

          <button
            disabled={!isIntl}
            title={isIntl ? '매치마다 (International week only)' : '국제대회 기간에만 활성화'}
            className={intlBtnClass}
          >
            매치마다
          </button>

          <button onClick={advanceOneDay} className={btnClass} title="하루 넘기기 (+1 day)">
            +1일
          </button>

          <button onClick={advanceThreeDays} className={btnClass} title="3일 넘기기 (+3 days)">
            +3일
          </button>

          <button onClick={advanceToNextMonday} className={btnClass} title="다음 월요일까지">
            다음주
          </button>
        </div>
      </div>
    </div>
  );
}
