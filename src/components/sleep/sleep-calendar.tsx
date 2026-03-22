'use client';

import { useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  isSameMonth,
  isFuture,
  parseISO,
  subWeeks,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSleepColor, getSleepLabel, SLEEP_COLORS } from '@/lib/constants';
import type { DailySleep } from '@/lib/types';

interface SleepCalendarProps {
  data: DailySleep[];
  onSelectDate?: (date: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SleepCalendar({ data, onSelectDate }: SleepCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const sleepMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.date, d.total_minutes));
    return map;
  }, [data]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const result: { date: string; minutes: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let current = calStart;
    while (current <= calEnd) {
      const dateStr = format(current, 'yyyy-MM-dd');
      result.push({
        date: dateStr,
        minutes: sleepMap.get(dateStr) || 0,
        isCurrentMonth: isSameMonth(current, month),
        isToday: dateStr === todayStr,
      });
      current = addDays(current, 1);
    }
    return result;
  }, [month, sleepMap]);

  const canGoForward = !isFuture(addMonths(month, 1));

  const handleSelect = (date: string) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
          style={{ color: 'var(--fg-secondary)' }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
          {format(month, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => canGoForward && setMonth((m) => addMonths(m, 1))}
          disabled={!canGoForward}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-30"
          style={{ color: 'var(--fg-secondary)' }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium py-1" style={{ color: 'var(--fg-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const hasData = day.minutes > 0;
          return (
            <button
              key={day.date}
              onClick={() => handleSelect(day.date)}
              className="relative flex flex-col items-center justify-center rounded-lg transition-all min-h-[52px]"
              style={{
                background: selectedDate === day.date
                  ? 'var(--bg-elevated)'
                  : hasData
                    ? getSleepColor(day.minutes)
                    : 'var(--bg-card)',
                opacity: day.isCurrentMonth ? 1 : 0.3,
                border: selectedDate === day.date ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              <span
                className="text-xs font-medium tabular-nums"
                style={{ color: hasData ? '#fff' : day.isToday ? '#00d26a' : 'var(--fg)' }}
              >
                {parseInt(day.date.split('-')[2], 10)}
              </span>
              {hasData && (
                <span
                  className="text-[9px] font-bold tabular-nums mt-0.5"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {formatDuration(day.minutes)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--fg-muted)' }}>
        <span>Less</span>
        {SLEEP_COLORS.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
