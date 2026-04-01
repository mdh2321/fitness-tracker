import useSWR from 'swr';
import type { Workout } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRunning() {
  const { data, isLoading, mutate } = useSWR<Workout[]>('/api/running', fetcher);

  return {
    runs: data ?? [],
    isLoading,
    mutate,
  };
}
