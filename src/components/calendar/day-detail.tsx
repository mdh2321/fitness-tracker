'use client';

import { getWorkoutColor, getStrainColor, getStrainLabel, getSleepColor, getSleepLabel } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import type { Workout } from '@/lib/types';

interface DayDetailProps {
  date: string;
  workouts: Workout[];
  strain: number;
  nutritionScore: number | null;
  sleepMinutes?: number | null;
}

export function DayDetail({ date, workouts, strain, nutritionScore, sleepMinutes }: DayDetailProps) {
  const formattedDate = format(parseISO(date), 'EEEE, MMMM d');
  const hasData = workouts.length > 0 || strain > 0 || (sleepMinutes != null && sleepMinutes > 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>{formattedDate}</h3>

      {/* Strain */}
      {strain > 0 && (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: getStrainColor(strain) }}
          >
            {strain.toFixed(1)}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Daily Strain</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{getStrainLabel(strain)}</p>
          </div>
        </div>
      )}

      {/* Nutrition */}
      {nutritionScore !== null && (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{
              background: nutritionScore >= 14 ? '#00d26a' : nutritionScore >= 7 ? '#ff6b35' : '#ff3b5c',
            }}
          >
            {Math.round(nutritionScore)}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Nutrition Score</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>out of 21</p>
          </div>
        </div>
      )}

      {/* Sleep */}
      {sleepMinutes != null && sleepMinutes > 0 && (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: getSleepColor(sleepMinutes) }}
          >
            {Math.round(sleepMinutes / 60 * 10) / 10}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Sleep</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              {Math.floor(sleepMinutes / 60)}h {sleepMinutes % 60}m · {getSleepLabel(sleepMinutes)}
            </p>
          </div>
        </div>
      )}

      {/* Workouts */}
      {workouts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--fg-muted)' }}>
            Workouts ({workouts.length})
          </h4>
          <div className="space-y-1.5">
            {workouts.map((w) => (
              <div key={w.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: getWorkoutColor(w.name, w.type) }}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{w.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasData && (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--fg-muted)' }}>No activity recorded</p>
      )}
    </div>
  );
}
