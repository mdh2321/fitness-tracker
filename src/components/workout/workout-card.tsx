'use client';

import Link from 'next/link';
import { getStrainColor, getWorkoutColor } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { Clock, Flame, Heart, ChevronRight, Footprints, Route } from 'lucide-react';
import type { Workout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';

export function WorkoutCard({ workout }: { workout: Workout }) {
  const color = getWorkoutColor(workout.name, workout.type as WorkoutType);
  const isWalking = workout.name === 'Walking';

  return (
    <Link href={`/workouts/${workout.id}`}>
      <div
        className="flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors cursor-pointer group"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Color dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />

        {/* Name + date */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
              {workout.name}
            </span>
            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              {format(parseISO(workout.started_at), 'MMM d · h:mm a')}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
              {isWalking ? <Footprints className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {workout.duration_minutes}m
            </span>
            {workout.avg_heart_rate && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                <Heart className="h-3 w-3" />
                {workout.avg_heart_rate}
              </span>
            )}
            {workout.distance_km != null && workout.distance_km > 0 && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                <Route className="h-3 w-3" />
                {workout.distance_km.toFixed(2)} km
              </span>
            )}
            {workout.distance_km != null && workout.distance_km > 0 && workout.duration_minutes > 0 && (
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                {(() => {
                  const pace = workout.duration_minutes / workout.distance_km!;
                  const mins = Math.floor(pace);
                  const secs = Math.round((pace - mins) * 60);
                  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
                })()}
              </span>
            )}
            {workout.calories != null && workout.calories > 0 && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                <Flame className="h-3 w-3" />
                {workout.calories}
              </span>
            )}
          </div>
        </div>

        {/* Strain + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: getStrainColor(workout.strain_score) }}
          >
            {workout.strain_score.toFixed(1)}
          </span>
          <ChevronRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            style={{ color: 'var(--fg-muted)' }}
          />
        </div>
      </div>
    </Link>
  );
}
