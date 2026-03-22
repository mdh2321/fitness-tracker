import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sleepSessions, dailySleep } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface SleepEntry {
  totalSleep?: number;   // seconds (flat format)
  asleep?: number;       // hours (Auto Export format)
  core?: number;         // seconds
  deep?: number;         // seconds or hours
  rem?: number;          // seconds or hours
  sleepStart?: string;
  sleepEnd?: string;
  inBed?: number;        // seconds or hours
  inBedStart?: string;
  inBedEnd?: string;
  awake?: number;
  date?: string;
  source?: string;
}

function parseSleepEntry(entry: SleepEntry) {
  // Auto Export sends values in hours; flat format sends seconds
  // Use totalSleep if asleep is 0 or missing; all values in hours
  const sleepHours = entry.asleep || entry.totalSleep;
  const totalMinutes = sleepHours ? Math.round(sleepHours * 60) : 0;

  const toMinutes = (val: number | undefined | null): number | null => {
    if (val == null || val === 0) return null;
    return Math.round(val * 60);
  };

  const deepMinutes = toMinutes(entry.deep);
  const remMinutes = toMinutes(entry.rem);
  const lightMinutes = toMinutes(entry.core);
  const timeInBedMinutes = toMinutes(entry.inBed);
  const awakeMinutes = toMinutes(entry.awake);

  // Determine the date from sleepEnd or the date field
  // Use local date from the string (not UTC) to match source timezone
  const sleepEnd = entry.sleepEnd || entry.inBedEnd;
  let date: string;
  if (sleepEnd) {
    const match = sleepEnd.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    date = match ? match[1] : new Date(sleepEnd).toISOString().split('T')[0];
  } else if (entry.date) {
    const match = entry.date.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    date = match ? match[1] : new Date(entry.date).toISOString().split('T')[0];
  } else {
    return null; // Can't determine date
  }

  return {
    date,
    bedtime: entry.sleepStart || entry.inBedStart || null,
    wake_time: sleepEnd || null,
    duration_minutes: totalMinutes,
    time_in_bed_minutes: timeInBedMinutes,
    deep_minutes: deepMinutes,
    rem_minutes: remMinutes,
    light_minutes: lightMinutes,
    awake_minutes: awakeMinutes,
  };
}

async function upsertSleepSession(parsed: NonNullable<ReturnType<typeof parseSleepEntry>>) {
  const sourceId = `auto_export_${parsed.date}`;

  const existing = await db.select().from(sleepSessions).where(eq(sleepSessions.source_id, sourceId)).get();

  if (existing) {
    await db.update(sleepSessions).set({
      ...parsed,
    }).where(eq(sleepSessions.source_id, sourceId));
  } else {
    await db.insert(sleepSessions).values({
      ...parsed,
      source: 'auto_export',
      source_id: sourceId,
    });
  }

  // Recalculate daily_sleep for this date
  const sessions = await db.select().from(sleepSessions).where(eq(sleepSessions.date, parsed.date));
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
      date: parsed.date,
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

  return parsed.date;
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log('[Sleep Sync] Incoming payload:', JSON.stringify(body, null, 2));

    const results: string[] = [];

    // Handle Health Auto Export format: { data: { metrics: [{ name, data: [...] }] } }
    if (body?.data?.metrics) {
      for (const metric of body.data.metrics) {
        if (metric.name === 'sleep_analysis' && Array.isArray(metric.data)) {
          for (const entry of metric.data) {
            const parsed = parseSleepEntry(entry);
            if (parsed && parsed.duration_minutes > 0) {
              const date = await upsertSleepSession(parsed);
              results.push(date);
            }
          }
        }
      }

      if (results.length === 0) {
        console.log('[Sleep Sync] No sleep_analysis entries found in metrics');
        return NextResponse.json({ success: true, message: 'No sleep data in payload', dates: [] });
      }

      return NextResponse.json({ success: true, dates: results });
    }

    // Handle flat format (single entry)
    const parsed = parseSleepEntry(body);
    if (!parsed || parsed.duration_minutes <= 0) {
      return NextResponse.json({ error: 'Could not parse sleep data' }, { status: 400 });
    }

    const date = await upsertSleepSession(parsed);
    return NextResponse.json({ success: true, date, duration_minutes: parsed.duration_minutes });
  } catch (e) {
    console.error('[Sleep Sync] Error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
