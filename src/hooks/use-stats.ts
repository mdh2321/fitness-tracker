import useSWR from 'swr';
import type { DailyStrain, Achievement } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useStats() {
  return useSWR('/api/stats', fetcher, { refreshInterval: 30000 });
}

export function useStrainData(range = 90) {
  return useSWR<DailyStrain[]>(`/api/strain?range=${range}`, fetcher);
}

export function useAchievements() {
  return useSWR<Achievement[]>('/api/achievements', fetcher);
}
