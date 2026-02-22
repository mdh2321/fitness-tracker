'use client';

import { useAchievements } from '@/hooks/use-stats';
import { BadgeCard } from '@/components/achievements/badge-card';
import { BADGES } from '@/lib/constants';
import { Trophy } from 'lucide-react';

export default function AchievementsPage() {
  const { data: earned, isLoading } = useAchievements();

  const earnedKeys = new Set((earned || []).map((a) => a.badge_key));
  const earnedMap = new Map((earned || []).map((a) => [a.badge_key, a.earned_at]));

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Achievements</h1>
        <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
          {earnedKeys.size} / {BADGES.length} earned
        </span>
      </div>

      {earnedKeys.size === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p style={{ color: 'var(--fg-secondary)' }}>Complete workouts to earn badges!</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {BADGES.map((badge) => (
          <BadgeCard
            key={badge.key}
            badgeKey={badge.key}
            earnedAt={earnedMap.get(badge.key)}
            locked={!earnedKeys.has(badge.key)}
          />
        ))}
      </div>
    </div>
  );
}
