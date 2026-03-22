import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns';

export interface SimpleStreak {
  current: number;
  longest: number;
}

function calculateConsecutiveDays(qualifyingDates: string[]): SimpleStreak {
  if (qualifyingDates.length === 0) return { current: 0, longest: 0 };

  const sorted = [...new Set(qualifyingDates)].sort().reverse();
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  let current = 0;
  if (sorted[0] === today || sorted[0] === yesterday) {
    current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = differenceInCalendarDays(parseISO(sorted[i - 1]), parseISO(sorted[i]));
      if (diff === 1) current++;
      else break;
    }
  }

  let longest = 1;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInCalendarDays(parseISO(sorted[i - 1]), parseISO(sorted[i]));
    if (diff === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  return { current, longest: Math.max(longest, current) };
}

/**
 * Sleep streak: consecutive days meeting sleep target.
 * @param threshold - minimum minutes (default 420 = 7 hours)
 */
export function calculateSleepStreak(
  dailySleep: { date: string; total_minutes: number }[],
  threshold: number = 420
): SimpleStreak {
  const qualifying = dailySleep
    .filter((d) => d.total_minutes >= threshold)
    .map((d) => d.date);
  return calculateConsecutiveDays(qualifying);
}

/**
 * Nutrition streak: consecutive days meeting nutrition score target.
 * @param threshold - minimum score (default 14)
 */
export function calculateNutritionStreak(
  dailyNutrition: { date: string; nutrition_score: number | null }[],
  threshold: number = 14
): SimpleStreak {
  const qualifying = dailyNutrition
    .filter((d) => d.nutrition_score !== null && d.nutrition_score >= threshold)
    .map((d) => d.date);
  return calculateConsecutiveDays(qualifying);
}
