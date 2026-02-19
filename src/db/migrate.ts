import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'fitness.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weight_kg REAL NOT NULL DEFAULT 70,
    birth_year INTEGER NOT NULL DEFAULT 1990,
    max_heart_rate INTEGER NOT NULL DEFAULT 190,
    weekly_workout_target INTEGER NOT NULL DEFAULT 4,
    weekly_cardio_minutes_target INTEGER NOT NULL DEFAULT 150,
    weekly_strength_sessions_target INTEGER NOT NULL DEFAULT 3,
    weekly_steps_target INTEGER NOT NULL DEFAULT 70000
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_minutes INTEGER NOT NULL,
    perceived_effort INTEGER NOT NULL,
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    calories INTEGER,
    strain_score REAL NOT NULL DEFAULT 0,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    apple_health_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS exercise_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    reps INTEGER,
    weight_kg REAL,
    distance_km REAL,
    duration_seconds INTEGER,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    is_pr INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS daily_strain (
    date TEXT PRIMARY KEY,
    strain_score REAL NOT NULL DEFAULT 0,
    workout_count INTEGER NOT NULL DEFAULT 0,
    total_duration INTEGER NOT NULL DEFAULT 0,
    total_volume REAL NOT NULL DEFAULT 0,
    total_calories INTEGER NOT NULL DEFAULT 0,
    steps INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_key TEXT NOT NULL UNIQUE,
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    workout_id INTEGER REFERENCES workouts(id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS badge_key_idx ON achievements(badge_key);

  -- Insert default settings if not exists
  INSERT OR IGNORE INTO user_settings (id) VALUES (1);
`);

// Add columns if they don't exist (for existing databases)
try { sqlite.exec('ALTER TABLE daily_strain ADD COLUMN steps INTEGER NOT NULL DEFAULT 0'); } catch {}
try { sqlite.exec('ALTER TABLE user_settings ADD COLUMN weekly_steps_target INTEGER NOT NULL DEFAULT 70000'); } catch {}

console.log('Database migrated successfully');
sqlite.close();
