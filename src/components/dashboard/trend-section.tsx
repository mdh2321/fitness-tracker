'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useStrainData } from '@/hooks/use-stats';
import { useSleepHistory } from '@/hooks/use-sleep';
import { useTheme } from '@/components/providers/theme-provider';
import {
  ComposedChart, Bar, Area, Line, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { LineChart as LineIcon, BarChart2 } from 'lucide-react';
import {
  format, parseISO, subDays, eachWeekOfInterval, endOfWeek,
  eachMonthOfInterval, endOfMonth,
} from 'date-fns';

type Period = 'daily' | 'weekly' | 'monthly';
type Metric = 'strain' | 'steps' | 'activeTime' | 'workoutTime' | 'sleep';
type ChartType = 'line' | 'bar';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const RANGES: { value: number; label: string }[] = [
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 365, label: '1y' },
  { value: 3650, label: 'All' },
];

const METRICS: { value: Metric; label: string }[] = [
  { value: 'strain', label: 'Strain' },
  { value: 'steps', label: 'Steps' },
  { value: 'activeTime', label: 'Active time' },
  { value: 'workoutTime', label: 'Workout time' },
  { value: 'sleep', label: 'Sleep' },
];

interface DataPoint {
  date: string;
  value: number;
  avg?: number;
}

interface TrendSectionProps {
  dailyTargets: { strain: number; steps: number; activeMinutes: number; sleepMinutes: number };
  weeklyStepsTarget: number;
}

