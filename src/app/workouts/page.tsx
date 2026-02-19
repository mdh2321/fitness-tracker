'use client';

import Link from 'next/link';
import { useWorkouts } from '@/hooks/use-workouts';
import { WorkoutCard } from '@/components/workout/workout-card';
import { Button } from '@/components/ui/button';
import { Plus, Dumbbell } from 'lucide-react';

export default function WorkoutsPage() {
  const { data: workouts, isLoading } = useWorkouts();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Workouts</h1>
        <Link href="/workouts/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" /> New Workout
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[#141419] border border-[#2a2a35] animate-pulse" />
          ))}
        </div>
      )}

      {workouts && workouts.length === 0 && (
        <div className="text-center py-16">
          <Dumbbell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-300">No workouts yet</h2>
          <p className="text-gray-500 mt-1">Log your first workout to get started.</p>
          <Link href="/workouts/new" className="mt-4 inline-block">
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New Workout
            </Button>
          </Link>
        </div>
      )}

      {workouts && workouts.length > 0 && (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </div>
  );
}
