'use client';

import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { DayCell, type DayCellData } from './day-cell';
import type { Workout, DailyStrain } from '@/lib/types';

interface MonthGridProps {
  month: Date;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  workouts: Workout[];
  strainData: DailyStrain[];
  nutritionScores: Record<string, number | null>;
  sleepData?: Record<string, number | null>;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthGrid({
  month,
  selectedDate,
  onSelectDate,
  workouts,
  strainData,
  nutritionScores,
  sleepData,
}: MonthGridProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    // Build lookup maps
    const strainMap = new Map(strainData.map((d) => [d.date, d]));
    const workoutsByDate = new Map<string, { name: string; type: string }[]>();
    for (const w of workouts) {
      const d = w.local_date || format(new Date(w.started_at), 'yyyy-MM-dd');
      if (!workoutsByDate.has(d)) workoutsByDate.set(d, []);
      workoutsByDate.get(d)!.push({ name: w.name, type: w.type });
    }

    const result: DayCellData[] = [];
    let current = calStart;
    while (current <= calEnd) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const strain = strainMap.get(dateStr);
      result.push({
        date: dateStr,
        strain: strain?.strain_score ?? 0,
        workouts: workoutsByDate.get(dateStr) || [],
        nutritionScore: nutritionScores[dateStr] ?? null,
        sleepMinutes: sleepData?.[dateStr] ?? null,
        isToday: dateStr === today,
        isCurrentMonth: isSameMonth(current, month),
      });
      current = addDays(current, 1);
    }
    return result;
  }, [month, workouts, strainData, nutritionScores, sleepData, today]);

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium py-1" style={{ color: 'var(--fg-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <DayCell
            key={day.date}
            data={day}
            selected={selectedDate === day.date}
            onClick={() => onSelectDate(day.date)}
          />
        ))}
      </div>
    </div>
  );
}