export function TrendSection({ dailyTargets, weeklyStepsTarget }: TrendSectionProps) {
  const [period, setPeriod] = useState<Period>('daily');
  const [metric, setMetric] = useState<Metric>('strain');
  const [range, setRange] = useState(90);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const { theme } = useTheme();

  const { data: strainData } = useStrainData(range);
  const today = format(new Date(), 'yyyy-MM-dd');
  const sleepFrom = format(subDays(new Date(), range), 'yyyy-MM-dd');
  const { history: sleepHistory } = useSleepHistory(metric === 'sleep' ? sleepFrom : '', today);

  const config = useMemo(() => ({
    strain: {
      color: 'var(--accent)', hex: undefined as string | undefined,
      dailyTarget: dailyTargets.strain, weeklyTarget: undefined as number | undefined,
      agg: 'avg' as const, unit: '', fmt: (v: number) => v.toFixed(1),
    },
    steps: {
      color: '#ff6b35', hex: '#ff6b35',
      dailyTarget: dailyTargets.steps, weeklyTarget: weeklyStepsTarget,
      agg: 'sum' as const, unit: '', fmt: (v: number) => Math.round(v).toLocaleString(),
    },
    activeTime: {
      color: '#00bcd4', hex: '#00bcd4',
      dailyTarget: dailyTargets.activeMinutes, weeklyTarget: undefined,
      agg: 'sum' as const, unit: ' min', fmt: (v: number) => `${Math.round(v)} min`,
    },
    workoutTime: {
      color: '#a78bfa', hex: '#a78bfa',
      dailyTarget: undefined, weeklyTarget: undefined,
      agg: 'sum' as const, unit: ' min', fmt: (v: number) => `${Math.round(v)} min`,
    },
    sleep: {
      color: '#8b5cf6', hex: '#8b5cf6',
      dailyTarget: Math.round((dailyTargets.sleepMinutes / 60) * 10) / 10, weeklyTarget: undefined,
      agg: 'avg' as const, unit: 'h', fmt: (v: number) => `${v.toFixed(1)}h`,
    },
  }[metric]), [metric, dailyTargets, weeklyStepsTarget]);

  // Daily series for the selected metric
  const dailySeries: DataPoint[] = useMemo(() => {
    if (metric === 'sleep') {
      return [...sleepHistory]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => ({ date: s.date, value: Math.round((s.total_minutes / 60) * 10) / 10 }));
    }
    if (!strainData) return [];
    const extract = {
      strain: (d: typeof strainData[number]) => d.strain_score,
      steps: (d: typeof strainData[number]) => d.steps || 0,
      activeTime: (d: typeof strainData[number]) => d.total_duration,
      workoutTime: (d: typeof strainData[number]) => d.workout_duration ?? 0,
    }[metric];
    return [...strainData]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ date: d.date, value: extract(d) }));
  }, [metric, strainData, sleepHistory]);

  // Aggregate into weeks/months: sum for volumes, avg of non-zero days for scores
  const aggregated: DataPoint[] = useMemo(() => {
    if (period === 'daily' || dailySeries.length < 2) {
      // rolling 7-day average overlay for daily view
      return dailySeries.map((d, i) => {
        const window = dailySeries.slice(Math.max(0, i - 6), i + 1);
        return { ...d, avg: window.reduce((a, b) => a + b.value, 0) / window.length };
      });
    }
    const first = parseISO(dailySeries[0].date);
    const last = parseISO(dailySeries[dailySeries.length - 1].date);
    const buckets = period === 'weekly'
      ? eachWeekOfInterval({ start: first, end: last }, { weekStartsOn: 1 })
          .map((s) => ({ start: s, end: endOfWeek(s, { weekStartsOn: 1 }) }))
      : eachMonthOfInterval({ start: first, end: last })
          .map((s) => ({ start: s, end: endOfMonth(s) }));
    const byDate = new Map(dailySeries.map((d) => [d.date, d.value]));
    return buckets.map(({ start, end }) => {
      let sum = 0, count = 0;
      for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
        const v = byDate.get(format(d, 'yyyy-MM-dd'));
        if (v !== undefined && (config.agg === 'sum' || v > 0)) { sum += v; count++; }
      }
      const value = config.agg === 'avg'
        ? (count > 0 ? Math.round((sum / count) * 10) / 10 : 0)
        : sum;
      return { date: format(start, 'yyyy-MM-dd'), value };
    });
  }, [dailySeries, period, config.agg]);

  const target = period === 'daily' ? config.dailyTarget
    : period === 'weekly' ? config.weeklyTarget
    : undefined;

  // Footer stats
  const footer = useMemo(() => {
    if (aggregated.length === 0) return null;
    const peak = aggregated.reduce((a, b) => (b.value > a.value ? b : a));
    let avg7: number | null = null;
    let avg7Dir: 'up' | 'down' | null = null;
    let daysHit: number | null = null;
    if (period === 'daily' && dailySeries.length >= 7) {
      const lastWeek = dailySeries.slice(-7).map((d) => d.value);
      const prevWeek = dailySeries.slice(-14, -7).map((d) => d.value);
      avg7 = lastWeek.reduce((a, b) => a + b, 0) / lastWeek.length;
      if (prevWeek.length === 7) {
        const prev = prevWeek.reduce((a, b) => a + b, 0) / prevWeek.length;
        avg7Dir = avg7 >= prev ? 'up' : 'down';
      }
    }
    if (period === 'daily' && target !== undefined) {
      daysHit = dailySeries.filter((d) => d.value >= target).length;
    }
    return { peak, avg7, avg7Dir, daysHit };
  }, [aggregated, dailySeries, period, target]);

  const ct = {
    tick: theme === 'light' ? '#84848f' : '#6b6b78',
    grid: theme === 'light' ? '#d9d9e2' : '#1e1e26',
    tooltipBg: theme === 'light' ? '#ffffff' : '#15151d',
    tooltipColor: theme === 'light' ? '#16161a' : '#ececf1',
  };

  const dateFormat = period === 'monthly' ? 'MMM yy' : 'MMM d';
  const chartData = aggregated.map((d) => ({ ...d, label: format(parseISO(d.date), dateFormat) }));
  const metricLabel = METRICS.find((m) => m.value === metric)!.label;

  const segBtn = (active: boolean) => ({
    className: 'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
    style: active
      ? { background: 'var(--bg-hover)', color: 'var(--fg)' }
      : { color: 'var(--fg-muted)' },
  });

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        {/* Metric chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {METRICS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMetric(m.value)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors"
              style={metric === m.value
                ? { background: 'color-mix(in srgb, var(--accent) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)', color: 'var(--accent)' }
                : { borderColor: 'transparent', color: 'var(--fg-muted)' }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => setPeriod(p.value)} {...segBtn(period === p.value)}>{p.label}</button>
            ))}
          </div>
          <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
            {RANGES.map((r) => (
              <button key={r.value} onClick={() => setRange(r.value)} {...segBtn(range === r.value)}>{r.label}</button>
            ))}
          </div>
          <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
            <button onClick={() => setChartType('line')} title="Line chart" {...segBtn(chartType === 'line')}>
              <LineIcon size={14} />
            </button>
            <button onClick={() => setChartType('bar')} title="Bar chart" {...segBtn(chartType === 'bar')}>
              <BarChart2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 12, right: 10, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: ct.tick, fontSize: 11 }} interval="preserveStartEnd" minTickGap={40} />
          <YAxis
            axisLine={false} tickLine={false} width={48} domain={[0, 'auto']}
            tick={{ fill: ct.tick, fontSize: 11 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: 'rgba(128,128,128,0.06)' }}
            contentStyle={{
              backgroundColor: ct.tooltipBg, border: `1px solid ${ct.grid}`, borderRadius: '10px',
              color: ct.tooltipColor, fontSize: '12px', padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            formatter={(value: unknown, name: unknown) => [
              config.fmt(Number(value)),
              name === 'avg' ? '7-day avg' : metricLabel,
            ]}
          />
          {chartType === 'bar' ? (
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={26}>
              {chartData.map((d) => (
                <Cell
                  key={d.date}
                  fill={config.color}
                  fillOpacity={target !== undefined ? (d.value >= target ? 1 : 0.35) : 0.8}
                />
              ))}
            </Bar>
          ) : (
            <Area
              type="monotone" dataKey="value"
              stroke={config.color} strokeWidth={2.2}
              fill={config.color} fillOpacity={0.08}
              dot={false} activeDot={{ r: 4, fill: config.color }}
            />
          )}
          {period === 'daily' && chartData.length >= 7 && (
            <Line type="monotone" dataKey="avg" stroke="var(--fg)" strokeWidth={1.6} strokeOpacity={0.7} dot={false} activeDot={false} />
          )}
          {target !== undefined && (
            <ReferenceLine
              y={target} stroke={ct.tick} strokeDasharray="4 5"
              label={{ value: `target ${config.fmt(target)}`, position: 'insideTopRight', fill: ct.tick, fontSize: 11 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {footer && (
        <div className="flex items-center gap-6 flex-wrap mt-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
          <span>
            Peak <b className="font-semibold" style={{ color: 'var(--fg-secondary)' }}>
              {config.fmt(footer.peak.value)} · {format(parseISO(footer.peak.date), 'MMM d')}
            </b>
          </span>
          {footer.avg7 != null && (
            <span>
              7-day avg <b className="font-semibold" style={{ color: 'var(--accent)' }}>
                {config.fmt(footer.avg7)}{footer.avg7Dir ? (footer.avg7Dir === 'up' ? ' ↑' : ' ↓') : ''}
              </b>
            </span>
          )}
          {footer.daysHit != null && (
            <span>
              Days ≥ target <b className="font-semibold" style={{ color: 'var(--fg-secondary)' }}>
                {footer.daysHit} of {dailySeries.length}
              </b>
            </span>
          )}
          {target !== undefined && (
            <span className="ml-auto">- - - target from your goals in Settings</span>
          )}
        </div>
      )}
    </Card>
  );
}
