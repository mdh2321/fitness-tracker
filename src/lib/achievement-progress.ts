import { db } from '@/db';
import { workouts, dailyStrain, userSettings } from '@/db/schema';
import { PASSIVE_ACTIVITIES } from './constants';
import { calculateStreaks } from './streaks';
import {
  format, parseISO, startOfWeek, endOfWeek,
  differenceInCalendarDays, subWeeks,
} from 'date-fns';

export interface BadgeProgress {
  badge_key: string;
  current: number;
  target: number;
}

export async function computeAllProgress(): Promise<BadgeProgress[]> {
  const allWorkouts = await db.select({
    id: workouts.id, type: workouts.type, name: workouts.name,
    started_at: workouts.started_at, duration_minutes: workouts.duration_minutes,
    strain_score: workouts.strain_score,
  }).from(workouts);

  const allStrainData = await db.select({
    date: dailyStrain.date, strain_score: dailyStrain.strain_score, steps: dailyStrain.steps,
  }).from(dailyStrain);

  const settings = await db.select().from(userSettings).get();

  const activeWorkouts = allWorkouts.filter((w) => !PASSIVE_ACTIVITIES.has(w.name));
  const totalCount = activeWorkouts.length;
  const strengthCount = activeWorkouts.filter((w) => w.type === 'strength').length;

  // Streaks — only show current (live) streak for progress
  const streaks = calculateStreaks(activeWorkouts.map((w) => w.started_at));
  const streakCurrent = streaks.current;

  // Heat wave: current consecutive run of strain >= 10 (ending today/yesterday)
  const tenPlusStrainDates = allStrainData
    .filter((d) => d.strain_score >= 10)
    .map((d) => d.date)
    .sort();
  let liveHeatStreak = 0;
  if (tenPlusStrainDates.length > 0) {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    const lastDate = tenPlusStrainDates[tenPlusStrainDates.length - 1];
    if (lastDate === todayStr || lastDate === yesterdayStr) {
      liveHeatStreak = 1;
      for (let i = tenPlusStrainDates.length - 2; i >= 0; i--) {
        if (differenceInCalendarDays(parseISO(tenPlusStrainDates[i + 1]), parseISO(tenPlusStrainDates[i])) === 1) {
          liveHeatStreak++;
        } else {
          break;
        }
      }
    }
  }

  // Five-in-week: best week by unique workout days
  const weekDaysMap: Record<string, Set<string>> = {};
  for (const w of activeWorkouts) {
    const d = format(parseISO(w.started_at), 'yyyy-MM-dd');
    const wk = format(startOfWeek(parseISO(w.started_at), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!weekDaysMap[wk]) weekDaysMap[wk] = new Set();
    weekDaysMap[wk].add(d);
  }
  const bestWeekDays = Math.max(0, ...Object.values(weekDaysMap).map((s) => s.size));

  // Weekend warrior: count full weekends (Sat+Sun)
  const satDates = new Set<string>();
  const sunDates = new Set<string>();
  for (const w of activeWorkouts) {
    const d = parseISO(w.started_at);
    const dateStr = format(d, 'yyyy-MM-dd');
    if (d.getDay() === 6) satDates.add(dateStr);
    if (d.getDay() === 0) sunDates.add(dateStr);
  }
  let fullWeekends = 0;
  for (const satDate of satDates) {
    const nextDay = new Date(parseISO(satDate));
    nextDay.setDate(nextDay.getDate() + 1);
    if (sunDates.has(format(nextDay, 'yyyy-MM-dd'))) fullWeekends++;
  }

  // Perfect streak: consecutive perfect weeks (looking back)
  const CARDIO_ACTIVITIES_SET = new Set(['Running', 'Cycling', 'Swimming', 'Rowing', 'HIIT']);
  const now = new Date();
  let consecutivePerfect = 0;
  for (let i = 1; i <= 6; i++) {
    const wStart = format(startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const wEnd = format(endOfWeek(subWeeks(now, i), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const wWorkouts = activeWorkouts.filter((w) => {
      const d = format(parseISO(w.started_at), 'yyyy-MM-dd');
      return d >= wStart && d <= wEnd;
    });
    const wDays = new Set(wWorkouts.map((w) => format(parseISO(w.started_at), 'yyyy-MM-dd'))).size;
    const wCardio = wWorkouts.filter((w) => CARDIO_ACTIVITIES_SET.has(w.name)).reduce((s, w) => s + w.duration_minutes, 0);
    const wStrength = wWorkouts.filter((w) => w.type === 'strength').length;
    const wSteps = allStrainData.filter((d) => d.date >= wStart && d.date <= wEnd).reduce((s, d) => s + d.steps, 0);
    const wPerfect =
      wDays >= (settings?.weekly_workout_target || 4) &&
      wCardio >= (settings?.weekly_cardio_minutes_target || 150) &&
      wStrength >= (settings?.weekly_strength_sessions_target || 3) &&
      wSteps >= (settings?.weekly_steps_target || 70000);
    if (wPerfect) {
      consecutivePerfect++;
    } else {
      break;
    }
  }

  return [
    // Milestones
    { badge_key: 'first_workout', current: Math.min(totalCount, 1), target: 1 },
    { badge_key: 'ten_workouts', current: Math.min(totalCount, 10), target: 10 },
    { badge_key: 'fifty_workouts', current: Math.min(totalCount, 50), target: 50 },
    { badge_key: 'hundred_workouts', current: Math.min(totalCount, 100), target: 100 },
    { badge_key: 'five_hundred_workouts', current: Math.min(totalCount, 500), target: 500 },
    { badge_key: 'thousand_workouts', current: Math.min(totalCount, 1000), target: 1000 },
    { badge_key: 'strength_century', current: Math.min(strengthCount, 100), target: 100 },
    // Streaks
    { badge_key: 'streak_3', current: Math.min(streakCurrent, 3), target: 3 },
    { badge_key: 'streak_7', current: Math.min(streakCurrent, 7), target: 7 },
    { badge_key: 'streak_14', current: Math.min(streakCurrent, 14), target: 14 },
    { badge_key: 'streak_30', current: Math.min(streakCurrent, 30), target: 30 },
    // Intensity
    { badge_key: 'heat_wave', current: Math.min(liveHeatStreak, 14), target: 14 },
    // Consistency
    { badge_key: 'five_in_week', current: Math.min(bestWeekDays, 5), target: 5 },
    { badge_key: 'weekend_warrior', current: Math.min(fullWeekends, 4), target: 4 },
    { badge_key: 'perfect_streak', current: Math.min(consecutivePerfect, 4), target: 4 },
  ];
}
