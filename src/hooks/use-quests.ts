import useSWR from 'swr';
import { format } from 'date-fns';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface Quest {
  id: number;
  quest_key: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xp_reward: number;
  completed: boolean;
  completed_at: string | null;
  type: 'core' | 'bonus';
}

export interface XpStatus {
  total: number;
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  multiplier: number;
  coreStreakWeeks: number;
  streakShields: number;
}

export interface LevelUpInfo {
  newLevel: number;
  previousLevel: number;
  newTitle: string;
  colorUnlocks: { name: string; hex: string }[];
  shieldEarned: boolean;
}

export interface DailyQuest {
  id: number;
  quest_key: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xp_reward: number;
  completed: boolean;
  completed_at: string | null;
  type: 'daily';
}

export interface QuestsResponse {
  quests: Quest[];
  dailyQuests: DailyQuest[];
  xp: XpStatus;
  weekStart: string;
  allCompleted: boolean;
  levelUp: LevelUpInfo | null;
}

export interface XpHistoryEntry {
  id: number;
  date: string;
  source: string;
  source_id: string;
  amount: number;
  description: string;
  created_at: string;
}

export interface XpResponse extends XpStatus {
  history: XpHistoryEntry[];
}

export function useWeeklyQuests() {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useSWR<QuestsResponse>(`/api/quests?date=${today}`, fetcher, { refreshInterval: 30000 });
}

export function useXpStatus() {
  return useSWR<XpResponse>('/api/quests/xp', fetcher);
}
