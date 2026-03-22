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

  const passiveNames = Array.from(PASSIVE_ACTIVITIES);

  // Active-only workouts (Walking excluded) — for workout_count and workout_duration
  const activeWorkoutRows = await db
    .select({
      date: workouts.local_date,
      count: sql<number>`count(*)`,
      total: sql<number>`sum(${workouts.duration_minutes})`,
    })
    .from(workouts)
    .where(
      and(
        sql`${workouts.local_date} >= ${from}`,
        sql`${workouts.local_date} <= ${to}`,
        not(inArray(workouts.name, passiveNames))
      )
    )
    .groupBy(workouts.local_date);

  // All workouts (including Walking) — for active_time (Active Time metric)
  const allWorkoutRows = await db
    .select({
      date: workouts.local_date,
      total: sql<number>`sum(${workouts.duration_minutes})`,
    })
    .from(workouts)
    .where(
      and(
        sql`${workouts.local_date} >= ${from}`,
        sql`${workouts.local_date} <= ${to}`
      )
    )
    .groupBy(workouts.local_date);

  // Heart rate aggregates per day (weighted avg HR by duration, max HR)
  const hrRows = await db
    .select({
      date: workouts.local_date,
      avg_hr: sql<number>`cast(sum(${workouts.avg_heart_rate} * ${workouts.duration_minutes}) as real) / sum(case when ${workouts.avg_heart_rate} is not null then ${workouts.duration_minutes} else 0 end)`,
      max_hr: sql<number>`max(${workouts.max_heart_rate})`,
    })
    .from(workouts)
    .where(
      and(
        sql`${workouts.local_date} >= ${from}`,
        sql`${workouts.local_date} <= ${to}`,
        sql`${workouts.avg_heart_rate} is not null`
      )
    )
    .groupBy(workouts.local_date);

  const activeMap = new Map(activeWorkoutRows.map((r) => [r.date, r]));
  const allMap = new Map(allWorkoutRows.map((r) => [r.date, r.total]));
  const hrMap = new Map(hrRows.map((r) => [r.date, { avg_hr: Math.round(r.avg_hr), max_hr: r.max_hr }]));

  return NextResponse.json(
    data.map((d) => ({
      ...d,
      workout_count: activeMap.get(d.date)?.count ?? 0,
      workout_duration: activeMap.get(d.date)?.total ?? 0,
      total_duration: allMap.get(d.date) ?? d.total_duration,
      avg_hr: hrMap.get(d.date)?.avg_hr ?? null,
      max_hr: hrMap.get(d.date)?.max_hr ?? null,
    }))
  );
}
