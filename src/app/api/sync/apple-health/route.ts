import { NextRequest, NextResponse } from 'next/server';
import { db as database, dbReady, type DB } from '@/db';
import { workouts, dailyStrain, userSettings, sleepSessions, dailySleep } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { calculateStrainScore, aggregateDailyStrain } from '@/lib/strain';
import { evaluateAllAchievements } from '@/lib/achievements';
import { APPLE_HEALTH_TYPE_MAP, PASSIVE_ACTIVITIES } from '@/lib/constants';
import { extractDistanceKm, extractKcal, extractQty, extractLocalDate, normalizeMetricName, parseFlexibleDate, validateHealthSync } from '@/lib/health-sync';
import { syncAuth, logHealthSync } from '@/lib/sync-server';
import type { WorkoutType } from '@/lib/constants';

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

async function recalcDailyStrain(db: Pick<DB, 'select' | 'insert'>, date: string) {
  const dayWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.local_date, date));

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
  const endpoint = '/api/sync/apple-health';
  const empty = { workouts: 0, steps: 0, sleep: 0 };
  const unauthorized = syncAuth(request);
  if (unauthorized) {
    await logHealthSync(endpoint, [], empty, unauthorized.status === 401 ? 'unauthorized' : 'sync_not_configured');
    return unauthorized;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await logHealthSync(endpoint, [], empty, 'invalid_json');
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_json' }, { status: 400 });
  }
  const validated = validateHealthSync(body);
  if (!validated.success) {
    await logHealthSync(endpoint, [], empty, 'invalid_payload');
    return NextResponse.json({
      error: 'Invalid health data. No records were imported.', code: 'invalid_payload',
      issues: validated.error.issues.slice(0, 10).map(i => ({ path: i.path.join('.'), message: i.message })),
    }, { status: 422 });
  }
  const incomingWorkouts = validated.data.workouts;
  const incomingMetrics = validated.data.metrics;
  const receivedMetricNames = incomingMetrics.map(m => normalizeMetricName(m.name))
    .filter(n => ['step_count', 'sleep_analysis'].includes(n));
  if (incomingWorkouts.length) receivedMetricNames.push('workouts');
  if (!receivedMetricNames.length) {
    await logHealthSync(endpoint, [], empty, 'no_supported_data');
    return NextResponse.json({ error: 'No workouts, steps or sleep data found.', code: 'no_supported_data' }, { status: 422 });
  }
  try {
    await dbReady;
    // libSQL uses a write transaction: retries cannot leave half-imported batches.
    const result = await database.transaction(async (db) => {
      const settings = await db.select().from(userSettings).get();
      const userMaxHR = settings?.max_heart_rate ?? 190;
      const userRestingHR = settings?.resting_hr ?? 60;

      let importedWorkouts = 0;
      let skippedWorkouts = 0;
      let updatedWorkouts = 0;
      const affectedDates = new Set<string>();

      // --- Workouts ---
      for (const w of incomingWorkouts) {
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
            ? Math.round(extractQty(w.heartRate?.avg)!)
            : null;

        const maxHR = w.maxHeartRate != null
          ? Math.round(extractQty(w.maxHeartRate) ?? 0) || null
          : extractQty(w.heartRate?.max) != null
            ? Math.round(extractQty(w.heartRate?.max)!)
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

        // Distance: Health Auto Export sends "totalDistance" as { qty, units }
        const distanceKm = extractDistanceKm(w.totalDistance) ?? extractDistanceKm(w.distance);

        // Calories: v1 uses "totalEnergy" or "activeEnergy" (scalar), v2 uses "activeEnergyBurned"
        // AutoExport may send kJ — extractKcal handles unit conversion
        const caloriesQty =
          extractKcal(w.activeEnergyBurned) ??
          extractKcal(w.totalEnergy) ??
          extractKcal(w.activeEnergy);

        const values = {
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
          distance_km: distanceKm,
          strain_score: strainScore,
          source: 'apple_health',
          apple_health_id: w.id != null ? String(w.id) : null,
        };
        const existing = w.id != null ? await db.select().from(workouts)
          .where(eq(workouts.apple_health_id, String(w.id))).get() : null;
        if (existing) {
          // Exporters can deliver HR/distance after the workout. Preserve previously
          // known optional values when they are absent in a later partial export.
          const merged = {
            ...values,
            ended_at: values.ended_at ?? existing.ended_at,
            avg_heart_rate: avgHR ?? existing.avg_heart_rate,
            max_heart_rate: maxHR ?? existing.max_heart_rate,
            calories: values.calories ?? existing.calories,
            distance_km: distanceKm ?? existing.distance_km,
          };
          merged.perceived_effort = estimateRPE(merged.avg_heart_rate, userMaxHR, userRestingHR);
          merged.strain_score = calculateStrainScore({
            ...merged, type: mapping.type, user_max_heart_rate: userMaxHR, user_resting_heart_rate: userRestingHR,
          });
          const changed = Object.entries(merged).some(([key, value]) => existing[key as keyof typeof existing] !== value);
          if (!changed) { skippedWorkouts++; continue; }
          await db.update(workouts).set(merged).where(eq(workouts.id, existing.id));
          affectedDates.add(existing.local_date ?? existing.started_at.slice(0, 10));
          updatedWorkouts++;
        } else {
          await db.insert(workouts).values({ ...values, created_at: new Date().toISOString() });
          importedWorkouts++;
        }

        affectedDates.add(dateKey);
      }

      // --- Steps (in metrics array, metric name "step_count" or variations) ---
      let importedSteps = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stepMetric = incomingMetrics.find((m: any) => normalizeMetricName(m.name ?? '') === 'step_count');
      if (stepMetric?.data) {
        // Sum the exported step samples for each local date.
        const stepsByDate = new Map<string, number>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const entry of stepMetric.data as any[]) {
          const qty = extractQty(entry) ?? (entry.qty != null ? Number(entry.qty) : null);
          if (qty == null || !entry.date) continue;
          const dateKey = extractLocalDate(entry.date);
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
            // Don't overwrite with lower sleep duration — Health Auto Export / Oura
            // sometimes re-sends partial or recalculated data that's less accurate
            if (existingSleep.duration_minutes > totalMinutes) {
              continue;
            }
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
        await recalcDailyStrain(db, date);
      }

      return { workouts: importedWorkouts, updated: updatedWorkouts, skipped: skippedWorkouts, steps: importedSteps, sleep: importedSleep };
    });
    const logged = await logHealthSync(endpoint, receivedMetricNames,
      { workouts: result.workouts + result.updated, steps: result.steps, sleep: result.sleep }, null);
    const warnings: string[] = logged ? [] : ['sync_log_unavailable'];
    if (result.workouts > 0 || result.updated > 0) {
      try { await evaluateAllAchievements(); }
      catch { warnings.push('achievements_pending'); }
    }
    return NextResponse.json({
      imported: result, warnings,
      message: `Synced ${result.workouts} new workout(s), updated ${result.updated}, ${result.steps} day(s) of steps, ${result.sleep} sleep session(s)`,
    });
  } catch {
    await logHealthSync(endpoint, receivedMetricNames, empty, 'import_failed');
    console.error('[Health Sync] Import transaction failed; records rolled back');
    return NextResponse.json({ error: 'Import failed. Retry this batch.', code: 'import_failed' }, { status: 500 });
  }
}
