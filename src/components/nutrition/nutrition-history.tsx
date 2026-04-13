'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getGradeFromScore, getGradeColor } from '@/lib/constants';
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
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;

            const dateStr = `${year}-${pad(month)}-${pad(day)}`;
            const isFuture = dateStr > today;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            const score = scores[dateStr] ?? null;
            const grade = score != null && score > 0 ? getGradeFromScore(score) : null;
            const gradeColor = grade ? getGradeColor(grade) : null;

            const tileBackground = gradeColor
              ? `linear-gradient(160deg, ${gradeColor}40 0%, ${gradeColor}14 100%)`
              : 'var(--bg-elevated)';
            const tileBorder = isSelected
              ? (gradeColor ?? 'var(--fg)')
              : gradeColor
                ? `${gradeColor}33`
                : 'transparent';

            return (
              <button
                key={dateStr}
                onClick={() => !isFuture && onSelectDate(dateStr)}
                disabled={isFuture}
                className="aspect-square flex flex-col items-center justify-center rounded-xl transition-all duration-200"
                style={{
                  background: tileBackground,
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderColor: tileBorder,
                  boxShadow: isSelected && gradeColor ? `0 0 0 2px ${gradeColor}` : 'none',
                  opacity: isFuture ? 0.2 : 1,
                  cursor: isFuture ? 'default' : 'pointer',
                }}
              >
                <span
                  className="text-[10px] leading-none font-medium mb-0.5"
                  style={{
                    color: isToday
                      ? '#00d26a'
                      : gradeColor
                        ? 'var(--fg)'
                        : 'var(--fg-muted)',
                  }}
                >
                  {day}
                </span>
                <span
                  className="text-sm font-bold leading-none"
                  style={{ color: gradeColor ?? 'var(--fg-muted)', opacity: gradeColor ? 1 : 0.4 }}
                >
                  {grade ?? '·'}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
