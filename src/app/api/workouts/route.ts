import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, exercises, exerciseSets, dailyStrain, userSettings } from '@/db/schema';
import { desc, eq, and, gte, lte } from 'drizzle-orm';
import { calculateStrainScore, aggregateDailyStrain, calculateTotalVolume } from '@/lib/strain';
import { evaluateAchievements } from '@/lib/achievements';
import { format, parseISO } from 'date-fns';
import { PASSIVE_ACTIVITIES } from '@/lib/constants';
import type { WorkoutType } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = db.select().from(workouts).orderBy(desc(workouts.started_at)).limit(limit).offset(offset);

  const conditions = [];
  if (type) conditions.push(eq(workouts.type, type));
  if (from) conditions.push(gte(workouts.started_at, from));
  if (to) conditions.push(lte(workouts.started_at, to));

  const result = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    type,
    name,
    started_at,
    ended_at,
    duration_minutes,
    perceived_effort,
    avg_heart_rate,
    max_heart_rate,
    calories,
    notes,
    source = 'manual',
    apple_health_id,
    exerciseList = [],
  } = body;

  // Reject future dates
  if (new Date(started_at) > new Date()) {
    return NextResponse.json({ error: 'Cannot log workouts in the future' }, { status: 400 });
  }

  // Calculate total volume from exercises
  const allSets = exerciseList.flatMap((ex: any) => ex.sets || []);
  const totalVolume = calculateTotalVolume(allSets);

  // Calculate strain score
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

  // Insert workout
  const workout = await db.insert(workouts).values({
    type,
    name,
    started_at,
    ended_at,
    duration_minutes,
    perceived_effort,
    avg_heart_rate,
    max_heart_rate,
    calories,
    strain_score: strainScore,
    notes,
    source,
    apple_health_id,
    local_date: format(parseISO(started_at), 'yyyy-MM-dd'),
    created_at: new Date().toISOString(),
  }).returning();

  const workoutId = workout[0].id;

  // Insert exercises and sets
  for (let i = 0; i < exerciseList.length; i++) {
    const ex = exerciseList[i];
    const insertedExercise = await db.insert(exercises).values({
      workout_id: workoutId,
      name: ex.name,
      category: ex.category,
      muscle_group: ex.muscle_group,
      order_index: i,
    }).returning();

    const exerciseId = insertedExercise[0].id;
    if (ex.sets && ex.sets.length > 0) {
      for (const set of ex.sets) {
        await db.insert(exerciseSets).values({
          exercise_id: exerciseId,
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

  // Update daily strain — use local date
  await updateDailyStrain(format(parseISO(started_at), 'yyyy-MM-dd'));

  // Evaluate achievements
  const newBadges = await evaluateAchievements(workoutId);

  return NextResponse.json({ workout: workout[0], newBadges }, { status: 201 });
}

async function updateDailyStrain(date: string) {
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
