import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailySleep, sleepSessions } from '@/db/schema';
import { and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(dailySleep)
    .where(and(gte(dailySleep.date, from), lte(dailySleep.date, to)));

  // Also fetch bedtime/wake_time from sleep_sessions for the same range
  const sessions = await db
    .select({
      date: sleepSessions.date,
      bedtime: sleepSessions.bedtime,
      wake_time: sleepSessions.wake_time,
    })
    .from(sleepSessions)
    .where(and(gte(sleepSessions.date, from), lte(sleepSessions.date, to)));

  // Build a map of date -> earliest bedtime, latest wake_time
  const timesMap = new Map<string, { bedtime: string | null; wake_time: string | null }>();
  for (const s of sessions) {
    const existing = timesMap.get(s.date);
    if (!existing) {
      timesMap.set(s.date, { bedtime: s.bedtime, wake_time: s.wake_time });
    } else {
      if (s.bedtime && (!existing.bedtime || s.bedtime < existing.bedtime)) {
        existing.bedtime = s.bedtime;
      }
      if (s.wake_time && (!existing.wake_time || s.wake_time > existing.wake_time)) {
        existing.wake_time = s.wake_time;
      }
    }
  }

  // Merge times into daily sleep rows
  const result = rows.map((r) => {
    const times = timesMap.get(r.date);
    return {
      ...r,
      bedtime: times?.bedtime ?? null,
      wake_time: times?.wake_time ?? null,
    };
  });

  return NextResponse.json(result);
}
