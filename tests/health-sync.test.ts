import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { NextRequest } from 'next/server';
import * as schema from '../src/db/schema';
import { extractDistanceKm, extractQty, validateHealthSync } from '../src/lib/health-sync';

let database: typeof import('../src/db');
let health: typeof import('../src/app/api/sync/apple-health/route');
let sleep: typeof import('../src/app/api/sleep/sync/route');
let status: typeof import('../src/app/api/sync/status/route');
let debug: typeof import('../src/app/api/sync/debug/route');
const workout = { id: 'run-1', name: 'Running', start: '2026-10-14 07:00:00 +1100',
  end: '2026-10-14 07:30:00 +1100', duration: 1800, totalDistance: { qty: 5000, units: 'm' } };
const request = (body?: unknown, key: string | null = 'local-test-key', url = 'http://localhost/api/sync/apple-health') => new NextRequest(url, {
  method: body === undefined ? 'GET' : 'POST', headers: key ? { 'x-api-key': key } : {},
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
});

before(async () => {
  assert.match(process.env.TURSO_DATABASE_URL ?? '', /^file:.*arc-sync-test-/);
  assert.equal(process.env.TURSO_AUTH_TOKEN, undefined);
  // Build an isolated fixture from the current schema. Production migrations are not run.
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  for (const table of Object.values(schema)) {
    const config = getTableConfig(table);
    const columns = config.columns.map(c => {
      const defaultValue = c.default === undefined ? '' : ` DEFAULT ${typeof c.default === 'string'
        ? "'" + c.default.replaceAll("'", "''") + "'" : Number(c.default)}`;
      return `"${c.name}" ${c.getSQLType()}${c.primary ? ' PRIMARY KEY' : ''}${c.notNull ? ' NOT NULL' : ''}${defaultValue}`;
    });
    await client.execute(`CREATE TABLE "${config.name}" (${columns.join(', ')})`);
    for (const index of config.indexes) {
      const i = index.config;
      await client.execute(`CREATE ${i.unique ? 'UNIQUE ' : ''}INDEX "${i.name}" ON "${config.name}" (${i.columns.map(c => 'name' in c ? `"${c.name}"` : '').join(', ')})`);
    }
  }
  await client.execute('INSERT INTO user_settings(id) VALUES (1)');
  client.close();
  database = await import('../src/db');
  await database.dbReady;
  health = await import('../src/app/api/sync/apple-health/route');
  sleep = await import('../src/app/api/sleep/sync/route');
  status = await import('../src/app/api/sync/status/route');
  debug = await import('../src/app/api/sync/debug/route');
});
after(() => database?.rawClient.close());

test('distance units and malformed quantities', () => {
  assert.equal(extractDistanceKm({ qty: 5000, units: 'm' }), 5);
  assert.equal(extractDistanceKm({ qty: 1, units: 'mi' }), 1.609344);
  assert.equal(extractDistanceKm({ qty: 5, units: 'yards' }), null);
  assert.equal(extractDistanceKm({ qty: 1.7e308, units: 'mi' }), null);
  for (const value of [' ', 'Infinity', -1, Infinity, {}, null]) assert.equal(extractQty(value), null);
  assert.equal(validateHealthSync({ data: { workouts: [workout] } }).success, true);
  assert.equal(validateHealthSync({ workouts: [{ ...workout, end: 'invalid' }] }).success, false);
  assert.equal(validateHealthSync({ workouts: [{ ...workout, start: '2026-02-30' }] }).success, false);
});

test('authentication and validation reject before importing', async () => {
  assert.equal((await health.POST(request({ workouts: [workout] }, null))).status, 401);
  assert.equal((await health.POST(request('{'))).status, 400);
  assert.equal((await health.POST(request({ workouts: [workout, { ...workout, id: 'invalid', end: 'invalid' }] }))).status, 422);
  assert.equal((await database.rawClient.execute('SELECT count(*) AS n FROM workouts')).rows[0].n, 0);
});

