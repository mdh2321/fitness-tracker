'use client';

import { useState, useMemo } from 'react';
import { useAchievements } from '@/hooks/use-stats';
import { BadgeCard } from '@/components/achievements/badge-card';
import { BADGES } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Trophy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AchievementsPage() {
  const { data: earned, progress, isLoading, mutate } = useAchievements();
  const [recalculating, setRecalculating] = useState(false);

  const earnedKeys = new Set((earned || []).map((a) => a.badge_key));
  const earnedMap = new Map((earned || []).map((a) => [a.badge_key, a.earned_at]));
  const progressMap = new Map((progress || []).map((p) => [p.badge_key, p]));

  // "Almost There" — top 3 locked badges closest to unlocking (by %)
  const almostThere = useMemo(() => {
    if (!progress) return [];
    return progress
      .filter((p) => !earnedKeys.has(p.badge_key) && p.current > 0 && p.target > 0)
      .map((p) => ({ ...p, pct: p.current / p.target }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
  }, [progress, earnedKeys]);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const res = await fetch('/api/achievements', { method: 'POST' });
      const data = await res.json();
      await mutate();
      const count = data.newBadges?.length ?? 0;
      toast.success(count > 0 ? `Unlocked ${count} new achievement${count > 1 ? 's' : ''}!` : 'All achievements up to date');
    } catch {
      toast.error('Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  }

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
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
            {earnedKeys.size} / {BADGES.length} earned
          </span>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
            style={{ color: 'var(--fg-secondary)', borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
          >
            <RefreshCw className={`h-3 w-3 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Checking…' : 'Recalculate'}
          </button>
        </div>
      </div>

      {/* Almost There */}
      {almostThere.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fg-secondary)' }}>
            <Trophy className="h-4 w-4 text-[#00d26a]" />
            Almost There
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {almostThere.map((p) => (
              <BadgeCard
                key={p.badge_key}
                badgeKey={p.badge_key}
                compact
                progress={{ current: p.current, target: p.target }}
              />
            ))}
          </div>
        </div>
      )}

      {earnedKeys.size === 0 && almostThere.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p style={{ color: 'var(--fg-secondary)' }}>Complete workouts to earn badges!</p>
        </div>
      )}

      {/* All Badges Grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-secondary)' }}>All Badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {BADGES.map((badge) => (
            <BadgeCard
              key={badge.key}
              badgeKey={badge.key}
              earnedAt={earnedMap.get(badge.key)}
              locked={!earnedKeys.has(badge.key)}
              progress={progressMap.get(badge.key)}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
