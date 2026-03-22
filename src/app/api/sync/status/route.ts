import { NextResponse } from 'next/server';
import { rawClient, dbReady } from '@/db';

export async function GET() {
  await dbReady;

  // Get last sync log entries by data type
  const logs = await rawClient.execute(
    `SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT 50`
  );

  // Find last successful sync for each type
  let lastWorkoutSync: string | null = null;
  let lastStepSync: string | null = null;
  let lastSleepSync: string | null = null;
  let lastAnySync: string | null = null;

  for (const row of logs.rows) {
    const ts = row.timestamp as string;
    if (!lastAnySync) lastAnySync = ts;
    if (!lastWorkoutSync && (row.workouts_imported as number) > 0) lastWorkoutSync = ts;
    if (!lastStepSync && (row.steps_imported as number) > 0) lastStepSync = ts;
    if (!lastSleepSync && (row.sleep_imported as number) > 0) lastSleepSync = ts;
  }

  // Also check DB directly for last data timestamps
  const lastWorkout = await rawClient.execute(
    `SELECT created_at FROM workouts WHERE source = 'apple_health' ORDER BY created_at DESC LIMIT 1`
  );
  const lastSleep = await rawClient.execute(
    `SELECT created_at FROM sleep_sessions WHERE source = 'auto_export' ORDER BY created_at DESC LIMIT 1`
  );
  const lastSteps = await rawClient.execute(
    `SELECT date FROM daily_strain WHERE steps > 0 ORDER BY date DESC LIMIT 1`
  );

  return NextResponse.json({
    lastSync: {
      any: lastAnySync,
      workouts: lastWorkoutSync,
      steps: lastStepSync,
      sleep: lastSleepSync,
    },
    lastData: {
      workout: lastWorkout.rows[0]?.created_at ?? null,
      sleep: lastSleep.rows[0]?.created_at ?? null,
      steps: lastSteps.rows[0]?.date ?? null,
    },
    recentLogs: logs.rows.slice(0, 10).map((row) => ({
      timestamp: row.timestamp,
      endpoint: row.endpoint,
      metrics: row.metric_names,
      workouts: row.workouts_imported,
      steps: row.steps_imported,
      sleep: row.sleep_imported,
      error: row.error,
    })),
  });
}
