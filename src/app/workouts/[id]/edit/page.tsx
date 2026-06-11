'use client';

import { use } from 'react';
import { useWorkout } from '@/hooks/use-workouts';
import { WorkoutForm } from '@/components/workout/workout-form';

export default function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: workout, isLoading } = useWorkout(id);

  if (isLoading) {
    return <div className="max-w-2xl mx-auto"><div className="h-48 rounded-[20px] border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} /></div>;
  }

  if (!workout) {
    return <div className="text-center py-16" style={{ color: 'var(--fg-secondary)' }}>Workout not found</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-center" style={{ color: 'var(--fg)' }}>
        Edit {workout.name}
      </h1>
      <WorkoutForm workout={workout} />
    </div>
  );
}
