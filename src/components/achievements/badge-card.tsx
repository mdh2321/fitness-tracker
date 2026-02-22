'use client';

import { Card } from '@/components/ui/card';
import { BADGES } from '@/lib/constants';
import { format, parseISO } from 'date-fns';

interface BadgeCardProps {
  badgeKey: string;
  earnedAt?: string;
  locked?: boolean;
}

export function BadgeCard({ badgeKey, earnedAt, locked = false }: BadgeCardProps) {
  const badge = BADGES.find((b) => b.key === badgeKey);
  if (!badge) return null;

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
      </div>
    </Card>
  );
}
