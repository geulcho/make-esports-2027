import type { MatchResult } from '../../types';
import { clubById } from '../../data/clubs';
import { TeamDot } from './TeamDot';

interface Props { match: MatchResult; }

export function SeriesScore({ match }: Props) {
  const clubA = clubById(match.teamA);
  const clubB = clubById(match.teamB);
  if (!clubA || !clubB) return null;

  const winA = match.scoreA > match.scoreB;
  const winB = !winA;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={winA ? 'font-bold text-white' : 'text-slate-400'}>
        {clubA ? <TeamDot club={clubA} /> : match.teamA}
      </span>
      <span className="flex items-center gap-1">
        <span className={winA ? 'text-status-up font-bold' : 'text-slate-500'}>{match.scoreA}</span>
        <span className="text-slate-600">:</span>
        <span className={winB ? 'text-status-up font-bold' : 'text-slate-500'}>{match.scoreB}</span>
      </span>
      <span className={winB ? 'font-bold text-white' : 'text-slate-400'}>
        {clubB ? <TeamDot club={clubB} /> : match.teamB}
      </span>
      <span className="ml-auto text-xs text-slate-500">
        {match.oddsA.toFixed(2)} / {match.oddsB.toFixed(2)}
      </span>
    </div>
  );
}
