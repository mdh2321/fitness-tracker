import { db } from '@/db';
import { workouts } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  const runs = await db
    .select()
    .from(workouts)
    .where(sql`lower(${workouts.name}) LIKE '%run%'`)
    .orderBy(sql`${workouts.started_at} DESC`);

  return NextResponse.json(runs);
}
