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
}

export function DayCell({ data, selected, onClick }: DayCellProps) {
  const day = parseInt(data.date.split('-')[2], 10);

  // Pick the workout with the longest duration
  const primary = data.workouts.length > 0
    ? data.workouts.reduce((a, b) => b.duration_minutes > a.duration_minutes ? b : a)
    : null;
  const extras = data.workouts.length - 1;

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-start p-1.5 rounded-lg transition-all text-center min-h-[60px] sm:min-h-[72px]"
      style={{
        background: selected ? 'var(--bg-elevated)' : 'transparent',
        opacity: data.isCurrentMonth ? 1 : 0.3,
        border: selected ? '1px solid var(--border)' : '1px solid transparent',
      }}
    >
      <span
        className="text-xs font-medium tabular-nums"
        style={{
          color: data.isToday ? '#00d26a' : 'var(--fg)',
        }}
      >
        {day}
      </span>

      {/* Primary workout icon — vertically centered between date and bottom */}
      {primary && (() => {
        const Icon = getWorkoutIcon(primary.name);
        const color = getWorkoutColor(primary.name, primary.type as any);
        return (
          <div className="flex-1 flex items-center justify-center relative w-full">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: `${color}20` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            {extras > 0 && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-medium leading-none" style={{ color: 'var(--fg-muted)' }}>
                +{extras}
              </span>
            )}
          </div>
        );
      })()}
    </button>
  );
}
