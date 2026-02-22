import { WorkoutForm } from '@/components/workout/workout-form';

export default function NewWorkoutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--fg)' }}>Log Workout</h1>
      <WorkoutForm />
    </div>
  );
}
