import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyStrain, workouts } from '@/db/schema';
import { gte, lte, and, not, inArray, sql } from 'drizzle-orm';
import { format, subDays } from 'date-fns';
import { PASSIVE_ACTIVITIES } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '90'; // days
  const from = searchParams.get('from') || format(subDays(new Date(), parseInt(range)), 'yyyy-MM-dd');
  const to = searchParams.get('to') || format(new Date(), 'yyyy-MM-dd');

  const data = await db
    .select()
    .from(dailyStrain)
    .where(and(gte(dailyStrain.date, from), lte(dailyStrain.date, to)));

  const workoutDurationRows = await db
    .select({
      date: sql<string>`date(${workouts.started_at})`,
      total: sql<number>`sum(${workouts.duration_minutes})`,
    })
    .from(workouts)
    .where(
      and(
        sql`date(${workouts.started_at}) >= ${from}`,
        sql`date(${workouts.started_at}) <= ${to}`,
        not(inArray(workouts.name, Array.from(PASSIVE_ACTIVITIES)))
      )
    )
    .groupBy(sql`date(${workouts.started_at})`);

  const workoutDurationMap = new Map(workoutDurationRows.map((r) => [r.date, r.total]));

  return NextResponse.json(
    data.map((d) => ({ ...d, workout_duration: workoutDurationMap.get(d.date) ?? 0 }))
  );
}
