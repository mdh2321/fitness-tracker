'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StrainRing } from '@/components/charts/strain-ring';
import { Activity, Dumbbell, Footprints, Moon } from 'lucide-react';

interface TodayCardProps {
  strain: number;
  workouts: number;
  duration: number;
  calories: number;
  steps: number;
  sleepHours: number | null;
}

export function TodayCard({ strain, workouts, duration, steps, sleepHours }: TodayCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg)' }}>Today</h2>
        <div className="flex items-center gap-10">
          <StrainRing value={strain} />
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                <Dumbbell className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                <span className="text-xs">Workouts</span>
              </div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{workouts}</div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                <Activity className="h-4 w-4" style={{ color: '#00bcd4' }} />
                <span className="text-xs">Active Time</span>
              </div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{duration}<span className="text-sm font-normal" style={{ color: 'var(--fg-muted)' }}>min</span></div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                <Footprints className="h-4 w-4" style={{ color: '#ff6b35' }} />
                <span className="text-xs">Steps</span>
              </div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{(steps ?? 0).toLocaleString()}</div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                <Moon className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                <span className="text-xs">Sleep</span>
              </div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                {sleepHours != null ? sleepHours : '--'}
                <span className="text-sm font-normal" style={{ color: 'var(--fg-muted)' }}>hrs</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
