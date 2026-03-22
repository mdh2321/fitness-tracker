import { NextRequest, NextResponse } from 'next/server';
import { rawClient, dbReady } from '@/db';

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') ?? request.nextUrl.searchParams.get('key');
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbReady;

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 20), 50);

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
      payload_snippet: row.payload_snippet,
    })),
  });
}
