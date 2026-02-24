'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getStrainColor } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';

interface NutritionHistoryProps {
  viewMonth: string; // 'YYYY-MM'
  scores: Record<string, number | null>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
}

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function MiniRing({ score, size = 32 }: { score: number | null; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = score !== null && score > 0 ? Math.min(score / 21, 1) : 0;
  const strokeDashoffset = circumference * (1 - percentage);
  const color = score !== null && score > 0 ? getStrainColor(score) : 'var(--bg-hover)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
        />
        {score !== null && score > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        )}
      </svg>
      <div className="absolute flex items-center justify-center">
        <span
          className="text-[9px] font-bold tabular-nums leading-none"
          style={{ color: score !== null && score > 0 ? color : 'var(--fg-muted)' }}
        >
          {score !== null && score > 0 ? Math.round(score) : ''}
        </span>
      </div>
    </div>
  );
}

export function NutritionHistory({
  viewMonth,
  scores,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  canGoNext,
}: NutritionHistoryProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [yearStr, monthStr] = viewMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr); // 1-indexed

  const daysInMonth = new Date(year, month, 0).getDate();

  // Day of week for first of month, Mon-first (0=Mon … 6=Sun)
  const firstJsDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const leadingBlanks = (firstJsDay + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onPrevMonth}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={onNextMonth}
            disabled={!canGoNext}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-30"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="flex justify-center">
              <span className="text-[10px] font-medium" style={{ color: 'var(--fg-muted)' }}>
                {d}
              </span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;

            const dateStr = `${year}-${pad(month)}-${pad(day)}`;
            const isFuture = dateStr > today;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            const score = scores[dateStr] ?? null;

            return (
              <button
                key={dateStr}
                onClick={() => !isFuture && onSelectDate(dateStr)}
                disabled={isFuture}
                className="flex flex-col items-center gap-0.5 py-1 rounded-lg transition-colors"
                style={{
                  background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                  outline: isSelected ? '1px solid var(--border)' : 'none',
                  opacity: isFuture ? 0.25 : 1,
                  cursor: isFuture ? 'default' : 'pointer',
                }}
              >
                <span
                  className="text-[10px] leading-none font-medium"
                  style={{
                    color: isToday
                      ? '#00d26a'
                      : isSelected
                      ? 'var(--fg)'
                      : 'var(--fg-muted)',
                  }}
                >
                  {day}
                </span>
                <MiniRing score={score} size={32} />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
