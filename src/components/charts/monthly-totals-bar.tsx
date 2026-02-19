'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants';
import type { Workout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';

interface MonthlyTotalsBarProps {
  workouts: Workout[];
  months?: number;
}

export function MonthlyTotalsBar({ workouts, months = 6 }: MonthlyTotalsBarProps) {
  const chartData = useMemo(() => {
    // Group workouts by month and type (duration in minutes)
    const byMonth: Record<string, Record<string, number>> = {};

    for (const w of workouts) {
      const month = format(parseISO(w.started_at), 'yyyy-MM');
      if (!byMonth[month]) byMonth[month] = {};
      byMonth[month][w.type] = (byMonth[month][w.type] || 0) + w.duration_minutes;
    }

    // Get last N months sorted
    const allMonths = Object.keys(byMonth).sort().slice(-months);

    return allMonths.map((m) => ({
      month: format(parseISO(`${m}-01`), 'MMM yyyy'),
      strength: byMonth[m]?.strength || 0,
      cardio: byMonth[m]?.cardio || 0,
      mixed: byMonth[m]?.mixed || 0,
      flexibility: byMonth[m]?.flexibility || 0,
      sport: byMonth[m]?.sport || 0,
    }));
  }, [workouts, months]);

  if (chartData.length === 0) {
    return <div className="text-center text-gray-500 text-sm py-8">No data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50 + 40)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          tickFormatter={(v) => `${v}m`}
        />
        <YAxis
          type="category"
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#141419',
            border: '1px solid #2a2a35',
            borderRadius: '8px',
            color: '#e5e5e5',
            fontSize: '12px',
          }}
          formatter={(value: unknown, name: unknown) => [
            `${Number(value)} min`,
            WORKOUT_TYPE_LABELS[String(name) as WorkoutType] || String(name),
          ]}
        />
        <Legend
          formatter={(value: string) => WORKOUT_TYPE_LABELS[value as WorkoutType] || value}
          wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
        />
        <Bar dataKey="strength" stackId="a" fill={WORKOUT_TYPE_COLORS.strength} radius={0} />
        <Bar dataKey="cardio" stackId="a" fill={WORKOUT_TYPE_COLORS.cardio} radius={0} />
        <Bar dataKey="mixed" stackId="a" fill={WORKOUT_TYPE_COLORS.mixed} radius={0} />
        <Bar dataKey="flexibility" stackId="a" fill={WORKOUT_TYPE_COLORS.flexibility} radius={0} />
        <Bar dataKey="sport" stackId="a" fill={WORKOUT_TYPE_COLORS.sport} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
