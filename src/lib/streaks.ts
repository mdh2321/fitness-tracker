import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns';
import type { StreakInfo } from './types';

export function calculateStreaks(workoutDates: string[]): StreakInfo {
  if (workoutDates.length === 0) {
    return { current: 0, longest: 0, lastWorkoutDate: null };
  }

  // Get unique dates (local time), sorted descending
  const uniqueDates = [...new Set(workoutDates.map((d) => format(parseISO(d), 'yyyy-MM-dd')))].sort().reverse();

  const lastWorkoutDate = uniqueDates[0];
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Current streak: must include today or yesterday
  let current = 0;
  if (lastWorkoutDate === today || lastWorkoutDate === yesterday) {
    current = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = differenceInCalendarDays(parseISO(uniqueDates[i - 1]), parseISO(uniqueDates[i]));
      if (diff === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  let longest = 1;
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = differenceInCalendarDays(parseISO(uniqueDates[i - 1]), parseISO(uniqueDates[i]));
    if (diff === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  return { current, longest: Math.max(longest, current), lastWorkoutDate };
}

/**
 * Exercise streak: days in a row with >= 30 minutes of total exercise.
 * Takes an array of { date, totalMinutes } already aggregated per day.
 */
export interface ExerciseStreakInfo {
  current: number;
  longest: number;
}

export function calculateExerciseStreak(
  dailyMinutes: { date: string; totalMinutes: number }[]
): ExerciseStreakInfo {
  if (dailyMinutes.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Filter to qualifying days (>= 30 min), sorted descending
  const qualifying = dailyMinutes
    .filter((d) => d.totalMinutes >= 30)
    .map((d) => d.date)
    .sort()
    .reverse();

  if (qualifying.length === 0) {
    return { current: 0, longest: 0 };
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Current streak
  let current = 0;
  if (qualifying[0] === today || qualifying[0] === yesterday) {
    current = 1;
    for (let i = 1; i < qualifying.length; i++) {
      const diff = differenceInCalendarDays(parseISO(qualifying[i - 1]), parseISO(qualifying[i]));
      if (diff === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  let longest = 1;
  let streak = 1;
  for (let i = 1; i < qualifying.length; i++) {
    const diff = differenceInCalendarDays(parseISO(qualifying[i - 1]), parseISO(qualifying[i]));
    if (diff === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  return { current, longest: Math.max(longest, current) };
}
