import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/db';
import { dailyNutrition, mealEntries, userSettings } from '@/db/schema';
import { gte, sql } from 'drizzle-orm';

// Daily calorie/protein totals for the trends charts. `days` bounds the window
// (default 84 = 12 weeks, enough for the weekly view).
export async function GET(request: NextRequest) {
  await dbReady;
  const { searchParams } = new URL(request.url);
  const days = Math.min(366, Math.max(7, parseInt(searchParams.get('days') ?? '84')));

  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  const fromDate = from.toISOString().slice(0, 10);

  const macroRows = await db
    .select({
      date: mealEntries.date,
      calories: sql<number>`coalesce(sum(${mealEntries.calories}), 0)`,
      protein_g: sql<number>`coalesce(sum(${mealEntries.protein_g}), 0)`,
      meals: sql<number>`count(*)`,
    })
    .from(mealEntries)
    .where(gte(mealEntries.date, fromDate))
    .groupBy(mealEntries.date);

  const scoreRows = await db
    .select({ date: dailyNutrition.date, score: dailyNutrition.nutrition_score })
    .from(dailyNutrition)
    .where(gte(dailyNutrition.date, fromDate));

  const scoreMap = new Map(scoreRows.map(r => [r.date, r.score]));

  const daysOut = macroRows
    // Meals logged before macro tracking have no calorie data — a day of only
    // those would chart as a misleading 0-kcal bar, so treat it as unlogged.
    .filter(r => r.calories > 0 || r.protein_g > 0)
    .map(r => ({
      date: r.date,
      calories: r.calories,
      protein_g: Math.round(r.protein_g),
      meals: r.meals,
      score: scoreMap.get(r.date) ?? null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const settings = await db.select().from(userSettings).get();

  return NextResponse.json({
    days: daysOut,
    targets: {
      calories: settings?.daily_calorie_target ?? 2400,
      protein_g: settings?.daily_protein_target ?? 140,
    },
  });
}
