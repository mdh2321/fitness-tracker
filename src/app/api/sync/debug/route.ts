import { NextRequest, NextResponse } from 'next/server';
import { rawClient, dbReady } from '@/db';
import { syncAuth } from '@/lib/sync-server';

export async function GET(request: NextRequest) {
  const unauthorized = syncAuth(request);
  if (unauthorized) return unauthorized;

  await dbReady;

  const requested = Number(request.nextUrl.searchParams.get('limit') ?? 20);
  const limit = Number.isFinite(requested) ? Math.max(1, Math.min(Math.floor(requested), 50)) : 20;

  const logs = await rawClient.execute({
    sql: `SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT ?`,
    args: [limit],
  });

  return NextResponse.json({
    total: logs.rows.length,
    logs: logs.rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      endpoint: row.endpoint,
      metric_names: row.metric_names,
      workouts_imported: row.workouts_imported,
      steps_imported: row.steps_imported,
      sleep_imported: row.sleep_imported,
      error: row.error,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
