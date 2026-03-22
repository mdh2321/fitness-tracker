'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StrainRing } from '@/components/charts/strain-ring';
import { Activity, Dumbbell, Flame, Footprints } from 'lucide-react';

interface TodayCardProps {
  strain: number;
  workouts: number;
  duration: number;
  calories: number;
  steps: number;
}

export function TodayCard({ strain, workouts, duration, calories, steps }: TodayCardProps) {
  const metrics = [
    {
      icon: Dumbbell,
      label: 'Workouts',
      value: `${workouts}`,
      unit: undefined,
      color: '#8b5cf6',
    },
    {
      icon: Activity,
      label: 'Active Time',
      value: `${duration}`,
      unit: 'min',
      color: '#00bcd4',
    },
    {
      icon: Flame,
      label: 'Calories',
      value: calories.toLocaleString(),
      unit: undefined,
      color: '#ff6b35',
    },
    {
      icon: Footprints,
      label: 'Steps',
      value: (steps ?? 0).toLocaleString(),
      unit: undefined,
      color: 'var(--accent)',
    },
  ];

  return (
    <Card className="relative overflow-hidden">
      <CardContent>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg)' }}>Today</h2>
        <div className="flex items-center gap-10">
          <StrainRing value={strain} />
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-5">
            {metrics.map((m) => (
              <div key={m.label} className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <m.icon className="h-4 w-4" style={{ color: m.color }} />
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{m.label}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                  {m.value}
                  {m.unit && (
                    <span className="text-sm font-normal" style={{ color: 'var(--fg-muted)' }}>{m.unit}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
