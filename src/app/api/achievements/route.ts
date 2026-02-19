import { NextResponse } from 'next/server';
import { db } from '@/db';
import { achievements } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  const result = await db.select().from(achievements).orderBy(desc(achievements.earned_at));
  return NextResponse.json(result);
}
