import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, dailyStrain } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { calculateStrainScore, aggregateDailyStrain } from '@/lib/strain';
import type { WorkoutType } from '@/lib/constants';
import type { AppleHealthWorkout } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { workouts: importWorkouts } = body as { workouts: AppleHealthWorkout[] };

  let imported = 0;
  let skipped = 0;
  const affectedDates = new Set<string>();

  for (const w of importWorkouts) {
    if (!w.selected) {
      skipped++;
      continue;
    }

    // Check for duplicate
    const existing = await db
      .select()
      .from(workouts)
      .where(eq(workouts.apple_health_id, w.sourceId))
      .get();

    if (existing) {
      skipped++;
      continue;
    }

    const strainScore = calculateStrainScore({
      duration_minutes: w.duration,
      perceived_effort: estimateRPE(w),
      type: w.type as WorkoutType,
      avg_heart_rate: w.avgHeartRate,
      max_heart_rate: w.maxHeartRate,
    });

    await db.insert(workouts).values({
      type: w.type,
      name: w.name,
      started_at: localDateTimeString(w.startDate),
      ended_at: localDateTimeString(w.endDate),
      duration_minutes: w.duration,
      perceived_effort: estimateRPE(w),
      avg_heart_rate: w.avgHeartRate,
      max_heart_rate: w.maxHeartRate,
      calories: w.calories,
      strain_score: strainScore,
      source: 'apple_health',
      apple_health_id: w.sourceId,
      created_at: new Date().toISOString(),
    });

    affectedDates.add(localDateTimeString(w.startDate).substring(0, 10));
    imported++;
  }

  // Recalculate daily strain for affected dates
  for (const date of affectedDates) {
    const dayWorkouts = await db
      .select()
      .from(workouts)
      .where(sql`date(${workouts.started_at}) = ${date}`);

    const strains = dayWorkouts.map((w) => w.strain_score);
    const aggStrain = aggregateDailyStrain(strains);

    // Preserve existing steps — read before insert in case this is a fresh row
    const existingStrain = await db.select().from(dailyStrain).where(eq(dailyStrain.date, date)).get();
    const existingSteps = existingStrain?.steps ?? 0;

    await db
      .insert(dailyStrain)
      .values({
        date,
        strain_score: aggStrain,
        workout_count: dayWorkouts.length,
        total_duration: dayWorkouts.reduce((s, w) => s + w.duration_minutes, 0),
        total_volume: 0,
        total_calories: dayWorkouts.reduce((s, w) => s + (w.calories || 0), 0),
        steps: existingSteps,
      })
      .onConflictDoUpdate({
        target: dailyStrain.date,
        set: {
          strain_score: aggStrain,
          workout_count: dayWorkouts.length,
          total_duration: dayWorkouts.reduce((s, w) => s + w.duration_minutes, 0),
          total_calories: dayWorkouts.reduce((s, w) => s + (w.calories || 0), 0),
        },
      });
  }

  return NextResponse.json({ imported, skipped });
}

// Extract local datetime from an Apple Health XML timestamp (e.g. "2026-02-23 09:29:00 +1100")
// and return it as a fake-UTC ISO string (e.g. "2026-02-23T09:29:00.000Z") so that
// SQLite's date() function returns the user's local date — consistent with manually-entered workouts.
function localDateTimeString(dateStr: string): string {
  const normalised = dateStr.trim().replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const match = normalised.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]}.000Z` : new Date(dateStr).toISOString();
}

function estimateRPE(w: AppleHealthWorkout): number {
  // Estimate RPE from workout characteristics when no HR data
  const durationFactor = Math.min(w.duration / 90, 1);
  let base = 5;

  if (w.type === 'cardio') base = 6;
  else if (w.type === 'mixed') base = 7;
  else if (w.type === 'strength') base = 6;
  else if (w.type === 'flexibility') base = 3;
  else if (w.type === 'sport') base = 6;

  // Adjust by duration
  const rpe = Math.round(base + durationFactor * 2);
  return Math.min(10, Math.max(1, rpe));
}
