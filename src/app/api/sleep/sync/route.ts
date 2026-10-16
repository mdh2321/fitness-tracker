import { NextRequest, NextResponse } from 'next/server';
import { db as database, dbReady, type DB } from '@/db';
import { syncAuth, logHealthSync } from '@/lib/sync-server';
import { validateHealthSync } from '@/lib/health-sync';
import { sleepSessions, dailySleep } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

interface SleepEntry {
  totalSleep?: number;   // hours, matching existing ARC exports
  asleep?: number;       // hours (Auto Export format)
  core?: number;         // hours
  deep?: number;         // hours
  rem?: number;          // hours
  sleepStart?: string;
  sleepEnd?: string;
  inBed?: number;        // hours
  inBedStart?: string;
  inBedEnd?: string;
  awake?: number;
  date?: string;
  source?: string;
}

function parseSleepEntry(entry: SleepEntry) {
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

async function upsertSleepSession(db: Pick<DB, 'select' | 'insert' | 'update' | 'all'>, parsed: NonNullable<ReturnType<typeof parseSleepEntry>>) {
  const owned = await db.all(sql`SELECT date FROM healthkit_daily_ownership WHERE date=${parsed.date} AND metric='sleep'`);
  if (owned.length) return parsed.date;
  const sourceId = `auto_export_${parsed.date}`;

  const existing = await db.select().from(sleepSessions).where(eq(sleepSessions.source_id, sourceId)).get();

  if (existing) {
    // Don't overwrite with lower sleep duration — partial/recalculated data
    if (existing.duration_minutes > parsed.duration_minutes) {
      return parsed.date;
    }
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
  const endpoint = '/api/sleep/sync';
  const empty = { workouts: 0, steps: 0, sleep: 0 };
  const unauthorized = syncAuth(request);
  if (unauthorized) {
    await logHealthSync(endpoint, [], empty, unauthorized.status === 401 ? 'unauthorized' : 'sync_not_configured');
    return unauthorized;
  }
  let body;
  try { body = await request.json(); }
  catch {
    await logHealthSync(endpoint, [], empty, 'invalid_json');
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_json' }, { status: 400 });
  }
  const nested = body?.data?.metrics;
  // Preserve this endpoint's existing nested and single-entry formats.
  const metrics = Array.isArray(nested)
    ? nested.filter(m => typeof m?.name === 'string' && m.name.toLowerCase().includes('sleep'))
      .map(m => ({ ...m, name: 'sleep_analysis' }))
    : [{ name: 'sleep_analysis', data: [body] }];
  const validated = validateHealthSync({ metrics });
  if (!validated.success) {
    await logHealthSync(endpoint, ['sleep_analysis'], empty, 'invalid_payload');
    return NextResponse.json({ error: 'Invalid sleep data. No records were imported.', code: 'invalid_payload' }, { status: 422 });
  }
  const parsed = validated.data.metrics.flatMap(m => m.data as SleepEntry[])
    .map(parseSleepEntry).filter((p): p is NonNullable<typeof p> => p !== null && p.duration_minutes > 0);
  if (!parsed.length) {
    await logHealthSync(endpoint, ['sleep_analysis'], empty, 'no_sleep_entries_found');
    return NextResponse.json({ error: 'No sleep entries found', code: 'no_sleep_entries_found' }, { status: 422 });
  }
  try {
    await dbReady;
    const dates = await database.transaction(async db => {
      const dates: string[] = [];
      for (const entry of parsed) dates.push(await upsertSleepSession(db, entry));
      return dates;
    });
    const logged = await logHealthSync(endpoint, ['sleep_analysis'], { ...empty, sleep: dates.length }, null);
    return NextResponse.json({
      success: true, dates,
      ...(!Array.isArray(nested) ? { date: dates[0], duration_minutes: parsed[0].duration_minutes } : {}),
      warnings: logged ? [] : ['sync_log_unavailable'],
    });
  } catch {
    await logHealthSync(endpoint, ['sleep_analysis'], empty, 'import_failed');
    return NextResponse.json({ error: 'Import failed. Retry this batch.', code: 'import_failed' }, { status: 500 });
  }
}
