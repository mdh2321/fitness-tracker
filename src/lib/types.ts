import type { WorkoutType, ExerciseCategory, MuscleGroup } from './constants';

export interface Workout {
  id: number;
  type: WorkoutType;
  name: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  perceived_effort: number;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  strain_score: number;
  notes: string | null;
  source: 'manual' | 'apple_health';
  apple_health_id: string | null;
  created_at: string;
}

export interface Exercise {
  id: number;
  workout_id: number;
  name: string;
  category: ExerciseCategory;
  muscle_group: MuscleGroup;
  order_index: number;
}

export interface ExerciseSet {
  id: number;
  exercise_id: number;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  distance_km: number | null;
  duration_seconds: number | null;
  is_warmup: boolean;
  is_pr: boolean;
}

export interface DailyStrain {
  date: string;
  strain_score: number;
  workout_count: number;
  total_duration: number;
  total_volume: number;
  total_calories: number;
  steps: number;
}

export interface Achievement {
  id: number;
  badge_key: string;
  earned_at: string;
  workout_id: number | null;
}

export interface UserSettings {
  id: number;
  weight_kg: number;
  birth_year: number;
  max_heart_rate: number;
  weekly_workout_target: number;
  weekly_cardio_minutes_target: number;
  weekly_strength_sessions_target: number;
  weekly_steps_target: number;
}

export interface WorkoutWithExercises extends Workout {
  exercises: (Exercise & { sets: ExerciseSet[] })[];
}

export interface WeeklyProgress {
  workouts: number;
  cardioMinutes: number;
  strengthSessions: number;
  steps: number;
  targets: {
    workouts: number;
    cardioMinutes: number;
    strengthSessions: number;
    steps: number;
  };
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastWorkoutDate: string | null;
}

export interface TrendData {
  date: string;
  value: number;
}

export interface AppleHealthWorkout {
  activityType: string;
  type: WorkoutType;
  name: string;
  startDate: string;
  endDate: string;
  duration: number;
  calories: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  distance: number | null;
  sourceId: string;
  selected: boolean;
}
