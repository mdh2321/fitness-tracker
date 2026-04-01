'use client';

import type { Workout } from '@/lib/types';

interface StatsCardsProps {
  runs: Workout[];
}

function formatPace(minPerKm: number) {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function StatsCards({ runs }: StatsCardsProps) {
  const totalRuns = runs.length;
  const totalMinutes = runs.reduce((sum, r) => sum + r.duration_minutes, 0);
  const totalCalories = runs.reduce((sum, r) => sum + (r.calories ?? 0), 0);

  // Only compute distance/pace from runs that actually have distance data
  const runsWithDist = runs.filter((r) => r.distance_km != null && r.distance_km > 0);
  const totalDistance = runsWithDist.reduce((sum, r) => sum + r.distance_km!, 0);
  const distMinutes = runsWithDist.reduce((sum, r) => sum + r.duration_minutes, 0);
  const avgPace = runsWithDist.length > 0 && totalDistance > 0
    ? distMinutes / totalDistance
    : null;

  const runsWithHR = runs.filter((r) => r.avg_heart_rate);
  const avgHR = runsWithHR.length
    ? Math.round(runsWithHR.reduce((s, r) => s + r.avg_heart_rate!, 0) / runsWithHR.length)
    : null;

  const avgStrain = totalRuns > 0
    ? runs.reduce((s, r) => s + r.strain_score, 0) / totalRuns
    : null;

  const stats = [
    { label: 'Weekly Mileage', value: totalDistance > 0 ? `${totalDistance.toFixed(1)}` : '—', sub: 'km' },
    { label: 'Training Load', value: avgStrain ? avgStrain.toFixed(1) : '—', sub: 'avg strain' },
    { label: 'Avg Pace', value: avgPace ? formatPace(avgPace) : '—', sub: avgPace ? 'min/km' : 'no data' },
    { label: 'Avg Heart Rate', value: avgHR ? `${avgHR}` : '—', sub: avgHR ? 'bpm' : 'no data' },
    { label: 'Total Runs', value: String(totalRuns), sub: `${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m total` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{s.label}</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{s.value}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{s.sub}</p>
        </div>
      ))}
    </div>
  );
}
