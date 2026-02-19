'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TargetRing } from '@/components/charts/target-ring';
import type { WeeklyProgress } from '@/lib/types';

interface WeeklyOverviewProps {
  progress: WeeklyProgress;
}

export function WeeklyOverview({ progress }: WeeklyOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-around">
          <TargetRing
            value={progress.workouts}
            target={progress.targets.workouts}
            label="Workouts"
            color="#00d26a"
          />
          <TargetRing
            value={progress.cardioMinutes}
            target={progress.targets.cardioMinutes}
            label="Cardio (min)"
            color="#00bcd4"
          />
          <TargetRing
            value={progress.strengthSessions}
            target={progress.targets.strengthSessions}
            label="Strength"
            color="#8b5cf6"
          />
          <TargetRing
            value={progress.steps}
            target={progress.targets.steps}
            label="Steps"
            color="#ff6b35"
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            formatTarget={(t) => t >= 1000 ? `${(t / 1000).toFixed(0)}k` : String(t)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