test('UUID retries do not duplicate; later corrections update and preserve omitted values', async () => {
  const first = await health.POST(request({ data: { workouts: [workout] } }));
  assert.equal(first.status, 200);
  assert.equal((await first.json()).imported.workouts, 1);
  const retry = await health.POST(request({ workouts: [workout] }));
  assert.equal((await retry.json()).imported.skipped, 1);
  const correction = { ...workout, totalDistance: undefined, avgHeartRate: { qty: 145, units: 'bpm' } };
  const update = await health.POST(request({ workouts: [correction] }));
  assert.equal((await update.json()).imported.updated, 1);
  const rows = (await database.rawClient.execute('SELECT * FROM workouts')).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].distance_km, 5);
  assert.equal(rows[0].avg_heart_rate, 145);
  assert.equal(rows[0].local_date, '2026-10-14');
});

test('database failure rolls back earlier records in the same batch', async () => {
  await database.rawClient.execute(`CREATE TRIGGER reject_test_workout BEFORE INSERT ON workouts
    WHEN NEW.apple_health_id = 'reject' BEGIN SELECT RAISE(ABORT, 'test failure'); END`);
  const response = await health.POST(request({ workouts: [{ ...workout, id: 'rollback' }, { ...workout, id: 'reject' }] }));
  assert.equal(response.status, 500);
  assert.equal((await database.rawClient.execute("SELECT count(*) AS n FROM workouts WHERE apple_health_id IN ('rollback','reject')")).rows[0].n, 0);
  await database.rawClient.execute('DROP TRIGGER reject_test_workout');
});

test('steps and both sleep formats preserve expected imports', async () => {
  const entry = { date: '2026-10-14', asleep: 7.5, deep: 1.5 };
  assert.equal((await health.POST(request({ metrics: [
    { name: 'step_count', data: [{ date: '2026-10-14', qty: 1000 }, { date: '2026-10-14', qty: 500 }] },
    { name: 'sleep_analysis', data: [entry] },
  ] }))).status, 200);
  assert.equal((await database.rawClient.execute("SELECT steps FROM daily_strain WHERE date='2026-10-14'")).rows[0].steps, 1500);
  assert.equal((await sleep.POST(request({ ...entry, date: '2026-10-15' }))).status, 200);
  assert.equal((await sleep.POST(request({ data: { metrics: [{ name: 'Sleep Analysis', data: [{ ...entry, date: '2026-10-16' }] }] } }))).status, 200);
  assert.equal((await database.rawClient.execute('SELECT count(*) AS n FROM sleep_sessions WHERE duration_minutes=450')).rows[0].n, 3);
  const bad = await sleep.POST(request({ data: { metrics: [{ name: 'sleep_analysis', data: [entry, { date: 'bad', asleep: 8 }] }] } }));
  assert.equal(bad.status, 422);
});

test('sleep database failures roll back the entire batch', async () => {
  await database.rawClient.execute(`CREATE TRIGGER reject_test_sleep BEFORE INSERT ON sleep_sessions
    WHEN NEW.date = '2026-10-18' BEGIN SELECT RAISE(ABORT, 'test failure'); END`);
  const response = await sleep.POST(request({ data: { metrics: [{ name: 'sleep_analysis', data: [
    { date: '2026-10-17', asleep: 8 }, { date: '2026-10-18', asleep: 8 },
  ] }] } }));
  assert.equal(response.status, 500);
  assert.equal((await database.rawClient.execute("SELECT count(*) AS n FROM sleep_sessions WHERE date >= '2026-10-17'")).rows[0].n, 0);
  await database.rawClient.execute('DROP TRIGGER reject_test_sleep');
});

test('diagnostics require a header, omit raw payloads and retain older success timestamps', async () => {
  assert.equal((await status.GET(request(undefined, null))).status, 401);
  assert.equal((await debug.GET(request(undefined, null, 'http://localhost/api/sync/debug?key=local-test-key'))).status, 401);
  assert.equal((await database.rawClient.execute('SELECT count(*) AS n FROM sync_log WHERE payload_snippet IS NOT NULL')).rows[0].n, 0);
  await database.rawClient.execute('DELETE FROM sync_log');
  await database.rawClient.execute("INSERT INTO sync_log(timestamp,endpoint,workouts_imported,payload_snippet) VALUES ('2026-10-01 00:00:00','/test',1,'sensitive-legacy-payload')");
  for (let i = 0; i < 55; i++) await database.rawClient.execute("INSERT INTO sync_log(timestamp,endpoint,error) VALUES ('2026-10-02 00:00:00','/test','invalid_payload')");
  const response = await status.GET(request());
  const result = await response.json();
  assert.equal(result.lastSync.workouts, '2026-10-01 00:00:00');
  assert.equal(result.lastSync.any, '2026-10-01 00:00:00');
  assert.equal(result.lastAttempt, '2026-10-02 00:00:00');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const details = await debug.GET(request(undefined, 'local-test-key', 'http://localhost/api/sync/debug?limit=NaN'));
  assert.equal(details.status, 200);
  assert.equal((await details.text()).includes('payload_snippet'), false);
});

