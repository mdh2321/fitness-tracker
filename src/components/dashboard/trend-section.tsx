'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendLine } from '@/components/charts/trend-line';
import { TrendBar } from '@/components/charts/trend-bar';
import { LineChart, BarChart2 } from 'lucide-react';
import { format, parseISO, eachWeekOfInterval, endOfWeek, eachMonthOfInterval, endOfMonth } from 'date-fns';
import type { DailyStrain } from '@/lib/types';

type Period = 'daily' | 'weekly' | 'monthly';
type Metric = 'strain' | 'exercises' | 'activeTime' | 'workoutTime' | 'steps';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const METRICS: { value: Metric; label: string }[] = [
  { value: 'strain', label: 'Strain' },
  { value: 'exercises', label: 'Count' },
  { value: 'activeTime', label: 'Active Time' },
  { value: 'workoutTime', label: 'Workout Time' },
  { value: 'steps', label: 'Steps' },
];

const METRIC_CONFIG: Record<Metric, { color: string; label: string; aggLabel: string }> = {
  strain: { color: '#00d26a', label: 'Strain', aggLabel: 'Avg Strain' },
  exercises: { color: '#8b5cf6', label: 'Workouts', aggLabel: 'Workouts' },
  activeTime: { color: '#00bcd4', label: 'Active Time (min)', aggLabel: 'Active Time (min)' },
  workoutTime: { color: '#8b5cf6', label: 'Workout Time (min)', aggLabel: 'Workout Time (min)' },
  steps: { color: '#ff6b35', label: 'Steps', aggLabel: 'Steps' },
};

interface TrendSectionProps {
  strainData: DailyStrain[];
}

export function TrendSection({ strainData }: TrendSectionProps) {
  const [period, setPeriod] = useState<Period>('daily');
  const [metric, setMetric] = useState<Metric>('strain');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Daily series
  const dailyData = useMemo(() => ({
    strain: strainData.map((d) => ({ date: d.date, value: d.strain_score })),
    activeTime: strainData.map((d) => ({ date: d.date, value: d.total_duration })),
    workoutTime: strainData.map((d) => ({ date: d.date, value: d.workout_duration ?? 0 })),
    exercises: strainData.map((d) => ({ date: d.date, value: d.workout_count })),
    steps: strainData.map((d) => ({ date: d.date, value: d.steps || 0 })),
  }), [strainData]);

  // Weekly aggregation
  const weeklyData = useMemo(() => {
    if (strainData.length < 2) return { strain: [], activeTime: [], workoutTime: [], exercises: [], steps: [] };
    const sorted = [...strainData].sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = parseISO(sorted[0].date);
    const lastDate = parseISO(sorted[sorted.length - 1].date);
    const weeks = eachWeekOfInterval({ start: firstDate, end: lastDate }, { weekStartsOn: 1 });
    const dataMap = new Map(strainData.map((d) => [d.date, d]));

    return {
      strain: weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        let total = 0, count = 0;
        for (let d = weekStart; d <= weekEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) { total += entry.strain_score; count++; }
        }
        return { date: format(weekStart, 'yyyy-MM-dd'), value: count > 0 ? Math.round(total / count * 10) / 10 : 0 };
      }),
      activeTime: weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        let total = 0;
        for (let d = weekStart; d <= weekEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) total += entry.total_duration;
        }
        return { date: format(weekStart, 'yyyy-MM-dd'), value: total };
      }),
      workoutTime: weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        let total = 0;
        for (let d = weekStart; d <= weekEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) total += entry.workout_duration ?? 0;
        }
        return { date: format(weekStart, 'yyyy-MM-dd'), value: total };
      }),
      exercises: weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        let total = 0;
        for (let d = weekStart; d <= weekEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) total += entry.workout_count;
        }
        return { date: format(weekStart, 'yyyy-MM-dd'), value: total };
      }),
      steps: weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        let total = 0;
        for (let d = weekStart; d <= weekEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) total += entry.steps || 0;
        }
        return { date: format(weekStart, 'yyyy-MM-dd'), value: total };
      }),
    };
  }, [strainData]);

  // Monthly aggregation
  const monthlyData = useMemo(() => {
    if (strainData.length < 2) return { strain: [], activeTime: [], workoutTime: [], exercises: [], steps: [] };
    const sorted = [...strainData].sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = parseISO(sorted[0].date);
    const lastDate = parseISO(sorted[sorted.length - 1].date);
    const months = eachMonthOfInterval({ start: firstDate, end: lastDate });
    const dataMap = new Map(strainData.map((d) => [d.date, d]));

    return {
      strain: months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        let total = 0, count = 0;
        for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) { total += entry.strain_score; count++; }
        }
        return { date: format(monthStart, 'yyyy-MM-dd'), value: count > 0 ? Math.round(total / count * 10) / 10 : 0 };
      }),
      activeTime: months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        let total = 0;
        for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) total += entry.total_duration;
        }
        return { date: format(monthStart, 'yyyy-MM-dd'), value: total };
      }),
      workoutTime: months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        let total = 0;
        for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) total += entry.workout_duration ?? 0;
        }
        return { date: format(monthStart, 'yyyy-MM-dd'), value: total };
      }),
      exercises: months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        let total = 0;
        for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) total += entry.workout_count;
        }
        return { date: format(monthStart, 'yyyy-MM-dd'), value: total };
      }),
      steps: months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        let total = 0;
        for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) total += entry.steps || 0;
        }
        return { date: format(monthStart, 'yyyy-MM-dd'), value: total };
      }),
    };
  }, [strainData]);

  const sourceData = period === 'daily' ? dailyData : period === 'weekly' ? weeklyData : monthlyData;
  const chartData = sourceData[metric];
  const config = METRIC_CONFIG[metric];
  const chartLabel = period === 'daily' ? config.label : config.aggLabel;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle>Trends</CardTitle>
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors`}
                  style={period === p.value ? { background: 'var(--border)', color: 'var(--fg)' } : { color: 'var(--fg-muted)' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Metric selector */}
            <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
              {METRICS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMetric(m.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors`}
                  style={metric === m.value ? { background: 'var(--border)', color: 'var(--fg)' } : { color: 'var(--fg-muted)' }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {/* Chart type toggle */}
            <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
              <button
                onClick={() => setChartType('line')}
                title="Line chart"
                className={`p-1.5 rounded-md transition-colors`}
                style={chartType === 'line' ? { background: 'var(--border)', color: 'var(--fg)' } : { color: 'var(--fg-muted)' }}
              >
                <LineChart size={14} />
              </button>
              <button
                onClick={() => setChartType('bar')}
                title="Bar chart"
                className={`p-1.5 rounded-md transition-colors`}
                style={chartType === 'bar' ? { background: 'var(--border)', color: 'var(--fg)' } : { color: 'var(--fg-muted)' }}
              >
                <BarChart2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartType === 'line'
          ? <TrendLine data={chartData} color={config.color} label={chartLabel} />
          : <TrendBar  data={chartData} color={config.color} label={chartLabel} period={period} />}
      </CardContent>
    </Card>
  );
}
