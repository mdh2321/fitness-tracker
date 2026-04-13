import { db } from '@/db';
import { mealEntries, dailyNutrition, userSettings, workouts, dailySleep } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { analyseNutrition, type NutritionAIMeal } from './nutrition-ai';
import type { FitnessGoal } from './types';

export async function rescoreDay(date: string): Promise<void> {
  const meals = await db.select().from(mealEntries).where(eq(mealEntries.date, date));

  if (meals.length === 0) {
    await db.delete(dailyNutrition).where(eq(dailyNutrition.date, date));
    return;
  }

  const settings = await db.select().from(userSettings).get();
  const fitness_goal = (settings?.fitness_goal ?? 'maintain') as FitnessGoal;
  const weight_kg = settings?.weight_kg ?? 70;

  const todayWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.local_date, date));
  const today_strain = todayWorkouts.reduce((s, w) => s + (w.strain_score ?? 0), 0);

  const sleep = await db
    .select()
    .from(dailySleep)
    .where(eq(dailySleep.date, date))
    .get();
  const last_night_sleep_hours = sleep ? sleep.total_minutes / 60 : null;

  const aiMeals: NutritionAIMeal[] = meals.map(m => ({
    id: m.id,
    description: m.description,
  }));

  let result;
  try {
    result = await analyseNutrition(aiMeals, date, {
      fitness_goal,
      weight_kg,
      today_strain: today_strain > 0 ? today_strain : null,
      today_workouts: todayWorkouts.map(w => ({
        name: w.name,
        duration_minutes: w.duration_minutes,
      })),
      last_night_sleep_hours,
    });
  } catch (e) {
    console.error('nutrition AI failed:', e);
    return;
  }

  const now = new Date().toISOString();

  for (const m of result.meals) {
    await db
      .update(mealEntries)
      .set({ emoji: m.emoji, grade: m.grade })
      .where(eq(mealEntries.id, m.id));
  }

  const values = {
    date,
    nutrition_score: result.daily.score,
    ai_summary: result.daily.summary,
    scored_at: now,
    updated_at: now,
  };

  await db
    .insert(dailyNutrition)
    .values(values)
    .onConflictDoUpdate({
      target: dailyNutrition.date,
      set: values,
    });
}
