'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants';
import type { Workout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';
import { format, parseISO, startOfWeek } from 'date-fns';
import { useMemo } from 'react';
import { useTheme } from '@/components/providers/theme-provider';

interface WeeklyTypeBarProps {
  workouts: Workout[];
  weeks?: number;
}

export function WeeklyTypeBar({ workouts, weeks = 8 }: WeeklyTypeBarProps) {
  const { theme } = useTheme();
  const ct = {
    tick: theme === 'light' ? '#71717a' : '#6b7280',
    tooltipBg: theme === 'light' ? '#ffffff' : '#141419',
    tooltipBorder: theme === 'light' ? '#cccbda' : '#2a2a35',
    tooltipColor: theme === 'light' ? '#18181b' : '#e5e5e5',
  };

  const chartData = useMemo(() => {
    const byWeek: Record<string, Record<string, number>> = {};

    for (const w of workouts) {
      const weekStart = format(startOfWeek(parseISO(w.started_at), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!byWeek[weekStart]) byWeek[weekStart] = {};
      byWeek[weekStart][w.type] = (byWeek[weekStart][w.type] || 0) + w.duration_minutes;
    }

    const allWeeks = Object.keys(byWeek).sort().slice(-weeks);

    return allWeeks.map((wk) => ({
      week: format(parseISO(wk), 'MMM d'),
      strength: byWeek[wk]?.strength || 0,
      cardio: byWeek[wk]?.cardio || 0,
      mixed: byWeek[wk]?.mixed || 0,
      flexibility: byWeek[wk]?.flexibility || 0,
      sport: byWeek[wk]?.sport || 0,
    }));
  }, [workouts, weeks]);

  if (chartData.length === 0) {
    return <div className="text-center text-sm py-8" style={{ color: 'var(--fg-muted)' }}>No data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis
          dataKey="week"
          axisLine={false}
          tickLine={false}
          tick={{ fill: ct.tick, fontSize: 11 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: ct.tick, fontSize: 11 }}
          tickFormatter={(v) => `${v}m`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: ct.tooltipBg,
            border: `1px solid ${ct.tooltipBorder}`,
            borderRadius: '8px',
            color: ct.tooltipColor,
            fontSize: '12px',
          }}
          formatter={(value: unknown, name: unknown) => [
            `${Number(value)} min`,
            WORKOUT_TYPE_LABELS[String(name) as WorkoutType] || String(name),
          ]}
        />
        <Legend
          formatter={(value: string) => WORKOUT_TYPE_LABELS[value as WorkoutType] || value}
          wrapperStyle={{ fontSize: '11px', color: ct.tick }}
        />
        <Bar dataKey="strength" stackId="a" fill={WORKOUT_TYPE_COLORS.strength} radius={0} />
        <Bar dataKey="cardio" stackId="a" fill={WORKOUT_TYPE_COLORS.cardio} radius={0} />
        <Bar dataKey="mixed" stackId="a" fill={WORKOUT_TYPE_COLORS.mixed} radius={0} />
        <Bar dataKey="flexibility" stackId="a" fill={WORKOUT_TYPE_COLORS.flexibility} radius={0} />
        <Bar dataKey="sport" stackId="a" fill={WORKOUT_TYPE_COLORS.sport} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
