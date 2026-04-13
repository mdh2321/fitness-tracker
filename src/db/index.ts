import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const url =
  process.env.TURSO_DATABASE_URL ??
  `file:${path.join(process.cwd(), 'data', 'fitness.db')}`;

const authToken = process.env.TURSO_AUTH_TOKEN;

// Ensure data directory exists for local file-based SQLite
if (url.startsWith('file:')) {
  const dbPath = url.slice(5);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const client = createClient({ url, authToken });

// Ensure tables created outside Drizzle exist — awaited via initPromise
const initPromise = (async () => {
  // Sync log for debugging Health Auto Export payloads
  await client.execute(`CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  endpoint TEXT NOT NULL,
  metric_names TEXT,
  workouts_imported INTEGER NOT NULL DEFAULT 0,
  steps_imported INTEGER NOT NULL DEFAULT 0,
  sleep_imported INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  payload_snippet TEXT,
  ip TEXT
)`);

  await client.execute(`CREATE TABLE IF NOT EXISTS weekly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL UNIQUE,
  week_end TEXT NOT NULL,
  workout_count INTEGER NOT NULL DEFAULT 0,
  total_duration INTEGER NOT NULL DEFAULT 0,
  avg_strain REAL,
  avg_sleep_hours REAL,
  avg_nutrition_score REAL,
  total_steps INTEGER NOT NULL DEFAULT 0,
  ai_summary TEXT,
  ai_highlights TEXT,
  generated_at TEXT NOT NULL
)`);

  await client.execute(`CREATE TABLE IF NOT EXISTS user_xp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
)`);

  await client.execute(`CREATE TABLE IF NOT EXISTS weekly_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,
  quest_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target REAL NOT NULL,
  current REAL NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  UNIQUE(week_start, quest_key)
)`);

  await client.execute(`CREATE TABLE IF NOT EXISTS xp_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
)`);

  await client.execute(`CREATE TABLE IF NOT EXISTS daily_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  quest_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target REAL NOT NULL,
  current REAL NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  UNIQUE(date, quest_key)
)`);

  // Add daily target columns to user_settings (safe if already exist)
  const dailyTargetColumns = [
    { name: 'daily_active_minutes_target', type: 'INTEGER NOT NULL DEFAULT 30' },
    { name: 'daily_sleep_minutes_target', type: 'INTEGER NOT NULL DEFAULT 420' },
    { name: 'daily_nutrition_score_target', type: 'INTEGER NOT NULL DEFAULT 14' },
    { name: 'daily_steps_target', type: 'INTEGER NOT NULL DEFAULT 10000' },
    { name: 'daily_strain_target', type: 'REAL NOT NULL DEFAULT 10' },
  ];
  for (const col of dailyTargetColumns) {
    await client.execute(`ALTER TABLE user_settings ADD COLUMN ${col.name} ${col.type}`).catch(() => {});
  }

  // XP system columns
  const xpColumns = [
    { name: 'core_streak_weeks', type: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'streak_shields', type: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'last_celebrated_level', type: 'INTEGER NOT NULL DEFAULT 0' },
  ];
  for (const col of xpColumns) {
    await client.execute(`ALTER TABLE user_xp ADD COLUMN ${col.name} ${col.type}`).catch(() => {});
  }

  // Theme and dashboard_layout columns on user_settings
  await client.execute(`ALTER TABLE user_settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark'`).catch(() => {});
  await client.execute(`ALTER TABLE user_settings ADD COLUMN dashboard_layout TEXT`).catch(() => {});

  // Accent color columns on user_settings
  const accentColumns = [
    { name: 'accent_color', type: "TEXT NOT NULL DEFAULT '#00d26a'" },
    { name: 'unlocked_colors', type: `TEXT NOT NULL DEFAULT '["#00d26a"]'` },
  ];
  for (const col of accentColumns) {
    await client.execute(`ALTER TABLE user_settings ADD COLUMN ${col.name} ${col.type}`).catch(() => {});
  }

  // Pinned badges column on user_settings
  await client.execute(`ALTER TABLE user_settings ADD COLUMN pinned_badges TEXT NOT NULL DEFAULT '[]'`).catch(() => {});

  // Fitness goal column on user_settings (drives nutrition scoring)
  await client.execute(`ALTER TABLE user_settings ADD COLUMN fitness_goal TEXT NOT NULL DEFAULT 'maintain'`).catch(() => {});

  // Nutrition v2: per-meal enrichment columns
  const mealColumns = [
    { name: 'emoji', type: 'TEXT' },
    { name: 'grade', type: 'TEXT' },
  ];
  for (const col of mealColumns) {
    await client.execute(`ALTER TABLE meal_entries ADD COLUMN ${col.name} ${col.type}`).catch(() => {});
  }

  // Nutrition v3: drop columns the AI no longer produces — portion is inferred
  // from description, day overview is a single summary paragraph.
  const droppedColumns: Array<{ table: string; column: string }> = [
    { table: 'meal_entries', column: 'portion_size' },
    { table: 'daily_nutrition', column: 'strengths' },
    { table: 'daily_nutrition', column: 'gaps' },
    { table: 'daily_nutrition', column: 'macros' },
    { table: 'daily_nutrition', column: 'goal_alignment' },
  ];
  for (const { table, column } of droppedColumns) {
    await client.execute(`ALTER TABLE ${table} DROP COLUMN ${column}`).catch(() => {});
  }
})();

export const db = drizzle(client, { schema });
export const rawClient = client;
/** Await this before using rawClient for quest/report tables */
export const dbReady = initPromise;
export type DB = typeof db;
