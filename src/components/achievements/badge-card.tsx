'use client';

import { Card } from '@/components/ui/card';
import { BADGES } from '@/lib/constants';
import { format, parseISO } from 'date-fns';

interface BadgeCardProps {
  badgeKey: string;
  earnedAt?: string;
  locked?: boolean;
  progress?: { current: number; target: number };
  compact?: boolean;
}

export function BadgeCard({ badgeKey, earnedAt, locked = false, progress, compact = false }: BadgeCardProps) {
  const badge = BADGES.find((b) => b.key === badgeKey);
  if (!badge) return null;

  const pct = progress ? Math.round((progress.current / progress.target) * 100) : 0;

  if (compact) {
    return (
      <Card className="flex items-center gap-3 px-3 py-2">
        <span className="text-2xl">{badge.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{badge.name}</h3>
          {progress && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: '#00d26a' }}
                />
              </div>
              <span className="text-[10px] tabular-nums whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>
                {progress.current}/{progress.target}
              </span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={`text-center transition-all ${locked ? 'opacity-40 grayscale' : 'hover:border-[#3a3a45]'}`}>
      <div className="pt-4 pb-2">
        <span className="text-4xl">{badge.icon}</span>
      </div>
      <div className="px-3 pb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{badge.name}</h3>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{badge.description}</p>
        {earnedAt && (
          <p className="text-[10px] mt-2" style={{ color: 'var(--fg-muted)' }}>{format(parseISO(earnedAt), 'MMM d, yyyy')}</p>
        )}
        {locked && progress && progress.current > 0 && (
          <div className="mt-2 px-1">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: '#00d26a' }}
              />
            </div>
            <p className="text-[10px] mt-1 tabular-nums" style={{ color: 'var(--fg-muted)' }}>
              {progress.current} / {progress.target}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
