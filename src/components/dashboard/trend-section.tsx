'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useStrainData } from '@/hooks/use-stats';
import { useSleepHistory } from '@/hooks/use-sleep';
import { useTheme } from '@/components/providers/theme-provider';
import {
  ComposedChart, Bar, Area, Line, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceDot,
} from 'recharts';
import {
  format, parseISO, subDays, eachWeekOfInterval, endOfWeek,
  eachMonthOfInterval, endOfMonth, getDaysInMonth,
} from 'date-fns';

type Granularity = 'days' | 'weeks' | 'months';
type Metric = 'strain' | 'steps' | 'activeTime' | 'workoutTime' | 'sleep';

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
];

// Days shows the last 30 (fetch extra so the 7-day avg is correct from day one);
// Weeks shows the last 26; Months shows all history.
const FETCH_DAYS: Record<Granularity, number> = { days: 37, weeks: 183, months: 3650 };
const SHOWN_DAYS = 30;

const METRICS: { value: Metric; label: string; color: string }[] = [
  { value: 'strain', label: 'Strain', color: '#00d26a' },
  { value: 'steps', label: 'Steps', color: '#ff6b35' },
  { value: 'activeTime', label: 'Active time', color: '#00bcd4' },
  { value: 'workoutTime', label: 'Workout time', color: '#a78bfa' },
  { value: 'sleep', label: 'Sleep', color: '#8b5cf6' },
];

interface DataPoint {
  date: string;
  value: number;
  avg?: number;
  target?: number;
  partial?: boolean;
}

interface ChartPoint extends DataPoint {
  label: string;
  prev?: number;
}

interface TrendSectionProps {
  dailyTargets: { strain: number; steps: number; activeMinutes: number; sleepMinutes: number };
  weeklyTargets: { steps: number; cardioMinutes: number };
}

