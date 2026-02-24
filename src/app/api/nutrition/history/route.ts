import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyNutrition } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const datesParam = searchParams.get('dates');
  if (!datesParam) return NextResponse.json({ scores: {} });

  const dates = datesParam.split(',').filter(Boolean);
  if (dates.length === 0) return NextResponse.json({ scores: {} });

  const rows = await db
    .select()
    .from(dailyNutrition)
    .where(inArray(dailyNutrition.date, dates));

  const scores: Record<string, number | null> = {};
  for (const date of dates) {
    scores[date] = null;
  }
  for (const row of rows) {
    scores[row.date] = row.nutrition_score;
  }

  return NextResponse.json({ scores });
}
