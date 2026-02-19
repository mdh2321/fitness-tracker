import { WorkoutForm } from '@/components/workout/workout-form';

export default function NewWorkoutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Log Workout</h1>
      <WorkoutForm />
    </div>
  );
}
