'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendLine } from '@/components/charts/trend-line';
import { TrendBar } from '@/components/charts/trend-bar';
import { LineChart, BarChart2 } from 'lucide-react';
import { format, parseISO, eachWeekOfInterval, endOfWeek, eachMonthOfInterval, endOfMonth } from 'date-fns';
import type { DailySleep } from '@/lib/types';

type Period = 'daily' | 'weekly' | 'monthly';
type Metric = 'total' | 'bedtime' | 'waketime';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface SleepTrendsProps {
  data: DailySleep[];
}

// Parse Auto Export date strings like "2026-03-06 01:07:31 +1100"
function parseFlexibleDate(dateStr: string): Date {
  const normalized = dateStr.trim().replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const d = new Date(normalized);
  if (!isNaN(d.getTime())) return d;
  return new Date(dateStr);
}

function timeToDecimal(dateStr: string): number {
  const date = parseFlexibleDate(dateStr);
  // Extract hours/minutes in the original timezone by parsing the offset
  const offsetMatch = dateStr.trim().match(/([+-])(\d{2}):?(\d{2})$/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const offsetH = parseInt(offsetMatch[2]);
    const offsetM = parseInt(offsetMatch[3]);
    const totalOffsetMs = sign * (offsetH * 60 + offsetM) * 60000;
    const localMs = date.getTime() + totalOffsetMs;
    const localDate = new Date(localMs);
    let hours = localDate.getUTCHours() + localDate.getUTCMinutes() / 60;
    if (hours < 12) hours += 24;
    return Math.round(hours * 10) / 10;
  }
  let hours = date.getHours() + date.getMinutes() / 60;
  if (hours < 12) hours += 24;
  return Math.round(hours * 10) / 10;
}

