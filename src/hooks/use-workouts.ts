import useSWR, { mutate } from 'swr';
import type { Workout, WorkoutWithExercises } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWorkouts(limit = 50) {
  return useSWR<Workout[]>(`/api/workouts?limit=${limit}`, fetcher);
}

export function useWorkout(id: number | string | null) {
  return useSWR<WorkoutWithExercises>(id ? `/api/workouts/${id}` : null, fetcher);
}

/** Revalidate all workout-related SWR caches */
function revalidateAll() {
  mutate((key: string) => typeof key === 'string' && (
    key.startsWith('/api/workouts') ||
    key.startsWith('/api/stats') ||
    key.startsWith('/api/strain') ||
    key.startsWith('/api/achievements')
  ), undefined, { revalidate: true });
}

export async function createWorkout(data: any) {
  const res = await fetch('/api/workouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create workout');
  const result = await res.json();
  revalidateAll();
  return result;
}

export async function deleteWorkout(id: number) {
  const res = await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete workout');
  const result = await res.json();
  revalidateAll();
  return result;
}
