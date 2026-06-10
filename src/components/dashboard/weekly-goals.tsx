'use client';

import { Card } from '@/components/ui/card';
import { TargetRing } from '@/components/charts/target-ring';
import type { WeeklyProgress } from '@/lib/types';

interface WeeklyGoalsProps {
  progress: WeeklyProgress;
}

const fmtK = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v));

export function WeeklyGoals({ progress }: WeeklyGoalsProps) {
  // Monday-based fraction of the week elapsed (end of today)
  const jsDay = new Date().getDay();
  const dayIndex = jsDay === 0 ? 7 : jsDay;
  const weekFraction = dayIndex / 7;

  const goals = [
    { label: 'Workouts', value: progress.workouts, target: progress.targets.workouts, color: 'var(--accent)', noun: `${progress.targets.workouts - progress.workouts} more workout days` },
    { label: 'Cardio min', value: progress.cardioMinutes, target: progress.targets.cardioMinutes, color: '#00bcd4', noun: `${progress.targets.cardioMinutes - progress.cardioMinutes} cardio minutes` },
    { label: 'Strength', value: progress.strengthSessions, target: progress.targets.strengthSessions, color: '#8b5cf6', noun: `${progress.targets.strengthSessions - progress.strengthSessions} strength sessions` },
    { label: 'Steps', value: progress.steps, target: progress.targets.steps, color: '#ff6b35', noun: `${fmtK(progress.targets.steps - progress.steps)} steps`, fmt: fmtK },
  ];

  const onPaceCount = goals.filter((g) => g.value >= g.target * weekFraction).length;
  const worst = goals
    .filter((g) => g.value < g.target)
    .sort((a, b) => a.value / a.target - b.value / b.target)[0];

  return (
    <Card className="flex flex-col">
      <span className="tile-label">This week · goals</span>
      <div className="flex justify-between mt-4 flex-1 items-center">
        {goals.map((g) => (
          <TargetRing
            key={g.label}
            value={g.value}
            target={g.target}
            label={g.label}
            color={g.color}
            size={72}
            formatValue={g.fmt}
            formatTarget={g.fmt}
          />
        ))}
      </div>
      <div className="mt-4 pt-3.5 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
        On pace for <b className="font-semibold" style={{ color: 'var(--accent)' }}>{onPaceCount} of {goals.length}</b> targets
        {worst && <> · {worst.noun} needed by Sunday</>}
      </div>
    </Card>
  );
}
