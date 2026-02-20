import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, dailyStrain, userSettings } from '@/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { calculateStrainScore, aggregateDailyStrain } from '@/lib/strain';
import { APPLE_HEALTH_TYPE_MAP } from '@/lib/constants';
import { format } from 'date-fns';
import type { WorkoutType } from '@/lib/constants';

// Estimate RPE (1–10) from average heart rate when no manual effort is provided
function estimateRPE(avgHR: number | null, userMaxHR: number): number {
  if (!avgHR || userMaxHR <= 0) return 5;
  return Math.max(1, Math.min(10, Math.round((avgHR / userMaxHR) * 12)));
}

// Accept several date string formats sent by Shortcuts / Apple Health
function parseFlexibleDate(dateStr: string): Date {
  // "2026-02-20 08:00:00 +1100" → "2026-02-20T08:00:00+11:00"
  const normalised = dateStr
    .trim()
    .replace(' ', 'T')
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const d = new Date(normalised);
  if (!isNaN(d.getTime())) return d;
  // fallback: try as-is
  return new Date(dateStr);
}

async function recalcDailyStrain(date: string) {
  const dayStart = new Date(`${date}T00:00:00`).toISOString();
  const dayEnd = new Date(new Date(`${date}T00:00:00`).getTime() + 86400000).toISOString();

  const dayWorkouts = await db
    .select()
    .from(workouts)
    .where(
      and(
        gte(workouts.started_at, dayStart),
        sql`${workouts.started_at} < ${dayEnd}`
      )
    );

  if (dayWorkouts.length === 0) return;

  const existing = await db.select().from(dailyStrain).where(eq(dailyStrain.date, date)).get();
  const existingSteps = existing?.steps ?? 0;

  const aggStrain = aggregateDailyStrain(dayWorkouts.map((w) => w.strain_score));
  const totalDuration = dayWorkouts.reduce((s, w) => s + w.duration_minutes, 0);
  const totalCals = dayWorkouts.reduce((s, w) => s + (w.calories ?? 0), 0);

  await db
    .insert(dailyStrain)
    .values({
      date,
      strain_score: aggStrain,
      workout_count: dayWorkouts.length,
      total_duration: totalDuration,
      total_volume: 0,
      total_calories: totalCals,
      steps: existingSteps,
    })
    .onConflictDoUpdate({
      target: dailyStrain.date,
      set: {
        strain_score: aggStrain,
        workout_count: dayWorkouts.length,
        total_duration: totalDuration,
        total_calories: totalCals,
      },
    });
}

export async function POST(request: NextRequest) {
  // --- Auth ---
  const apiKey = request.headers.get('x-api-key');
  if (!process.env.SYNC_API_KEY || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { workouts?: any[]; steps?: any[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const incomingWorkouts: any[] = body.workouts ?? [];
  const incomingSteps: any[] = body.steps ?? [];

  // User settings (for max HR → RPE estimation)
  const settings = await db.select().from(userSettings).get();
  const userMaxHR = settings?.max_heart_rate ?? 190;

  let importedWorkouts = 0;
  let skippedWorkouts = 0;
  const affectedDates = new Set<string>();

  // --- Workouts ---
  for (const w of incomingWorkouts) {
    // Deduplicate by apple_health_id
    if (w.id) {
      const existing = await db
        .select({ id: workouts.id })
        .from(workouts)
        .where(eq(workouts.apple_health_id, String(w.id)))
        .get();
      if (existing) { skippedWorkouts++; continue; }
    }

    // Map HK activity type
    const mapping = APPLE_HEALTH_TYPE_MAP[w.activityType];
    if (!mapping) { skippedWorkouts++; continue; }

    const startDate = parseFlexibleDate(w.startDate);
    if (isNaN(startDate.getTime())) { skippedWorkouts++; continue; }

    const endDate = w.endDate ? parseFlexibleDate(w.endDate) : null;
    const durationMinutes =
      w.duration ??
      (endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) : 0);

    if (durationMinutes <= 0) { skippedWorkouts++; continue; }

    const avgHR = w.avgHeartRate ? Math.round(Number(w.avgHeartRate)) : null;
    const maxHR = w.maxHeartRate ? Math.round(Number(w.maxHeartRate)) : null;
    const rpe = estimateRPE(avgHR, userMaxHR);

    const strainScore = calculateStrainScore({
      duration_minutes: durationMinutes,
      perceived_effort: rpe,
      type: mapping.type as WorkoutType,
      avg_heart_rate: avgHR,
      max_heart_rate: maxHR,
      user_max_heart_rate: userMaxHR,
    });

    const dateKey = format(startDate, 'yyyy-MM-dd');

    await db.insert(workouts).values({
      type: mapping.type,
      name: w.name ?? mapping.name,
      started_at: startDate.toISOString(),
      ended_at: endDate?.toISOString() ?? null,
      duration_minutes: durationMinutes,
      perceived_effort: rpe,
      avg_heart_rate: avgHR,
      max_heart_rate: maxHR,
      calories: w.calories != null ? Math.round(Number(w.calories)) : null,
      strain_score: strainScore,
      source: 'apple_health',
      apple_health_id: w.id ? String(w.id) : null,
      created_at: new Date().toISOString(),
    });

    affectedDates.add(dateKey);
    importedWorkouts++;
  }

  // --- Steps ---
  let importedSteps = 0;
  for (const s of incomingSteps) {
    if (!s.date || s.count == null) continue;
    await db
      .insert(dailyStrain)
      .values({
        date: s.date,
        strain_score: 0,
        workout_count: 0,
        total_duration: 0,
        total_volume: 0,
        total_calories: 0,
        steps: Math.round(Number(s.count)),
      })
      .onConflictDoUpdate({
        target: dailyStrain.date,
        set: { steps: Math.round(Number(s.count)) },
      });
    importedSteps++;
  }

  // --- Recalculate daily strain for affected dates ---
  for (const date of affectedDates) {
    await recalcDailyStrain(date);
  }

  return NextResponse.json({
    imported: {
      workouts: importedWorkouts,
      skipped: skippedWorkouts,
      steps: importedSteps,
    },
    message: `Synced ${importedWorkouts} workout(s), ${importedSteps} day(s) of steps`,
  });
}
