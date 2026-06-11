import { db } from '@/db';
import { workouts, exercises, exerciseSets, dailyStrain } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { aggregateDailyStrain, calculateTotalVolume } from '@/lib/strain';
import { PASSIVE_ACTIVITIES } from '@/lib/constants';

/** Recompute the daily_strain row for a local date from its workouts, preserving steps. */
export async function updateDailyStrain(date: string) {
  const dayWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.local_date, date));

  // Preserve existing steps value
  const existing = await db.select().from(dailyStrain).where(eq(dailyStrain.date, date)).get();
  const existingSteps = existing?.steps || 0;

  if (dayWorkouts.length === 0) {
    // Keep the row if it has steps data, otherwise delete
    if (existingSteps > 0) {
      await db.update(dailyStrain).set({
        strain_score: 0,
        workout_count: 0,
        total_duration: 0,
        total_volume: 0,
        total_calories: 0,
      }).where(eq(dailyStrain.date, date));
    } else {
      await db.delete(dailyStrain).where(eq(dailyStrain.date, date));
    }
    return;
  }

  const strains = dayWorkouts.map((w) => w.strain_score);
  const aggStrain = aggregateDailyStrain(strains);
  const totalDuration = dayWorkouts.reduce((s, w) => s + w.duration_minutes, 0);
  const totalCals = dayWorkouts.reduce((s, w) => s + (w.calories || 0), 0);
  const activeCount = dayWorkouts.filter((w) => !PASSIVE_ACTIVITIES.has(w.name)).length;

  // Calculate total volume for the day
  let totalVolume = 0;
  for (const w of dayWorkouts) {
    const exs = await db.select().from(exercises).where(eq(exercises.workout_id, w.id));
    for (const ex of exs) {
      const sets = await db.select().from(exerciseSets).where(eq(exerciseSets.exercise_id, ex.id));
      totalVolume += calculateTotalVolume(sets);
    }
  }

  await db
    .insert(dailyStrain)
    .values({
      date,
      strain_score: aggStrain,
      workout_count: activeCount,
      total_duration: totalDuration,
      total_volume: totalVolume,
      total_calories: totalCals,
      steps: existingSteps,
    })
    .onConflictDoUpdate({
      target: dailyStrain.date,
      set: {
        strain_score: aggStrain,
        workout_count: activeCount,
        total_duration: totalDuration,
        total_volume: totalVolume,
        total_calories: totalCals,
      },
    });
}
