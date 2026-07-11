import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { db, dbReady } from '@/db';
import { mealEntries } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rescoreDay } from '@/lib/nutrition-scoring';
import { getDaySummary } from '@/lib/meal-logging';

export const maxDuration = 60;

function unauthorized(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  return !apiKey || apiKey !== process.env.SYNC_API_KEY;
}

function scheduleRescore(date: string) {
  after(async () => {
    try {
      await rescoreDay(date);
    } catch (e) {
      console.error('rescore failed:', e);
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbReady;
  if (unauthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const mealId = parseInt(id);
  if (isNaN(mealId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const meal = await db.select().from(mealEntries).where(eq(mealEntries.id, mealId)).get();
  if (!meal) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await db.delete(mealEntries).where(eq(mealEntries.id, mealId));
  scheduleRescore(meal.date);

  return NextResponse.json(await getDaySummary(meal.date));
}

// Correct a meal's macros or description (e.g. after checking a label)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbReady;
  if (unauthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const mealId = parseInt(id);
  if (isNaN(mealId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const meal = await db.select().from(mealEntries).where(eq(mealEntries.id, mealId)).get();
  if (!meal) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = await request.json();
  const { description, calories, protein_g, carbs_g, fat_g } = body as {
    description?: string;
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };

  await db
    .update(mealEntries)
    .set({
      description: description?.trim() ? description.trim() : meal.description,
      calories: calories != null ? Math.round(calories) : meal.calories,
      protein_g: protein_g != null ? Math.round(protein_g) : meal.protein_g,
      carbs_g: carbs_g != null ? Math.round(carbs_g) : meal.carbs_g,
      fat_g: fat_g != null ? Math.round(fat_g) : meal.fat_g,
      assumptions: 'Adjusted manually.',
    })
    .where(eq(mealEntries.id, mealId));

  scheduleRescore(meal.date);

  return NextResponse.json(await getDaySummary(meal.date));
}
