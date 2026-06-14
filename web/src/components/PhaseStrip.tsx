import { useStore, getWeekInfo } from '../store/store';

const INTERNATIONAL_TYPES = new Set(['mm', 'wt', 'we']);

export function PhaseStrip() {
  const gameDate = useStore(s => s.gameDate);
  const advanceOneDay = useStore(s => s.advanceOneDay);
  const advanceThreeDays = useStore(s => s.advanceThreeDays);
  const advanceToNextMonday = useStore(s => s.advanceToNextMonday);
  const resetSeason = useStore(s => s.resetSeason);

  const week = getWeekInfo(gameDate);
  const isIntl = INTERNATIONAL_TYPES.has(week.type);

  const intlBtnClass = isIntl
    ? 'px-3 py-1.5 text-xs rounded font-bold bg-tier-a text-black hover:opacity-90 transition-opacity'
    : 'px-3 py-1.5 text-xs rounded font-bold bg-bg-border text-slate-600 cursor-not-allowed opacity-50';

  const btnClass = 'px-3 py-1.5 text-xs rounded bg-tier-s text-black font-bold hover:opacity-90 transition-opacity';

  const typeColor: Record<string, string> = {
    mm: 'text-tier-a',
    wt: 'text-accent-blue',
    we: 'text-tier-s',
    regional: 'text-slate-300',
    intermatch: 'text-slate-400',
    break: 'text-slate-500',
    offseason: 'text-slate-600',
  };

  return (
    <div className="h-11 flex items-center px-4 border-b border-bg-border bg-bg-card gap-4">
      {/* Week info */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
          S{week.season} W{week.weekNum}
        </span>
        <span className={`text-xs truncate ${typeColor[week.type] ?? 'text-slate-400'}`}>
          {week.label}
        </span>
        {isIntl && (
          <span className="px-1.5 py-0.5 text-xs rounded bg-tier-a/15 text-tier-a border border-tier-a/30 whitespace-nowrap">
            INTL
          </span>
        )}
      </div>

      {/* Controls */}
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
  );
}
