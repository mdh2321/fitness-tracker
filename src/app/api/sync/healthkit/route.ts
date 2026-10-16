import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, dbReady } from '@/db';
import { workouts, userSettings, dailyStrain, dailySleep, sleepSessions, exercises, exerciseSets, achievements } from '@/db/schema';
import { healthkitPayload } from '@/lib/healthkit-payload';
import { syncAuth, logHealthSync } from '@/lib/sync-server';
import { resolveWorkoutType, estimateRPE, recalcDailyStrain } from '@/lib/workout-sync';
import { calculateStrainScore } from '@/lib/strain';

export async function GET(request: NextRequest) {
  return syncAuth(request) ?? NextResponse.json({ version: 1, service: 'ARC HealthKit' }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const unauthorized = syncAuth(request);
  if (unauthorized) return unauthorized;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'invalid_json' }, { status: 400 }); }
  const parsed = healthkitPayload.safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: 'invalid_payload', issues: parsed.error.issues.slice(0, 10).map(i => ({ path: i.path.join('.'), message: i.message })) }, { status: 422 });
  const payload = parsed.data;
  if (payload.workouts.some(w => !resolveWorkoutType(w.name))) return NextResponse.json({ code: 'unsupported_workout' }, { status: 422 });
  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  try {
    await dbReady;
    const result = await db.transaction(async tx => {
      const receipts = await tx.all<{ device_id: string; payload_hash: string; response: string }>(sql`SELECT * FROM healthkit_receipts WHERE batch_id=${payload.batchId}`);
      if (receipts[0]) {
        if (receipts[0].device_id !== payload.deviceId || receipts[0].payload_hash !== hash) throw new Error('batch_conflict');
        return JSON.parse(receipts[0].response);
      }
      const settings = await tx.select().from(userSettings).get();
      const maxHR = settings?.max_heart_rate ?? 190, restingHR = settings?.resting_hr ?? 60;
      const affected = new Set<string>();
      let imported = 0, updated = 0, deleted = 0, steps = 0, sleep = 0;
      for (const w of payload.workouts) {
        const mapping = resolveWorkoutType(w.name)!;
        const start = new Date(w.start).toISOString();
        const links = await tx.all<{ workout_id: number }>(sql`SELECT workout_id FROM healthkit_workout_links WHERE healthkit_id=${w.id}`);
        let existing = links[0] ? await tx.select().from(workouts).where(eq(workouts.id, links[0].workout_id)).get() : undefined;
        if (!existing) existing = await tx.select().from(workouts).where(and(eq(workouts.source, 'apple_health'), sql`lower(${workouts.apple_health_id})=${w.id}`)).get();
        if (!existing) {
          // Adopt only an unambiguous exact-time legacy import. Never merge manual workouts.
          const candidates = await tx.select().from(workouts).where(and(eq(workouts.source, 'apple_health'), eq(workouts.started_at, start), eq(workouts.name, mapping.name)));
          const legacy = candidates.filter(c => c.apple_health_id === null || c.apple_health_id.startsWith('apple_health_'));
          if (legacy.length > 1) throw new Error('ambiguous_legacy_workout');
          if (legacy.length === 1) existing = legacy[0];
        }
        const average = w.averageHeartRate ?? existing?.avg_heart_rate ?? null;
        const maximum = w.maximumHeartRate ?? existing?.max_heart_rate ?? null;
        const duration = w.durationSeconds / 60;
        const rpe = estimateRPE(average, maxHR, restingHR);
        const values = {
          name: mapping.name, type: mapping.type, started_at: start, ended_at: new Date(w.end).toISOString(), local_date: w.localDate,
          duration_minutes: duration, perceived_effort: rpe, avg_heart_rate: average, max_heart_rate: maximum,
          calories: w.activeCalories ?? existing?.calories ?? null, distance_km: w.distanceKm ?? existing?.distance_km ?? null,
          source: 'apple_health', apple_health_id: w.id,
          strain_score: calculateStrainScore({ duration_minutes: duration, perceived_effort: rpe, type: mapping.type,
            avg_heart_rate: average, max_heart_rate: maximum, user_max_heart_rate: maxHR, user_resting_heart_rate: restingHR }),
        };
        let id: number;
        if (existing) {
          id = existing.id;
          await tx.update(workouts).set(values).where(eq(workouts.id, id));
          affected.add(existing.local_date ?? existing.started_at.slice(0, 10));
          updated++;
        } else {
          const rows = await tx.insert(workouts).values(values).returning({ id: workouts.id });
          id = rows[0].id; imported++;
        }
        await tx.run(sql`INSERT INTO healthkit_workout_links(healthkit_id, workout_id) VALUES (${w.id},${id}) ON CONFLICT(healthkit_id) DO UPDATE SET workout_id=excluded.workout_id`);
        affected.add(w.localDate);
      }
      for (const id of payload.deletedWorkoutIds) {
        // Only delete workouts this native bridge previously identified.
        const links = await tx.all<{ workout_id: number }>(sql`SELECT workout_id FROM healthkit_workout_links WHERE healthkit_id=${id}`);
        if (!links[0]) continue;
        const old = await tx.select().from(workouts).where(and(eq(workouts.id, links[0].workout_id), eq(workouts.source, 'apple_health'))).get();
        if (old) {
          const children = await tx.select({ id: exercises.id }).from(exercises).where(eq(exercises.workout_id, old.id));
          if (children.length) await tx.delete(exerciseSets).where(inArray(exerciseSets.exercise_id, children.map(c => c.id)));
          await tx.delete(exercises).where(eq(exercises.workout_id, old.id));
          await tx.update(achievements).set({ workout_id: null }).where(eq(achievements.workout_id, old.id));
          await tx.delete(workouts).where(eq(workouts.id, old.id));
          affected.add(old.local_date ?? old.started_at.slice(0, 10)); deleted++;
        }
        await tx.run(sql`DELETE FROM healthkit_workout_links WHERE healthkit_id=${id}`);
      }
      for (const day of payload.days) {
        if (day.steps !== undefined) {
          const owned = await tx.all(sql`SELECT date FROM healthkit_daily_ownership WHERE date=${day.date} AND metric='steps'`);
          if (day.steps > 0 || owned.length) {
            await tx.insert(dailyStrain).values({ date: day.date, steps: day.steps }).onConflictDoUpdate({ target: dailyStrain.date, set: { steps: day.steps } });
            await tx.run(sql`INSERT OR IGNORE INTO healthkit_daily_ownership(date,metric) VALUES (${day.date},'steps')`);
            steps++;
          }
        }
        if (day.sleep) {
          const s = day.sleep;
          const owned = await tx.all(sql`SELECT date FROM healthkit_daily_ownership WHERE date=${day.date} AND metric='sleep'`);
          if (s.totalMinutes === 0 && !owned.length) continue;
          // Replace the old per-day export aggregate, preserving manually entered sleep.
          await tx.delete(sleepSessions).where(and(eq(sleepSessions.date, day.date), inArray(sleepSessions.source, ['auto_export', 'healthkit'])));
          if (s.totalMinutes > 0) await tx.insert(sleepSessions).values({ date: day.date, duration_minutes: s.totalMinutes,
            time_in_bed_minutes: s.inBedMinutes, deep_minutes: s.deepMinutes, rem_minutes: s.remMinutes,
            light_minutes: s.coreMinutes, awake_minutes: s.awakeMinutes, source: 'healthkit', source_id: `healthkit_${day.date}` });
          const sessions = await tx.select().from(sleepSessions).where(eq(sleepSessions.date, day.date));
          const total = sessions.reduce((a, b) => a + b.duration_minutes, 0);
          const sum = (key: 'time_in_bed_minutes' | 'deep_minutes' | 'rem_minutes' | 'light_minutes' | 'awake_minutes') => sessions.some(s => s[key] !== null) ? sessions.reduce((a, b) => a + (b[key] ?? 0), 0) : null;
          const inBed = sum('time_in_bed_minutes');
          const values = { total_minutes: total, time_in_bed_minutes: inBed, deep_minutes: sum('deep_minutes'), rem_minutes: sum('rem_minutes'),
            light_minutes: sum('light_minutes'), awake_minutes: sum('awake_minutes'), efficiency: inBed ? Math.min(100, total / inBed * 100) : null, sessions: sessions.length };
          await tx.insert(dailySleep).values({ date: day.date, ...values }).onConflictDoUpdate({ target: dailySleep.date, set: values });
          await tx.run(sql`INSERT OR IGNORE INTO healthkit_daily_ownership(date,metric) VALUES (${day.date},'sleep')`);
          sleep++;
        }
      }
      for (const date of affected) await recalcDailyStrain(tx, date);
      const receipt = { accepted: true, batchId: payload.batchId, imported, updated, deleted, steps, sleep };
      await tx.run(sql`INSERT INTO healthkit_receipts(batch_id,device_id,payload_hash,response) VALUES (${payload.batchId},${payload.deviceId},${hash},${JSON.stringify(receipt)})`);
      // Receipt and data commit together; lost HTTP responses are safe to retry.
      return receipt;
    });
    await logHealthSync('/api/sync/healthkit', ['healthkit'], { workouts: result.imported + result.updated, steps: result.steps, sleep: result.sleep }, null);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const code = error instanceof Error && ['batch_conflict', 'ambiguous_legacy_workout'].includes(error.message) ? error.message : 'import_failed';
    await logHealthSync('/api/sync/healthkit', ['healthkit'], { workouts: 0, steps: 0, sleep: 0 }, code);
    return NextResponse.json({ code }, { status: code === 'import_failed' ? 500 : 409 });
  }
}
