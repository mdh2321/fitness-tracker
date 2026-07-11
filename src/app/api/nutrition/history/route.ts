import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/db';
import { dailyNutrition, mealEntries } from '@/db/schema';
import { inArray, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  await dbReady;
  const { searchParams } = new URL(request.url);
  const datesParam = searchParams.get('dates');
  if (!datesParam) return NextResponse.json({ scores: {}, macros: {} });

  const dates = datesParam.split(',').filter(Boolean);
  if (dates.length === 0) return NextResponse.json({ scores: {}, macros: {} });

  const rows = await db
    .select()
    .from(dailyNutrition)
    .where(inArray(dailyNutrition.date, dates));

  const macroRows = await db
    .select({
      date: mealEntries.date,
      calories: sql<number>`coalesce(sum(${mealEntries.calories}), 0)`,
      protein_g: sql<number>`coalesce(sum(${mealEntries.protein_g}), 0)`,
    })
    .from(mealEntries)
    .where(inArray(mealEntries.date, dates))
    .groupBy(mealEntries.date);

  const scores: Record<string, number | null> = {};
  for (const date of dates) scores[date] = null;
  for (const row of rows) scores[row.date] = row.nutrition_score;

  const macros: Record<string, { calories: number; protein_g: number }> = {};
  for (const row of macroRows) {
    macros[row.date] = { calories: row.calories, protein_g: Math.round(row.protein_g) };
  }

  return NextResponse.json({ scores, macros });
}
