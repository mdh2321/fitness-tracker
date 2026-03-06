import { NextResponse } from 'next/server';
import { db } from '@/db';
import { achievements } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { evaluateAllAchievements } from '@/lib/achievements';
import { computeAllProgress } from '@/lib/achievement-progress';

export async function GET() {
  const [earned, progress] = await Promise.all([
    db.select().from(achievements).orderBy(desc(achievements.earned_at)),
    computeAllProgress(),
  ]);
  return NextResponse.json({ earned, progress });
}

export async function POST() {
  const newBadges = await evaluateAllAchievements();
  return NextResponse.json({ newBadges });
}
