'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { getStrainColor, getStrainLabel, getWorkoutColor } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { Clock, Flame, Activity, Heart, ChevronRight, Footprints } from 'lucide-react';
import type { Workout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';

export function WorkoutCard({ workout, isPassive }: { workout: Workout; isPassive?: boolean }) {
  return (
    <Link href={`/workouts/${workout.id}`}>
      <Card
        className={`transition-colors cursor-pointer overflow-hidden${isPassive ? ' opacity-70' : ''}`}
        style={{ borderLeftColor: getWorkoutColor(workout.name, workout.type as WorkoutType), borderLeftWidth: '3px' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold truncate" style={{ color: 'var(--fg)' }}>{workout.name}</h3>
              {isPassive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#00bcd4]/10 text-[#00bcd4] leading-none">Active Time</span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
              {format(parseISO(workout.started_at), 'MMM d, yyyy · h:mm a')}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                {isPassive ? <Footprints className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                {workout.duration_minutes}m
              </span>
              {workout.source === 'manual' && (
                <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                  <Activity className="h-3.5 w-3.5" />
                  RPE {workout.perceived_effort}
                </span>
              )}
              {workout.source === 'apple_health' && workout.avg_heart_rate && (
                <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                  <Heart className="h-3.5 w-3.5 text-[#ff3b5c]" />
                  {workout.avg_heart_rate} bpm
                </span>
              )}
              {workout.calories && (
                <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                  <Flame className="h-3.5 w-3.5" />
                  {workout.calories} kcal
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums" style={{ color: getStrainColor(workout.strain_score) }}>
                {workout.strain_score.toFixed(1)}
              </div>
              <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{getStrainLabel(workout.strain_score)}</div>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: 'var(--fg-muted)' }} />
          </div>
        </div>
      </Card>
    </Link>
  );
}
