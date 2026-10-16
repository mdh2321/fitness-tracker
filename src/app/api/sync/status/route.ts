import { NextRequest, NextResponse } from 'next/server';
import { rawClient, dbReady } from '@/db';
import { syncAuth } from '@/lib/sync-server';

export async function GET(request: NextRequest) {
  const unauthorized = syncAuth(request);
  if (unauthorized) return unauthorized;
  await dbReady;

  // Get last sync log entries by data type
  const logs = await rawClient.execute(
    `SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT 50`
  );

  // Aggregate all history: frequent no-op requests must not hide an older success.
  const summary = await rawClient.execute(`SELECT
    MAX(timestamp) AS attempted,
    MAX(CASE WHEN error IS NULL THEN timestamp END) AS succeeded,
    MAX(CASE WHEN error IS NULL AND workouts_imported > 0 THEN timestamp END) AS workouts,
    MAX(CASE WHEN error IS NULL AND steps_imported > 0 THEN timestamp END) AS steps,
    MAX(CASE WHEN error IS NULL AND sleep_imported > 0 THEN timestamp END) AS sleep
    FROM sync_log`);
  const last = summary.rows[0];

  // Also check DB directly for last data timestamps
  const lastWorkout = await rawClient.execute(
    `SELECT created_at FROM workouts WHERE source = 'apple_health' ORDER BY created_at DESC LIMIT 1`
  );
  const lastSleep = await rawClient.execute(
    `SELECT created_at FROM sleep_sessions WHERE source IN ('auto_export', 'healthkit') ORDER BY created_at DESC LIMIT 1`
  );
  const lastSteps = await rawClient.execute(
    `SELECT date FROM daily_strain WHERE steps > 0 ORDER BY date DESC LIMIT 1`
  );

  return NextResponse.json({
    lastSync: {
      any: last?.succeeded ?? null,
      workouts: last?.workouts ?? null,
      steps: last?.steps ?? null,
      sleep: last?.sleep ?? null,
    },
    lastAttempt: last?.attempted ?? null,
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
  }, { headers: { 'Cache-Control': 'no-store' } });
}
