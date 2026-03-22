import { format, startOfWeek } from 'date-fns';

// --- Level system ---

export function getLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

export function getXpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 100;
}

export function getXpForNextLevel(level: number): number {
  return level * level * 100;
}

const LEVEL_TITLES: [number, string][] = [
  [25, 'Transcendent'],
  [22, 'Immortal'],
  [19, 'Legend'],
  [16, 'Titan'],
  [13, 'Champion'],
  [10, 'Warrior'],
  [7, 'Athlete'],
  [5, 'Contender'],
  [3, 'Challenger'],
  [1, 'Rookie'],
];

export function getLevelTitle(level: number): string {
  for (const [min, title] of LEVEL_TITLES) {
    if (level >= min) return title;
  }
  return 'Beginner';
}

// --- Quest templates ---

export interface QuestTemplate {
  key: string;
  title: string;
  description: string;
  target: number;
  xp: number;
  type: 'core' | 'bonus';
}

// Core quests match the existing weekly goals
export const CORE_QUESTS: Omit<QuestTemplate, 'target'>[] = [
  { key: 'weekly_workouts', title: 'Workout Days', description: 'Hit your weekly workout target', xp: 75, type: 'core' },
  { key: 'weekly_cardio', title: 'Cardio Minutes', description: 'Hit your weekly cardio target', xp: 75, type: 'core' },
  { key: 'weekly_strength', title: 'Strength Sessions', description: 'Hit your weekly strength target', xp: 75, type: 'core' },
  { key: 'weekly_steps', title: 'Step Goal', description: 'Hit your weekly step target', xp: 75, type: 'core' },
];

export const BONUS_QUEST_POOL: QuestTemplate[] = [
  // Easy (50 XP)
  { key: 'nutrition_3d', title: 'Track Meals', description: 'Log nutrition on 3+ days this week', target: 3, xp: 50, type: 'bonus' },
  { key: 'workout_30m', title: 'Quick Session', description: 'Complete a 30+ minute workout', target: 30, xp: 50, type: 'bonus' },
  { key: 'sleep_3d_7h', title: 'Rest Up', description: 'Sleep 7+ hours on 3 nights this week', target: 3, xp: 50, type: 'bonus' },
  { key: 'steps_10k', title: 'Step It Up', description: 'Hit 10,000 steps in a single day', target: 10000, xp: 50, type: 'bonus' },
  { key: 'active_3d', title: 'Get Moving', description: 'Work out on 3 different days', target: 3, xp: 50, type: 'bonus' },

  // Medium (100 XP)
  { key: 'sleep_7h', title: 'Sleep Well', description: 'Average 7+ hours of sleep this week', target: 7, xp: 100, type: 'bonus' },
  { key: 'nutrition_5d', title: 'Eat Clean', description: 'Log nutrition on 5+ days this week', target: 5, xp: 100, type: 'bonus' },
  { key: 'workout_60m', title: 'Long Session', description: 'Complete a 60+ minute workout', target: 60, xp: 100, type: 'bonus' },
  { key: 'steps_15k', title: 'Step Monster', description: 'Hit 15,000 steps in a single day', target: 15000, xp: 100, type: 'bonus' },
  { key: 'active_5d', title: 'Stay Active', description: 'Work out on 5 different days', target: 5, xp: 100, type: 'bonus' },
  { key: 'total_calories_2k', title: 'Calorie Burner', description: 'Burn 2,000+ calories from workouts this week', target: 2000, xp: 100, type: 'bonus' },
  { key: 'strain_10_5d', title: 'Consistent Effort', description: 'Hit strain 10+ on 5 days', target: 5, xp: 100, type: 'bonus' },

  // Hard (150 XP)
  { key: 'strain_15_2d', title: 'Push It', description: 'Hit strain 15+ on 2 days this week', target: 2, xp: 150, type: 'bonus' },
  { key: 'nutrition_14', title: 'Nutrition Star', description: 'Score 14+ nutrition on 3 days', target: 3, xp: 150, type: 'bonus' },
  { key: 'total_duration_300', title: 'Time Committed', description: 'Accumulate 300+ active minutes', target: 300, xp: 150, type: 'bonus' },
  { key: 'workout_90m', title: 'Endurance Test', description: 'Complete a 90+ minute workout', target: 90, xp: 150, type: 'bonus' },
];

export const PERFECT_WEEK_XP = 250;

// --- Daily quest templates ---

export interface DailyQuestTemplate {
  key: string;
  title: string;
  description: string;
  xp: number;
  targetFromSettings: (settings: DailyTargets) => number;
}

export interface DailyTargets {
  activeMinutes: number;
  sleepMinutes: number;
  nutritionScore: number;
  steps: number;
  strain: number;
}

export const DAILY_QUESTS: DailyQuestTemplate[] = [
  {
    key: 'daily_workout',
    title: 'Get Active',
    description: 'Complete a workout today',
    xp: 10,
    targetFromSettings: () => 1,
  },
  {
    key: 'daily_active_minutes',
    title: 'Active Time',
    description: 'Hit your active minutes target',
    xp: 10,
    targetFromSettings: (s) => s.activeMinutes,
  },
  {
    key: 'daily_sleep',
    title: 'Good Sleep',
    description: 'Hit your sleep target last night',
    xp: 10,
    targetFromSettings: (s) => s.sleepMinutes,
  },
  {
    key: 'daily_nutrition',
    title: 'Eat Well',
    description: 'Hit your nutrition score target',
    xp: 15,
    targetFromSettings: (s) => s.nutritionScore,
  },
  {
    key: 'daily_steps',
    title: 'Step Goal',
    description: 'Hit your daily step target',
    xp: 10,
    targetFromSettings: (s) => s.steps,
  },
  {
    key: 'daily_strain',
    title: 'Push Yourself',
    description: 'Hit your daily strain target',
    xp: 15,
    targetFromSettings: (s) => s.strain,
  },
];

// Deterministic bonus quest selection based on week
export function getBonusQuestsForWeek(weekStart: string, count: number = 3): QuestTemplate[] {
  // Simple hash from the week string to pick quests
  let hash = 0;
  for (let i = 0; i < weekStart.length; i++) {
    hash = ((hash << 5) - hash + weekStart.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  const pool = [...BONUS_QUEST_POOL];
  const selected: QuestTemplate[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = (hash + i * 7) % pool.length;
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}

// Build full quest list for a week
export function buildWeekQuests(
  weekStart: string,
  targets: { workouts: number; cardioMinutes: number; strengthSessions: number; steps: number }
): QuestTemplate[] {
  const core: QuestTemplate[] = CORE_QUESTS.map((q) => {
    let target = 0;
    switch (q.key) {
      case 'weekly_workouts': target = targets.workouts; break;
      case 'weekly_cardio': target = targets.cardioMinutes; break;
      case 'weekly_strength': target = targets.strengthSessions; break;
      case 'weekly_steps': target = targets.steps; break;
    }
    return { ...q, target };
  });

  const bonus = getBonusQuestsForWeek(weekStart, 3);
  return [...core, ...bonus];
}
