'use client';

import { useMemo } from 'react';
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants';
import type { Workout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';

interface WorkoutBreakdownProps {
  workouts: Workout[];
  label?: string;
}

export function WorkoutBreakdown({ workouts, label }: WorkoutBreakdownProps) {
  const breakdown = useMemo(() => {
    const totals: Record<string, { count: number; minutes: number }> = {};
    let totalMinutes = 0;

    for (const w of workouts) {
      if (!totals[w.type]) totals[w.type] = { count: 0, minutes: 0 };
      totals[w.type].count++;
      totals[w.type].minutes += w.duration_minutes;
      totalMinutes += w.duration_minutes;
    }

    return Object.entries(totals)
      .map(([type, data]) => ({
        type: type as WorkoutType,
        ...data,
        pct: totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [workouts]);

  const totalMinutes = workouts.reduce((s, w) => s + w.duration_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  if (workouts.length === 0) {
    return <div className="text-center text-gray-500 text-sm py-4">No workouts</div>;
  }

  return (
    <div className="space-y-4">
      {label && <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>}

      {/* Stacked percentage bar */}
      <div className="flex h-4 rounded-full overflow-hidden">
        {breakdown.map((b) => (
          <div
            key={b.type}
            style={{
              width: `${b.pct}%`,
              backgroundColor: WORKOUT_TYPE_COLORS[b.type],
            }}
            className="transition-all duration-500"
            title={`${WORKOUT_TYPE_LABELS[b.type]}: ${b.pct}%`}
          />
        ))}
      </div>

      {/* Total */}
      <div className="text-sm text-gray-400">
        {totalHours > 0 && <span className="text-lg font-bold text-gray-100">{totalHours}</span>}
        {totalHours > 0 && <span className="text-gray-500">h </span>}
        <span className="text-lg font-bold text-gray-100">{remainingMins}</span>
        <span className="text-gray-500">m total</span>
        <span className="text-gray-600 mx-2">·</span>
        <span>{workouts.length} sessions</span>
      </div>

      {/* Type rows */}
      <div className="space-y-2">
        {breakdown.map((b) => (
          <div key={b.type} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: WORKOUT_TYPE_COLORS[b.type] }} />
            <span className="text-sm text-gray-300 flex-1">{WORKOUT_TYPE_LABELS[b.type]}</span>
            <span className="text-sm font-medium text-gray-200 tabular-nums">{b.pct}%</span>
            <span className="text-xs text-gray-500 tabular-nums w-16 text-right">
              {b.count} × {Math.round(b.minutes / b.count)}m
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
