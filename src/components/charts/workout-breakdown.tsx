'use client';

import { useMemo } from 'react';
import { getWorkoutColor } from '@/lib/constants';
import type { Workout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';

interface WorkoutBreakdownProps {
  workouts: Workout[];
  label?: string;
}

export function WorkoutBreakdown({ workouts, label }: WorkoutBreakdownProps) {
  const breakdown = useMemo(() => {
    const totals: Record<string, { count: number; minutes: number; type: WorkoutType }> = {};
    let totalMinutes = 0;

    for (const w of workouts) {
      if (!totals[w.name]) totals[w.name] = { count: 0, minutes: 0, type: w.type as WorkoutType };
      totals[w.name].count++;
      totals[w.name].minutes += w.duration_minutes;
      totalMinutes += w.duration_minutes;
    }

    return Object.entries(totals)
      .map(([name, data]) => ({
        name,
        ...data,
        pct: totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [workouts]);

  const totalMinutes = workouts.reduce((s, w) => s + w.duration_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  if (workouts.length === 0) {
    return <div className="text-center text-sm py-4" style={{ color: 'var(--fg-muted)' }}>No workouts</div>;
  }

  return (
    <div className="space-y-4">
      {label && <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>{label}</div>}

      {/* Stacked percentage bar */}
      <div className="flex h-4 rounded-full overflow-hidden">
        {breakdown.map((b) => (
          <div
            key={b.name}
            style={{
              width: `${b.pct}%`,
              backgroundColor: getWorkoutColor(b.name, b.type),
            }}
            className="transition-all duration-500"
            title={`${b.name}: ${b.pct}%`}
          />
        ))}
      </div>

      {/* Total */}
      <div className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
        {totalHours > 0 && <span className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{totalHours}</span>}
        {totalHours > 0 && <span style={{ color: 'var(--fg-muted)' }}>h </span>}
        <span className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{remainingMins}</span>
        <span style={{ color: 'var(--fg-muted)' }}>m total</span>
        <span className="mx-2" style={{ color: 'var(--fg-muted)' }}>·</span>
        <span>{workouts.length} sessions</span>
      </div>

      {/* Activity rows */}
      <div className="space-y-2">
        {breakdown.map((b) => (
          <div key={b.name} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getWorkoutColor(b.name, b.type) }} />
            <span className="text-sm flex-1" style={{ color: 'var(--fg-secondary)' }}>{b.name}</span>
            <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--fg)' }}>{b.pct}%</span>
            <span className="text-xs tabular-nums w-16 text-right" style={{ color: 'var(--fg-muted)' }}>
              {b.count} × {Math.round(b.minutes / b.count)}m
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
