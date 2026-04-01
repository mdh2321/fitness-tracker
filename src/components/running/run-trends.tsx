'use client';

import { useState, useMemo } from 'react';
import { format, parseISO, subDays, subWeeks, startOfWeek, startOfMonth, isAfter } from 'date-fns';
import type { Workout } from '@/lib/types';
import { TrendLine } from '@/components/charts/trend-line';
import { TrendBar } from '@/components/charts/trend-bar';

interface RunTrendsProps {
  runs: Workout[];
}

type Granularity = 'daily' | 'weekly' | 'monthly';

const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

function getDateValue(r: Workout) {
  return r.local_date ?? format(parseISO(r.started_at), 'yyyy-MM-dd');
}

// Group runs into buckets and aggregate
function aggregate(
  runs: Workout[],
  granularity: Granularity,
  getValue: (r: Workout) => number | null,
  mode: 'sum' | 'avg',
): { date: string; value: number }[] {
  if (granularity === 'daily') {
    return runs
      .map((r) => {
        const v = getValue(r);
        return v != null ? { date: getDateValue(r), value: v } : null;
      })
      .filter((d): d is { date: string; value: number } => d !== null);
  }

  const buckets = new Map<string, number[]>();
  for (const r of runs) {
    const v = getValue(r);
    if (v == null) continue;
    const d = parseISO(getDateValue(r));
    const key = granularity === 'weekly'
      ? format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(startOfMonth(d), 'yyyy-MM-dd');
    const arr = buckets.get(key) ?? [];
    arr.push(v);
    buckets.set(key, arr);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      value: mode === 'sum'
        ? vals.reduce((s, v) => s + v, 0)
        : vals.reduce((s, v) => s + v, 0) / vals.length,
    }));
}

export function RunTrends({ runs }: RunTrendsProps) {
  const [granularity, setGranularity] = useState<Granularity>('daily');

  const sorted = useMemo(() =>
    [...runs].sort((a, b) => a.started_at.localeCompare(b.started_at)),
    [runs]
  );

  // Auto-derive window from granularity: daily=28d, weekly=3m, monthly=all
  const filtered = useMemo(() => {
    if (granularity === 'monthly') return sorted;
    const now = new Date();
    const cutoff = granularity === 'daily' ? subDays(now, 28) : subWeeks(now, 13);
    return sorted.filter((r) => isAfter(parseISO(r.started_at), cutoff));
  }, [sorted, granularity]);

  // Distance: sum for weekly/monthly (total volume), individual for daily
  const distanceData = aggregate(
    filtered,
    granularity,
    (r) => (r.distance_km != null && r.distance_km > 0) ? r.distance_km : null,
    granularity === 'daily' ? 'avg' : 'sum',
  );

  // HR: always average
  const hrData = aggregate(
    filtered,
    granularity,
    (r) => r.avg_heart_rate,
    'avg',
  );

  // Duration: sum for weekly/monthly (total volume), individual for daily
  const durationData = aggregate(
    filtered,
    granularity,
    (r) => r.duration_minutes,
    granularity === 'daily' ? 'avg' : 'sum',
  );

  // Pace: always average (min/km) — only from runs with distance
  const paceData = aggregate(
    filtered,
    granularity,
    (r) => (r.distance_km != null && r.distance_km > 0) ? r.duration_minutes / r.distance_km : null,
    'avg',
  );

  const formatPace = (v: number) => {
    const m = Math.floor(v);
    const s = Math.round((v - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')} /km`;
  };

  const barPeriod = granularity === 'monthly' ? 'monthly' : granularity === 'weekly' ? 'weekly' : 'daily';
  const useBar = granularity !== 'daily';

  if (runs.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No running data to chart yet.</p>
      </div>
    );
  }

  const segmentedControl = (
    items: { key: string; label: string }[],
    active: string,
    onSelect: (key: string) => void,
  ) => (
    <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          className="px-3 py-1 text-xs font-medium transition-colors"
          style={{
            background: active === item.key ? 'var(--bg-elevated)' : 'transparent',
            color: active === item.key ? 'var(--fg)' : 'var(--fg-muted)',
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  const renderChart = (
    data: { date: string; value: number }[],
    color: string,
    label: string,
    formatter: (v: number) => string,
    isVolume: boolean,
  ) => {
    if (data.length === 0) {
      return <p className="text-xs py-16 text-center" style={{ color: 'var(--fg-muted)' }}>No data</p>;
    }
    // Volume metrics (distance, duration) use bars when aggregated, lines for daily per-run
    // Rate metrics (HR, pace) always use lines to show trajectory
    if (isVolume && useBar) {
      return <TrendBar data={data} color={color} label={label} formatter={formatter} period={barPeriod} />;
    }
    return <TrendLine data={data} color={color} label={label} formatter={formatter} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Trends</h2>
        {segmentedControl(GRANULARITIES, granularity, (k) => setGranularity(k as Granularity))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Distance {useBar ? '(total)' : ''}
          </h3>
          {renderChart(distanceData, '#00d26a', 'Distance', (v) => `${v.toFixed(1)} km`, true)}
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Heart Rate {useBar ? '(avg)' : ''}
          </h3>
          {renderChart(hrData, '#ff3b5c', 'Avg HR', (v) => `${Math.round(v)} bpm`, false)}
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Duration {useBar ? '(total)' : ''}
          </h3>
          {renderChart(durationData, '#00bcd4', 'Duration', (v) => `${Math.round(v)} min`, true)}
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Avg Pace
          </h3>
          {renderChart(paceData, '#8b5cf6', 'Pace', formatPace, false)}
        </div>
      </div>
    </div>
  );
}
