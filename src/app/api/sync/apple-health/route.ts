import { NextRequest, NextResponse } from 'next/server';
import { db, rawClient, dbReady } from '@/db';
import { workouts, dailyStrain, userSettings, sleepSessions, dailySleep } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calculateStrainScore, aggregateDailyStrain } from '@/lib/strain';
import { evaluateAllAchievements } from '@/lib/achievements';
import { APPLE_HEALTH_TYPE_MAP, PASSIVE_ACTIVITIES } from '@/lib/constants';
import { format } from 'date-fns';
import type { WorkoutType } from '@/lib/constants';

// Normalize metric names to handle variations from Health Auto Export
function normalizeMetricName(name: string): string {
  const n = name.toLowerCase().replace(/[\s_-]+/g, '');
  if (n.includes('sleep') && (n.includes('analysis') || n.includes('analys'))) return 'sleep_analysis';
  if (n === 'sleep') return 'sleep_analysis';
  if (n.includes('step') && n.includes('count')) return 'step_count';
  if (n === 'steps' || n === 'stepcount') return 'step_count';
  return name;
}

async function logSync(endpoint: string, metricNames: string[], results: { workouts: number; steps: number; sleep: number }, error: string | null, payloadSnippet: string) {
  try {
    await dbReady;
    await rawClient.execute({
      sql: `INSERT INTO sync_log (endpoint, metric_names, workouts_imported, steps_imported, sleep_imported, error, payload_snippet) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [endpoint, metricNames.join(','), results.workouts, results.steps, results.sleep, error, payloadSnippet.slice(0, 4000)],
    });
  } catch (e) {
    console.error('[Sync Log] Failed to write log:', e);
  }
}

// Health Auto Export sends workout type as a human-readable "name" field
const SHORTCUTS_TYPE_MAP: Record<string, { type: WorkoutType; name: string }> = {
  'Running':                          { type: 'cardio',      name: 'Running' },
  'Run':                              { type: 'cardio',      name: 'Running' },
  'Outdoor Run':                      { type: 'cardio',      name: 'Running' },
  'Indoor Run':                       { type: 'cardio',      name: 'Running' },
  'Cycling':                          { type: 'cardio',      name: 'Cycling' },
  'Ride':                             { type: 'cardio',      name: 'Cycling' },
  'Outdoor Cycling':                  { type: 'cardio',      name: 'Cycling' },
  'Indoor Cycling':                   { type: 'cardio',      name: 'Cycling' },
  'Swimming':                         { type: 'cardio',      name: 'Swimming' },
  'Swim':                             { type: 'cardio',      name: 'Swimming' },
  'Open Water Swimming':              { type: 'cardio',      name: 'Swimming' },
  'Pool Swimming':                    { type: 'cardio',      name: 'Swimming' },
  'Walking':                          { type: 'cardio',      name: 'Walking' },
  'Walk':                             { type: 'cardio',      name: 'Walking' },
  'Outdoor Walk':                     { type: 'cardio',      name: 'Walking' },
  'Indoor Walk':                      { type: 'cardio',      name: 'Walking' },
  'Hiking':                           { type: 'cardio',      name: 'Hiking' },
  'Hike':                             { type: 'cardio',      name: 'Hiking' },
  'Elliptical':                       { type: 'cardio',      name: 'Elliptical' },
  'Rowing':                           { type: 'cardio',      name: 'Rowing' },
  'Stair Climbing':                   { type: 'cardio',      name: 'Stair Climbing' },
  'Jump Rope':                        { type: 'cardio',      name: 'Jump Rope' },
  'Dance':                            { type: 'cardio',      name: 'Dance' },
  'Step Training':                    { type: 'cardio',      name: 'Step Training' },
  'Traditional Strength Training':    { type: 'strength',    name: 'Strength Training' },
  'Functional Strength Training':     { type: 'strength',    name: 'Functional Strength' },
  'Core Training':                    { type: 'strength',    name: 'Core Training' },
  'Cross Training':                   { type: 'mixed',       name: 'Cross Training' },
  'High Intensity Interval Training': { type: 'mixed',       name: 'HIIT' },
  'HIIT':                             { type: 'mixed',       name: 'HIIT' },
  'Mixed Cardio':                     { type: 'mixed',       name: 'Mixed Cardio' },
  'Kickboxing':                       { type: 'mixed',       name: 'Kickboxing' },
  'Yoga':                             { type: 'flexibility', name: 'Yoga' },
  'Pilates':                          { type: 'flexibility', name: 'Pilates' },
  'Barre':                            { type: 'flexibility', name: 'Barre' },
  'Cooldown':                         { type: 'flexibility', name: 'Cooldown' },
  'Mind & Body':                      { type: 'flexibility', name: 'Mind & Body' },
  'Soccer':                           { type: 'sport',       name: 'Soccer' },
  'Basketball':                       { type: 'sport',       name: 'Basketball' },
  'Tennis':                           { type: 'sport',       name: 'Tennis' },
  'Volleyball':                       { type: 'sport',       name: 'Volleyball' },
  'Boxing':                           { type: 'sport',       name: 'Boxing' },
  'Martial Arts':                     { type: 'sport',       name: 'Martial Arts' },
  'Other':                            { type: 'mixed',       name: 'Other' },
};

function resolveWorkoutType(name: string) {
  return SHORTCUTS_TYPE_MAP[name] ?? APPLE_HEALTH_TYPE_MAP[name] ?? null;
}

function estimateRPE(avgHR: number | null, userMaxHR: number, userRestingHR: number): number {
  if (!avgHR || userMaxHR <= userRestingHR) return 5;
  const hrr = Math.max(0, (avgHR - userRestingHR) / (userMaxHR - userRestingHR));
  return Math.max(1, Math.min(10, Math.round(hrr * 10)));
}

// Health Auto Export date format: "2026-02-20 08:00:00 +1100"
function parseFlexibleDate(dateStr: string): Date {
  const normalised = dateStr
    .trim()
    .replace(' ', 'T')
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const d = new Date(normalised);
  if (!isNaN(d.getTime())) return d;
  return new Date(dateStr);
}

// Extract local date (YYYY-MM-DD) from a date string, respecting its timezone offset
// e.g. "2026-03-11 08:47:33 +1100" → "2026-03-11" (not UTC "2026-03-10")
function extractLocalDate(dateStr: string): string {
  const match = dateStr.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return parseFlexibleDate(dateStr).toISOString().split('T')[0];
}

// Extract a plain number from a Health Auto Export qty object or plain number
function extractQty(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'qty' in val) {
    const n = Number((val as { qty: unknown }).qty);
    return isNaN(n) ? null : n;
  }
  return null;
}

// Extract calories as kcal, converting from kJ if needed (AutoExport sends kJ)
function extractKcal(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'qty' in val) {
    const qty = Number((val as { qty: unknown }).qty);
    if (isNaN(qty)) return null;
    const units = (val as { units?: unknown }).units;
    if (typeof units === 'string' && units.toLowerCase() === 'kj') {
      return qty / 4.184;
    }
    return qty;
  }
  return null;
}

async function recalcDailyStrain(date: string) {
  const dayWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.local_date, date));

  if (dayWorkouts.length === 0) return;

  const existing = await db.select().from(dailyStrain).where(eq(dailyStrain.date, date)).get();
  const existingSteps = existing?.steps ?? 0;

  const aggStrain = aggregateDailyStrain(dayWorkouts.map((w) => w.strain_score));
  const totalDuration = dayWorkouts.reduce((s, w) => s + w.duration_minutes, 0);
  const totalCals = dayWorkouts.reduce((s, w) => s + (w.calories ?? 0), 0);
  const activeCount = dayWorkouts.filter((w) => !PASSIVE_ACTIVITIES.has(w.name)).length;

  await db
    .insert(dailyStrain)
    .values({
      date,
      strain_score: aggStrain,
      workout_count: activeCount,
      total_duration: totalDuration,
      total_volume: 0,
      total_calories: totalCals,
      steps: existingSteps,
    })
    .onConflictDoUpdate({
      target: dailyStrain.date,
      set: {
        strain_score: aggStrain,
        workout_count: activeCount,
        total_duration: totalDuration,
        total_calories: totalCals,
      },
    });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Capture raw payload snippet for sync log
  const rawPayloadSnippet = JSON.stringify(body).slice(0, 4000);
  const receivedMetricNames: string[] = [];

  // Health Auto Export wraps everything under body.data
  const data = body?.data ?? body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incomingWorkouts: any[] = data?.workouts ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incomingMetrics: any[] = data?.metrics ?? [];

  // Log all metric names received for debugging
  for (const m of incomingMetrics) {
    if (m?.name) receivedMetricNames.push(m.name);
  }
  if (incomingWorkouts.length > 0) receivedMetricNames.push(`workouts(${incomingWorkouts.length})`);

  console.log('[Apple Health Sync] Received metrics:', receivedMetricNames.join(', ') || 'none');
  console.log('[Apple Health Sync] Payload keys:', Object.keys(data ?? {}));

  const settings = await db.select().from(userSettings).get();
  const userMaxHR = settings?.max_heart_rate ?? 190;
  const userRestingHR = settings?.resting_hr ?? 60;

  let importedWorkouts = 0;
  let skippedWorkouts = 0;
  const affectedDates = new Set<string>();

  // --- Workouts ---
  for (const w of incomingWorkouts) {
    // Deduplicate by apple_health_id (v2 sends a UUID as "id")
    if (w.id) {
      const existing = await db
        .select({ id: workouts.id })
        .from(workouts)
        .where(eq(workouts.apple_health_id, String(w.id)))
        .get();
      if (existing) { skippedWorkouts++; continue; }
    }

    // Health Auto Export uses "name" for the workout type display name
    const mapping = resolveWorkoutType(w.name ?? '');
    if (!mapping) { skippedWorkouts++; continue; }

    // Health Auto Export uses "start" / "end" (not "startDate" / "endDate")
    const rawStartStr = (w.start ?? w.startDate ?? '').trim();
    const startDate = parseFlexibleDate(rawStartStr);
    if (isNaN(startDate.getTime())) { skippedWorkouts++; continue; }

    // Extract the user's local date from the Apple Health string (which includes a timezone offset,
    // e.g. "2026-02-23 09:29:00 +1100"). Store it as local_date for date-based grouping.
    // started_at remains real UTC so the browser displays the correct local time.
    const normalisedRaw = rawStartStr.replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const localDTMatch = normalisedRaw.match(/^(\d{4}-\d{2}-\d{2})/);
    // Fall back to UTC date from startDate if the raw string can't be parsed
    const localDate: string = localDTMatch ? localDTMatch[1] : startDate.toISOString().substring(0, 10);

    const rawEndStr = (w.end ?? w.endDate ?? '').trim();
    const endDate = rawEndStr ? parseFlexibleDate(rawEndStr) : null;

    // "duration" is in seconds in Health Auto Export
    let durationMinutes: number;
    if (w.duration != null) {
      durationMinutes = Math.round(Number(w.duration) / 60);
    } else if (endDate != null) {
      durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    } else {
      durationMinutes = 0;
    }

    if (durationMinutes <= 0) { skippedWorkouts++; continue; }

    // Heart rate: Health Auto Export sends { qty, units } objects
    const avgHR = w.avgHeartRate != null
      ? Math.round(extractQty(w.avgHeartRate) ?? 0) || null
      : extractQty(w.heartRate?.avg) != null
        ? Math.round(extractQty(w.heartRate.avg)!)
        : null;

    const maxHR = w.maxHeartRate != null
      ? Math.round(extractQty(w.maxHeartRate) ?? 0) || null
      : extractQty(w.heartRate?.max) != null
        ? Math.round(extractQty(w.heartRate.max)!)
        : null;

    const rpe = estimateRPE(avgHR, userMaxHR, userRestingHR);

    const strainScore = calculateStrainScore({
      duration_minutes: durationMinutes,
      perceived_effort: rpe,
      type: mapping.type as WorkoutType,
      avg_heart_rate: avgHR,
      max_heart_rate: maxHR,
      user_max_heart_rate: userMaxHR,
      user_resting_heart_rate: userRestingHR,
    });

    const dateKey: string = localDate;

    // Calories: v1 uses "totalEnergy" or "activeEnergy" (scalar), v2 uses "activeEnergyBurned"
    // AutoExport may send kJ — extractKcal handles unit conversion
    const caloriesQty =
      extractKcal(w.activeEnergyBurned) ??
      extractKcal(w.totalEnergy) ??
      extractKcal(w.activeEnergy);

    await db.insert(workouts).values({
      type: mapping.type,
      name: mapping.name,
      started_at: startDate.toISOString(),
      ended_at: endDate?.toISOString() ?? null,
      local_date: localDate,
      duration_minutes: durationMinutes,
      perceived_effort: rpe,
      avg_heart_rate: avgHR,
      max_heart_rate: maxHR,
      calories: caloriesQty != null ? Math.round(caloriesQty) : null,
      strain_score: strainScore,
      source: 'apple_health',
      apple_health_id: w.id ? String(w.id) : null,
      created_at: new Date().toISOString(),
    });

    affectedDates.add(dateKey);
    importedWorkouts++;
  }

  // --- Steps (in metrics array, metric name "step_count" or variations) ---
  let importedSteps = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepMetric = incomingMetrics.find((m: any) => normalizeMetricName(m.name ?? '') === 'step_count');
  if (stepMetric?.data) {
    // Build step rows, deduplicated by date (keep the last entry per date)
    const stepsByDate = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const entry of stepMetric.data as any[]) {
      const qty = extractQty(entry) ?? (entry.qty != null ? Number(entry.qty) : null);
      if (qty == null || !entry.date) continue;
      const dateKey = entry.date.substring(0, 10);
      stepsByDate.set(dateKey, (stepsByDate.get(dateKey) ?? 0) + Math.round(qty));
    }

    // Insert all step days in one batch
    if (stepsByDate.size > 0) {
      const stepRows = Array.from(stepsByDate.entries()).map(([date, steps]) => ({
        date,
        strain_score: 0 as number,
        workout_count: 0,
        total_duration: 0,
        total_volume: 0 as number,
        total_calories: 0,
        steps,
      }));
      await db
        .insert(dailyStrain)
        .values(stepRows)
        .onConflictDoUpdate({
          target: dailyStrain.date,
          set: { steps: sql`MAX(excluded.steps, ${dailyStrain.steps})` },
        });
      importedSteps = stepsByDate.size;
    }
  }

  // --- Sleep (in metrics array, metric name "sleep_analysis" or variations) ---
  let importedSleep = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sleepMetric = incomingMetrics.find((m: any) => normalizeMetricName(m.name ?? '') === 'sleep_analysis');
  if (sleepMetric?.data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const entry of sleepMetric.data as any[]) {
      // Auto Export sends sleep values in hours
      // Use totalSleep if asleep is 0 or missing
      const sleepHours = (entry.asleep || entry.totalSleep);
      if (!sleepHours) continue;

      const totalMinutes = Math.round(sleepHours * 60);

      if (totalMinutes <= 0) continue;

      const toMin = (val: number | null | undefined): number | null => {
        if (val == null || val === 0) return null;
        return Math.round(val * 60); // All values are in hours
      };

      const deepMinutes = toMin(entry.deep);
      const remMinutes = toMin(entry.rem);
      const lightMinutes = toMin(entry.core);
      const timeInBedMinutes = toMin(entry.inBed);
      const awakeMinutes = toMin(entry.awake);


      // Determine date from sleepEnd, inBedEnd, or date field
      // Use local date from timezone offset (not UTC) to match AEDT
      const sleepEnd = entry.sleepEnd || entry.inBedEnd;
      let date: string;
      if (sleepEnd) {
        date = extractLocalDate(sleepEnd);
      } else if (entry.date) {
        date = extractLocalDate(entry.date);
      } else {
        continue;
      }

      const sourceId = `auto_export_${date}`;

      // Upsert sleep session
      const existingSleep = await db.select().from(sleepSessions).where(eq(sleepSessions.source_id, sourceId)).get();

      const sleepData = {
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

      if (existingSleep) {
        await db.update(sleepSessions).set(sleepData).where(eq(sleepSessions.source_id, sourceId));
      } else {
        await db.insert(sleepSessions).values({
          ...sleepData,
          source: 'auto_export',
          source_id: sourceId,
        });
      }

      // Recalculate daily_sleep
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

      importedSleep++;
    }
  }

  // --- Recalculate daily strain for affected workout dates ---
  for (const date of affectedDates) {
    await recalcDailyStrain(date);
  }

  // --- Evaluate achievements against full history ---
  if (importedWorkouts > 0) {
    await evaluateAllAchievements();
  }

  const result = {
    workouts: importedWorkouts,
    skipped: skippedWorkouts,
    steps: importedSteps,
    sleep: importedSleep,
  };

  // Log this sync attempt
  await logSync('/api/sync/apple-health', receivedMetricNames, { workouts: importedWorkouts, steps: importedSteps, sleep: importedSleep }, null, rawPayloadSnippet);

  return NextResponse.json({
    imported: result,
    message: `Synced ${importedWorkouts} workout(s), ${importedSteps} day(s) of steps, ${importedSleep} sleep session(s)`,
  });
}
