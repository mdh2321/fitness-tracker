import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mealEntries, dailyNutrition } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { scoreNutritionDay } from '@/lib/nutrition-ai';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const remaining = await db.select().from(mealEntries).where(eq(mealEntries.date, date));
  const now = new Date().toISOString();

  if (remaining.length === 0) {
    await db.delete(dailyNutrition).where(eq(dailyNutrition.date, date));
    return NextResponse.json({ meals: [], score: null, summary: null });
  }

  const descriptions = remaining.map((m) => m.description);
  let score: number | null = null;
  let summary: string | null = null;

  // Only score if 3+ meals remain; clear score if dropped below threshold
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
  } else {
    // Fewer than 3 meals — clear any existing score
    await db.delete(dailyNutrition).where(eq(dailyNutrition.date, date));
  }

  return NextResponse.json({ meals: remaining, score, summary });
}
