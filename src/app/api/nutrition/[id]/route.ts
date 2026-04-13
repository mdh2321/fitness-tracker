import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/db';
import { mealEntries, dailyNutrition } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rescoreDay } from '@/lib/nutrition-scoring';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbReady;

  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const mealId = parseInt(id);
  if (isNaN(mealId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const meal = await db.select().from(mealEntries).where(eq(mealEntries.id, mealId)).get();
  if (!meal) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const date = meal.date;
  await db.delete(mealEntries).where(eq(mealEntries.id, mealId));

  await rescoreDay(date);

  const meals = await db.select().from(mealEntries).where(eq(mealEntries.date, date));
  const nutrition = await db.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).get();

  return NextResponse.json({
    meals,
    score: nutrition?.nutrition_score ?? null,
    summary: nutrition?.ai_summary ?? null,
    scored_at: nutrition?.scored_at ?? null,
  });
}
