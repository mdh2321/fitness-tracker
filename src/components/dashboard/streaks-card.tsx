'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays } from 'date-fns';
import { Flame, Dumbbell, Moon, Salad, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StreakType {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  current: number;
  longest: number;
  qualifyingDates: Set<string>;
}

export interface StreaksCardProps {
  workoutStreak: { current: number; longest: number };
  exerciseStreak: { current: number; longest: number };
  sleepStreak: { current: number; longest: number };
  nutritionStreak: { current: number; longest: number };
  workoutDates: string[];
  exerciseQualifyingDates: string[];
  sleepQualifyingDates: string[];
  nutritionQualifyingDates: string[];
  dailyTargets?: {
    activeMinutes: number;
    sleepMinutes: number;
    nutritionScore: number;
    steps: number;
    strain: number;
  };
}

function StreakTile({ streak }: { streak: StreakType }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const last14 = Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), 13 - i), 'yyyy-MM-dd'));

  return (
    <div
      className="relative rounded-xl border p-4 overflow-hidden"
      style={{ borderColor: `color-mix(in srgb, ${streak.color} 20%, var(--border))`, background: 'var(--bg-card)' }}
    >
      {/* Subtle gradient accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${streak.color} 6%, transparent), transparent)` }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <streak.icon className="h-4 w-4" style={{ color: streak.color }} />
          <span className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>{streak.label}</span>
        </div>

        {/* Current & Best side by side */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--fg-muted)' }}>Current</div>
            <div className="text-4xl font-bold tabular-nums leading-none" style={{ color: streak.color }}>
              {streak.current}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end mb-0.5">
              <Trophy className="h-3 w-3" style={{ color: '#fbbf24' }} />
              <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>Best</span>
            </div>
            <div className="text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--fg)' }}>
              {streak.longest}
            </div>
          </div>
        </div>

        {/* 14-day dot history */}
        <div className="flex gap-1">
          {last14.map((date) => {
            const qualified = streak.qualifyingDates.has(date);
            const isFuture = date > today;
            return (
              <div
                key={date}
                className="h-2 flex-1 rounded-full"
                title={date}
                style={{
                  background: isFuture
                    ? 'var(--bg-elevated)'
                    : qualified
                      ? streak.color
                      : 'var(--bg-elevated)',
                  opacity: isFuture ? 0.3 : qualified ? 1 : 0.5,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function StreaksCard({
  workoutStreak,
  exerciseStreak,
  sleepStreak,
  nutritionStreak,
  workoutDates,
  exerciseQualifyingDates,
  sleepQualifyingDates,
  nutritionQualifyingDates,
  dailyTargets,
}: StreaksCardProps) {
  const activeLabel = `Active Time (${dailyTargets?.activeMinutes ?? 30}m+)`;
  const sleepLabel = `Sleep (${Math.round((dailyTargets?.sleepMinutes ?? 420) / 60)}h+)`;
  const nutritionLabel = `Nutrition (${dailyTargets?.nutritionScore ?? 14}+)`;

  const streaks: StreakType[] = useMemo(() => [
    {
      key: 'workout',
      label: 'Workout',
      icon: Flame,
      color: '#ff6b35',
      current: workoutStreak.current,
      longest: workoutStreak.longest,
      qualifyingDates: new Set(workoutDates),
    },
    {
      key: 'exercise',
      label: activeLabel,
      icon: Dumbbell,
      color: '#8b5cf6',
      current: exerciseStreak.current,
      longest: exerciseStreak.longest,
      qualifyingDates: new Set(exerciseQualifyingDates),
    },
    {
      key: 'sleep',
      label: sleepLabel,
      icon: Moon,
      color: '#00bcd4',
      current: sleepStreak.current,
      longest: sleepStreak.longest,
      qualifyingDates: new Set(sleepQualifyingDates),
    },
    {
      key: 'nutrition',
      label: nutritionLabel,
      icon: Salad,
      color: 'var(--accent)',
      current: nutritionStreak.current,
      longest: nutritionStreak.longest,
      qualifyingDates: new Set(nutritionQualifyingDates),
    },
  ], [workoutStreak, exerciseStreak, sleepStreak, nutritionStreak, workoutDates, exerciseQualifyingDates, sleepQualifyingDates, nutritionQualifyingDates, activeLabel, sleepLabel, nutritionLabel]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Streaks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {streaks.map((s) => (
            <StreakTile key={s.key} streak={s} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
