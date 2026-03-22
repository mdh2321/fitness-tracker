'use client';

import { useMemo } from 'react';
import {
  format,
  startOfWeek,
  addDays,
} from 'date-fns';
import { getStrainColor, getWorkoutColor, getSleepColor } from '@/lib/constants';
import { Zap, Moon, Salad } from 'lucide-react';
import { getWorkoutIcon } from './workout-icons';
import type { Workout, DailyStrain } from '@/lib/types';

interface WeekGridProps {
  weekStart: Date;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  workouts: Workout[];
  strainData: DailyStrain[];
  nutritionScores: Record<string, number | null>;
  sleepData: Record<string, number | null>;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getNutritionColor(score: number): string {
  if (score >= 14) return '#00d26a';
  if (score >= 7) return '#ff6b35';
  return '#ff3b5c';
}

export function WeekGrid({
  weekStart,
  selectedDate,
  onSelectDate,
  workouts,
  strainData,
  nutritionScores,
  sleepData,
}: WeekGridProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const days = useMemo(() => {
    const ws = startOfWeek(weekStart, { weekStartsOn: 1 });
    const strainMap = new Map(strainData.map((d) => [d.date, d]));
    const workoutsByDate = new Map<string, Workout[]>();
    for (const w of workouts) {
      const d = w.local_date || format(new Date(w.started_at), 'yyyy-MM-dd');
      if (!workoutsByDate.has(d)) workoutsByDate.set(d, []);
      workoutsByDate.get(d)!.push(w);
    }

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(ws, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const strain = strainMap.get(dateStr);
      const dayWorkouts = workoutsByDate.get(dateStr) || [];
      return {
        dateStr,
        day: format(date, 'd'),
        weekday: WEEKDAYS[i],
        isToday: dateStr === today,
        strain: strain?.strain_score ?? 0,
        workouts: dayWorkouts,
        nutritionScore: nutritionScores[dateStr] ?? null,
        sleepMinutes: sleepData[dateStr] ?? null,
      };
    });
  }, [weekStart, workouts, strainData, nutritionScores, sleepData, today]);

  const ScoreCircle = ({ value, bg, empty }: { value: string; bg: string; empty?: boolean }) => (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold"
      style={empty
        ? { background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }
        : { background: bg, color: 'white' }
      }
    >
      {value}
    </div>
  );

  return (
    <div>
      {/* Header row: label column + 7 day columns */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: '28px repeat(7, 1fr)' }}>
        {/* Empty label cell */}
        <div />
        {/* Day headers */}
        {days.map((day) => {
          const selected = selectedDate === day.dateStr;
          return (
            <button
              key={`hdr-${day.dateStr}`}
              onClick={() => onSelectDate(day.dateStr)}
              className="flex flex-col items-center py-1.5 rounded-lg transition-colors"
              style={{
                background: selected ? 'var(--bg-elevated)' : 'transparent',
              }}
            >
              <span className="text-[10px] font-medium" style={{ color: 'var(--fg-muted)' }}>
                {day.weekday}
              </span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: day.isToday ? '#00d26a' : 'var(--fg)' }}
              >
                {day.day}
              </span>
            </button>
          );
        })}

        {/* Strain row */}
        <div className="flex items-center justify-center">
          <Zap className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        </div>
        {days.map((day) => (
          <div key={`strain-${day.dateStr}`} className="flex items-center justify-center py-1">
            <ScoreCircle
              value={day.strain > 0 ? day.strain.toFixed(1) : '—'}
              bg={getStrainColor(day.strain)}
              empty={day.strain <= 0}
            />
          </div>
        ))}

        {/* Sleep row */}
        <div className="flex items-center justify-center">
          <Moon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        </div>
        {days.map((day) => {
          const sleepHours = day.sleepMinutes != null ? day.sleepMinutes / 60 : null;
          const hasData = sleepHours != null && sleepHours > 0;
          return (
            <div key={`sleep-${day.dateStr}`} className="flex items-center justify-center py-1">
              <ScoreCircle
                value={hasData ? sleepHours!.toFixed(1) : '—'}
                bg={hasData ? getSleepColor(day.sleepMinutes!) : ''}
                empty={!hasData}
              />
            </div>
          );
        })}

        {/* Nutrition row */}
        <div className="flex items-center justify-center">
          <Salad className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        </div>
        {days.map((day) => {
          const hasData = day.nutritionScore != null;
          return (
            <div key={`nutr-${day.dateStr}`} className="flex items-center justify-center py-1">
              <ScoreCircle
                value={hasData ? String(Math.round(day.nutritionScore!)) : '—'}
                bg={hasData ? getNutritionColor(day.nutritionScore!) : ''}
                empty={!hasData}
              />
            </div>
          );
        })}

        {/* Workout row */}
        <div />
        {days.map((day) => (
          <div key={`wk-${day.dateStr}`} className="flex items-center justify-center py-1">
            {day.workouts.length > 0 ? (
              <div className="flex flex-wrap gap-1 justify-center">
                {day.workouts.slice(0, 3).map((w, i) => {
                  const Icon = getWorkoutIcon(w.name);
                  const color = getWorkoutColor(w.name, w.type);
                  return (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: `${color}20` }}
                      title={`${w.name} · ${w.duration_minutes}m`}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                  );
                })}
                {day.workouts.length > 3 && (
                  <span className="text-[8px] self-center" style={{ color: 'var(--fg-muted)' }}>
                    +{day.workouts.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[9px]" style={{ color: 'var(--fg-muted)' }}>Rest</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
