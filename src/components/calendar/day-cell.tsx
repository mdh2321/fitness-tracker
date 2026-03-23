'use client';

import { getWorkoutColor } from '@/lib/constants';
import { getWorkoutIcon } from './workout-icons';

export interface DayCellData {
  date: string;
  strain: number;
  workouts: { name: string; type: string; duration_minutes: number }[];
  nutritionScore: number | null;
  sleepMinutes: number | null;
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface DayCellProps {
  data: DayCellData;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}

export function DayCell({ data, selected, onClick, compact }: DayCellProps) {
  const day = parseInt(data.date.split('-')[2], 10);

  // Pick the workout with the longest duration
  const primary = data.workouts.length > 0
    ? data.workouts.reduce((a, b) => b.duration_minutes > a.duration_minutes ? b : a)
    : null;
  const extras = data.workouts.length - 1;

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-start rounded-lg transition-all text-center cursor-pointer hover:bg-[var(--bg-hover)] w-full h-12 p-1 gap-0.5"
      style={{
        background: selected
          ? 'var(--bg-elevated)'
          : primary
            ? `${getWorkoutColor(primary.name, primary.type as any)}08`
            : undefined,
        opacity: data.isCurrentMonth ? 1 : 0.25,
        border: selected ? '1px solid var(--border)' : '1px solid transparent',
      }}
    >
      <span
        className="text-[10px] font-semibold tabular-nums leading-none"
        style={{
          color: data.isToday ? '#00d26a' : 'var(--fg-secondary)',
        }}
      >
        {day}
      </span>

      {/* Primary workout icon — centered in remaining space */}
      {primary && (() => {
        const Icon = getWorkoutIcon(primary.name);
        const color = getWorkoutColor(primary.name, primary.type as any);
        return (
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="flex items-center gap-0.5">
              <Icon className="w-4 h-4" style={{ color }} />
              {extras > 0 && (
                <span
                  className="text-[7px] font-bold leading-none"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  +{extras}
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </button>
  );
}
