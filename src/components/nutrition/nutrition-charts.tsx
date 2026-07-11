'use client';

import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { format, parseISO, startOfWeek } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/components/providers/theme-provider';
import type { TrendDay } from '@/hooks/use-nutrition';

const GREEN = '#00d26a';
const RED = '#ff3b5c';
const TEAL = '#00bcd4';

function useChartTheme() {
  const { theme } = useTheme();
  return {
    tick: theme === 'light' ? '#84848f' : '#6b6b78',
    faint: theme === 'light' ? '#a7a7b3' : '#4b4b58',
    targetLine: theme === 'light' ? '#b3b3c2' : '#4a4a5c',
    tooltipBg: theme === 'light' ? '#ffffff' : '#1e1e28',
    tooltipBorder: theme === 'light' ? '#d9d9e2' : '#34343f',
    tooltipColor: theme === 'light' ? '#16161a' : '#ececf1',
  };
}

function tooltipStyle(ct: ReturnType<typeof useChartTheme>) {
  return {
    backgroundColor: ct.tooltipBg,
    border: `1px solid ${ct.tooltipBorder}`,
    borderRadius: '10px',
    color: ct.tooltipColor,
    fontSize: '12px',
    padding: '8px 12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  };
}

function GradientDefs({ id, color, dim }: { id: string; color: string; dim?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={dim ? 0.45 : 1} />
      <stop offset="100%" stopColor={color} stopOpacity={dim ? 0.1 : 0.26} />
    </linearGradient>
  );
}

function ChartHeader({
  title,
  stat,
  statSuffix,
  chip,
  chipTone,
}: {
  title: string;
  stat: string;
  statSuffix: string;
  chip: string | null;
  chipTone: 'green' | 'teal' | 'red';
}) {
  const tones = {
    green: { background: 'rgba(0,210,106,.12)', color: GREEN },
    teal: { background: 'rgba(0,188,212,.12)', color: TEAL },
    red: { background: 'rgba(255,59,92,.12)', color: RED },
  };
  return (
    <div className="flex items-start justify-between mb-3">
      <div>
        <h2 className="text-[13px] font-semibold" style={{ color: 'var(--fg-secondary)' }}>{title}</h2>
        <div className="mt-1 leading-none">
          <span className="text-2xl font-bold tracking-tight tabular-nums" style={{ color: 'var(--fg)' }}>{stat}</span>
          <span className="text-xs ml-1.5" style={{ color: 'var(--fg-muted)' }}>{statSuffix}</span>
        </div>
      </div>
      {chip && (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap tabular-nums" style={tones[chipTone]}>
          {chip}
        </span>
      )}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <p className="text-sm py-10 text-center" style={{ color: 'var(--fg-muted)' }}>{label}</p>
  );
}

// ── Daily trend: last 14 logged days vs daily target ─────────────────────────

export function DailyTrendCard({
  metric,
  days,
  target,
}: {
  metric: 'calories' | 'protein';
  days: TrendDay[];
  target: number;
}) {
  const ct = useChartTheme();
  const isCal = metric === 'calories';
  const gid = `grad-daily-${metric}`;

  const points = useMemo(
    () =>
      days.slice(-14).map((d) => ({
        date: d.date,
        label: format(parseISO(d.date), 'EEEEE'),
        value: isCal ? d.calories : d.protein_g,
      })),
    [days, isCal],
  );

  const avg = points.length > 0 ? Math.round(points.reduce((s, p) => s + p.value, 0) / points.length) : 0;

  let chip: string | null = null;
  let chipTone: 'green' | 'teal' | 'red' = isCal ? 'green' : 'teal';
  if (points.length > 0) {
    if (isCal) {
      const delta = target - avg;
      chip = delta >= 0 ? `${delta.toLocaleString()} under target` : `${Math.abs(delta).toLocaleString()} over target`;
      chipTone = delta >= 0 ? 'green' : 'red';
    } else {
      const hits = points.filter((p) => p.value >= target).length;
      chip = `hit ${hits} of ${points.length} days`;
    }
  }

  const barFill = (value: number) => {
    if (isCal) return value > target ? `url(#${gid}-miss)` : `url(#${gid}-hit)`;
    return value >= target ? `url(#${gid}-hit)` : `url(#${gid}-miss)`;
  };

  return (
    <Card>
      <CardContent className="pt-5 px-6 pb-4">
        <ChartHeader
          title={`${isCal ? 'Calories' : 'Protein'} · 14 days`}
          stat={isCal ? avg.toLocaleString() : `${avg}g`}
          statSuffix="avg / day"
          chip={chip}
          chipTone={chipTone}
        />
        {points.length === 0 ? (
          <EmptyChart label="Log a few days of meals to see trends" />
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={points} margin={{ top: 12, right: 42, bottom: 0, left: 0 }} barCategoryGap="24%">
              <defs>
                <GradientDefs id={`${gid}-hit`} color={isCal ? GREEN : TEAL} />
                <GradientDefs id={`${gid}-miss`} color={isCal ? RED : TEAL} dim={!isCal} />
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: ct.faint, fontSize: 10 }}
                interval={0}
              />
              <YAxis hide domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.08), Math.ceil(target * 1.15))]} />
              <Tooltip
                cursor={{ fill: 'rgba(128,128,128,0.06)', radius: 4 }}
                contentStyle={tooltipStyle(ct)}
                labelFormatter={(_, payload) =>
                  payload?.[0] ? format(parseISO((payload[0].payload as { date: string }).date), 'EEE, MMM d') : ''
                }
                formatter={(value: unknown) => {
                  const v = Number(value);
                  const delta = v - target;
                  const rel = delta === 0 ? 'on target' : delta > 0 ? `+${delta.toLocaleString()} vs target` : `${delta.toLocaleString()} vs target`;
                  return [`${v.toLocaleString()}${isCal ? ' kcal' : 'g'} (${rel})`, isCal ? 'Calories' : 'Protein'];
                }}
              />
              <ReferenceLine
                y={target}
                stroke={ct.targetLine}
                strokeDasharray="6 4"
                label={{
                  value: isCal ? `${(target / 1000).toFixed(1)}k` : `${target}g`,
                  position: 'right',
                  fill: ct.tick,
                  fontSize: 10,
                  fontWeight: 650,
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 1, 1]} maxBarSize={26}>
                {points.map((p) => (
                  <Cell key={p.date} fill={barFill(p.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── Weekly totals: 7-day sums vs weekly target ───────────────────────────────

interface WeekPoint {
  weekStart: string;
  label: string;
  value: number;
  isCurrent: boolean;
  daysLogged: number;
}

export function WeeklyTotalsCard({
  days,
  targets,
}: {
  days: TrendDay[];
  targets: { calories: number; protein_g: number };
}) {
  const [metric, setMetric] = useState<'calories' | 'protein'>('calories');
  const ct = useChartTheme();
  const isCal = metric === 'calories';
  const dailyTarget = isCal ? targets.calories : targets.protein_g;
  const weekTarget = dailyTarget * 7;
  const gid = `grad-weekly-${metric}`;

  const points: WeekPoint[] = useMemo(() => {
    const currentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const byWeek = new Map<string, TrendDay[]>();
    for (const d of days) {
      const ws = format(startOfWeek(parseISO(d.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const bucket = byWeek.get(ws) ?? [];
      bucket.push(d);
      byWeek.set(ws, bucket);
    }
    return [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([ws, bucket]) => ({
        weekStart: ws,
        label: ws === currentWeek ? 'this week' : format(parseISO(ws), 'MMM d'),
        value: Math.round(bucket.reduce((s, d) => s + (isCal ? d.calories : d.protein_g), 0)),
        isCurrent: ws === currentWeek,
        daysLogged: bucket.length,
      }));
  }, [days, isCal]);

  const completed = points.filter((p) => !p.isCurrent);
  const avg = completed.length > 0 ? Math.round(completed.reduce((s, p) => s + p.value, 0) / completed.length) : 0;

  const fmtVal = (v: number) => (isCal ? v.toLocaleString() : `${v.toLocaleString()}g`);

  const barFill = (p: WeekPoint) => {
    if (p.isCurrent) return `url(#${gid}-progress)`;
    if (isCal) return p.value > weekTarget ? `url(#${gid}-miss)` : `url(#${gid}-hit)`;
    return p.value >= weekTarget ? `url(#${gid}-hit)` : `url(#${gid}-miss)`;
  };

  const seg = (active: boolean) =>
    active
      ? { background: 'var(--border)', color: 'var(--fg)' }
      : { color: 'var(--fg-muted)' };

  return (
    <Card>
      <CardContent className="pt-5 px-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-[13px] font-semibold" style={{ color: 'var(--fg-secondary)' }}>Weekly totals</h2>
            <div className="mt-1 leading-none">
              <span className="text-2xl font-bold tracking-tight tabular-nums" style={{ color: 'var(--fg)' }}>
                {completed.length > 0 ? fmtVal(avg) : '–'}
              </span>
              <span className="text-xs ml-1.5" style={{ color: 'var(--fg-muted)' }}>avg / week</span>
            </div>
          </div>
          <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
            {(['calories', 'protein'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize"
                style={seg(metric === m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {points.length === 0 ? (
          <EmptyChart label="Log a few days of meals to see weekly totals" />
        ) : (
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={points} margin={{ top: 12, right: 48, bottom: 0, left: 0 }} barCategoryGap="30%">
              <defs>
                <GradientDefs id={`${gid}-hit`} color={isCal ? GREEN : TEAL} />
                <GradientDefs id={`${gid}-miss`} color={isCal ? RED : TEAL} dim={!isCal} />
                <pattern
                  id={`${gid}-progress`}
                  patternUnits="userSpaceOnUse"
                  width="7"
                  height="7"
                  patternTransform="rotate(-45)"
                >
                  <rect width="7" height="7" fill={isCal ? 'rgba(0,210,106,0.14)' : 'rgba(0,188,212,0.14)'} />
                  <rect width="3.5" height="7" fill={isCal ? 'rgba(0,210,106,0.45)' : 'rgba(0,188,212,0.45)'} />
                </pattern>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: ct.faint, fontSize: 10.5 }}
                interval={0}
              />
              <YAxis hide domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.08), Math.ceil(weekTarget * 1.12))]} />
              <Tooltip
                cursor={{ fill: 'rgba(128,128,128,0.06)', radius: 4 }}
                contentStyle={tooltipStyle(ct)}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as WeekPoint | undefined;
                  return p ? `Week of ${format(parseISO(p.weekStart), 'MMM d')}${p.isCurrent ? ' (in progress)' : ''}` : '';
                }}
                formatter={(value: unknown, _name: unknown, entry: { payload?: WeekPoint }) => {
                  const v = Number(value);
                  const p = entry.payload;
                  const delta = v - weekTarget;
                  const rel = p?.isCurrent
                    ? `${p.daysLogged} day${p.daysLogged === 1 ? '' : 's'} logged`
                    : delta > 0
                      ? `+${delta.toLocaleString()} vs target`
                      : `${delta.toLocaleString()} vs target`;
                  return [`${fmtVal(v)}${isCal ? ' kcal' : ''} (${rel})`, isCal ? 'Calories' : 'Protein'];
                }}
              />
              <ReferenceLine
                y={weekTarget}
                stroke={ct.targetLine}
                strokeDasharray="6 4"
                label={{
                  value: isCal ? `${(weekTarget / 1000).toFixed(1)}k` : `${weekTarget.toLocaleString()}g`,
                  position: 'right',
                  fill: ct.tick,
                  fontSize: 10,
                  fontWeight: 650,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 2, 2]} maxBarSize={64}>
                {points.map((p) => (
                  <Cell key={p.weekStart} fill={barFill(p)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
