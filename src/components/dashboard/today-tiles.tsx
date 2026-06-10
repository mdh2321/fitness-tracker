'use client';

import { Card } from '@/components/ui/card';
import { Sparkline } from '@/components/charts/sparkline';

interface Last7Day {
  date: string;
  strain_score: number;
  workout_count: number;
  total_duration: number;
  steps: number;
  sleep_minutes: number;
  nutrition_score: number;
}

interface TodayTilesProps {
  steps: number;
  activeMinutes: number;
  sleepHours: number | null;
  workouts: number;
  workoutMinutes: number;
  calories: number;
  weekWorkouts: number;
  weekWorkoutsTarget: number;
  last7Days: Last7Day[];
}

function formatHm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function Tile({
  label, value, sub, spark, color,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  spark: number[];
  color: string;
}) {
  return (
    <Card className="relative flex flex-col justify-center min-h-[118px] p-5">
      <span className="tile-label">{label}</span>
      <div className="font-display text-[25px] font-semibold mt-1.5 tabular-nums" style={{ color: 'var(--fg)' }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{sub}</div>
      <div className="absolute right-5 bottom-4">
        <Sparkline data={spark} color={color} />
      </div>
    </Card>
  );
}

export function TodayTiles({
  steps, activeMinutes, sleepHours, workouts, workoutMinutes, calories,
  weekWorkouts, weekWorkoutsTarget, last7Days,
}: TodayTilesProps) {
  const avg = (vals: number[]) => {
    const filtered = vals.filter((v) => v > 0);
    if (filtered.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const avgNonzero = (vals: number[]) => {
    const filtered = vals.filter((v) => v > 0);
    if (filtered.length === 0) return 0;
    return filtered.reduce((a, b) => a + b, 0) / filtered.length;
  };

  const stepsAvg = Math.round(avg(last7Days.map((d) => d.steps)));
  const activeAvg = Math.round(avg(last7Days.map((d) => d.total_duration)));
  const sleepAvg = avgNonzero(last7Days.map((d) => d.sleep_minutes));

  const sub = (text: string, val: string) => (
    <>
      {text} <b className="font-semibold" style={{ color: 'var(--fg-secondary)' }}>{val}</b>
    </>
  );

  return (
    <div className="grid grid-cols-2 gap-3.5 h-full">
      <Tile
        label="Steps today"
        value={steps.toLocaleString()}
        sub={sub('7-day avg', stepsAvg.toLocaleString())}
        spark={last7Days.map((d) => d.steps)}
        color="#ff6b35"
      />
      <Tile
        label="Active today"
        value={<>{activeMinutes}<span className="text-sm font-medium ml-1" style={{ color: 'var(--fg-secondary)' }}>min</span></>}
        sub={sub('7-day avg', `${activeAvg} min`)}
        spark={last7Days.map((d) => d.total_duration)}
        color="#00bcd4"
      />
      <Tile
        label="Sleep last night"
        value={sleepHours != null
          ? formatHm(Math.round(sleepHours * 60))
          : <span style={{ color: 'var(--fg-muted)' }}>—</span>}
        sub={sleepAvg > 0 ? sub('7-day avg', formatHm(sleepAvg)) : 'no data yet'}
        spark={last7Days.map((d) => d.sleep_minutes / 60)}
        color="#8b5cf6"
      />
      <Tile
        label="Workouts today"
        value={workouts > 0
          ? <>{workouts}<span className="text-sm font-medium ml-1.5" style={{ color: 'var(--fg-secondary)' }}>· {workoutMinutes} min · {calories} kcal</span></>
          : <span style={{ color: 'var(--fg-muted)' }}>—</span>}
        sub={sub('this week', `${weekWorkouts} of ${weekWorkoutsTarget}`)}
        spark={last7Days.map((d) => d.workout_count)}
        color="#f5c542"
      />
    </div>
  );
}
