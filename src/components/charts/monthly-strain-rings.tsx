'use client';

import { useMemo, useState } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays, addMonths, subMonths, parseISO, isAfter } from 'date-fns';
import { getStrainColor } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthlyStrainRingsProps {
  strainByDate: Map<string, { strain: number; duration: number; workouts: number }>;
}

function MiniRing({ value, max = 21, size = 32 }: { value: number; max?: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);
  const color = value > 0 ? getStrainColor(value) : 'var(--bg-elevated)';

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth={strokeWidth} />
      {value > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      )}
    </svg>
  );
}

export function MonthlyStrainRings({ strainByDate }: MonthlyStrainRingsProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const daysInMonth = getDaysInMonth(currentMonth);
  const canGoForward = !isAfter(startOfMonth(addMonths(currentMonth, 1)), startOfMonth(today));

  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < daysInMonth; i++) {
      const date = addDays(monthStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const data = strainByDate.get(dateStr);
      const isFuture = isAfter(date, today);
      result.push({
        date: dateStr,
        day: i + 1,
        strain: data?.strain || 0,
        duration: data?.duration || 0,
        workouts: data?.workouts || 0,
        isFuture,
      });
    }
    return result;
  }, [strainByDate, daysInMonth, monthStart, today, currentMonth]);

  const hoveredData = hoveredDay ? days.find((d) => d.date === hoveredDay) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Strain</CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
              style={{ color: 'var(--fg-muted)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm min-w-[100px] text-center" style={{ color: 'var(--fg-secondary)' }}>
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => canGoForward && setCurrentMonth(addMonths(currentMonth, 1))}
              className={`p-1 rounded-md transition-colors ${
                canGoForward ? 'hover:bg-[var(--bg-elevated)]' : 'opacity-25 cursor-not-allowed'
              }`}
              style={{ color: 'var(--fg-muted)' }}
              disabled={!canGoForward}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <div
              key={day.date}
              className={`flex flex-col items-center gap-0.5 ${day.isFuture ? 'opacity-20' : 'cursor-pointer'}`}
              onMouseEnter={() => !day.isFuture && setHoveredDay(day.date)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <MiniRing value={day.strain} />
              <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>{day.day}</span>
            </div>
          ))}
        </div>

        <div
          className={`mt-3 px-3 py-2 rounded-lg text-xs transition-opacity duration-200 ${
            hoveredData ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: 'var(--bg)', color: 'var(--fg-secondary)' }}
        >
          {hoveredData ? (
            <>
              <span className="font-medium" style={{ color: 'var(--fg)' }}>{format(parseISO(hoveredData.date), 'MMM d')}</span>
              {' — '}
              <span style={{ color: getStrainColor(hoveredData.strain) }}>
                {hoveredData.strain.toFixed(1)} strain
              </span>
              {hoveredData.duration > 0 && <span> · {hoveredData.duration}m</span>}
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
