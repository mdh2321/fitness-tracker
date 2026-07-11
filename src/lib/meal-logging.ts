import { db } from '@/db';
import { mealEntries, dailyNutrition, userSettings } from '@/db/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { estimateMeal, type MealEstimate } from './nutrition-ai';
import type { FitnessGoal } from './types';

export interface LogMealInput {
  date: string;
  text?: string;
  image?: { data: string; media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' };
  manual?: { description: string; calories: number; protein_g: number; carbs_g?: number; fat_g?: number };
  source: 'app' | 'telegram';
}

export type MealEntryRow = typeof mealEntries.$inferSelect;

export interface DayMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DayNutritionSummary {
  meals: MealEntryRow[];
  totals: DayMacros;
  targets: { calories: number; protein_g: number };
  /** Totals for the Monday-start week containing the requested date */
  week: { calories: number; protein_g: number };
  score: number | null;
  summary: string | null;
  scored_at: string | null;
}

/**
 * Estimate (unless manual) and insert one meal. Does NOT rescore the day —
 * callers schedule rescoreDay() themselves (usually via next/server after()).
 */
export async function logMeal(input: LogMealInput): Promise<MealEntryRow> {
  const now = new Date().toISOString();
  const existing = await db.select().from(mealEntries).where(eq(mealEntries.date, input.date));
  const nextIndex = existing.length;

  let values: typeof mealEntries.$inferInsert;

  if (input.manual) {
    values = {
      date: input.date,
      description: input.manual.description.trim() || 'Meal',
      order_index: nextIndex,
      logged_at: now,
      calories: Math.round(input.manual.calories),
      protein_g: Math.round(input.manual.protein_g),
      carbs_g: input.manual.carbs_g != null ? Math.round(input.manual.carbs_g) : null,
      fat_g: input.manual.fat_g != null ? Math.round(input.manual.fat_g) : null,
      assumptions: 'Macros entered manually.',
      source: input.source,
      input_method: 'manual',
    };
  } else {
    const settings = await db.select().from(userSettings).get();
    const estimate: MealEstimate = await estimateMeal(
      { text: input.text, image: input.image },
      {
        fitness_goal: (settings?.fitness_goal ?? 'maintain') as FitnessGoal,
        weight_kg: settings?.weight_kg ?? 70,
      },
    );
    values = {
      date: input.date,
      description: estimate.description,
      order_index: nextIndex,
      logged_at: now,
      emoji: estimate.emoji,
      grade: estimate.grade,
      calories: estimate.calories,
      protein_g: estimate.protein_g,
      carbs_g: estimate.carbs_g,
      fat_g: estimate.fat_g,
      items: JSON.stringify(estimate.items),
      assumptions: estimate.assumptions,
      source: input.source,
      input_method: input.image ? 'photo' : 'text',
    };
  }

  const inserted = await db.insert(mealEntries).values(values).returning();
  return inserted[0];
}

export function sumMacros(meals: MealEntryRow[]): DayMacros {
  return {
    calories: meals.reduce((s, m) => s + (m.calories ?? 0), 0),
    protein_g: Math.round(meals.reduce((s, m) => s + (m.protein_g ?? 0), 0)),
    carbs_g: Math.round(meals.reduce((s, m) => s + (m.carbs_g ?? 0), 0)),
    fat_g: Math.round(meals.reduce((s, m) => s + (m.fat_g ?? 0), 0)),
  };
}

export async function getDaySummary(date: string): Promise<DayNutritionSummary> {
  const meals = await db.select().from(mealEntries).where(eq(mealEntries.date, date));
  const nutrition = await db.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).get();
  const settings = await db.select().from(userSettings).get();

  const weekStart = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
  const weekRow = await db
    .select({
      calories: sql<number>`coalesce(sum(${mealEntries.calories}), 0)`,
      protein_g: sql<number>`coalesce(sum(${mealEntries.protein_g}), 0)`,
    })
    .from(mealEntries)
    .where(and(gte(mealEntries.date, weekStart), lte(mealEntries.date, weekEnd)))
    .get();

  return {
    meals,
    totals: sumMacros(meals),
    targets: {
      calories: settings?.daily_calorie_target ?? 2400,
      protein_g: settings?.daily_protein_target ?? 140,
    },
    week: {
      calories: weekRow?.calories ?? 0,
      protein_g: Math.round(weekRow?.protein_g ?? 0),
    },
    score: nutrition?.nutrition_score ?? null,
    summary: nutrition?.ai_summary ?? null,
    scored_at: nutrition?.scored_at ?? null,
  };
}

/** Local calendar date (YYYY-MM-DD) in the app's timezone — used by the Telegram webhook where there is no browser clock. */
export function todayLocalDate(): string {
  const tz = process.env.APP_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}
