import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { rawClient, dbReady } from '@/db';

export function syncAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.SYNC_API_KEY;
  if (!expected) return NextResponse.json({ error: 'Sync is not configured', code: 'sync_not_configured' }, { status: 503 });
  const received = request.headers.get('x-api-key') ?? '';
  const a = Buffer.from(received), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
  }
  return null;
}

// Store operational metadata only: never request bodies, credentials or raw errors.
export async function logHealthSync(endpoint: string, metrics: string[], result: { workouts: number; steps: number; sleep: number }, error: string | null) {
  try {
    await dbReady;
    await rawClient.execute({
      sql: 'INSERT INTO sync_log (endpoint, metric_names, workouts_imported, steps_imported, sleep_imported, error) VALUES (?, ?, ?, ?, ?, ?)',
      args: [endpoint, metrics.join(',').slice(0, 2000), result.workouts, result.steps, result.sleep, error],
    });
    return true;
  } catch {
    console.error('[Health Sync] Could not persist diagnostic log');
    return false;
  }
}
