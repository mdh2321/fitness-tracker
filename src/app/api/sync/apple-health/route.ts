import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, dailyStrain, userSettings } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calculateStrainScore, aggregateDailyStrain } from '@/lib/strain';
import { evaluateAllAchievements } from '@/lib/achievements';
import { APPLE_HEALTH_TYPE_MAP, PASSIVE_ACTIVITIES } from '@/lib/constants';
import { format } from 'date-fns';
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

  // Health Auto Export wraps everything under body.data
  const data = body?.data ?? body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incomingWorkouts: any[] = data?.workouts ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incomingMetrics: any[] = data?.metrics ?? [];


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

  // --- Steps (in metrics array, metric name "step_count") ---
  let importedSteps = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepMetric = incomingMetrics.find((m: any) => m.name === 'step_count');
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

  // --- Recalculate daily strain for affected workout dates ---
  for (const date of affectedDates) {
    await recalcDailyStrain(date);
  }

  // --- Evaluate achievements against full history ---
  if (importedWorkouts > 0) {
    await evaluateAllAchievements();
  }

  return NextResponse.json({
    imported: {
      workouts: importedWorkouts,
      skipped: skippedWorkouts,
      steps: importedSteps,
    },
    message: `Synced ${importedWorkouts} workout(s), ${importedSteps} day(s) of steps`,
  });
}
