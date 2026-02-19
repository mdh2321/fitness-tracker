import type { WorkoutType } from './constants';

interface StrainInput {
  duration_minutes: number;
  perceived_effort: number; // 1-10 RPE
  type: WorkoutType;
  total_volume?: number; // kg lifted
  avg_heart_rate?: number | null;
  max_heart_rate?: number | null;
  user_max_heart_rate?: number; // from settings
}

const TYPE_MULTIPLIERS: Record<WorkoutType, number> = {
  cardio: 1.1,
  mixed: 1.15,
  strength: 1.0,
  sport: 1.05,
  flexibility: 0.5,
};

export function calculateStrainScore(input: StrainInput): number {
  const {
    duration_minutes,
    perceived_effort,
    type,
    total_volume = 0,
    avg_heart_rate,
    max_heart_rate,
    user_max_heart_rate = 190,
  } = input;

  // Intensity: blend HR data with RPE
  let intensity: number;
  const rpeIntensity = perceived_effort / 10;

  if (avg_heart_rate && max_heart_rate && user_max_heart_rate > 0) {
    const hrIntensity = avg_heart_rate / user_max_heart_rate;
    const peakHrIntensity = max_heart_rate / user_max_heart_rate;
    const hrBlend = hrIntensity * 0.7 + peakHrIntensity * 0.3;
    intensity = hrBlend * 0.7 + rpeIntensity * 0.3;
  } else {
    intensity = rpeIntensity;
  }

  // Duration factor with diminishing returns
  const durationFactor = Math.sqrt(duration_minutes / 60);

  // Volume bonus for strength (minor)
  const volumeBonus = total_volume > 0 ? Math.min(0.15, Math.log10(total_volume / 1000 + 1) * 0.1) : 0;

  // Type multiplier
  const typeMult = TYPE_MULTIPLIERS[type] || 1.0;

  // Raw strain
  const rawStrain = intensity * durationFactor * typeMult + volumeBonus;

  // Map to 0-21 using exponential curve
  const strain = 21 * (1 - Math.exp(-1.1 * rawStrain));

  return Math.round(Math.max(0, Math.min(21, strain)) * 10) / 10;
}

export function aggregateDailyStrain(workoutStrains: number[]): number {
  if (workoutStrains.length === 0) return 0;

  // Sort descending
  const sorted = [...workoutStrains].sort((a, b) => b - a);

  // Highest workout counts full, subsequent at 60%
  let total = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    total += sorted[i] * 0.6;
  }

  return Math.round(Math.min(21, total) * 10) / 10;
}

export function calculateTotalVolume(sets: { reps: number | null; weight_kg: number | null }[]): number {
  return sets.reduce((sum, set) => {
    if (set.reps && set.weight_kg) {
      return sum + set.reps * set.weight_kg;
    }
    return sum;
  }, 0);
}
