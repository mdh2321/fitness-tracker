'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useStats, useStrainData } from '@/hooks/use-stats';
import { useWorkouts } from '@/hooks/use-workouts';
import { TodayCard } from '@/components/dashboard/today-card';
import { StreaksCard } from '@/components/dashboard/streaks-card';
import { WeeklyOverview } from '@/components/dashboard/weekly-overview';
import { FitnessSummary } from '@/components/dashboard/fitness-summary';
import { TrendSection } from '@/components/dashboard/trend-section';
import { HeatmapCalendar } from '@/components/charts/heatmap-calendar';
import { MonthlyStrainRings } from '@/components/charts/monthly-strain-rings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Activity } from 'lucide-react';
import { PASSIVE_ACTIVITIES } from '@/lib/constants';

export default function DashboardPage() {
  const { data: stats, isLoading } = useStats();
  const { data: strainData } = useStrainData(365);
  const { data: allWorkouts } = useWorkouts(500);

  // Split workouts into active and passive
  const activeWorkouts = useMemo(() => {
    if (!allWorkouts) return [];
    return allWorkouts.filter((w) => !PASSIVE_ACTIVITIES.has(w.name));
  }, [allWorkouts]);

  // Use server-computed active workout dates (Walking excluded) for streaks calendar
  const workoutDates = stats?.activeWorkoutDates || [];

  // Build strain-by-date map for monthly rings
  const strainByDate = useMemo(() => {
    const map = new Map<string, { strain: number; duration: number; workouts: number }>();
    if (strainData) {
      for (const d of strainData) {
        map.set(d.date, { strain: d.strain_score, duration: d.total_duration, workouts: d.workout_count });
      }
    }
    return map;
  }, [strainData]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const isEmpty = stats.totals.workouts === 0;

  if (isEmpty) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <Activity className="h-16 w-16 text-[#00d26a] mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>Welcome to FitTrack</h1>
          <p className="mb-8 max-w-md mx-auto" style={{ color: 'var(--fg-secondary)' }}>
            Start tracking your workouts to see your strain scores, streaks, and progress over time.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/workouts/new">
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" /> Log Your First Workout
              </Button>
            </Link>
            <Link href="/import">
              <Button variant="outline" size="lg">Import from Apple Health</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Dashboard</h1>
        <Link href="/workouts/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Log Workout
          </Button>
        </Link>
      </div>

      {/* Today */}
      <TodayCard
        strain={stats.today.strain}
        workouts={stats.today.workouts}
        duration={stats.today.duration}
        calories={stats.today.calories}
        steps={stats.today.steps || 0}
      />

      {/* This Week — moved above Streaks */}
      <WeeklyOverview progress={stats.weeklyProgress} weeklyStreak={stats.weeklyStreak} />

      {/* Streaks — uses workout streak (any workout counts), month view */}
      <StreaksCard
        exerciseStreak={stats.exerciseStreak}
        workoutStreak={stats.streaks}
        workoutDates={workoutDates}
      />

      {/* Workouts breakdown — combined, horizontal thin bars, week/month/all tabs */}
      {allWorkouts && allWorkouts.length > 0 && (
        <FitnessSummary workouts={activeWorkouts} />
      )}

      {/* Monthly Strain Rings */}
      <MonthlyStrainRings strainByDate={strainByDate} />

      {strainData && strainData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Activity Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <HeatmapCalendar data={strainData} />
            </CardContent>
          </Card>

          <TrendSection strainData={strainData} />
        </>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{stats.totals.workouts}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total Workouts</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
              {Math.floor((stats.totals.duration || 0) / 60)}<span className="text-lg font-normal" style={{ color: 'var(--fg-muted)' }}>h</span>
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total Time</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{stats.averages.strain}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Avg Daily Strain</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{stats.streaks.longest}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Best Streak</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
