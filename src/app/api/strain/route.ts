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

  const activeWorkoutRows = await db
    .select({
      date: sql<string>`date(${workouts.started_at})`,
      count: sql<number>`count(*)`,
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

  const activeMap = new Map(activeWorkoutRows.map((r) => [r.date, r]));

  return NextResponse.json(
    data.map((d) => ({
      ...d,
      workout_count: activeMap.get(d.date)?.count ?? 0,
      workout_duration: activeMap.get(d.date)?.total ?? 0,
    }))
  );
}
