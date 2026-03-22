import { db } from '@/db';
import { workouts, achievements, dailyStrain, dailySleep, dailyNutrition, userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { BADGES, PASSIVE_ACTIVITIES } from './constants';
import { calculateStreaks, calculateExerciseStreak } from './streaks';
import {
  format, parseISO, startOfWeek, endOfWeek,
  differenceInCalendarDays, getDaysInMonth, startOfMonth, addDays, subWeeks, subMonths,
} from 'date-fns';

export interface NewBadge {
  key: string;
  name: string;
  description: string;
  icon: string;
}

// ─── shared data types ────────────────────────────────────────────────────────

type WorkoutRow = {
  id: number;
  type: string;
  name: string;
  started_at: string;
  duration_minutes: number;
  strain_score: number;
};

type StrainRow = {
  date: string;
  strain_score: number;
  steps: number;
};

type SleepRow = {
  date: string;
  total_minutes: number;
};

type NutritionRow = {
  date: string;
  nutrition_score: number | null;
};

// ─── core award logic (shared between both evaluation paths) ──────────────────

async function runAwards(
  allWorkouts: WorkoutRow[],
  allStrainData: StrainRow[],
  allSleepData: SleepRow[],
  allNutritionData: NutritionRow[],
  settings: { weekly_workout_target: number; weekly_cardio_minutes_target: number; weekly_strength_sessions_target: number; weekly_steps_target: number } | undefined,
  earnedKeys: Set<string>,
  workoutId: number | null,
): Promise<NewBadge[]> {
  const earned: NewBadge[] = [];

  async function award(key: string) {
    if (earnedKeys.has(key)) return;
    const badge = BADGES.find((b) => b.key === key);
    if (!badge) return;
    await db.insert(achievements).values({ badge_key: key, earned_at: new Date().toISOString(), workout_id: workoutId });
    earnedKeys.add(key);
    earned.push({ key: badge.key, name: badge.name, description: badge.description, icon: badge.icon });
  }

  const now = new Date();
  // Exclude passive activities (Walking) from all achievement calculations
  const activeWorkouts = allWorkouts.filter((w) => !PASSIVE_ACTIVITIES.has(w.name));
  const totalCount = activeWorkouts.length;

  // ── Milestones ──────────────────────────────────────────────────────────────
  if (totalCount >= 1)    await award('first_workout');
  if (totalCount >= 10)   await award('ten_workouts');
  if (totalCount >= 50)   await award('fifty_workouts');
  if (totalCount >= 100)  await award('hundred_workouts');
  if (totalCount >= 500)  await award('five_hundred_workouts');
  if (totalCount >= 1000) await award('thousand_workouts');

  const strengthCount = activeWorkouts.filter((w) => w.type === 'strength').length;
  if (strengthCount >= 100) await award('strength_century');

  // Comeback Kid: any 14+ day gap between consecutive workout days
  const sortedDates = [...new Set(activeWorkouts.map((w) => format(parseISO(w.started_at), 'yyyy-MM-dd')))].sort();
  for (let i = 1; i < sortedDates.length; i++) {
    if (differenceInCalendarDays(parseISO(sortedDates[i]), parseISO(sortedDates[i - 1])) >= 14) {
      await award('comeback_kid');
      break;
    }
  }

  // ── Streak badges ────────────────────────────────────────────────────────────
  const streaks = calculateStreaks(activeWorkouts.map((w) => w.started_at));
  // Use longest (not just current) so past streaks are credited on bulk eval
  const streakMax = Math.max(streaks.current, streaks.longest);
  if (streakMax >= 3)  await award('streak_3');
  if (streakMax >= 7)  await award('streak_7');
  if (streakMax >= 14) await award('streak_14');
  if (streakMax >= 30) await award('streak_30');

  // ── Intensity badges ─────────────────────────────────────────────────────────
  // Strain 15 / 19: any day in history qualifies
  if (allStrainData.some((d) => d.strain_score >= 15)) await award('strain_15');
  if (allStrainData.some((d) => d.strain_score >= 19)) await award('strain_19');

  // Double Peak: 2 consecutive days with 19+ strain
  const highStrainDates = allStrainData
    .filter((d) => d.strain_score >= 19)
    .map((d) => d.date)
    .sort();
  for (let i = 1; i < highStrainDates.length; i++) {
    if (differenceInCalendarDays(parseISO(highStrainDates[i]), parseISO(highStrainDates[i - 1])) === 1) {
      await award('double_peak');
      break;
    }
  }

  // Heat Wave: 14 consecutive days with strain >= 10
  const tenPlusStrainDates = allStrainData
    .filter((d) => d.strain_score >= 10)
    .map((d) => d.date)
    .sort();
  let heatStreak = 1;
  for (let i = 1; i < tenPlusStrainDates.length; i++) {
    if (differenceInCalendarDays(parseISO(tenPlusStrainDates[i]), parseISO(tenPlusStrainDates[i - 1])) === 1) {
      heatStreak++;
      if (heatStreak >= 14) { await award('heat_wave'); break; }
    } else {
      heatStreak = 1;
    }
  }

  // ── Volume / Cardio badges ────────────────────────────────────────────────────
  // Endurance Engine: any cardio session >= 60 min
  if (activeWorkouts.some((w) => w.type === 'cardio' && w.duration_minutes >= 60)) await award('cardio_60');

  // Running duration tiers — matches "Run", "Running", "Run 5k", etc.
  const maxRunDuration = activeWorkouts
    .filter((w) => w.name.toLowerCase().includes('run'))
    .reduce((max, w) => Math.max(max, w.duration_minutes), 0);
  if (maxRunDuration >= 90)  await award('run_90');
  if (maxRunDuration >= 120) await award('run_120');
  if (maxRunDuration >= 180) await award('run_180');

  // Long Haul: any single workout >= 3 hours
  if (activeWorkouts.some((w) => w.duration_minutes >= 180)) await award('long_haul');

  // Step Master: 100,000 steps in a single week
  const weeklyStepsMap: Record<string, number> = {};
  for (const d of allStrainData) {
    const weekKey = format(startOfWeek(parseISO(d.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    weeklyStepsMap[weekKey] = (weeklyStepsMap[weekKey] || 0) + d.steps;
  }
  if (Object.values(weeklyStepsMap).some((s) => s >= 100000)) await award('step_master');

  // ── Consistency badges ────────────────────────────────────────────────────────
  // Five-a-Week: any week in history with 5+ unique workout days
  const weekDaysMap: Record<string, Set<string>> = {};
  for (const w of activeWorkouts) {
    const d   = format(parseISO(w.started_at), 'yyyy-MM-dd');
    const wk  = format(startOfWeek(parseISO(w.started_at), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!weekDaysMap[wk]) weekDaysMap[wk] = new Set();
    weekDaysMap[wk].add(d);
  }
  if (Object.values(weekDaysMap).some((days) => days.size >= 5)) await award('five_in_week');

  // Double Session: 2 workouts in one day
  const countByDay: Record<string, number> = {};
  for (const w of activeWorkouts) {
    const d = format(parseISO(w.started_at), 'yyyy-MM-dd');
    countByDay[d] = (countByDay[d] || 0) + 1;
  }
  if (Object.values(countByDay).some((c) => c >= 2)) await award('double_session');

  // Weekend Warrior: both Sat AND Sun in 4 different weekends
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
    if (sunDates.has(format(addDays(parseISO(satDate), 1), 'yyyy-MM-dd'))) fullWeekends++;
  }
  if (fullWeekends >= 4) await award('weekend_warrior');

  // No Days Off: a full calendar month with no 2 consecutive rest days
  const workoutDateSet = new Set(activeWorkouts.map((w) => format(parseISO(w.started_at), 'yyyy-MM-dd')));
  // Check back far enough to cover all data
  const monthsToCheck = sortedDates.length > 0
    ? Math.ceil(differenceInCalendarDays(now, parseISO(sortedDates[0])) / 30) + 1
    : 24;
  outer: for (let m = 1; m <= Math.max(monthsToCheck, 2); m++) {
    const monthStart = startOfMonth(subMonths(now, m));
    const daysInMonth = getDaysInMonth(monthStart);
    for (let d = 0; d < daysInMonth - 1; d++) {
      const day1 = format(addDays(monthStart, d), 'yyyy-MM-dd');
      const day2 = format(addDays(monthStart, d + 1), 'yyyy-MM-dd');
      if (!workoutDateSet.has(day1) && !workoutDateSet.has(day2)) continue outer;
    }
    await award('no_rest_month');
    break;
  }

  // Marathon Month: 26.2 hours (1,572 min) in one calendar month
  const minutesByMonth: Record<string, number> = {};
  for (const w of activeWorkouts) {
    const month = format(parseISO(w.started_at), 'yyyy-MM');
    minutesByMonth[month] = (minutesByMonth[month] || 0) + w.duration_minutes;
  }
  if (Object.values(minutesByMonth).some((m) => m >= 1572)) await award('marathon_month');

  // Perfect Streak: 4 consecutive perfect weeks
  const CARDIO_ACTIVITIES_SET = new Set(['Running', 'Cycling', 'Swimming', 'Rowing', 'HIIT']);
  let consecutivePerfect = 0;
  for (let i = 1; i <= 6; i++) {
    const wStart = format(startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const wEnd   = format(endOfWeek(subWeeks(now, i),   { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const wWorkouts = activeWorkouts.filter((w) => {
      const d = format(parseISO(w.started_at), 'yyyy-MM-dd');
      return d >= wStart && d <= wEnd;
    });
    const wDays     = new Set(wWorkouts.map((w) => format(parseISO(w.started_at), 'yyyy-MM-dd'))).size;
    const wCardio   = wWorkouts.filter((w) => CARDIO_ACTIVITIES_SET.has(w.name)).reduce((s, w) => s + w.duration_minutes, 0);
    const wStrength = wWorkouts.filter((w) => w.type === 'strength').length;
    const wSteps    = allStrainData.filter((d) => d.date >= wStart && d.date <= wEnd).reduce((s, d) => s + d.steps, 0);
    const wPerfect  =
      wDays     >= (settings?.weekly_workout_target           || 4)     &&
      wCardio   >= (settings?.weekly_cardio_minutes_target    || 150)   &&
      wStrength >= (settings?.weekly_strength_sessions_target || 3)     &&
      wSteps    >= (settings?.weekly_steps_target             || 70000);
    if (wPerfect) {
      consecutivePerfect++;
      if (consecutivePerfect >= 4) { await award('perfect_streak'); break; }
    } else {
      break;
    }
  }

  // ── Sleep badges ─────────────────────────────────────────────────────────────
  const sortedSleep = [...allSleepData].sort((a, b) => a.date.localeCompare(b.date));

  // Sleep Scholar: 7 consecutive nights of 7+ hours
  let sleepStreak = 0;
  let maxSleepStreak = 0;
  for (let i = 0; i < sortedSleep.length; i++) {
    if (sortedSleep[i].total_minutes >= 420) {
      if (i === 0 || differenceInCalendarDays(parseISO(sortedSleep[i].date), parseISO(sortedSleep[i - 1].date)) === 1) {
        sleepStreak++;
      } else {
        sleepStreak = 1;
      }
      maxSleepStreak = Math.max(maxSleepStreak, sleepStreak);
    } else {
      sleepStreak = 0;
    }
  }
  if (maxSleepStreak >= 7) await award('sleep_7_streak_7');

  // Well Rested: average 8+ hours across any full week (Mon–Sun)
  const sleepByWeek: Record<string, number[]> = {};
  for (const s of sortedSleep) {
    const wk = format(startOfWeek(parseISO(s.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!sleepByWeek[wk]) sleepByWeek[wk] = [];
    sleepByWeek[wk].push(s.total_minutes);
  }
  for (const mins of Object.values(sleepByWeek)) {
    if (mins.length >= 7) {
      const avg = mins.reduce((a, b) => a + b, 0) / mins.length;
      if (avg >= 480) { await award('sleep_8h_avg_week'); break; }
    }
  }

  // Dream Machine: average 7+ hours for a calendar month
  const sleepByMonth: Record<string, number[]> = {};
  for (const s of sortedSleep) {
    const month = s.date.slice(0, 7); // yyyy-MM
    if (!sleepByMonth[month]) sleepByMonth[month] = [];
    sleepByMonth[month].push(s.total_minutes);
  }
  for (const [month, mins] of Object.entries(sleepByMonth)) {
    const daysInMonth = getDaysInMonth(parseISO(`${month}-01`));
    if (mins.length >= daysInMonth * 0.8) { // require data for at least 80% of the month
      const avg = mins.reduce((a, b) => a + b, 0) / mins.length;
      if (avg >= 420) { await award('sleep_7h_avg_month'); break; }
    }
  }

  // ── Nutrition badges ────────────────────────────────────────────────────────
  const sortedNutrition = [...allNutritionData]
    .filter((d) => d.nutrition_score !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Perfect Plate: any day with score 21
  if (sortedNutrition.some((d) => d.nutrition_score! >= 21)) await award('nutrition_perfect');

  // Clean Eater: 7 consecutive days with score 14+
  let nutStreak = 0;
  let maxNutStreak = 0;
  for (let i = 0; i < sortedNutrition.length; i++) {
    if (sortedNutrition[i].nutrition_score! >= 14) {
      if (i === 0 || differenceInCalendarDays(parseISO(sortedNutrition[i].date), parseISO(sortedNutrition[i - 1].date)) === 1) {
        nutStreak++;
      } else {
        nutStreak = 1;
      }
      maxNutStreak = Math.max(maxNutStreak, nutStreak);
    } else {
      nutStreak = 0;
    }
  }
  if (maxNutStreak >= 7) await award('nutrition_streak_7');

  // Nutrition Master: average 14+ for a calendar month
  const nutByMonth: Record<string, number[]> = {};
  for (const d of sortedNutrition) {
    const month = d.date.slice(0, 7);
    if (!nutByMonth[month]) nutByMonth[month] = [];
    nutByMonth[month].push(d.nutrition_score!);
  }
  for (const [month, scores] of Object.entries(nutByMonth)) {
    const daysInMonth = getDaysInMonth(parseISO(`${month}-01`));
    if (scores.length >= daysInMonth * 0.8) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg >= 14) { await award('nutrition_14_avg_month'); break; }
    }
  }

  // ── Variety badges ────────────────────────────────────────────────────────────
  // Early Bird / Night Owl: any workout at qualifying hour
  if (activeWorkouts.some((w) => parseISO(w.started_at).getHours() < 6))   await award('early_bird');
  if (activeWorkouts.some((w) => parseISO(w.started_at).getHours() >= 21)) await award('night_owl');

  return earned;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluate achievements after a single workout save.
 * Called by the workouts POST route.
 */
export async function evaluateAchievements(workoutId: number): Promise<NewBadge[]> {
  const workout = await db.select().from(workouts).where(eq(workouts.id, workoutId)).get();
  if (!workout) return [];

  const existing = await db.select({ badge_key: achievements.badge_key }).from(achievements);
  const earnedKeys = new Set(existing.map((a) => a.badge_key));

  const allWorkouts = await db.select({
    id: workouts.id, type: workouts.type, name: workouts.name,
    started_at: workouts.started_at, duration_minutes: workouts.duration_minutes,
    strain_score: workouts.strain_score,
  }).from(workouts);

  const allStrainData = await db.select({
    date: dailyStrain.date, strain_score: dailyStrain.strain_score, steps: dailyStrain.steps,
  }).from(dailyStrain);

  const allSleepData = await db.select({
    date: dailySleep.date, total_minutes: dailySleep.total_minutes,
  }).from(dailySleep);

  const allNutritionData = await db.select({
    date: dailyNutrition.date, nutrition_score: dailyNutrition.nutrition_score,
  }).from(dailyNutrition);

  const settings = await db.select().from(userSettings).get();

  return runAwards(allWorkouts, allStrainData, allSleepData, allNutritionData, settings ?? undefined, earnedKeys, workoutId);
}

/**
 * Evaluate all achievements from scratch against the full history.
 * Clears existing achievements first so stale/incorrect badges are removed.
 * Called after bulk imports and from the recalculate endpoint.
 */
export async function evaluateAllAchievements(): Promise<NewBadge[]> {
  // Wipe and re-award so removed eligibility (e.g. Walking exclusion) is reflected
  await db.delete(achievements);
  const earnedKeys = new Set<string>();

  const allWorkouts = await db.select({
    id: workouts.id, type: workouts.type, name: workouts.name,
    started_at: workouts.started_at, duration_minutes: workouts.duration_minutes,
    strain_score: workouts.strain_score,
  }).from(workouts);

  const allStrainData = await db.select({
    date: dailyStrain.date, strain_score: dailyStrain.strain_score, steps: dailyStrain.steps,
  }).from(dailyStrain);

  const allSleepData = await db.select({
    date: dailySleep.date, total_minutes: dailySleep.total_minutes,
  }).from(dailySleep);

  const allNutritionData = await db.select({
    date: dailyNutrition.date, nutrition_score: dailyNutrition.nutrition_score,
  }).from(dailyNutrition);

  const settings = await db.select().from(userSettings).get();

  return runAwards(allWorkouts, allStrainData, allSleepData, allNutritionData, settings ?? undefined, earnedKeys, null);
}
