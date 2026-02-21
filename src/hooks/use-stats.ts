import useSWR from 'swr';
import { format } from 'date-fns';
import type { DailyStrain, Achievement } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useStats() {
  // Pass local date so the server (UTC) uses the correct calendar day
  const today = format(new Date(), 'yyyy-MM-dd');
  return useSWR(`/api/stats?date=${today}`, fetcher, { refreshInterval: 30000 });
}

export function useStrainData(range = 90) {
  return useSWR<DailyStrain[]>(`/api/strain?range=${range}`, fetcher);
}

export function useAchievements() {
  return useSWR<Achievement[]>('/api/achievements', fetcher);
}
