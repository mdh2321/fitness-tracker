'use client';

import { format, parseISO } from 'date-fns';
import type { Workout } from '@/lib/types';

interface PersonalBestsProps {
  runs: Workout[];
}

export function PersonalBests({ runs }: PersonalBestsProps) {
  if (runs.length === 0) return null;

  const longestDuration = runs.reduce((best, r) => r.duration_minutes > best.duration_minutes ? r : best, runs[0]);
  const highestStrain = runs.reduce((best, r) => r.strain_score > best.strain_score ? r : best, runs[0]);
  const maxHRRun = runs.filter((r) => r.max_heart_rate).reduce<Workout | null>((best, r) => !best || r.max_heart_rate! > best.max_heart_rate! ? r : best, null);

  const runsWithDist = runs.filter((r) => r.distance_km && r.distance_km > 0);
  const longestDist = runsWithDist.length
    ? runsWithDist.reduce((best, r) => r.distance_km! > best.distance_km! ? r : best, runsWithDist[0])
    : null;
  const fastestPace = runsWithDist.length
    ? runsWithDist.reduce((best, r) => {
        const pace = r.duration_minutes / r.distance_km!;
        const bestPace = best.duration_minutes / best.distance_km!;
        return pace < bestPace ? r : best;
      }, runsWithDist[0])
    : null;

  const formatDate = (w: Workout) => {
    try { return format(parseISO(w.started_at), 'MMM d, yyyy'); } catch { return ''; }
  };

  const records = [
    { label: 'Longest Run', value: `${longestDuration.duration_minutes} min`, date: formatDate(longestDuration), icon: '🏃' },
    { label: 'Highest Strain', value: longestDuration ? highestStrain.strain_score.toFixed(1) : '—', date: formatDate(highestStrain), icon: '🔥' },
    ...(longestDist ? [{ label: 'Longest Distance', value: `${longestDist.distance_km!.toFixed(1)} km`, date: formatDate(longestDist), icon: '📏' }] : []),
    ...(fastestPace ? [{ label: 'Fastest Pace', value: (() => { const p = fastestPace.duration_minutes / fastestPace.distance_km!; const m = Math.floor(p); const s = Math.round((p - m) * 60); return `${m}:${s.toString().padStart(2, '0')} /km`; })(), date: formatDate(fastestPace), icon: '⚡' }] : []),
    ...(maxHRRun ? [{ label: 'Max Heart Rate', value: `${maxHRRun.max_heart_rate} bpm`, date: formatDate(maxHRRun), icon: '❤️' }] : []),
  ];

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg)' }}>Personal Bests</h2>
      <div className="space-y-3">
        {records.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <span className="text-lg">{r.icon}</span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{r.label}</p>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{r.date}</p>
              </div>
            </div>
            <p className="text-lg font-bold tabular-nums" style={{ color: '#00bcd4' }}>{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
