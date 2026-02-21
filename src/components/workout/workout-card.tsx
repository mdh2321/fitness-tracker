'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WORKOUT_TYPE_LABELS, getStrainColor, getStrainLabel } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { Clock, Flame, Activity, Heart, ChevronRight } from 'lucide-react';
import type { Workout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';

export function WorkoutCard({ workout }: { workout: Workout }) {
  return (
    <Link href={`/workouts/${workout.id}`}>
      <Card className="hover:border-[#3a3a45] transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-100 truncate">{workout.name}</h3>
              <Badge variant={workout.type as WorkoutType}>
                {WORKOUT_TYPE_LABELS[workout.type as WorkoutType]}
              </Badge>
            </div>
            <p className="text-sm text-gray-400">
              {format(parseISO(workout.started_at), 'MMM d, yyyy · h:mm a')}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                {workout.duration_minutes}m
              </span>
              {workout.source === 'manual' && (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <Activity className="h-3.5 w-3.5" />
                  RPE {workout.perceived_effort}
                </span>
              )}
              {workout.source === 'apple_health' && workout.avg_heart_rate && (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <Heart className="h-3.5 w-3.5 text-[#ff3b5c]" />
                  {workout.avg_heart_rate} bpm
                </span>
              )}
              {workout.calories && (
                <span className="flex items-center gap-1 text-sm text-gray-400">
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
              <div className="text-xs text-gray-500">{getStrainLabel(workout.strain_score)}</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
