'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { getStrainColor } from '@/lib/constants';
import type { Workout } from '@/lib/types';

interface RecentWorkoutsProps {
  workouts: Workout[];
}

const WORKOUT_EMOJI: Record<string, string> = {
  'Walking': '🚶',
  'Running': '🏃',
  'Rowing': '🚣',
  'Cycling': '🚴',
  'Swimming': '🏊',
  'Strength Training': '🏋️',
  'Functional Strength': '🏋️',
  'HIIT': '⚡',
  'Yoga': '🧘',
  'Pilates': '🤸',
  'Hiking': '🥾',
  'Boxing': '🥊',
  'Basketball': '🏀',
};

function workoutEmoji(name: string): string {
  return WORKOUT_EMOJI[name] ?? '💪';
}

function formatDay(w: Workout): string {
  const date = w.local_date ? parseISO(w.local_date) : parseISO(w.started_at);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

function details(w: Workout): string {
  const parts = [formatDay(w), `${w.duration_minutes}m`];
  if (w.calories) parts.push(`${w.calories} kcal`);
  if (w.distance_km) parts.push(`${w.distance_km.toFixed(1)} km`);
  else if (w.avg_heart_rate) parts.push(`avg HR ${w.avg_heart_rate}`);
  return parts.join(' · ');
}

export function RecentWorkouts({ workouts }: RecentWorkoutsProps) {
  const recent = workouts.slice(0, 6);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="tile-label">Recent</span>
        <Link href="/workouts" className="text-xs font-medium hover:underline" style={{ color: 'var(--accent)' }}>
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-10 mt-1.5">
        {recent.length === 0 ? (
          <p className="text-xs py-3" style={{ color: 'var(--fg-muted)' }}>No workouts yet</p>
        ) : (
          recent.map((w, i) => {
            const color = getStrainColor(w.strain_score);
            const lastRow = i >= recent.length - 2;
            return (
              <Link
                key={w.id}
                href={`/workouts/${w.id}`}
                className="flex items-center gap-3 py-2.5 hover:brightness-125 transition-all"
                style={!lastRow ? { borderBottom: '1px solid var(--border)' } : {}}
              >
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-[9px] text-sm"
                  style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                >
                  {workoutEmoji(w.name)}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--fg)' }}>{w.name}</div>
                  <div className="text-[11.5px] truncate" style={{ color: 'var(--fg-muted)' }}>{details(w)}</div>
                </div>
                <span
                  className="ml-auto font-display text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums"
                  style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
                >
                  {w.strain_score.toFixed(1)}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}
