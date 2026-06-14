interface Props { tier: string; className?: string; }

const tierColor: Record<string, string> = {
  S: 'text-tier-s border-tier-s',
  'S-': 'text-tier-s border-tier-s opacity-80',
  'A++': 'text-tier-a border-tier-a',
  'A+': 'text-tier-a border-tier-a opacity-90',
  'A0': 'text-yellow-300 border-yellow-300',
  A: 'text-yellow-400 border-yellow-400',
  'A-': 'text-yellow-500 border-yellow-500',
  'B++': 'text-white border-white',
  'B+': 'text-slate-200 border-slate-200',
  B0: 'text-slate-300 border-slate-300',
  B: 'text-slate-400 border-slate-400',
  'C++': 'text-tier-c border-tier-c',
  C: 'text-tier-c border-tier-c',
};

export function TierBadge({ tier, className = '' }: Props) {
  const color = tierColor[tier] ?? 'text-slate-500 border-slate-500';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-bold border rounded ${color} ${className}`}>
      {tier}
    </span>
  );
}
