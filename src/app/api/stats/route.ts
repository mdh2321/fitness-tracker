import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, dailyStrain, exercises, exerciseSets, userSettings, dailySleep, dailyNutrition } from '@/db/schema';
import { desc, eq, sql, gte, and } from 'drizzle-orm';
import { calculateStreaks, calculateExerciseStreak, calculateWeeklyGoalStreak } from '@/lib/streaks';
import { calculateSleepStreak, calculateNutritionStreak } from '@/lib/streaks-extended';
import { PASSIVE_ACTIVITIES } from '@/lib/constants';
import { format, subDays, subWeeks, startOfWeek, endOfWeek, parseISO, getDaysInMonth, startOfMonth, addDays } from 'date-fns';

export async function GET(request: NextRequest) {
  // Use client-supplied date to avoid UTC vs local timezone mismatch on Vercel
  const { searchParams } = new URL(request.url);
  const today = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const now = parseISO(today);
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Today's stats
  const todayStrain = await db
    .select()
    .from(dailyStrain)
    .where(eq(dailyStrain.date, today))
    .get();

  // This week's workouts
  const weekWorkouts = await db
    .select()
    .from(workouts)
    .where(
      and(
        gte(workouts.local_date, weekStart),
        sql`${workouts.local_date} <= ${weekEnd}`
      )
    );

  // All workouts for streaks and totals
  const allWorkouts = await db
    .select({
      started_at: workouts.started_at,
      local_date: workouts.local_date,
      duration_minutes: workouts.duration_minutes,
      type: workouts.type,
      name: workouts.name,
    })
    .from(workouts);

  // Active workouts exclude passive activities (e.g. Walking) from goal/streak metrics
  const activeWorkouts = allWorkouts.filter((w) => !PASSIVE_ACTIVITIES.has(w.name));

  const streaks = calculateStreaks(activeWorkouts.map((w) => w.local_date ?? w.started_at));

  // Active time streak (30 min/day) — includes all workouts (walking counts)
  const dailyMinutesMap: Record<string, number> = {};
  for (const w of allWorkouts) {
    const d = w.local_date ?? format(parseISO(w.started_at), 'yyyy-MM-dd');
    dailyMinutesMap[d] = (dailyMinutesMap[d] || 0) + w.duration_minutes;
  }
  const dailyMinutes = Object.entries(dailyMinutesMap).map(([date, totalMinutes]) => ({
    date,
    totalMinutes,
  }));
  // Settings for targets (fetched early so we can use for streaks)
  const settings = await db.select().from(userSettings).get();
  const dailyTargets = {
    activeMinutes: settings?.daily_active_minutes_target ?? 30,
    sleepMinutes: settings?.daily_sleep_minutes_target ?? 420,
    nutritionScore: settings?.daily_nutrition_score_target ?? 14,
    steps: settings?.daily_steps_target ?? 10000,
    strain: settings?.daily_strain_target ?? 10,
  };

  const exerciseStreak = calculateExerciseStreak(dailyMinutes, dailyTargets.activeMinutes);

  // Weekly progress
  const CARDIO_ACTIVITIES = new Set(['Running', 'Cycling', 'Swimming', 'Rowing', 'HIIT']);
  const cardioMinutes = weekWorkouts
    .filter((w) => CARDIO_ACTIVITIES.has(w.name))
    .reduce((sum, w) => sum + w.duration_minutes, 0);
  const strengthSessions = weekWorkouts.filter((w) => w.type === 'strength').length;
  const uniqueWorkoutDays = new Set(
    weekWorkouts
      .filter((w) => !PASSIVE_ACTIVITIES.has(w.name))
      .map((w) => w.local_date)
  ).size;

  // Weekly steps from daily_strain
  const weekStrainData = await db
    .select()
    .from(dailyStrain)
    .where(and(gte(dailyStrain.date, weekStart), sql`${dailyStrain.date} <= ${weekEnd}`));
  const weeklySteps = weekStrainData.reduce((sum, d) => sum + d.steps, 0);

  // Historical strain data covering 13 weeks back (for 12-week perfect-week history)
  const thirteenWeeksAgo = format(subWeeks(now, 13), 'yyyy-MM-dd');
  const historicalStrainData = await db
    .select()
    .from(dailyStrain)
    .where(gte(dailyStrain.date, thirteenWeeksAgo));

  // Build 12-week history: oldest first (i=12 → i=1)
  const weekHistory = [];
  for (let i = 12; i >= 1; i--) {
    const wStart = format(startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const wEnd = format(endOfWeek(subWeeks(now, i), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const wWorkouts = allWorkouts.filter(
      (w) => (w.local_date ?? '') >= wStart && (w.local_date ?? '') <= wEnd && !PASSIVE_ACTIVITIES.has(w.name)
    );

    const wUniqueWorkoutDays = new Set(wWorkouts.map((w) => w.local_date)).size;
    const wCardioMinutes = wWorkouts
      .filter((w) => CARDIO_ACTIVITIES.has(w.name))
      .reduce((sum, w) => sum + w.duration_minutes, 0);
    const wStrengthSessions = wWorkouts.filter((w) => w.type === 'strength').length;
    const wSteps = historicalStrainData
      .filter((d) => d.date >= wStart && d.date <= wEnd)
      .reduce((sum, d) => sum + d.steps, 0);

    const perfect =
      wUniqueWorkoutDays >= (settings?.weekly_workout_target || 4) &&
      wCardioMinutes >= (settings?.weekly_cardio_minutes_target || 150) &&
      wStrengthSessions >= (settings?.weekly_strength_sessions_target || 3) &&
      wSteps >= (settings?.weekly_steps_target || 70000);

    weekHistory.push({ weekStart: wStart, perfect });
  }
  const weeklyStreak = calculateWeeklyGoalStreak(weekHistory);

  // Last 7 days strain + sleep + nutrition (previous 7 days, excluding today)
  const last7Days = [];
  for (let i = 7; i >= 1; i--) {
    const date = format(subDays(now, i), 'yyyy-MM-dd');
    const strain = await db.select().from(dailyStrain).where(eq(dailyStrain.date, date)).get();
    const sleep = await db.select().from(dailySleep).where(eq(dailySleep.date, date)).get();
    const nutrition = await db.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).get();
    last7Days.push({
      date,
      strain_score: strain?.strain_score || 0,
      workout_count: strain?.workout_count || 0,
      total_duration: strain?.total_duration || 0,
      total_volume: strain?.total_volume || 0,
      total_calories: strain?.total_calories || 0,
      steps: strain?.steps || 0,
      sleep_minutes: sleep?.total_minutes || 0,
      nutrition_score: nutrition?.nutrition_score || 0,
    });
  }

  // Previous 7 days for trend comparison (days 8-14 ago)
  const prev7Days = [];
  for (let i = 14; i >= 8; i--) {
    const date = format(subDays(now, i), 'yyyy-MM-dd');
    const strain = await db.select().from(dailyStrain).where(eq(dailyStrain.date, date)).get();
    const sleep = await db.select().from(dailySleep).where(eq(dailySleep.date, date)).get();
    const nutrition = await db.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).get();
    prev7Days.push({
      strain_score: strain?.strain_score || 0,
      steps: strain?.steps || 0,
      sleep_minutes: sleep?.total_minutes || 0,
      nutrition_score: nutrition?.nutrition_score || 0,
    });
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const trendComparison = {
    strain: { current: avg(last7Days.map(d => d.strain_score)), previous: avg(prev7Days.map(d => d.strain_score)) },
    steps: { current: avg(last7Days.map(d => d.steps)), previous: avg(prev7Days.map(d => d.steps)) },
    sleep: { current: avg(last7Days.map(d => d.sleep_minutes)), previous: avg(prev7Days.map(d => d.sleep_minutes)) },
    nutrition: { current: avg(last7Days.map(d => d.nutrition_score)), previous: avg(prev7Days.map(d => d.nutrition_score)) },
  };

  // Current month data for streaks month view
  const monthStartDate = startOfMonth(now);
  const daysInMonth = getDaysInMonth(now);
  const monthDays = [];
  for (let i = 0; i < daysInMonth; i++) {
    const date = format(addDays(monthStartDate, i), 'yyyy-MM-dd');
    const hasWorkout = dailyMinutesMap[date] ? dailyMinutesMap[date] > 0 : false;
    monthDays.push({ date, hasWorkout, minutes: dailyMinutesMap[date] || 0 });
  }

  // 4-week rolling averages
  const fourWeeksAgo = format(subDays(now, 28), 'yyyy-MM-dd');
  const recentStrain = await db
    .select()
    .from(dailyStrain)
    .where(gte(dailyStrain.date, fourWeeksAgo));

  const avgStrain = recentStrain.length > 0
    ? recentStrain.reduce((s, d) => s + d.strain_score, 0) / recentStrain.length
    : 0;
  const avgVolume = recentStrain.length > 0
    ? recentStrain.reduce((s, d) => s + d.total_volume, 0) / recentStrain.length
    : 0;

  // Total stats — excludes passive activities
  const totalWorkouts = activeWorkouts.length;
  const allStrainData = await db.select().from(dailyStrain);
  const totalCalories = allStrainData.reduce((s, d) => s + d.total_calories, 0);
  const totalDuration = activeWorkouts.reduce((s, w) => s + w.duration_minutes, 0);

  // Sleep and nutrition data for today's card + streaks
  const todaySleep = await db
    .select()
    .from(dailySleep)
    .where(eq(dailySleep.date, today))
    .get();

  const todayNutrition = await db
    .select()
    .from(dailyNutrition)
    .where(eq(dailyNutrition.date, today))
    .get();

  // All sleep/nutrition data for streak calculation
  const allSleepData = await db
    .select({ date: dailySleep.date, total_minutes: dailySleep.total_minutes })
    .from(dailySleep);
  const allNutritionData = await db
    .select({ date: dailyNutrition.date, nutrition_score: dailyNutrition.nutrition_score })
    .from(dailyNutrition);

  const sleepStreak = calculateSleepStreak(allSleepData, dailyTargets.sleepMinutes);
  const nutritionStreak = calculateNutritionStreak(allNutritionData, dailyTargets.nutritionScore);

  // Build sets of qualifying dates for streak calendar display (using user targets)
  const sleepQualifyingDates = allSleepData
    .filter((d) => d.total_minutes >= dailyTargets.sleepMinutes)
    .map((d) => d.date);
  const nutritionQualifyingDates = allNutritionData
    .filter((d) => d.nutrition_score !== null && d.nutrition_score >= dailyTargets.nutritionScore)
    .map((d) => d.date);
  const exerciseQualifyingDates = dailyMinutes
    .filter((d) => d.totalMinutes >= dailyTargets.activeMinutes)
    .map((d) => d.date);

  const metrics = {
    sleepHours: todaySleep ? Math.round((todaySleep.total_minutes / 60) * 10) / 10 : null,
    nutritionScore: todayNutrition?.nutrition_score ?? null,
  };

  return NextResponse.json({
    today: {
      strain: todayStrain?.strain_score || 0,
      workouts: todayStrain?.workout_count || 0,
      duration: todayStrain?.total_duration || 0,
      calories: todayStrain?.total_calories || 0,
      volume: todayStrain?.total_volume || 0,
      steps: todayStrain?.steps || 0,
    },
    streaks,
    exerciseStreak,
    monthDays,
    weeklyProgress: {
      workouts: uniqueWorkoutDays,
      cardioMinutes,
      strengthSessions,
      steps: weeklySteps,
      targets: {
        workouts: settings?.weekly_workout_target || 4,
        cardioMinutes: settings?.weekly_cardio_minutes_target || 150,
        strengthSessions: settings?.weekly_strength_sessions_target || 3,
        steps: settings?.weekly_steps_target || 70000,
      },
    },
    weeklyStreak,
    last7Days,
    last7DaysMinutes: (() => {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(now, i), 'yyyy-MM-dd');
        result.push({ date, totalMinutes: dailyMinutesMap[date] || 0 });
      }
      return result;
    })(),
    streakThreshold: dailyTargets.activeMinutes,
    dailyTargets,
    averages: {
      strain: Math.round(avgStrain * 10) / 10,
      volume: Math.round(avgVolume),
    },
    totals: {
      workouts: totalWorkouts,
      calories: totalCalories,
      duration: totalDuration,
    },
    activeWorkoutDates: [...new Set(activeWorkouts.map((w) => w.started_at.slice(0, 10)))],
    sleepStreak,
    nutritionStreak,
    sleepQualifyingDates,
    nutritionQualifyingDates,
    exerciseQualifyingDates,
    metrics,
    trendComparison,
  });
}
