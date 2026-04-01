'use client';

import { format, parseISO } from 'date-fns';
import type { Workout } from '@/lib/types';

interface RecentRunsProps {
  runs: Workout[];
}

function formatPace(mins: number, km: number) {
  const p = mins / km;
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function strainColor(s: number) {
  if (s >= 14) return '#ff3b5c';
  if (s >= 10) return '#ff6b35';
  if (s >= 6) return '#00d26a';
  return '#00bcd4';
}

export function RecentRuns({ runs }: RecentRunsProps) {
  if (runs.length === 0) return null;

  const columns = ['Date', 'Duration', 'Distance', 'Pace', 'Avg HR', 'Strain'];

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg)' }}>
        Recent Activity
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left py-2 px-2 text-xs font-medium border-b"
                  style={{ color: 'var(--fg-muted)', borderColor: 'var(--border)' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.slice(0, 15).map((run) => {
              const date = (() => { try { return format(parseISO(run.started_at), 'EEE, MMM d'); } catch { return '—'; } })();
              const hasDist = run.distance_km != null && run.distance_km > 0;
              return (
                <tr key={run.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2.5 px-2 font-medium" style={{ color: 'var(--fg)' }}>{date}</td>
                  <td className="py-2.5 px-2 tabular-nums" style={{ color: 'var(--fg-secondary)' }}>{run.duration_minutes} min</td>
                  <td className="py-2.5 px-2 tabular-nums" style={{ color: 'var(--fg-secondary)' }}>
                    {hasDist ? `${run.distance_km!.toFixed(1)} km` : '—'}
                  </td>
                  <td className="py-2.5 px-2 tabular-nums" style={{ color: 'var(--fg-secondary)' }}>
                    {hasDist ? `${formatPace(run.duration_minutes, run.distance_km!)} /km` : '—'}
                  </td>
                  <td className="py-2.5 px-2 tabular-nums" style={{ color: 'var(--fg-secondary)' }}>
                    {run.avg_heart_rate ? `${run.avg_heart_rate} bpm` : '—'}
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className="inline-block px-2 py-0.5 rounded-md text-xs font-bold tabular-nums"
                      style={{ color: strainColor(run.strain_score), background: `${strainColor(run.strain_score)}18` }}
                    >
                      {run.strain_score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
