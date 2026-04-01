'use client';

import { useRunning } from '@/hooks/use-running';
import { StatsCards } from '@/components/running/stats-cards';
import { RunTrends } from '@/components/running/run-trends';
import { PersonalBests } from '@/components/running/personal-bests';
import { RecentRuns } from '@/components/running/recent-runs';

export default function RunningPage() {
  const { runs, isLoading } = useRunning();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center">
        <p style={{ color: 'var(--fg-muted)' }}>Loading runs...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Running</h1>

      <StatsCards runs={runs} />

      <RunTrends runs={runs} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentRuns runs={runs} />
        </div>
        <PersonalBests runs={runs} />
      </div>
    </div>
  );
}
