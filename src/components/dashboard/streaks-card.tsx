'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, getDaysInMonth, startOfMonth, addDays, addMonths, subMonths, isAfter, parseISO } from 'date-fns';
import { Flame, Dumbbell, Moon, Salad, Trophy, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

function StreakCalendarModal({ streak, onClose }: { streak: StreakType; onClose: () => void }) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(today));

  const monthDays = useMemo(() => {
    const days = getDaysInMonth(selectedMonth);
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = format(addDays(selectedMonth, i), 'yyyy-MM-dd');
      result.push({ date, qualified: streak.qualifyingDates.has(date) });
    }
    return result;
  }, [selectedMonth, streak.qualifyingDates]);

  const canGoNext = selectedMonth < startOfMonth(today);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {/* Modal */}
      <div
        className="relative rounded-2xl border p-5 w-[340px] max-w-[90vw] shadow-2xl"
        style={{
          background: 'var(--bg-card)',
          borderColor: `color-mix(in srgb, ${streak.color} 30%, var(--border))`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <streak.icon className="h-4 w-4" style={{ color: streak.color }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{streak.label}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
            style={{ color: 'var(--fg-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            className="p-1 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
            style={{ color: 'var(--fg-muted)' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>
            {format(selectedMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            disabled={!canGoNext}
            className="p-1 rounded-md hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ color: 'var(--fg-muted)' }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((day) => {
            const isFuture = isAfter(parseISO(day.date), today);
            return (
              <div key={day.date} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] ${
                    isFuture ? 'opacity-25' : ''
                  }`}
                  style={
                    day.qualified && !isFuture
                      ? { background: `color-mix(in srgb, ${streak.color} 15%, transparent)`, border: `2px solid color-mix(in srgb, ${streak.color} 70%, transparent)` }
                      : { background: 'var(--bg-elevated)', border: '1px solid var(--border)' }
                  }
                >
                  {isFuture ? (
                    <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>{format(parseISO(day.date), 'd')}</span>
                  ) : day.qualified ? (
                    <Check className="h-3.5 w-3.5" style={{ color: streak.color }} />
                  ) : (
                    <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>{format(parseISO(day.date), 'd')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StreakTile({ streak, onClick }: { streak: StreakType; onClick: () => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const last14 = Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), 13 - i), 'yyyy-MM-dd'));

  return (
    <div
      className="relative rounded-xl border p-4 overflow-hidden cursor-pointer hover:brightness-110 transition-all"
      style={{ borderColor: `color-mix(in srgb, ${streak.color} 20%, var(--border))`, background: 'var(--bg-card)' }}
      onClick={onClick}
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
  const [openStreakKey, setOpenStreakKey] = useState<string | null>(null);
  const closeModal = useCallback(() => setOpenStreakKey(null), []);

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
      color: '#00d26a',
      current: nutritionStreak.current,
      longest: nutritionStreak.longest,
      qualifyingDates: new Set(nutritionQualifyingDates),
    },
  ], [workoutStreak, exerciseStreak, sleepStreak, nutritionStreak, workoutDates, exerciseQualifyingDates, sleepQualifyingDates, nutritionQualifyingDates, activeLabel, sleepLabel, nutritionLabel]);

  const openStreak = openStreakKey ? streaks.find((s) => s.key === openStreakKey) : null;

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Streaks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {streaks.map((s) => (
              <StreakTile key={s.key} streak={s} onClick={() => setOpenStreakKey(s.key)} />
            ))}
          </div>
        </CardContent>
      </Card>
      {openStreak && <StreakCalendarModal streak={openStreak} onClose={closeModal} />}
    </>
  );
}
