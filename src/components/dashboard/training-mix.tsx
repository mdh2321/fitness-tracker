'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { subDays, parseISO } from 'date-fns';
import { getWorkoutColor } from '@/lib/constants';
import type { Workout } from '@/lib/types';

interface TrainingMixProps {
  workouts: Workout[];
}

const RANGES = [
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 365, label: '1y' },
];

export function TrainingMix({ workouts }: TrainingMixProps) {
  const [range, setRange] = useState(90);

  const mix = useMemo(() => {
    const cutoff = subDays(new Date(), range);
    const byName = new Map<string, { minutes: number; type: Workout['type'] }>();
    let total = 0;
    for (const w of workouts) {
      const date = w.local_date ? parseISO(w.local_date) : parseISO(w.started_at);
      if (date < cutoff) continue;
      const entry = byName.get(w.name) ?? { minutes: 0, type: w.type };
      entry.minutes += w.duration_minutes;
      byName.set(w.name, entry);
      total += w.duration_minutes;
    }
    if (total === 0) return [];
    const sorted = [...byName.entries()].sort((a, b) => b[1].minutes - a[1].minutes);
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4).reduce((sum, [, v]) => sum + v.minutes, 0);
    const rows = top.map(([name, v]) => ({
      name,
      pct: Math.round((v.minutes / total) * 100),
      color: getWorkoutColor(name, v.type),
    }));
    if (rest > 0) rows.push({ name: 'Other', pct: Math.round((rest / total) * 100), color: '#6b7280' });
    return rows;
  }, [workouts, range]);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between">
        <span className="tile-label">Training mix</span>
        <div className="flex items-center rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
              style={range === r.value
                ? { background: 'var(--bg-hover)', color: 'var(--fg)' }
                : { color: 'var(--fg-muted)' }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex-1 flex flex-col justify-center gap-3.5">
        {mix.length === 0 ? (
          <p className="text-xs text-center" style={{ color: 'var(--fg-muted)' }}>No workouts in this period</p>
        ) : (
          mix.map((row) => (
            <div key={row.name} className="grid grid-cols-[84px_1fr_40px] items-center gap-3 text-[13px]">
              <span className="truncate" style={{ color: 'var(--fg-secondary)' }}>{row.name}</span>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
              </div>
              <span className="text-right text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>{row.pct}%</span>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 pt-3.5 text-[11px]" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
        Share of active time
      </div>
    </Card>
  );
}
