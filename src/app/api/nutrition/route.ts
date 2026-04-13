import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/db';
import { mealEntries, dailyNutrition } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rescoreDay } from '@/lib/nutrition-scoring';

export async function GET(request: NextRequest) {
  await dbReady;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const meals = await db.select().from(mealEntries).where(eq(mealEntries.date, date));
  const nutrition = await db.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).get();

  return NextResponse.json({
    meals,
    score: nutrition?.nutrition_score ?? null,
    summary: nutrition?.ai_summary ?? null,
    scored_at: nutrition?.scored_at ?? null,
  });
}

export async function POST(request: NextRequest) {
  await dbReady;

  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { description, date } = body as { description?: string; date?: string };

  if (!description?.trim() || !date) {
    return NextResponse.json({ error: 'description and date required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const existing = await db.select().from(mealEntries).where(eq(mealEntries.date, date));
  const nextIndex = existing.length;

  await db.insert(mealEntries).values({
    date,
    description: description.trim(),
    order_index: nextIndex,
    logged_at: now,
  });

  await rescoreDay(date);

  const meals = await db.select().from(mealEntries).where(eq(mealEntries.date, date));
  const nutrition = await db.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).get();

  return NextResponse.json(
    {
      meals,
      score: nutrition?.nutrition_score ?? null,
      summary: nutrition?.ai_summary ?? null,
      scored_at: nutrition?.scored_at ?? null,
    },
    { status: 201 },
  );
}
