'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isAfter, getDaysInMonth, startOfMonth, addDays, addMonths, subMonths, parseISO } from 'date-fns';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkoutCalendarCardProps {
  workoutDates: string[];
}

export function WorkoutCalendarCard({ workoutDates }: WorkoutCalendarCardProps) {
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
        <div className="flex items-center justify-between">
          <CardTitle>Workout Calendar</CardTitle>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="p-1 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
              style={{ color: 'var(--fg-muted)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs min-w-[100px] text-center" style={{ color: 'var(--fg-secondary)' }}>
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
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
