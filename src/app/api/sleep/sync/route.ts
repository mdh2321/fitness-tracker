import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sleepSessions, dailySleep } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      totalSleep,
      core,
      deep,
      rem,
      sleepStart,
      sleepEnd,
      inBed,
      inBedStart,
      inBedEnd,
    } = body;

    if (totalSleep == null || sleepEnd == null) {
      return NextResponse.json({ error: 'totalSleep and sleepEnd are required' }, { status: 400 });
    }

    // Convert seconds to minutes
    const durationMinutes = Math.round(totalSleep / 60);
    const deepMinutes = deep != null ? Math.round(deep / 60) : null;
    const remMinutes = rem != null ? Math.round(rem / 60) : null;
    const lightMinutes = core != null ? Math.round(core / 60) : null;
    const timeInBedMinutes = inBed != null ? Math.round(inBed / 60) : null;

    // Calculate awake time
    const awakeMinutes = timeInBedMinutes != null
      ? Math.max(0, timeInBedMinutes - durationMinutes)
      : null;

    // Extract date from sleepEnd (the morning you woke up)
    const wakeDate = new Date(sleepEnd);
    const date = wakeDate.toISOString().split('T')[0];
    const sourceId = `auto_export_${date}`;

    // Upsert sleep session
    const existing = await db.select().from(sleepSessions).where(eq(sleepSessions.source_id, sourceId)).get();

    if (existing) {
      await db.update(sleepSessions).set({
        date,
        bedtime: sleepStart || inBedStart || null,
        wake_time: sleepEnd,
        duration_minutes: durationMinutes,
        time_in_bed_minutes: timeInBedMinutes,
        deep_minutes: deepMinutes,
        rem_minutes: remMinutes,
        light_minutes: lightMinutes,
        awake_minutes: awakeMinutes,
      }).where(eq(sleepSessions.source_id, sourceId));
    } else {
      await db.insert(sleepSessions).values({
        date,
        bedtime: sleepStart || inBedStart || null,
        wake_time: sleepEnd,
        duration_minutes: durationMinutes,
        time_in_bed_minutes: timeInBedMinutes,
        deep_minutes: deepMinutes,
        rem_minutes: remMinutes,
        light_minutes: lightMinutes,
        awake_minutes: awakeMinutes,
        source: 'auto_export',
        source_id: sourceId,
      });
    }

    // Recalculate daily_sleep for this date
    const sessions = await db.select().from(sleepSessions).where(eq(sleepSessions.date, date));
    const totalMins = sessions.reduce((s, r) => s + r.duration_minutes, 0);
    const totalInBed = sessions.reduce((s, r) => s + (r.time_in_bed_minutes ?? 0), 0);
    const totalDeep = sessions.reduce((s, r) => s + (r.deep_minutes ?? 0), 0);
    const totalRem = sessions.reduce((s, r) => s + (r.rem_minutes ?? 0), 0);
    const totalLight = sessions.reduce((s, r) => s + (r.light_minutes ?? 0), 0);
    const totalAwake = sessions.reduce((s, r) => s + (r.awake_minutes ?? 0), 0);
    const efficiency = totalInBed > 0 ? Math.round((totalMins / totalInBed) * 1000) / 10 : null;

    await db
      .insert(dailySleep)
      .values({
        date,
        total_minutes: totalMins,
        time_in_bed_minutes: totalInBed || null,
        deep_minutes: totalDeep || null,
        rem_minutes: totalRem || null,
        light_minutes: totalLight || null,
        awake_minutes: totalAwake || null,
        efficiency,
        sessions: sessions.length,
      })
      .onConflictDoUpdate({
        target: dailySleep.date,
        set: {
          total_minutes: totalMins,
          time_in_bed_minutes: totalInBed || null,
          deep_minutes: totalDeep || null,
          rem_minutes: totalRem || null,
          light_minutes: totalLight || null,
          awake_minutes: totalAwake || null,
          efficiency,
          sessions: sessions.length,
        },
      });

    return NextResponse.json({ success: true, date, duration_minutes: durationMinutes });
  } catch (e) {
    console.error('Sleep sync error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
