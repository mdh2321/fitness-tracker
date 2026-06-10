'use client';

import Link from 'next/link';
import { useStats } from '@/hooks/use-stats';
import { useWorkouts } from '@/hooks/use-workouts';
import { StrainHero } from '@/components/dashboard/strain-hero';
import { TodayTiles } from '@/components/dashboard/today-tiles';
import { TrendSection } from '@/components/dashboard/trend-section';
import { WeeklyGoals } from '@/components/dashboard/weekly-goals';
import { StreaksCard } from '@/components/dashboard/streaks-card';
import { TrainingMix } from '@/components/dashboard/training-mix';
import { RecentWorkouts } from '@/components/dashboard/recent-workouts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ArcLogo } from '@/components/ui/arc-logo';

export default function DashboardPage() {
  const { data: stats, isLoading } = useStats();
  const { data: allWorkouts } = useWorkouts(500);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-3.5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-[20px] border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
          ))}
        </div>
        <div className="h-80 rounded-[20px] border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
      </div>
    );
  }

  if (!stats) return null;

  const isEmpty = stats.totals.workouts === 0;

  if (isEmpty) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <div className="mx-auto mb-6"><ArcLogo size={64} /></div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>Welcome to Arc</h1>
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

  const allTime = [
    { value: String(stats.totals.workouts), label: 'workouts' },
    { value: `${Math.floor((stats.totals.duration || 0) / 60)}h`, label: 'total time' },
    { value: String(stats.averages.strain), label: 'avg daily strain' },
    { value: `${Math.round((stats.totals.calories || 0) / 1000)}k`, label: 'calories' },
    { value: String(stats.streaks.longest), label: 'best streak' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-3.5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--fg)' }}>Dashboard</h1>
        <Link href="/workouts/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Log Workout
          </Button>
        </Link>
      </div>

      {/* Hero: strain ring + today's stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <StrainHero
          strain={stats.today.strain}
          workouts={stats.today.workouts}
          duration={stats.today.duration}
          calories={stats.today.calories}
          target={stats.dailyTargets.strain}
        />
        <div className="lg:col-span-2">
          <TodayTiles
            steps={stats.today.steps || 0}
            activeMinutes={stats.today.duration}
            sleepHours={stats.metrics?.sleepHours ?? null}
            workouts={stats.today.workouts}
            workoutMinutes={stats.today.duration}
            calories={stats.today.calories}
            weekWorkouts={stats.weeklyProgress.workouts}
            weekWorkoutsTarget={stats.weeklyProgress.targets.workouts}
            last7Days={stats.last7Days || []}
          />
        </div>
      </div>

      {/* Hero trend chart */}
      <TrendSection
        dailyTargets={stats.dailyTargets}
        weeklyStepsTarget={stats.weeklyProgress.targets.steps}
      />

      {/* Goals, streaks, training mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <WeeklyGoals progress={stats.weeklyProgress} />
        <StreaksCard
          workoutStreak={stats.streaks}
          exerciseStreak={stats.exerciseStreak}
          sleepStreak={stats.sleepStreak}
          nutritionStreak={stats.nutritionStreak}
          workoutDates={stats.activeWorkoutDates || []}
          exerciseQualifyingDates={stats.exerciseQualifyingDates || []}
          sleepQualifyingDates={stats.sleepQualifyingDates || []}
          nutritionQualifyingDates={stats.nutritionQualifyingDates || []}
          dailyTargets={stats.dailyTargets}
        />
        <TrainingMix workouts={allWorkouts || []} />
      </div>

      {/* Recent workouts */}
      <RecentWorkouts workouts={allWorkouts || []} />

      {/* All-time strip */}
      <Card className="py-4">
        <div className="flex items-center justify-between px-2">
          {allTime.map((item, i) => (
            <div key={item.label} className="flex items-center gap-8 lg:gap-14">
              {i > 0 && <div className="w-px h-7" style={{ background: 'var(--border)' }} />}
              <div>
                <div className="font-display text-xl font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>{item.value}</div>
                <div className="text-[11.5px]" style={{ color: 'var(--fg-muted)' }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
