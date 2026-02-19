import { db } from '@/db';
import { workouts, achievements, exercises, exerciseSets } from '@/db/schema';
import { eq, sql, count, gte, and } from 'drizzle-orm';
import { BADGES } from './constants';
import { calculateStreaks, calculateExerciseStreak } from './streaks';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';

export interface NewBadge {
  key: string;
  name: string;
  description: string;
  icon: string;
}

export async function evaluateAchievements(workoutId: number): Promise<NewBadge[]> {
  const earned: NewBadge[] = [];

  // Get existing achievements
  const existing = await db.select({ badge_key: achievements.badge_key }).from(achievements);
  const earnedKeys = new Set(existing.map((a) => a.badge_key));

  // Get workout details
  const workout = await db.select().from(workouts).where(eq(workouts.id, workoutId)).get();
  if (!workout) return earned;

  // Get all workouts for counting
  const allWorkouts = await db.select({
    id: workouts.id,
    type: workouts.type,
    started_at: workouts.started_at,
    duration_minutes: workouts.duration_minutes,
    strain_score: workouts.strain_score,
  }).from(workouts);

  const totalCount = allWorkouts.length;

  async function award(key: string) {
    if (earnedKeys.has(key)) return;
    const badge = BADGES.find((b) => b.key === key);
    if (!badge) return;
    await db.insert(achievements).values({
      badge_key: key,
      earned_at: new Date().toISOString(),
      workout_id: workoutId,
    });
    earnedKeys.add(key);
    earned.push({ key: badge.key, name: badge.name, description: badge.description, icon: badge.icon });
  }

  // Milestone badges
  if (totalCount >= 1) await award('first_workout');
  if (totalCount >= 10) await award('ten_workouts');
  if (totalCount >= 50) await award('fifty_workouts');
  if (totalCount >= 100) await award('hundred_workouts');

  // Streak badges
  const dates = allWorkouts.map((w) => w.started_at);
  const streaks = calculateStreaks(dates);
  if (streaks.current >= 3) await award('streak_3');
  if (streaks.current >= 7) await award('streak_7');
  if (streaks.current >= 14) await award('streak_14');
  if (streaks.current >= 30) await award('streak_30');

  // Strain badges - check daily strain
  const today = format(parseISO(workout.started_at), 'yyyy-MM-dd');
  const todayWorkouts = allWorkouts.filter(
    (w) => format(parseISO(w.started_at), 'yyyy-MM-dd') === today
  );
  const dailyStrain = todayWorkouts.reduce((sum, w) => sum + w.strain_score, 0);
  if (dailyStrain >= 15) await award('strain_15');
  if (dailyStrain >= 19) await award('strain_19');

  // Volume badges
  const workoutExercises = await db.select().from(exercises).where(eq(exercises.workout_id, workoutId));
  let totalVolume = 0;
  for (const ex of workoutExercises) {
    const sets = await db.select().from(exerciseSets).where(eq(exerciseSets.exercise_id, ex.id));
    for (const s of sets) {
      if (s.reps && s.weight_kg) totalVolume += s.reps * s.weight_kg;
    }
  }
  if (totalVolume >= 10000) await award('volume_10k');
  if (totalVolume >= 50000) await award('volume_50k');

  // Cardio duration
  if (workout.type === 'cardio' && workout.duration_minutes >= 60) await award('cardio_60');

  // Weekly consistency
  const workoutDate = new Date(workout.started_at);
  const weekStart = format(startOfWeek(workoutDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(workoutDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekWorkouts = allWorkouts.filter((w) => {
    const d = format(parseISO(w.started_at), 'yyyy-MM-dd');
    return d >= weekStart && d <= weekEnd;
  });
  const uniqueDaysInWeek = new Set(weekWorkouts.map((w) => format(parseISO(w.started_at), 'yyyy-MM-dd'))).size;
  if (uniqueDaysInWeek >= 5) await award('five_in_week');

  // Variety
  const allTypes = new Set(allWorkouts.map((w) => w.type));
  if (allTypes.size >= 5) await award('all_types');

  // Time of day badges
  const startHour = parseISO(workout.started_at).getHours();
  if (startHour < 6) await award('early_bird');
  if (startHour >= 21) await award('night_owl');

  // PR badge
  const prSets = await db.select().from(exerciseSets).where(eq(exerciseSets.is_pr, true));
  if (prSets.length > 0) await award('pr_set');

  // Exercise streak badges (30+ min/day)
  const dailyMinutesMap: Record<string, number> = {};
  for (const w of allWorkouts) {
    const d = format(parseISO(w.started_at), 'yyyy-MM-dd');
    dailyMinutesMap[d] = (dailyMinutesMap[d] || 0) + w.duration_minutes;
  }
  const dailyMinutes = Object.entries(dailyMinutesMap).map(([date, totalMinutes]) => ({
    date,
    totalMinutes,
  }));
  const exerciseStreak = calculateExerciseStreak(dailyMinutes);
  const exStreakMax = Math.max(exerciseStreak.current, exerciseStreak.longest);
  if (exStreakMax >= 7) await award('exercise_streak_7');
  if (exStreakMax >= 14) await award('exercise_streak_14');
  if (exStreakMax >= 30) await award('exercise_streak_30');
  if (exStreakMax >= 60) await award('exercise_streak_60');
  if (exStreakMax >= 100) await award('exercise_streak_100');

  return earned;
}