function decimalToTimeLabel(decimal: number): string {
  const normalized = decimal >= 24 ? decimal - 24 : decimal;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatHoursToHrMin(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SleepTrends({ data }: SleepTrendsProps) {
  const [period, setPeriod] = useState<Period>('daily');
  const [metric, setMetric] = useState<Metric>('total');
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');

  const hasBedtimeData = useMemo(() => data.some((d) => d.bedtime), [data]);

  const metrics: { value: Metric; label: string }[] = useMemo(() => {
    const base: { value: Metric; label: string }[] = [{ value: 'total', label: 'Total Sleep' }];
    if (hasBedtimeData) {
      base.push({ value: 'bedtime', label: 'Bed Time' });
      base.push({ value: 'waketime', label: 'Wake Time' });
    }
    return base;
  }, [hasBedtimeData]);

  const dailyData = useMemo(() => ({
    total: data.map((d) => ({ date: d.date, value: Math.round((d.total_minutes / 60) * 10) / 10 })),
    bedtime: data.filter((d) => d.bedtime).map((d) => ({ date: d.date, value: timeToDecimal(d.bedtime!) })),
    waketime: data.filter((d) => d.wake_time).map((d) => {
      let val = timeToDecimal(d.wake_time!);
      if (val >= 24) val -= 24;
      return { date: d.date, value: val };
    }),
  }), [data]);

  const weeklyData = useMemo(() => {
    if (data.length < 2) return { total: [], bedtime: [], waketime: [] };
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const dataMap = new Map(data.map((d) => [d.date, d]));
    const weeks = eachWeekOfInterval(
      { start: parseISO(sorted[0].date), end: parseISO(sorted[sorted.length - 1].date) },
      { weekStartsOn: 1 }
    );

    return {
      total: weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const days: DailySleep[] = [];
        for (let d = weekStart; d <= weekEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) days.push(entry);
        }
        const count = days.length || 1;
        return { date: format(weekStart, 'yyyy-MM-dd'), value: Math.round((days.reduce((s, d) => s + d.total_minutes, 0) / count / 60) * 10) / 10 };
      }),
      bedtime: weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const times: number[] = [];
        for (let d = weekStart; d <= weekEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry?.bedtime) times.push(timeToDecimal(entry.bedtime));
        }
        const avg = times.length > 0 ? Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 10) / 10 : 0;
        return { date: format(weekStart, 'yyyy-MM-dd'), value: avg };
      }).filter((d) => d.value > 0),
      waketime: weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const times: number[] = [];
        for (let d = weekStart; d <= weekEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry?.wake_time) {
            let val = timeToDecimal(entry.wake_time);
            if (val >= 24) val -= 24;
            times.push(val);
          }
        }
        const avg = times.length > 0 ? Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 10) / 10 : 0;
        return { date: format(weekStart, 'yyyy-MM-dd'), value: avg };
      }).filter((d) => d.value > 0),
    };
  }, [data]);

  const monthlyData = useMemo(() => {
    if (data.length < 2) return { total: [], bedtime: [], waketime: [] };
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const dataMap = new Map(data.map((d) => [d.date, d]));
    const months = eachMonthOfInterval(
      { start: parseISO(sorted[0].date), end: parseISO(sorted[sorted.length - 1].date) }
    );

    return {
      total: months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const days: DailySleep[] = [];
        for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry) days.push(entry);
        }
        const count = days.length || 1;
        return { date: format(monthStart, 'yyyy-MM-dd'), value: Math.round((days.reduce((s, d) => s + d.total_minutes, 0) / count / 60) * 10) / 10 };
      }),
      bedtime: months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const times: number[] = [];
        for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry?.bedtime) times.push(timeToDecimal(entry.bedtime));
        }
        const avg = times.length > 0 ? Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 10) / 10 : 0;
        return { date: format(monthStart, 'yyyy-MM-dd'), value: avg };
      }).filter((d) => d.value > 0),
      waketime: months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const times: number[] = [];
        for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86400000)) {
          const entry = dataMap.get(format(d, 'yyyy-MM-dd'));
          if (entry?.wake_time) {
            let val = timeToDecimal(entry.wake_time);
            if (val >= 24) val -= 24;
            times.push(val);
          }
        }
        const avg = times.length > 0 ? Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 10) / 10 : 0;
        return { date: format(monthStart, 'yyyy-MM-dd'), value: avg };
      }).filter((d) => d.value > 0),
    };
  }, [data]);

  const sourceData = period === 'daily' ? dailyData : period === 'weekly' ? weeklyData : monthlyData;
  const chartData = sourceData[metric];

  const metricConfig: Record<Metric, { color: string; label: string; formatter: (v: number) => string }> = {
    total: { color: '#00bcd4', label: 'Sleep', formatter: formatHoursToHrMin },
    bedtime: { color: '#8b5cf6', label: 'Bed Time', formatter: decimalToTimeLabel },
    waketime: { color: '#f59e0b', label: 'Wake Time', formatter: decimalToTimeLabel },
  };

  const config = metricConfig[metric];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle>Trends</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  style={period === p.value ? { background: 'var(--border)', color: 'var(--fg)' } : { color: 'var(--fg-muted)' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
              {metrics.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMetric(m.value)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  style={metric === m.value ? { background: 'var(--border)', color: 'var(--fg)' } : { color: 'var(--fg-muted)' }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
              <button
                onClick={() => setChartType('line')}
                title="Line chart"
                className="p-1.5 rounded-md transition-colors"
                style={chartType === 'line' ? { background: 'var(--border)', color: 'var(--fg)' } : { color: 'var(--fg-muted)' }}
              >
                <LineChart size={14} />
              </button>
              <button
                onClick={() => setChartType('bar')}
                title="Bar chart"
                className="p-1.5 rounded-md transition-colors"
                style={chartType === 'bar' ? { background: 'var(--border)', color: 'var(--fg)' } : { color: 'var(--fg-muted)' }}
              >
                <BarChart2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--fg-muted)' }}>No sleep data yet</p>
        ) : chartType === 'line' ? (
          <TrendLine data={chartData} color={config.color} label={config.label} formatter={config.formatter} />
        ) : (
          <TrendBar data={chartData} color={config.color} label={config.label} period={period} formatter={config.formatter} />
        )}
      </CardContent>
    </Card>
  );
}
