'use client';

import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TargetRing } from '@/components/charts/target-ring';
import type { WeeklyProgress, WeeklyStreakInfo } from '@/lib/types';

interface WeeklyOverviewProps {
  progress: WeeklyProgress;
  weeklyStreak: WeeklyStreakInfo;
}

export function WeeklyOverview({ progress, weeklyStreak }: WeeklyOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-around">
          <TargetRing
            value={progress.workouts}
            target={progress.targets.workouts}
            label="Workouts"
            color="var(--accent)"
          />
          <TargetRing
            value={progress.cardioMinutes}
            target={progress.targets.cardioMinutes}
            label="Cardio (min)"
            color="#00bcd4"
          />
          <TargetRing
            value={progress.strengthSessions}
            target={progress.targets.strengthSessions}
            label="Strength"
            color="#8b5cf6"
          />
          <TargetRing
            value={progress.steps}
            target={progress.targets.steps}
            label="Steps"
            color="#ff6b35"
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            formatTarget={(t) => t >= 1000 ? `${(t / 1000).toFixed(0)}k` : String(t)}
          />
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Perfect weeks</span>
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
              {weeklyStreak.current} {weeklyStreak.current === 1 ? 'week' : 'weeks'}
            </span>
          </div>

          {weeklyStreak.history.length === 0 ? (
            <p className="text-xs text-center py-1" style={{ color: 'var(--fg-muted)' }}>
              Complete all goals in a week to start a streak
            </p>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-1">
                {weeklyStreak.history.map((week) => (
                  <div
                    key={week.weekStart}
                    title={`Week of ${week.weekStart}`}
                    className="h-3.5 rounded-sm"
                    style={{ background: week.perfect ? 'var(--accent)' : 'var(--bg-elevated)' }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>12w ago</span>
                <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>1w ago</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
