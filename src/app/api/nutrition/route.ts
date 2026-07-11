import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { dbReady } from '@/db';
import { rescoreDay } from '@/lib/nutrition-scoring';
import { logMeal, getDaySummary } from '@/lib/meal-logging';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  await dbReady;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  return NextResponse.json(await getDaySummary(date));
}

export async function POST(request: NextRequest) {
  await dbReady;

  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { date, description, photo, manual } = body as {
    date?: string;
    description?: string;
    photo?: { data: string; media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' };
    manual?: { description: string; calories: number; protein_g: number; carbs_g?: number; fat_g?: number };
  };

  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
  const hasInput = Boolean(description?.trim() || photo?.data || (manual && manual.calories >= 0));
  if (!hasInput) {
    return NextResponse.json({ error: 'description, photo or manual macros required' }, { status: 400 });
  }

  try {
    await logMeal({
      date,
      text: description,
      image: photo,
      manual,
      source: 'app',
    });
  } catch (e) {
    console.error('meal estimate failed:', e);
    return NextResponse.json({ error: 'Failed to analyse meal' }, { status: 502 });
  }

  // Grade/score/summary for the whole day is slower — run it after the response
  // so the meal (with macros) appears immediately.
  after(async () => {
    try {
      await rescoreDay(date);
    } catch (e) {
      console.error('rescore failed:', e);
    }
  });

  return NextResponse.json(await getDaySummary(date), { status: 201 });
}
