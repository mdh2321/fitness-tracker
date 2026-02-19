import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const userSettings = sqliteTable('user_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  weight_kg: real('weight_kg').notNull().default(70),
  birth_year: integer('birth_year').notNull().default(1990),
  max_heart_rate: integer('max_heart_rate').notNull().default(190),
  weekly_workout_target: integer('weekly_workout_target').notNull().default(4),
  weekly_cardio_minutes_target: integer('weekly_cardio_minutes_target').notNull().default(150),
  weekly_strength_sessions_target: integer('weekly_strength_sessions_target').notNull().default(3),
  weekly_steps_target: integer('weekly_steps_target').notNull().default(70000),
});

export const workouts = sqliteTable('workouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // strength, cardio, mixed, flexibility, sport
  name: text('name').notNull(),
  started_at: text('started_at').notNull(),
  ended_at: text('ended_at'),
  duration_minutes: integer('duration_minutes').notNull(),
  perceived_effort: integer('perceived_effort').notNull(), // 1-10 RPE
  avg_heart_rate: integer('avg_heart_rate'),
  max_heart_rate: integer('max_heart_rate'),
  calories: integer('calories'),
  strain_score: real('strain_score').notNull().default(0),
  notes: text('notes'),
  source: text('source').notNull().default('manual'), // manual, apple_health
  apple_health_id: text('apple_health_id'),
  created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workout_id: integer('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(), // compound, isolation, cardio, flexibility, plyometric
  muscle_group: text('muscle_group').notNull(), // chest, back, shoulders, etc.
  order_index: integer('order_index').notNull().default(0),
});

export const exerciseSets = sqliteTable('exercise_sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exercise_id: integer('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  set_number: integer('set_number').notNull(),
  reps: integer('reps'),
  weight_kg: real('weight_kg'),
  distance_km: real('distance_km'),
  duration_seconds: integer('duration_seconds'),
  is_warmup: integer('is_warmup', { mode: 'boolean' }).notNull().default(false),
  is_pr: integer('is_pr', { mode: 'boolean' }).notNull().default(false),
});

export const dailyStrain = sqliteTable('daily_strain', {
  date: text('date').primaryKey(),
  strain_score: real('strain_score').notNull().default(0),
  workout_count: integer('workout_count').notNull().default(0),
  total_duration: integer('total_duration').notNull().default(0),
  total_volume: real('total_volume').notNull().default(0),
  total_calories: integer('total_calories').notNull().default(0),
  steps: integer('steps').notNull().default(0),
});

export const achievements = sqliteTable('achievements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  badge_key: text('badge_key').notNull().unique(),
  earned_at: text('earned_at').notNull().$defaultFn(() => new Date().toISOString()),
  workout_id: integer('workout_id').references(() => workouts.id),
}, (table) => [
  uniqueIndex('badge_key_idx').on(table.badge_key),
]);