test('native receipts, migration, corrections, deletions and Auto Export handover', async () => {
  const native = await import('../src/app/api/sync/healthkit/route');
  const { randomUUID } = await import('node:crypto');
  const id = randomUUID();
  const batch = { version: 1, batchId: randomUUID(), deviceId: randomUUID(),
    workouts: [{ id, name: 'Running', start: '2026-10-13T20:00:00Z', end: '2026-10-13T20:30:00Z', localDate: '2026-10-14',
      durationSeconds: 1801, distanceKm: 5.12, averageHeartRate: 144, maximumHeartRate: null, activeCalories: 300 }],
    deletedWorkoutIds: [], days: [{ date: '2026-10-14', steps: 1200, sleep: { totalMinutes: 430, inBedMinutes: null,
      deepMinutes: 90, remMinutes: null, coreMinutes: null, awakeMinutes: null } }] };
  // Mimic the older XML importer ID; adopt its row instead of creating a duplicate.
  await database.rawClient.execute("UPDATE workouts SET apple_health_id='apple_health_legacy' WHERE apple_health_id='run-1'");
  const first = await native.POST(request(batch));
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.updated, 1);
  const retry = await native.POST(request(batch));
  assert.deepEqual(await retry.json(), firstBody);
  assert.equal((await database.rawClient.execute('SELECT count(*) AS n FROM workouts')).rows[0].n, 1);
  assert.equal((await native.POST(request({ ...batch, days: [] }))).status, 409);
  const rows = (await database.rawClient.execute('SELECT * FROM workouts')).rows;
  assert.equal(rows[0].duration_minutes, 1801 / 60);
  assert.equal(rows[0].distance_km, 5.12);
  await health.POST(request({ workouts: [{ ...workout, id: id.toUpperCase() }] }));
  assert.equal((await database.rawClient.execute('SELECT count(*) AS n FROM workouts')).rows[0].n, 1);
  assert.equal((await database.rawClient.execute('SELECT duration_minutes FROM workouts')).rows[0].duration_minutes, 1801 / 60);

  assert.equal((await database.rawClient.execute("SELECT total_minutes FROM daily_sleep WHERE date='2026-10-14'")).rows[0].total_minutes, 430);
  await health.POST(request({ metrics: [{ name: 'step_count', data: [{ date: '2026-10-14', qty: 9999 }] },
    { name: 'sleep_analysis', data: [{ date: '2026-10-14', asleep: 12 }] }] }));
  assert.equal((await database.rawClient.execute("SELECT steps FROM daily_strain WHERE date='2026-10-14'")).rows[0].steps, 1200);
  assert.equal((await database.rawClient.execute("SELECT total_minutes FROM daily_sleep WHERE date='2026-10-14'")).rows[0].total_minutes, 430);
  const deletion = { ...batch, batchId: randomUUID(), workouts: [], deletedWorkoutIds: [id], days: [{ date: '2026-10-14', steps: 0, stepsConfirmedDeletion: true }] };
  assert.equal((await native.POST(request(deletion))).status, 200);
  assert.equal((await database.rawClient.execute('SELECT count(*) AS n FROM workouts')).rows[0].n, 0);
  assert.equal((await database.rawClient.execute("SELECT workout_count FROM daily_strain WHERE date='2026-10-14'")).rows[0].workout_count, 0);
  assert.equal((await native.POST(request({ ...deletion, batchId: randomUUID(), days: [{ date: '2026-10-14', steps: 0 }] }))).status, 422);
  assert.equal((await native.GET(request(undefined, null))).status, 401);
});
