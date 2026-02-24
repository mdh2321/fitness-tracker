import { NextResponse } from 'next/server';
import { db } from '@/db';
import { achievements } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { evaluateAllAchievements } from '@/lib/achievements';

export async function GET() {
  const result = await db.select().from(achievements).orderBy(desc(achievements.earned_at));
  return NextResponse.json(result);
}

export async function POST() {
  const newBadges = await evaluateAllAchievements();
  return NextResponse.json({ newBadges });
}
