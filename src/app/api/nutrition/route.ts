import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mealEntries, dailyNutrition } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { scoreNutritionDay } from '@/lib/nutrition-ai';

export async function GET(request: NextRequest) {
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
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { description, date } = body;

  if (!description?.trim() || !date) {
    return NextResponse.json({ error: 'description and date required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Get current max order_index for the day
  const existing = await db.select().from(mealEntries).where(eq(mealEntries.date, date));
  const nextIndex = existing.length;

  await db.insert(mealEntries).values({
    date,
    description: description.trim(),
    order_index: nextIndex,
    logged_at: now,
  });

  // Re-fetch all meals for scoring
  const allMeals = await db.select().from(mealEntries).where(eq(mealEntries.date, date));
  const descriptions = allMeals.map((m) => m.description);

  let score: number | null = null;
  let summary: string | null = null;

  // Only score once 3+ meals have been logged for the day
  if (descriptions.length >= 3) {
    try {
      const result = await scoreNutritionDay(descriptions, date);
      score = result.score;
      summary = result.summary;

      await db
        .insert(dailyNutrition)
        .values({ date, nutrition_score: score, ai_summary: summary, scored_at: now, updated_at: now })
        .onConflictDoUpdate({
          target: dailyNutrition.date,
          set: { nutrition_score: score, ai_summary: summary, scored_at: now, updated_at: now },
        });
    } catch (e) {
      console.error('AI scoring failed:', e);
    }
  }

  return NextResponse.json({ meals: allMeals, score, summary }, { status: 201 });
}
