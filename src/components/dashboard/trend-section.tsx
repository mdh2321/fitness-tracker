'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendLine } from '@/components/charts/trend-line';
import { TrendBar } from '@/components/charts/trend-bar';
import { LineChart, BarChart2 } from 'lucide-react';
import { format, parseISO, eachWeekOfInterval, endOfWeek, eachMonthOfInterval, endOfMonth } from 'date-fns';
import type { DailyStrain } from '@/lib/types';

type Period = 'daily' | 'weekly' | 'monthly';
type Metric = 'strain' | 'exercises' | 'activeTime' | 'workoutTime' | 'steps' | 'avgHr' | 'maxHr';

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
  { value: 'avgHr', label: 'Avg HR' },
  { value: 'maxHr', label: 'Max HR' },
];

const METRIC_CONFIG: Record<Metric, { color: string; label: string; aggLabel: string }> = {
  strain: { color: 'var(--accent)', label: 'Strain', aggLabel: 'Avg Strain' },
  exercises: { color: '#8b5cf6', label: 'Workouts', aggLabel: 'Workouts' },
  activeTime: { color: '#00bcd4', label: 'Active Time (min)', aggLabel: 'Active Time (min)' },
  workoutTime: { color: '#8b5cf6', label: 'Workout Time (min)', aggLabel: 'Workout Time (min)' },
  steps: { color: '#ff6b35', label: 'Steps', aggLabel: 'Steps' },
  avgHr: { color: '#ff3b5c', label: 'Avg HR (bpm)', aggLabel: 'Avg HR (bpm)' },
  maxHr: { color: '#ff6b35', label: 'Max HR (bpm)', aggLabel: 'Max HR (bpm)' },
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
    avgHr: strainData.filter((d) => d.avg_hr).map((d) => ({ date: d.date, value: d.avg_hr! })),
    maxHr: strainData.filter((d) => d.max_hr).map((d) => ({ date: d.date, value: d.max_hr! })),
  }), [strainData]);

  // Weekly aggregation
  const weeklyData = useMemo(() => {
    if (strainData.length < 2) return { strain: [], activeTime: [], workoutTime: [], exercises: [], steps: [], avgHr: [], maxHr: [] };
    const sorted = [...strainData].sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = parseISO(sorted[0].date);
    const lastDate = parseISO(sorted[sorted.length - 1].date);
    const weeks = eachWeekOfInterval({ start: firstDate, end: lastDate }, { weekStartsOn: 1 });
    const dataMap = new Map(strainData.map((d) => [d.date, d]));

    const aggregate = (weekStart: Date) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      let strain = 0, strainCount = 0, activeTime = 0, workoutTime = 0, exercises = 0, steps = 0;
      let hrSum = 0, hrCount = 0, maxHr = 0;
      for (let d = weekStart; d <= weekEnd; d = new Date(d.getTime() + 86400000)) {
        const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
        if (entry) {
          strain += entry.strain_score; strainCount++;
          activeTime += entry.total_duration;
          workoutTime += entry.workout_duration ?? 0;
          exercises += entry.workout_count;
          steps += entry.steps || 0;
          if (entry.avg_hr) { hrSum += entry.avg_hr; hrCount++; }
          if (entry.max_hr && entry.max_hr > maxHr) maxHr = entry.max_hr;
        }
      }
      return { strain, strainCount, activeTime, workoutTime, exercises, steps, hrAvg: hrCount > 0 ? Math.round(hrSum / hrCount) : null, hrMax: maxHr || null };
    };

    return {
      strain: weeks.map((ws) => { const a = aggregate(ws); return { date: format(ws, 'yyyy-MM-dd'), value: a.strainCount > 0 ? Math.round(a.strain / a.strainCount * 10) / 10 : 0 }; }),
      activeTime: weeks.map((ws) => ({ date: format(ws, 'yyyy-MM-dd'), value: aggregate(ws).activeTime })),
      workoutTime: weeks.map((ws) => ({ date: format(ws, 'yyyy-MM-dd'), value: aggregate(ws).workoutTime })),
      exercises: weeks.map((ws) => ({ date: format(ws, 'yyyy-MM-dd'), value: aggregate(ws).exercises })),
      steps: weeks.map((ws) => ({ date: format(ws, 'yyyy-MM-dd'), value: aggregate(ws).steps })),
      avgHr: weeks.map((ws) => { const a = aggregate(ws); return a.hrAvg !== null ? { date: format(ws, 'yyyy-MM-dd'), value: a.hrAvg } : null; }).filter(Boolean) as { date: string; value: number }[],
      maxHr: weeks.map((ws) => { const a = aggregate(ws); return a.hrMax !== null ? { date: format(ws, 'yyyy-MM-dd'), value: a.hrMax } : null; }).filter(Boolean) as { date: string; value: number }[],
    };
  }, [strainData]);

  // Monthly aggregation
  const monthlyData = useMemo(() => {
    if (strainData.length < 2) return { strain: [], activeTime: [], workoutTime: [], exercises: [], steps: [], avgHr: [], maxHr: [] };
    const sorted = [...strainData].sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = parseISO(sorted[0].date);
    const lastDate = parseISO(sorted[sorted.length - 1].date);
    const months = eachMonthOfInterval({ start: firstDate, end: lastDate });
    const dataMap = new Map(strainData.map((d) => [d.date, d]));

    const aggregate = (monthStart: Date) => {
      const monthEnd = endOfMonth(monthStart);
      let strain = 0, strainCount = 0, activeTime = 0, workoutTime = 0, exercises = 0, steps = 0;
      let hrSum = 0, hrCount = 0, maxHr = 0;
      for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86400000)) {
        const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
        if (entry) {
          strain += entry.strain_score; strainCount++;
          activeTime += entry.total_duration;
          workoutTime += entry.workout_duration ?? 0;
          exercises += entry.workout_count;
          steps += entry.steps || 0;
          if (entry.avg_hr) { hrSum += entry.avg_hr; hrCount++; }
          if (entry.max_hr && entry.max_hr > maxHr) maxHr = entry.max_hr;
        }
      }
      return { strain, strainCount, activeTime, workoutTime, exercises, steps, hrAvg: hrCount > 0 ? Math.round(hrSum / hrCount) : null, hrMax: maxHr || null };
    };

    return {
      strain: months.map((ms) => { const a = aggregate(ms); return { date: format(ms, 'yyyy-MM-dd'), value: a.strainCount > 0 ? Math.round(a.strain / a.strainCount * 10) / 10 : 0 }; }),
      activeTime: months.map((ms) => ({ date: format(ms, 'yyyy-MM-dd'), value: aggregate(ms).activeTime })),
      workoutTime: months.map((ms) => ({ date: format(ms, 'yyyy-MM-dd'), value: aggregate(ms).workoutTime })),
      exercises: months.map((ms) => ({ date: format(ms, 'yyyy-MM-dd'), value: aggregate(ms).exercises })),
      steps: months.map((ms) => ({ date: format(ms, 'yyyy-MM-dd'), value: aggregate(ms).steps })),
      avgHr: months.map((ms) => { const a = aggregate(ms); return a.hrAvg !== null ? { date: format(ms, 'yyyy-MM-dd'), value: a.hrAvg } : null; }).filter(Boolean) as { date: string; value: number }[],
      maxHr: months.map((ms) => { const a = aggregate(ms); return a.hrMax !== null ? { date: format(ms, 'yyyy-MM-dd'), value: a.hrMax } : null; }).filter(Boolean) as { date: string; value: number }[],
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
