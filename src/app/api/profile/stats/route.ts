import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dbReady, rawClient } from '@/db';
import { workouts, dailyStrain, dailySleep, dailyNutrition, userSettings } from '@/db/schema';
import { sql, gte, desc, and } from 'drizzle-orm';
import { format, subDays, parseISO, startOfWeek } from 'date-fns';

/**
 * GET /api/profile/stats
 * Computes RPG-style character stats (STR, END, REC, NUT, DSC) from real data.
 * Also returns lifetime stats for the profile card.
 */
export async function GET(request: NextRequest) {
  await dbReady;

  const { searchParams } = new URL(request.url);
  const today = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const d30ago = format(subDays(parseISO(today), 30), 'yyyy-MM-dd');
  const d90ago = format(subDays(parseISO(today), 90), 'yyyy-MM-dd');

  const settings = await db.select().from(userSettings).get();

  // ── Strength: strength sessions in last 30 days, consistency over 90 days ──
  const strengthSessions30 = await db
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(and(
      gte(workouts.local_date, d30ago),
      sql`${workouts.type} = 'strength'`
    ))
    .get();

  const strengthSessions90 = await db
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(and(
      gte(workouts.local_date, d90ago),
      sql`${workouts.type} = 'strength'`
    ))
    .get();

  const weeklyTarget = settings?.weekly_strength_sessions_target ?? 3;
  // Sessions per week over last month vs target
  // Stretch target: need to exceed weekly target by ~1 session to max out
  const strStretchTarget = weeklyTarget + 1;
  const str30 = Math.min(1, ((strengthSessions30?.count ?? 0) / 4.3) / Math.max(strStretchTarget, 1));
  const strConsistency90 = Math.min(1, ((strengthSessions90?.count ?? 0) / 13) / Math.max(strStretchTarget, 1));
  const strScore = Math.min(100, Math.round(str30 * 60 + strConsistency90 * 40));

  // ── Endurance: running/cycling time heavily weighted, other cardio less, steps minor ──
  // Running + cycling (the real endurance work)
  const runCycleMins30 = await db
    .select({ total: sql<number>`coalesce(sum(${workouts.duration_minutes}), 0)` })
    .from(workouts)
    .where(and(
      gte(workouts.local_date, d30ago),
      sql`${workouts.name} IN ('Running', 'Cycling', 'Swimming', 'Rowing', 'Hiking')`
    ))
    .get();

  // Other cardio/mixed (HIIT, mixed cardio — partial credit)
  const otherCardioMins30 = await db
    .select({ total: sql<number>`coalesce(sum(${workouts.duration_minutes}), 0)` })
    .from(workouts)
    .where(and(
      gte(workouts.local_date, d30ago),
      sql`${workouts.type} IN ('cardio', 'mixed')`,
      sql`${workouts.name} NOT IN ('Running', 'Cycling', 'Swimming', 'Rowing', 'Hiking', 'Walking')`
    ))
    .get();

  const steps30 = await db
    .select({ total: sql<number>`coalesce(sum(${dailyStrain.steps}), 0)` })
    .from(dailyStrain)
    .where(gte(dailyStrain.date, d30ago))
    .get();

  // Target: weekly cardio target × ~4.3 weeks. Running should be the main driver.
  const monthlyCardioTarget = (settings?.weekly_cardio_minutes_target ?? 150) * 4.3;
  const stepsTarget = (settings?.weekly_steps_target ?? 70000) * 4.3;

  // Running/cycling/swim vs target (main driver — 60%)
  const endPrimary = Math.min(1, (runCycleMins30?.total ?? 0) / Math.max(monthlyCardioTarget, 1));
  // Other cardio vs half the target (secondary — 25%)
  const endSecondary = Math.min(1, (otherCardioMins30?.total ?? 0) / Math.max(monthlyCardioTarget * 0.5, 1));
  // Steps (minor — 15%)
  const endSteps = Math.min(1, (steps30?.total ?? 0) / Math.max(stepsTarget, 1));

  const endScore = Math.min(100, Math.round(endPrimary * 60 + endSecondary * 25 + endSteps * 15));

  // ── Recovery: sleep avg + consistency over 30 days ──
  const sleepData30 = await db
    .select({
      avg: sql<number>`coalesce(avg(${dailySleep.total_minutes}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(dailySleep)
    .where(gte(dailySleep.date, d30ago))
    .get();

  const sleepTarget = settings?.daily_sleep_minutes_target ?? 420;
  const sleepAvg = sleepData30?.avg ?? 0;
  const sleepDays = sleepData30?.count ?? 0;
  // Stretch target: need to average target + 30 mins to max quality
  const sleepStretchTarget = sleepTarget + 30;
  // Power curve: being below target is punished more steeply
  // At 86% of target (e.g. 6h vs 7h) raw ratio is 0.8, squared = 0.64
  const sleepRatio = Math.min(1, sleepAvg / sleepStretchTarget);
  const sleepQuality = sleepRatio * sleepRatio; // quadratic — harsh below target
  // Need 25+ days of data for full consistency credit
  const sleepConsistency = Math.min(1, sleepDays / 30);
  const sleepConsistencyGated = sleepDays >= 25 ? sleepConsistency : sleepConsistency * 0.5;
  const recScore = Math.min(100, Math.round(sleepQuality * 85 + sleepConsistencyGated * 15));

  // ── Nutrition: avg score + consistency over 30 days ──
  const nutritionData30 = await db
    .select({
      avg: sql<number>`coalesce(avg(${dailyNutrition.nutrition_score}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(dailyNutrition)
    .where(and(
      gte(dailyNutrition.date, d30ago),
      sql`${dailyNutrition.nutrition_score} IS NOT NULL`
    ))
    .get();

  const nutTarget = settings?.daily_nutrition_score_target ?? 14;
  const nutAvg = nutritionData30?.avg ?? 0;
  const nutDays = nutritionData30?.count ?? 0;
  // To hit 100: need avg above target AND log every day
  // Scale 0-21 score against a stretch target (target + 3, capped at 21)
  const nutStretchTarget = Math.min(21, nutTarget + 3);
  const nutQuality = Math.min(1, nutAvg / nutStretchTarget);
  const nutConsistency = Math.min(1, nutDays / 30);
  // Must log at least 20 days to get any consistency credit
  const nutConsistencyGated = nutDays >= 20 ? nutConsistency : nutConsistency * 0.5;
  const nutScore = Math.min(100, Math.round(nutQuality * 80 + nutConsistencyGated * 20));

  // ── Discipline: quest completion rate over last 4 weeks ──
  // Exclude current week (still in progress) and today's dailies (day just started)
  const weekStart = format(startOfWeek(parseISO(today), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const questData = await rawClient.execute(
    `SELECT count(*) as total, sum(completed) as done
     FROM weekly_quests
     WHERE week_start >= ? AND week_start < ?`,
    [format(subDays(parseISO(today), 28), 'yyyy-MM-dd'), weekStart]
  );
  const dailyQuestData = await rawClient.execute(
    `SELECT count(*) as total, sum(completed) as done
     FROM daily_quests
     WHERE date >= ? AND date < ?`,
    [format(subDays(parseISO(today), 28), 'yyyy-MM-dd'), today]
  );

  const totalQuests = Number(questData.rows[0]?.total ?? 0) + Number(dailyQuestData.rows[0]?.total ?? 0);
  const doneQuests = Number(questData.rows[0]?.done ?? 0) + Number(dailyQuestData.rows[0]?.done ?? 0);
  const dscScore = totalQuests > 0 ? Math.min(100, Math.round((doneQuests / totalQuests) * 100)) : 0;

  // ── Lifetime stats ──
  const totals = await db
    .select({
      workouts: sql<number>`count(*)`,
      totalMinutes: sql<number>`coalesce(sum(${workouts.duration_minutes}), 0)`,
      totalCalories: sql<number>`coalesce(sum(${workouts.calories}), 0)`,
    })
    .from(workouts)
    .get();

  const strainTotals = await db
    .select({
      avgStrain: sql<number>`coalesce(avg(${dailyStrain.strain_score}), 0)`,
      totalSteps: sql<number>`coalesce(sum(${dailyStrain.steps}), 0)`,
      activeDays: sql<number>`count(*)`,
    })
    .from(dailyStrain)
    .where(sql`${dailyStrain.workout_count} > 0`)
    .get();

  const firstWorkout = await db
    .select({ date: workouts.local_date })
    .from(workouts)
    .orderBy(workouts.started_at)
    .limit(1)
    .get();

  return NextResponse.json({
    stats: {
      STR: strScore,
      END: endScore,
      REC: recScore,
      NUT: nutScore,
      DSC: dscScore,
    },
    lifetime: {
      totalWorkouts: totals?.workouts ?? 0,
      totalHours: Math.round((totals?.totalMinutes ?? 0) / 60),
      totalCalories: totals?.totalCalories ?? 0,
      avgStrain: Number((strainTotals?.avgStrain ?? 0).toFixed(1)),
      totalSteps: strainTotals?.totalSteps ?? 0,
      activeDays: strainTotals?.activeDays ?? 0,
      memberSince: firstWorkout?.date ?? null,
    },
  });
}
