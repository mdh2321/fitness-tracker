import useSWR from 'swr';
import { format } from 'date-fns';
import type { DailyStrain, Achievement } from '@/lib/types';
import type { BadgeProgress } from '@/lib/achievement-progress';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useStats() {
  // Pass local date so the server (UTC) uses the correct calendar day
  const today = format(new Date(), 'yyyy-MM-dd');
  return useSWR(`/api/stats?date=${today}`, fetcher, { refreshInterval: 30000 });
}

export function useStrainData(range = 90) {
  return useSWR<DailyStrain[]>(`/api/strain?range=${range}`, fetcher);
}

interface AchievementsResponse {
  earned: Achievement[];
  progress: BadgeProgress[];
}

export function useAchievements() {
  const { data, ...rest } = useSWR<AchievementsResponse>('/api/achievements', fetcher);
  return {
    ...rest,
    data: data?.earned,
    progress: data?.progress,
  };
}
