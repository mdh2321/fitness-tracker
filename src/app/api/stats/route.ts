import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, dailyStrain, exercises, exerciseSets, userSettings } from '@/db/schema';
import { desc, eq, sql, gte, and } from 'drizzle-orm';
import { calculateStreaks } from '@/lib/streaks';
import { calculateExerciseStreak } from '@/lib/streaks';
import { format, subDays, startOfWeek, endOfWeek, parseISO, getDaysInMonth, startOfMonth, addDays } from 'date-fns';

export async function GET(request: NextRequest) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

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
        gte(workouts.started_at, weekStart),
        sql`date(${workouts.started_at}) <= ${weekEnd}`
      )
    );

  // All workouts for streaks and totals
  const allWorkouts = await db
    .select({
      started_at: workouts.started_at,
      duration_minutes: workouts.duration_minutes,
      type: workouts.type,
    })
    .from(workouts);

  const streaks = calculateStreaks(allWorkouts.map((w) => w.started_at));

  // Exercise streak (30 min/day)
  const dailyMinutesMap: Record<string, number> = {};
  for (const w of allWorkouts) {
    const d = format(parseISO(w.started_at), 'yyyy-MM-dd');
    dailyMinutesMap[d] = (dailyMinutesMap[d] || 0) + w.duration_minutes;
  }
  const dailyMinutes = Object.entries(dailyMinutesMap).map(([date, totalMinutes]) => ({
    date,
    totalMinutes,
  }));
  const exerciseStreak = calculateExerciseStreak(dailyMinutes);

  // Settings for targets
  const settings = await db.select().from(userSettings).get();

  // Weekly progress
  const cardioMinutes = weekWorkouts
    .filter((w) => w.type === 'cardio' || w.type === 'mixed')
    .reduce((sum, w) => sum + w.duration_minutes, 0);
  const strengthSessions = weekWorkouts.filter((w) => w.type === 'strength' || w.type === 'mixed').length;
  const uniqueWorkoutDays = new Set(weekWorkouts.map((w) => format(parseISO(w.started_at), 'yyyy-MM-dd'))).size;

  // Weekly steps from daily_strain
  const weekStrainData = await db
    .select()
    .from(dailyStrain)
    .where(and(gte(dailyStrain.date, weekStart), sql`${dailyStrain.date} <= ${weekEnd}`));
  const weeklySteps = weekStrainData.reduce((sum, d) => sum + d.steps, 0);

  // Last 7 days strain
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const strain = await db.select().from(dailyStrain).where(eq(dailyStrain.date, date)).get();
    last7Days.push({
      date,
      strain_score: strain?.strain_score || 0,
      workout_count: strain?.workout_count || 0,
      total_duration: strain?.total_duration || 0,
      total_volume: strain?.total_volume || 0,
      total_calories: strain?.total_calories || 0,
      steps: strain?.steps || 0,
    });
  }

  // Current month data for streaks month view
  const now = new Date();
  const monthStartDate = startOfMonth(now);
  const daysInMonth = getDaysInMonth(now);
  const monthDays = [];
  for (let i = 0; i < daysInMonth; i++) {
    const date = format(addDays(monthStartDate, i), 'yyyy-MM-dd');
    const hasWorkout = dailyMinutesMap[date] ? dailyMinutesMap[date] > 0 : false;
    monthDays.push({ date, hasWorkout, minutes: dailyMinutesMap[date] || 0 });
  }

  // 4-week rolling averages
  const fourWeeksAgo = format(subDays(new Date(), 28), 'yyyy-MM-dd');
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

  // Total stats
  const totalWorkouts = allWorkouts.length;
  const allStrainData = await db.select().from(dailyStrain);
  const totalCalories = allStrainData.reduce((s, d) => s + d.total_calories, 0);
  const totalDuration = allWorkouts.reduce((s, w) => s + w.duration_minutes, 0);

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
    last7Days,
    last7DaysMinutes: (() => {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        result.push({ date, totalMinutes: dailyMinutesMap[date] || 0 });
      }
      return result;
    })(),
    streakThreshold: 30,
    averages: {
      strain: Math.round(avgStrain * 10) / 10,
      volume: Math.round(avgVolume),
    },
    totals: {
      workouts: totalWorkouts,
      calories: totalCalories,
      duration: totalDuration,
    },
  });
}
