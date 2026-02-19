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
        <h3 className="text-sm font-semibold text-gray-200">{badge.name}</h3>
        <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
        {earnedAt && (
          <p className="text-[10px] text-gray-600 mt-2">{format(parseISO(earnedAt), 'MMM d, yyyy')}</p>
        )}
      </div>
    </Card>
  );
}
