'use client';

import { useMemo, useState } from 'react';
import { format, subWeeks, startOfWeek, addDays, parseISO } from 'date-fns';
import { getHeatmapColor, getStrainLabel, HEATMAP_SCALE } from '@/lib/constants';
import type { DailyStrain } from '@/lib/types';

interface HeatmapCalendarProps {
  data: DailyStrain[];
  weeks?: number;
}

export function HeatmapCalendar({ data, weeks = 52 }: HeatmapCalendarProps) {
  const [hovered, setHovered] = useState<{ date: string; strain: number } | null>(null);

  const strainMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.date, d.strain_score));
    return map;
  }, [data]);

  const cellSize = 12;
  const gap = 2;
  const startDate = startOfWeek(subWeeks(new Date(), weeks - 1), { weekStartsOn: 1 });

  const cells = useMemo(() => {
    const result: { date: string; x: number; y: number; strain: number }[] = [];
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = addDays(startDate, w * 7 + d);
        const dateStr = format(date, 'yyyy-MM-dd');
        if (date > new Date()) continue;
        result.push({
          date: dateStr,
          x: w * (cellSize + gap),
          y: d * (cellSize + gap),
          strain: strainMap.get(dateStr) || 0,
        });
      }
    }
    return result;
  }, [strainMap, weeks, startDate]);

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
              fill={getHeatmapColor(cell.strain)}
              className="cursor-pointer"
              style={{ transition: 'filter 0.15s ease' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.3)';
                setHovered({ date: cell.date, strain: cell.strain });
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = '';
                setHovered(null);
              }}
            />
          ))}
        </svg>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--fg-muted)' }}>
        <span>Less</span>
        {HEATMAP_SCALE.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
        <span>More</span>
      </div>

      {/* Hover info bar — always rendered to prevent layout shift */}
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
            <span style={{ color: getHeatmapColor(hovered.strain) }}>
              {hovered.strain.toFixed(1)} strain · {getStrainLabel(hovered.strain)}
            </span>
          </>
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
    </div>
  );
}
