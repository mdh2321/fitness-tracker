'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isAfter, getDaysInMonth, startOfMonth, addDays, addMonths, subMonths, parseISO } from 'date-fns';
import { Check, Trophy, Flame, ChevronLeft, ChevronRight } from 'lucide-react';

interface StreaksCardProps {
  exerciseStreak: { current: number; longest: number };
  workoutStreak: { current: number; longest: number };
  workoutDates: string[];
}

export function StreaksCard({ exerciseStreak, workoutStreak, workoutDates }: StreaksCardProps) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(today));

  const workoutDateSet = useMemo(() => new Set(workoutDates), [workoutDates]);

  const monthDays = useMemo(() => {
    const days = getDaysInMonth(selectedMonth);
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = format(addDays(selectedMonth, i), 'yyyy-MM-dd');
      result.push({ date, hasWorkout: workoutDateSet.has(date) });
    }
    return result;
  }, [selectedMonth, workoutDateSet]);

  const canGoNext = selectedMonth < startOfMonth(today);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Streaks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current & Best */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current streak */}
          <div className="relative rounded-xl border border-[#ff6b35]/20 bg-gradient-to-b from-[#ff6b35]/8 to-transparent p-5 text-center overflow-hidden">
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-[#ff6b35]/10 pointer-events-none" />
            <Flame className="h-5 w-5 text-[#ff6b35] mx-auto mb-3" />
            <div className="text-4xl font-bold tabular-nums text-[#ff6b35] leading-none">
              {workoutStreak.current}
            </div>
            <div className="text-[11px] text-[#ff6b35]/60 mt-1.5 uppercase tracking-widest font-medium">
              day streak
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--fg-muted)' }}>Current</div>
          </div>

          {/* Best streak */}
          <div className="relative rounded-xl border border-[#fbbf24]/20 bg-gradient-to-b from-[#fbbf24]/8 to-transparent p-5 text-center overflow-hidden">
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-[#fbbf24]/10 pointer-events-none" />
            <Trophy className="h-5 w-5 text-[#fbbf24] mx-auto mb-3" />
            <div className="text-4xl font-bold tabular-nums leading-none" style={{ color: 'var(--fg)' }}>
              {workoutStreak.longest}
            </div>
            <div className="text-[11px] text-[#fbbf24]/60 mt-1.5 uppercase tracking-widest font-medium">
              day streak
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--fg-muted)' }}>Best</div>
          </div>
        </div>

        {/* Month view */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                className="p-1 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
                style={{ color: 'var(--fg-muted)' }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                disabled={!canGoNext}
                className="p-1 rounded-md hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ color: 'var(--fg-muted)' }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day) => {
              const isFuture = isAfter(parseISO(day.date), today);
              return (
                <div key={day.date} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] ${
                      isFuture ? 'opacity-25' : ''
                    } ${day.hasWorkout && !isFuture ? 'bg-[#ff6b35]/15 border-2 border-[#ff6b35]/70' : ''}`}
                    style={!day.hasWorkout || isFuture ? { background: 'var(--bg-elevated)', border: '1px solid var(--border)' } : {}}
                  >
                    {isFuture ? (
                      <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>{format(parseISO(day.date), 'd')}</span>
                    ) : day.hasWorkout ? (
                      <Check className="h-3.5 w-3.5 text-[#ff6b35]" />
                    ) : (
                      <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>{format(parseISO(day.date), 'd')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
