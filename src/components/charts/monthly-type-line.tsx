'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, parse, eachMonthOfInterval } from 'date-fns';
import { useTheme } from '@/components/providers/theme-provider';
import { getWorkoutColor, PASSIVE_ACTIVITIES } from '@/lib/constants';
import { TrendingUp } from 'lucide-react';
import type { Workout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Merge near-duplicate activity names into a single canonical line.
const NAME_ALIASES: Record<string, string> = {
  'Functional Strength': 'Strength Training',
};
const canonicalName = (name: string) => NAME_ALIASES[name] ?? name;

interface MonthlyTypeLineProps {
  /** Earliest month to display, as 'yyyy-MM'. Months before this are excluded. */
  startMonth?: string;
}

export function MonthlyTypeLine({ startMonth }: MonthlyTypeLineProps) {
  const { theme } = useTheme();
  const { data: workouts } = useSWR<Workout[]>('/api/workouts?limit=1000', fetcher);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const ct = {
    tick: theme === 'light' ? '#84848f' : '#6b6b78',
    grid: theme === 'light' ? '#d9d9e2' : '#1e1e26',
    tooltipBg: theme === 'light' ? '#ffffff' : '#15151d',
    tooltipBorder: theme === 'light' ? '#d9d9e2' : '#1e1e26',
    tooltipColor: theme === 'light' ? '#16161a' : '#ececf1',
    cardBg: theme === 'light' ? '#ffffff' : '#15151d',
  };

  // Aggregate sessions per workout name per month
  const { chartData, names, colors } = useMemo(() => {
    if (!workouts || workouts.length === 0) {
      return { chartData: [], names: [] as string[], colors: {} as Record<string, string> };
    }

    // counts[monthKey][name] = sessions
    const counts = new Map<string, Map<string, number>>();
    const totals = new Map<string, number>();
    const colorOf: Record<string, string> = {};
    let minKey = '9999-99';
    let maxKey = '0000-00';

    for (const w of workouts) {
      // Skip passive activities (Walking, Basketball) — same as the calendar.
      if (PASSIVE_ACTIVITIES.has(w.name)) continue;

      const d = w.local_date ? parse(w.local_date, 'yyyy-MM-dd', new Date()) : new Date(w.started_at);
      const monthKey = format(d, 'yyyy-MM');
      if (startMonth && monthKey < startMonth) continue;
      if (monthKey < minKey) minKey = monthKey;
      if (monthKey > maxKey) maxKey = monthKey;

      const name = canonicalName(w.name);
      if (!counts.has(monthKey)) counts.set(monthKey, new Map());
      const m = counts.get(monthKey)!;
      m.set(name, (m.get(name) ?? 0) + 1);
      totals.set(name, (totals.get(name) ?? 0) + 1);
      if (!colorOf[name]) colorOf[name] = getWorkoutColor(name, w.type as WorkoutType);
    }

    // Names sorted by total sessions (most frequent first)
    const sortedNames = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    // Continuous month axis from first to last month with data
    const months = eachMonthOfInterval({
      start: parse(minKey, 'yyyy-MM', new Date()),
      end: parse(maxKey, 'yyyy-MM', new Date()),
    });

    const rows = months.map((mDate) => {
      const key = format(mDate, 'yyyy-MM');
      const m = counts.get(key);
      const row: Record<string, string | number> = { label: format(mDate, 'MMM yy') };
      for (const name of sortedNames) {
        row[name] = m?.get(name) ?? 0;
      }
      return row;
    });

    return { chartData: rows, names: sortedNames, colors: colorOf };
  }, [workouts, startMonth]);

  const toggle = (name: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (!workouts) {
    return (
      <div className="h-[280px] rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
    );
  }

  if (chartData.length < 2) {
    return null; // need at least 2 months to draw a meaningful trend
  }

  const visibleNames = names.filter((n) => !hidden.has(n));

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4" style={{ color: 'var(--fg-muted)' }} />
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-secondary)' }}>
          Sessions by Type · Month over Month
        </h2>
      </div>

      {/* Legend / toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {names.map((name) => {
          const active = !hidden.has(name);
          const color = colors[name];
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
              style={active
                ? { background: `${color}15`, borderColor: `${color}40`, color }
                : { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)', opacity: 0.6 }
              }
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? color : 'var(--fg-muted)' }} />
              {name}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: ct.tick, fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: ct.tick, fontSize: 11 }}
            allowDecimals={false}
            width={30}
            domain={[0, 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: ct.tooltipBg,
              border: `1px solid ${ct.tooltipBorder}`,
              borderRadius: '10px',
              color: ct.tooltipColor,
              fontSize: '12px',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            itemSorter={(item: { value?: number }) => -(item.value ?? 0)}
          />
          {visibleNames.map((name) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={colors[name]}
              strokeWidth={2.5}
              dot={{ r: 3, fill: colors[name], stroke: ct.cardBg, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: colors[name], stroke: ct.cardBg, strokeWidth: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
