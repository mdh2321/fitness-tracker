import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, exercises, exerciseSets, dailyStrain } from '@/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import { calculateStrainScore, aggregateDailyStrain, calculateTotalVolume } from '@/lib/strain';
import { format, parseISO } from 'date-fns';
import type { WorkoutType } from '@/lib/constants';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = await db.select().from(workouts).where(eq(workouts.id, parseInt(id))).get();

  if (!workout) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const workoutExercises = await db.select().from(exercises).where(eq(exercises.workout_id, workout.id));
  const exercisesWithSets = await Promise.all(
    workoutExercises.map(async (ex) => {
      const sets = await db.select().from(exerciseSets).where(eq(exerciseSets.exercise_id, ex.id));
      return { ...ex, sets };
    })
  );

  return NextResponse.json({ ...workout, exercises: exercisesWithSets });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = await db.select().from(workouts).where(eq(workouts.id, parseInt(id))).get();

  if (!workout) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const date = format(parseISO(workout.started_at), 'yyyy-MM-dd');
  await db.delete(workouts).where(eq(workouts.id, parseInt(id)));

  // Recalculate daily strain using local-time day boundaries
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const dayStartUTC = dayStart.toISOString();
  const dayEndUTC = dayEnd.toISOString();

  const dayWorkouts = await db
    .select()
    .from(workouts)
    .where(and(
      gte(workouts.started_at, dayStartUTC),
      sql`${workouts.started_at} < ${dayEndUTC}`
    ));

  // Always preserve existing steps — never delete the daily_strain row
  const existingStrain = await db.select().from(dailyStrain).where(eq(dailyStrain.date, date)).get();
  const existingSteps = existingStrain?.steps ?? 0;

  if (dayWorkouts.length === 0) {
    // Zero out workout fields but keep the row so steps data is preserved
    await db
      .insert(dailyStrain)
      .values({ date, strain_score: 0, workout_count: 0, total_duration: 0, total_volume: 0, total_calories: 0, steps: existingSteps })
      .onConflictDoUpdate({
        target: dailyStrain.date,
        set: { strain_score: 0, workout_count: 0, total_duration: 0, total_volume: 0, total_calories: 0 },
      });
  } else {
    const strains = dayWorkouts.map((w) => w.strain_score);
    const aggStrain = aggregateDailyStrain(strains);
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

  return NextResponse.json({ success: true });
}
