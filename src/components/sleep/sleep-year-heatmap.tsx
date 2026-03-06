'use client';

import { useMemo, useState } from 'react';
import { format, subWeeks, startOfWeek, addDays, parseISO } from 'date-fns';
import { getSleepColor, getSleepLabel, SLEEP_COLORS } from '@/lib/constants';
import type { DailySleep } from '@/lib/types';

interface SleepYearHeatmapProps {
  data: DailySleep[];
  weeks?: number;
  onSelectDate?: (date: string) => void;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SleepYearHeatmap({ data, weeks = 52, onSelectDate }: SleepYearHeatmapProps) {
  const [hovered, setHovered] = useState<{ date: string; minutes: number } | null>(null);

  const sleepMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.date, d.total_minutes));
    return map;
  }, [data]);

  const cellSize = 12;
  const gap = 2;
  const startDate = startOfWeek(subWeeks(new Date(), weeks - 1), { weekStartsOn: 1 });

  const cells = useMemo(() => {
    const result: { date: string; x: number; y: number; minutes: number }[] = [];
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = addDays(startDate, w * 7 + d);
        const dateStr = format(date, 'yyyy-MM-dd');
        if (date > new Date()) continue;
        result.push({
          date: dateStr,
          x: w * (cellSize + gap),
          y: d * (cellSize + gap),
          minutes: sleepMap.get(dateStr) || 0,
        });
      }
    }
    return result;
  }, [sleepMap, weeks, startDate]);

  const monthLabels = useMemo(() => {
    const labels: { text: string; x: number }[] = [];
    let lastMonth = -1;
    for (const cell of cells) {
      if (cell.y !== 0) continue;
      const date = parseISO(cell.date);
      const month = date.getMonth();
      if (month !== lastMonth) {
        labels.push({ text: format(date, 'MMM'), x: cell.x });
        lastMonth = month;
      }
    }
    return labels;
  }, [cells]);

  const width = weeks * (cellSize + gap);
  const height = 7 * (cellSize + gap);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg width={width} height={height + 20} className="min-w-full">
          {monthLabels.map((label, i) => (
            <text key={i} x={label.x} y={height + 14} className="text-[10px]" style={{ fill: 'var(--fg-muted)' }}>
              {label.text}
            </text>
          ))}
          {cells.map((cell) => (
            <rect
              key={cell.date}
              x={cell.x}
              y={cell.y}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={getSleepColor(cell.minutes)}
              className="cursor-pointer"
              style={{ transition: 'filter 0.15s ease' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.3)';
                setHovered({ date: cell.date, minutes: cell.minutes });
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = '';
                setHovered(null);
              }}
              onClick={() => onSelectDate?.(cell.date)}
            />
          ))}
        </svg>
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

      {/* Hover info */}
      <div
        className={`px-3 py-2 rounded-lg text-xs transition-opacity duration-200 ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'var(--bg)', color: 'var(--fg-secondary)' }}
      >
        {hovered ? (
          <>
            <span className="font-medium" style={{ color: 'var(--fg)' }}>
              {format(parseISO(hovered.date), 'MMM d, yyyy')}
            </span>
            {' — '}
            <span style={{ color: getSleepColor(hovered.minutes) }}>
              {hovered.minutes > 0 ? `${formatDuration(hovered.minutes)} · ${getSleepLabel(hovered.minutes)}` : 'No data'}
            </span>
          </>
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
    </div>
  );
}