export function TrendSection({ dailyTargets, weeklyTargets }: TrendSectionProps) {
  const [granularity, setGranularity] = useState<Granularity>('days');
  const [metric, setMetric] = useState<Metric>('strain');
  const { theme } = useTheme();

  const fetchDays = FETCH_DAYS[granularity];
  const { data: strainData } = useStrainData(fetchDays);
  const today = format(new Date(), 'yyyy-MM-dd');
  const sleepFrom = format(subDays(new Date(), fetchDays), 'yyyy-MM-dd');
  // Always fetched so switching to the Sleep chip is instant
  const { history: sleepHistory } = useSleepHistory(sleepFrom, today);

  const config = useMemo(() => ({
    strain: {
      color: METRICS[0].color, kind: 'avg' as const,
      dailyTarget: dailyTargets.strain as number | undefined,
      weeklyTarget: undefined as number | undefined,
      fmt: (v: number) => v.toFixed(1),
    },
    steps: {
      color: METRICS[1].color, kind: 'sum' as const,
      dailyTarget: dailyTargets.steps as number | undefined,
      weeklyTarget: weeklyTargets.steps as number | undefined,
      fmt: (v: number) => Math.round(v).toLocaleString(),
    },
    activeTime: {
      color: METRICS[2].color, kind: 'sum' as const,
      dailyTarget: dailyTargets.activeMinutes as number | undefined,
      weeklyTarget: undefined as number | undefined,
      fmt: (v: number) => `${Math.round(v)} min`,
    },
    workoutTime: {
      color: METRICS[3].color, kind: 'sum' as const,
      dailyTarget: undefined as number | undefined,
      weeklyTarget: weeklyTargets.cardioMinutes as number | undefined,
      fmt: (v: number) => `${Math.round(v)} min`,
    },
    sleep: {
      color: METRICS[4].color, kind: 'avg' as const,
      dailyTarget: (Math.round((dailyTargets.sleepMinutes / 60) * 10) / 10) as number | undefined,
      weeklyTarget: undefined as number | undefined,
      fmt: (v: number) => `${v.toFixed(1)}h`,
    },
  }[metric]), [metric, dailyTargets, weeklyTargets]);

  const isBar = config.kind === 'sum';

  // Daily series for the selected metric
  const dailySeries = useMemo(() => {
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

  // One target per bucket: averages keep the daily target at every granularity;
  // sums scale to the bucket (explicit weekly setting wins over daily x 7)
  const bucketTarget = useMemo(() => (start: Date): number | undefined => {
    if (config.kind === 'avg') return config.dailyTarget;
    if (granularity === 'days') return config.dailyTarget;
    if (granularity === 'weeks') {
      return config.weeklyTarget ?? (config.dailyTarget !== undefined ? config.dailyTarget * 7 : undefined);
    }
    return config.dailyTarget !== undefined ? config.dailyTarget * getDaysInMonth(start) : undefined;
  }, [config, granularity]);

  // Aggregate into days/weeks/months: sum for volumes, avg of non-zero days for scores
  const aggregated: DataPoint[] = useMemo(() => {
    if (dailySeries.length === 0) return [];
    if (granularity === 'days') {
      const cutoff = format(subDays(new Date(), SHOWN_DAYS - 1), 'yyyy-MM-dd');
      return dailySeries
        .map((d, i) => {
          const window = dailySeries.slice(Math.max(0, i - 6), i + 1);
          return {
            ...d,
            avg: window.reduce((a, b) => a + b.value, 0) / window.length,
            target: config.dailyTarget,
            partial: config.kind === 'sum' && d.date === today ? true : undefined,
          };
        })
        .filter((d) => d.date >= cutoff);
    }
    const first = parseISO(dailySeries[0].date);
    const last = parseISO(dailySeries[dailySeries.length - 1].date);
    let buckets = granularity === 'weeks'
      ? eachWeekOfInterval({ start: first, end: last }, { weekStartsOn: 1 })
          .map((s) => ({ start: s, end: endOfWeek(s, { weekStartsOn: 1 }) }))
      : eachMonthOfInterval({ start: first, end: last })
          .map((s) => ({ start: s, end: endOfMonth(s) }));
    // Drop a leading week clipped by the fetch window (not by the start of history)
    if (granularity === 'weeks' && buckets.length > 0 && buckets[0].start < subDays(new Date(), fetchDays)) {
      buckets = buckets.slice(1);
    }
    const byDate = new Map(dailySeries.map((d) => [d.date, d.value]));
    return buckets.map(({ start, end }) => {
      let sum = 0, count = 0;
      for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
        const v = byDate.get(format(d, 'yyyy-MM-dd'));
        if (v !== undefined && (config.kind === 'sum' || v > 0)) { sum += v; count++; }
      }
      const value = config.kind === 'avg'
        ? (count > 0 ? Math.round((sum / count) * 10) / 10 : 0)
        : sum;
      return {
        date: format(start, 'yyyy-MM-dd'),
        value,
        target: bucketTarget(start),
        partial: format(end, 'yyyy-MM-dd') >= today ? true : undefined,
      };
    });
  }, [dailySeries, granularity, config, today, fetchDays, bucketTarget]);

  const dateFormat = granularity === 'months' ? 'MMM yy' : 'MMM d';
  const chartData: ChartPoint[] = useMemo(() => aggregated.map((d, i) => ({
    ...d,
    label: format(parseISO(d.date), dateFormat),
    prev: aggregated[i - 1]?.value,
  })), [aggregated, dateFormat]);

  // Single reference line; per-bucket targets drive bar shading and tooltip deltas
  // (month targets vary slightly with month length, the line sits at their mean)
  const targetLine = useMemo(() => {
    const ts = aggregated.map((d) => d.target).filter((t): t is number => t !== undefined);
    return ts.length > 0 ? ts.reduce((a, b) => a + b, 0) / ts.length : undefined;
  }, [aggregated]);

  // Headline: current period vs the previous one
  const headline = useMemo(() => {
    if (granularity === 'days') {
      if (dailySeries.length < 7) return null;
      const week = dailySeries.slice(-7).map((d) => d.value);
      const prevWeek = dailySeries.slice(-14, -7).map((d) => d.value);
      const value = week.reduce((a, b) => a + b, 0) / week.length;
      const prev = prevWeek.length === 7 ? prevWeek.reduce((a, b) => a + b, 0) / prevWeek.length : 0;
      return {
        value, label: '7-day avg',
        delta: prev > 0 ? (value - prev) / prev : null,
        deltaLabel: 'vs prior 7 days',
      };
    }
    if (aggregated.length === 0) return null;
    const cur = aggregated[aggregated.length - 1];
    const prev = aggregated[aggregated.length - 2];
    const noun = granularity === 'weeks' ? 'week' : 'month';
    return {
      value: cur.value,
      label: cur.partial && config.kind === 'sum' ? `this ${noun} so far` : `this ${noun}`,
      delta: prev && prev.value > 0 ? (cur.value - prev.value) / prev.value : null,
      deltaLabel: `vs last ${noun}`,
    };
  }, [granularity, dailySeries, aggregated, config.kind]);

  // Footer: peak + target hit rate over complete buckets
  const footer = useMemo(() => {
    if (aggregated.length === 0) return null;
    const complete = aggregated.filter((d) => !d.partial);
    const pool = complete.length > 0 ? complete : aggregated;
    const peak = pool.reduce((a, b) => (b.value > a.value ? b : a));
    const hasTarget = complete.some((d) => d.target !== undefined);
    const hit = hasTarget
      ? complete.filter((d) => d.target !== undefined && d.value >= d.target).length
      : null;
    return { peak, hit, total: complete.length };
  }, [aggregated]);

  const ct = {
    tick: theme === 'light' ? '#84848f' : '#6b6b78',
    grid: theme === 'light' ? '#d9d9e2' : '#1e1e26',
    tooltipBg: theme === 'light' ? '#ffffff' : '#15151d',
    tooltipColor: theme === 'light' ? '#16161a' : '#ececf1',
  };

  const metricLabel = METRICS.find((m) => m.value === metric)!.label;
  const bucketNoun = granularity === 'days' ? 'day' : granularity === 'weeks' ? 'week' : 'month';

  // Ticks at Mondays (days) or month boundaries (weeks); months label every bar
  const ticks = useMemo(() => {
    if (granularity === 'days') {
      return chartData.filter((d) => parseISO(d.date).getDay() === 1).map((d) => d.label);
    }
    if (granularity === 'weeks') {
      const out: string[] = [];
      let lastMonth = -1;
      for (const d of chartData) {
        const m = parseISO(d.date).getMonth();
        if (m !== lastMonth) { out.push(d.label); lastMonth = m; }
      }
      return out;
    }
    return undefined;
  }, [chartData, granularity]);

  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload: ChartPoint }> }) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0].payload;
    const d = parseISO(p.date);
    const title = granularity === 'days' ? format(d, 'EEE, MMM d')
      : granularity === 'weeks' ? `Week of ${format(d, 'MMM d')}`
      : format(d, 'MMMM yyyy');
    const pct = p.prev !== undefined && p.prev > 0 ? ((p.value - p.prev) / p.prev) * 100 : null;
    return (
      <div style={{
        background: ct.tooltipBg, border: `1px solid ${ct.grid}`, borderRadius: 10,
        padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: 12, color: ct.tooltipColor,
      }}>
        <div style={{ color: ct.tick, marginBottom: 4 }}>{title}{p.partial ? ' · in progress' : ''}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: config.color }} />
          {config.fmt(p.value)}
        </div>
        {granularity === 'days' && p.avg !== undefined && (
          <div style={{ color: ct.tick, marginTop: 3 }}>7-day avg {config.fmt(p.avg)}</div>
        )}
        {p.target !== undefined && (
          <div style={{ color: ct.tick, marginTop: 3 }}>
            {p.partial || p.value >= p.target
              ? `target ${config.fmt(p.target)}${!p.partial ? ' ✓' : ''}`
              : `target ${config.fmt(p.target)} · ${config.fmt(p.target - p.value)} short`}
          </div>
        )}
        {granularity !== 'days' && !p.partial && pct !== null && (
          <div style={{ marginTop: 3, color: pct >= 0 ? '#00d26a' : '#ff3b5c' }}>
            {pct >= 0 ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}% vs prev {bucketNoun}
          </div>
        )}
      </div>
    );
  };

  const segBtn = (active: boolean) => ({
    className: 'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
    style: active
      ? { background: 'var(--bg-hover)', color: 'var(--fg)' }
      : { color: 'var(--fg-muted)' },
  });

  const peakLabel = footer ? format(parseISO(footer.peak.date), dateFormat) : '';

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        {/* Metric chips, tinted with each metric's chart color */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {METRICS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMetric(m.value)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors"
              style={metric === m.value
                ? { background: `color-mix(in srgb, ${m.color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${m.color} 40%, transparent)`, color: m.color }
                : { borderColor: 'transparent', color: 'var(--fg-muted)' }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
          {GRANULARITIES.map((g) => (
            <button key={g.value} onClick={() => setGranularity(g.value)} {...segBtn(granularity === g.value)}>{g.label}</button>
          ))}
        </div>
      </div>

      {headline && (
        <div className="flex items-end gap-3 mb-2">
          <div>
            <div className="font-display text-2xl font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>
              {config.fmt(headline.value)}
            </div>
            <div className="text-[11.5px]" style={{ color: 'var(--fg-muted)' }}>
              {metricLabel} · {headline.label}
            </div>
          </div>
          {headline.delta !== null && (
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-medium mb-0.5"
              style={{
                background: `color-mix(in srgb, ${headline.delta >= 0 ? '#00d26a' : '#ff3b5c'} 12%, transparent)`,
                color: headline.delta >= 0 ? '#00d26a' : '#ff3b5c',
              }}
            >
              {headline.delta >= 0 ? '↑' : '↓'} {Math.abs(headline.delta * 100).toFixed(0)}% {headline.deltaLabel}
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 12, right: 10, bottom: 0, left: 0 }} barCategoryGap="22%">
          <defs>
            <linearGradient id={`trendFill-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={config.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="label" axisLine={false} tickLine={false}
            tick={{ fill: ct.tick, fontSize: 11 }}
            {...(ticks !== undefined
              ? { ticks: ticks as string[], interval: 0 as const }
              : { interval: 'preserveStartEnd' as const, minTickGap: 40 })}
          />
          <YAxis
            axisLine={false} tickLine={false} width={48} domain={[0, 'auto']}
            tick={{ fill: ct.tick, fontSize: 11 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))}
          />
          <Tooltip cursor={{ fill: 'rgba(128,128,128,0.06)' }} content={renderTooltip} />
          {isBar ? (
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={26}>
              {chartData.map((d) => (
                d.partial ? (
                  <Cell
                    key={d.date}
                    fill={config.color} fillOpacity={0.15}
                    stroke={config.color} strokeWidth={1.5} strokeDasharray="4 3"
                  />
                ) : (
                  <Cell
                    key={d.date}
                    fill={config.color}
                    fillOpacity={d.target !== undefined ? (d.value >= d.target ? 1 : 0.35) : 0.8}
                  />
                )
              ))}
            </Bar>
          ) : (
            <Area
              type="monotone" dataKey="value"
              stroke={config.color} strokeWidth={2.2}
              fill={`url(#trendFill-${metric})`}
              dot={false} activeDot={{ r: 4, fill: config.color }}
            />
          )}
          {granularity === 'days' && chartData.length >= 7 && (
            <Line type="monotone" dataKey="avg" stroke="var(--fg)" strokeWidth={1.6} strokeOpacity={0.7} dot={false} activeDot={false} />
          )}
          {!isBar && footer && footer.peak.value > 0 && (
            <ReferenceDot x={peakLabel} y={footer.peak.value} r={3.5} fill={config.color} stroke={ct.tooltipBg} strokeWidth={1.5} />
          )}
          {targetLine !== undefined && (
            <ReferenceLine
              y={targetLine} stroke={ct.tick} strokeDasharray="4 5"
              label={{ value: `target ${config.fmt(targetLine)}`, position: 'insideTopRight', fill: ct.tick, fontSize: 11 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {footer && (
        <div className="flex items-center gap-6 flex-wrap mt-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
          <span>
            Peak <b className="font-semibold" style={{ color: 'var(--fg-secondary)' }}>
              {config.fmt(footer.peak.value)} · {granularity === 'weeks' ? `wk of ${peakLabel}` : peakLabel}
            </b>
          </span>
          {footer.hit !== null && footer.total > 0 && (
            <span>
              {bucketNoun.charAt(0).toUpperCase() + bucketNoun.slice(1)}s ≥ target <b className="font-semibold" style={{ color: 'var(--fg-secondary)' }}>
                {footer.hit} of {footer.total}
              </b>
            </span>
          )}
          {targetLine !== undefined && (
            <span className="ml-auto">- - - target from your goals in Settings</span>
          )}
        </div>
      )}
    </Card>
  );
}
