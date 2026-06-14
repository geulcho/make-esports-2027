import type { Club } from '../../types';

interface Props {
  club: Club;
  showAbbr?: boolean;
  className?: string;
}

export function TeamDot({ club, showAbbr = true, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold flex-shrink-0"
        style={{ background: club.colors.bg, color: club.colors.text }}
      >
        {club.abbr.slice(0, 2)}
      </span>
      {showAbbr && <span className="text-sm text-slate-200 truncate">{club.abbr}</span>}
    </span>
  );
}
