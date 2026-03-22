import { NextRequest, NextResponse } from 'next/server';
import { db, rawClient, dbReady } from '@/db';
import { dailyStrain, dailySleep, dailyNutrition, workouts } from '@/db/schema';
import { and, gte, sql } from 'drizzle-orm';
import { format, endOfWeek, parseISO } from 'date-fns';
import { generateWeeklySummary } from '@/lib/weekly-report-ai';
import { PASSIVE_ACTIVITIES } from '@/lib/constants';

export async function GET() {
  try {
    await dbReady;
    const result = await rawClient.execute('SELECT * FROM weekly_reports ORDER BY week_start DESC');
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    console.error('GET reports error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbReady;
    const body = await request.json();
    const weekStart = body.week_start;

    if (!weekStart) {
      return NextResponse.json({ error: 'week_start is required' }, { status: 400 });
    }

    // Check if report already exists
    const existing = await rawClient.execute({ sql: 'SELECT id FROM weekly_reports WHERE week_start = ?', args: [weekStart] });
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Report already exists for this week' }, { status: 409 });
    }

    const weekEnd = format(endOfWeek(parseISO(weekStart), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    // Gather week data using Drizzle for schema-backed tables
    const strainData = await db
      .select()
      .from(dailyStrain)
      .where(and(gte(dailyStrain.date, weekStart), sql`${dailyStrain.date} <= ${weekEnd}`));

    const sleepData = await db
      .select()
      .from(dailySleep)
      .where(and(gte(dailySleep.date, weekStart), sql`${dailySleep.date} <= ${weekEnd}`));

    const nutritionData = await db
      .select()
      .from(dailyNutrition)
      .where(and(gte(dailyNutrition.date, weekStart), sql`${dailyNutrition.date} <= ${weekEnd}`));

    const weekWorkouts = await db
      .select()
      .from(workouts)
      .where(and(
        sql`date(${workouts.started_at}) >= ${weekStart}`,
        sql`date(${workouts.started_at}) <= ${weekEnd}`
      ));

    const activeWorkouts = weekWorkouts.filter((w) => !PASSIVE_ACTIVITIES.has(w.name));
    const workoutCount = activeWorkouts.length;
    const totalDuration = weekWorkouts.reduce((s, w) => s + w.duration_minutes, 0);
    const totalSteps = strainData.reduce((s, d) => s + d.steps, 0);
    const avgStrain = strainData.length > 0
      ? strainData.reduce((s, d) => s + d.strain_score, 0) / strainData.length
      : 0;
    const avgSleepHours = sleepData.length > 0
      ? sleepData.reduce((s, d) => s + d.total_minutes, 0) / sleepData.length / 60
      : null;
    const scoredNutrition = nutritionData.filter((d) => d.nutrition_score !== null);
    const avgNutritionScore = scoredNutrition.length > 0
      ? scoredNutrition.reduce((s, d) => s + (d.nutrition_score ?? 0), 0) / scoredNutrition.length
      : null;

    // Generate AI summary
    const ai = await generateWeeklySummary({
      weekStart,
      weekEnd,
      workoutCount,
      totalDuration,
      avgStrain,
      avgSleepHours,
      avgNutritionScore,
      totalSteps,
    });

    // Insert using raw client
    await rawClient.execute({
      sql: `INSERT INTO weekly_reports (week_start, week_end, workout_count, total_duration, avg_strain, avg_sleep_hours, avg_nutrition_score, total_steps, ai_summary, ai_highlights, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        weekStart,
        weekEnd,
        workoutCount,
        totalDuration,
        Math.round(avgStrain * 10) / 10,
        avgSleepHours !== null ? Math.round(avgSleepHours * 10) / 10 : null,
        avgNutritionScore !== null ? Math.round(avgNutritionScore * 10) / 10 : null,
        totalSteps,
        ai.summary,
        JSON.stringify(ai.highlights),
        new Date().toISOString(),
      ],
    });

    const report = await rawClient.execute({ sql: 'SELECT * FROM weekly_reports WHERE week_start = ?', args: [weekStart] });
    return NextResponse.json(report.rows[0]);
  } catch (error: unknown) {
    console.error('Report generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
