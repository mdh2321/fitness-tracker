'use client';

import { getHeatmapColor, getWorkoutColor } from '@/lib/constants';

export interface DayCellData {
  date: string;
  strain: number;
  workouts: { name: string; type: string }[];
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
  const hasActivity = data.workouts.length > 0 || data.strain > 0;
  const strainBg = hasActivity ? getHeatmapColor(data.strain) : undefined;

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all text-center min-h-[56px] sm:min-h-[64px]"
      style={{
        background: selected
          ? 'var(--bg-elevated)'
          : strainBg
            ? `${strainBg}20`
            : 'transparent',
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

      {/* Workout type dots */}
      {data.workouts.length > 0 && (
        <div className="flex gap-0.5 justify-center flex-wrap">
          {data.workouts.slice(0, 3).map((w, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: getWorkoutColor(w.name, w.type as any) }}
            />
          ))}
          {data.workouts.length > 3 && (
            <span className="text-[8px] leading-none" style={{ color: 'var(--fg-muted)' }}>+{data.workouts.length - 3}</span>
          )}
        </div>
      )}

    </button>
  );
}
