import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sleepSessions, dailySleep } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const sessions = await db.select().from(sleepSessions).where(eq(sleepSessions.date, date));
  const daily = await db.select().from(dailySleep).where(eq(dailySleep.date, date)).get();

  return NextResponse.json({ sessions, daily: daily ?? null });
}
