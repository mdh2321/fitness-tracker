'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useWorkouts } from '@/hooks/use-workouts';
import { WorkoutCard } from '@/components/workout/workout-card';
import { Button } from '@/components/ui/button';
import { Plus, Dumbbell } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getWorkoutColor } from '@/lib/constants';
import type { Workout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';

const PAGE_SIZE = 50;

export default function WorkoutsPage() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data: workouts, isLoading } = useWorkouts(limit);
  const [hiddenNames, setHiddenNames] = useState<Set<string>>(new Set());

  const canLoadMore = workouts && workouts.length === limit;

  // Get unique workout names for filter toggles
  const workoutNames = useMemo(() => {
    if (!workouts) return [];
    const counts = new Map<string, { type: WorkoutType; count: number }>();
    for (const w of workouts) {
      const existing = counts.get(w.name);
      if (existing) {
        existing.count++;
      } else {
        counts.set(w.name, { type: w.type as WorkoutType, count: 1 });
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, { type, count }]) => ({ name, type, count }));
  }, [workouts]);

  const toggleName = (name: string) => {
    setHiddenNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!workouts) return [];
    return workouts.filter((w: Workout) => !hiddenNames.has(w.name));
  }, [workouts, hiddenNames]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Workouts</h1>
        <Link href="/workouts/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" /> New Workout
          </Button>
        </Link>
      </div>

      {/* Filter toggles */}
      {workoutNames.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {workoutNames.map(({ name, type }) => {
            const active = !hiddenNames.has(name);
            const color = getWorkoutColor(name, type);
            return (
              <button
                key={name}
                onClick={() => toggleName(name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={active
                  ? { background: `${color}15`, borderColor: `${color}40`, color }
                  : { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)', opacity: 0.6 }
                }
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: active ? color : 'var(--fg-muted)' }}
                />
                {name}
              </button>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
          ))}
        </div>
      )}

      {workouts && workouts.length === 0 && (
        <div className="text-center py-16">
          <Dumbbell className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--fg-muted)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--fg-secondary)' }}>No workouts yet</h2>
          <p className="mt-1" style={{ color: 'var(--fg-muted)' }}>Log your first workout to get started.</p>
          <Link href="/workouts/new" className="mt-4 inline-block">
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New Workout
            </Button>
          </Link>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((workout: Workout, i: number) => {
            const month = format(parseISO(workout.started_at), 'MMMM yyyy');
            const prevMonth = i > 0 ? format(parseISO(filtered[i - 1].started_at), 'MMMM yyyy') : null;
            const showDivider = i === 0 || month !== prevMonth;
            return (
              <div key={workout.id}>
                {showDivider && (
                  <div className={`flex items-center gap-3 ${i === 0 ? 'pb-1' : 'pt-4 pb-1'}`}>
                    <span className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--fg-muted)' }}>
                      {month}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>
                )}
                <WorkoutCard workout={workout} />
              </div>
            );
          })}
        </div>
      )}

      {workouts && workouts.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>All workout types are hidden. Toggle some back on above.</p>
        </div>
      )}

      {canLoadMore && (
        <div className="flex justify-center pt-2">
          <Button variant="ghost" onClick={() => setLimit(l => l + PAGE_SIZE)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
