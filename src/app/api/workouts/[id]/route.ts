import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, exercises, exerciseSets, dailyStrain } from '@/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import { calculateStrainScore, aggregateDailyStrain, calculateTotalVolume } from '@/lib/strain';
import { updateDailyStrain } from '@/lib/daily-strain';
import { userSettings } from '@/db/schema';
import { format, parseISO } from 'date-fns';
import type { WorkoutType } from '@/lib/constants';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workoutId = parseInt(id);
  const existing = await db.select().from(workouts).where(eq(workouts.id, workoutId)).get();
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const {
    type = existing.type,
    name = existing.name,
    started_at = existing.started_at,
    duration_minutes = existing.duration_minutes,
    perceived_effort = existing.perceived_effort,
    avg_heart_rate = existing.avg_heart_rate,
    max_heart_rate = existing.max_heart_rate,
    calories = existing.calories,
    distance_km = existing.distance_km,
    notes = existing.notes,
    exerciseList,
  } = body;

  if (new Date(started_at) > new Date()) {
    return NextResponse.json({ error: 'Cannot log workouts in the future' }, { status: 400 });
  }

  // Replace exercises/sets when a new list is provided (cascade removes sets)
  if (exerciseList !== undefined) {
    await db.delete(exercises).where(eq(exercises.workout_id, workoutId));
    for (let i = 0; i < exerciseList.length; i++) {
      const ex = exerciseList[i];
      const inserted = await db.insert(exercises).values({
        workout_id: workoutId,
        name: ex.name,
        category: ex.category,
        muscle_group: ex.muscle_group,
        order_index: i,
      }).returning();
      for (const set of ex.sets ?? []) {
        await db.insert(exerciseSets).values({
          exercise_id: inserted[0].id,
          set_number: set.set_number,
          reps: set.reps,
          weight_kg: set.weight_kg,
          distance_km: set.distance_km,
          duration_seconds: set.duration_seconds,
          is_warmup: set.is_warmup || false,
          is_pr: set.is_pr || false,
        });
      }
    }
  }

  // Recompute strain from the (possibly updated) values
  const currentExercises = await db.select().from(exercises).where(eq(exercises.workout_id, workoutId));
  let totalVolume = 0;
  for (const ex of currentExercises) {
    const sets = await db.select().from(exerciseSets).where(eq(exerciseSets.exercise_id, ex.id));
    totalVolume += calculateTotalVolume(sets);
  }
  const settings = await db.select().from(userSettings).get();
  const strainScore = calculateStrainScore({
    duration_minutes,
    perceived_effort,
    type: type as WorkoutType,
    total_volume: totalVolume,
    avg_heart_rate,
    max_heart_rate,
    user_max_heart_rate: settings?.max_heart_rate ?? 190,
    user_resting_heart_rate: settings?.resting_hr ?? 60,
  });

  const newLocalDate = format(parseISO(started_at), 'yyyy-MM-dd');
  const updated = await db.update(workouts).set({
    type,
    name,
    started_at,
    duration_minutes,
    perceived_effort,
    avg_heart_rate,
    max_heart_rate,
    calories,
    distance_km,
    notes,
    strain_score: strainScore,
    local_date: newLocalDate,
  }).where(eq(workouts.id, workoutId)).returning();

  // Recalculate daily strain for the new date, and the old one if it moved
  const oldLocalDate = existing.local_date ?? format(parseISO(existing.started_at), 'yyyy-MM-dd');
  await updateDailyStrain(newLocalDate);
  if (oldLocalDate !== newLocalDate) {
    await updateDailyStrain(oldLocalDate);
  }

  return NextResponse.json({ workout: updated[0] });
}

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
