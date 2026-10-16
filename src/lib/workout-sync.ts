import type { DB } from '@/db';
import { workouts, dailyStrain } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { aggregateDailyStrain } from '@/lib/strain';
import { APPLE_HEALTH_TYPE_MAP, PASSIVE_ACTIVITIES, type WorkoutType } from '@/lib/constants';

// Health Auto Export sends workout type as a human-readable "name" field
const SHORTCUTS_TYPE_MAP: Record<string, { type: WorkoutType; name: string }> = {
  'Running':                          { type: 'cardio',      name: 'Running' },
  'Run':                              { type: 'cardio',      name: 'Running' },
  'Outdoor Run':                      { type: 'cardio',      name: 'Running' },
  'Indoor Run':                       { type: 'cardio',      name: 'Running' },
  'Cycling':                          { type: 'cardio',      name: 'Cycling' },
  'Ride':                             { type: 'cardio',      name: 'Cycling' },
  'Outdoor Cycling':                  { type: 'cardio',      name: 'Cycling' },
  'Indoor Cycling':                   { type: 'cardio',      name: 'Cycling' },
  'Swimming':                         { type: 'cardio',      name: 'Swimming' },
  'Swim':                             { type: 'cardio',      name: 'Swimming' },
  'Open Water Swimming':              { type: 'cardio',      name: 'Swimming' },
  'Pool Swimming':                    { type: 'cardio',      name: 'Swimming' },
  'Walking':                          { type: 'cardio',      name: 'Walking' },
  'Walk':                             { type: 'cardio',      name: 'Walking' },
  'Outdoor Walk':                     { type: 'cardio',      name: 'Walking' },
  'Indoor Walk':                      { type: 'cardio',      name: 'Walking' },
  'Hiking':                           { type: 'cardio',      name: 'Hiking' },
  'Hike':                             { type: 'cardio',      name: 'Hiking' },
  'Elliptical':                       { type: 'cardio',      name: 'Elliptical' },
  'Rowing':                           { type: 'cardio',      name: 'Rowing' },
  'Stair Climbing':                   { type: 'cardio',      name: 'Stair Climbing' },
  'Jump Rope':                        { type: 'cardio',      name: 'Jump Rope' },
  'Dance':                            { type: 'cardio',      name: 'Dance' },
  'Step Training':                    { type: 'cardio',      name: 'Step Training' },
  'Traditional Strength Training':    { type: 'strength',    name: 'Strength Training' },
  'Functional Strength Training':     { type: 'strength',    name: 'Functional Strength' },
  'Core Training':                    { type: 'strength',    name: 'Core Training' },
  'Cross Training':                   { type: 'mixed',       name: 'Cross Training' },
  'High Intensity Interval Training': { type: 'mixed',       name: 'HIIT' },
  'HIIT':                             { type: 'mixed',       name: 'HIIT' },
  'Mixed Cardio':                     { type: 'mixed',       name: 'Mixed Cardio' },
  'Kickboxing':                       { type: 'mixed',       name: 'Kickboxing' },
  'Yoga':                             { type: 'flexibility', name: 'Yoga' },
  'Pilates':                          { type: 'flexibility', name: 'Pilates' },
  'Barre':                            { type: 'flexibility', name: 'Barre' },
  'Cooldown':                         { type: 'flexibility', name: 'Cooldown' },
  'Mind & Body':                      { type: 'flexibility', name: 'Mind & Body' },
  'Soccer':                           { type: 'sport',       name: 'Soccer' },
  'Basketball':                       { type: 'sport',       name: 'Basketball' },
  'Tennis':                           { type: 'sport',       name: 'Tennis' },
  'Volleyball':                       { type: 'sport',       name: 'Volleyball' },
  'Boxing':                           { type: 'sport',       name: 'Boxing' },
  'Martial Arts':                     { type: 'sport',       name: 'Martial Arts' },
  'Other':                            { type: 'mixed',       name: 'Other' },
};

export function resolveWorkoutType(name: string) {
  return SHORTCUTS_TYPE_MAP[name] ?? APPLE_HEALTH_TYPE_MAP[name] ?? null;
}

export function estimateRPE(avgHR: number | null, userMaxHR: number, userRestingHR: number): number {
  if (!avgHR || userMaxHR <= userRestingHR) return 5;
  const hrr = Math.max(0, (avgHR - userRestingHR) / (userMaxHR - userRestingHR));
  return Math.max(1, Math.min(10, Math.round(hrr * 10)));
}

export async function recalcDailyStrain(db: Pick<DB, 'select' | 'insert'>, date: string) {
  const dayWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.local_date, date));

  const existing = await db.select().from(dailyStrain).where(eq(dailyStrain.date, date)).get();
  const existingSteps = existing?.steps ?? 0;

  const aggStrain = aggregateDailyStrain(dayWorkouts.map((w) => w.strain_score));
  const totalDuration = dayWorkouts.reduce((s, w) => s + w.duration_minutes, 0);
  const totalCals = dayWorkouts.reduce((s, w) => s + (w.calories ?? 0), 0);
  const activeCount = dayWorkouts.filter((w) => !PASSIVE_ACTIVITIES.has(w.name)).length;

  await db
    .insert(dailyStrain)
    .values({
      date,
      strain_score: aggStrain,
      workout_count: activeCount,
      total_duration: totalDuration,
      total_volume: 0,
      total_calories: totalCals,
      steps: existingSteps,
    })
    .onConflictDoUpdate({
      target: dailyStrain.date,
      set: {
        strain_score: aggStrain,
        workout_count: activeCount,
        total_duration: totalDuration,
        total_calories: totalCals,
      },
    });
}

