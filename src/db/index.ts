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
})();

export const db = drizzle(client, { schema });
export const rawClient = client;
/** Await this before using rawClient for quest/report tables */
export const dbReady = initPromise;
export type DB = typeof db;
