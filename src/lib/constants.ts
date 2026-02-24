export const PASSIVE_ACTIVITIES = new Set(['Walking']);

export const WORKOUT_TYPES = ['strength', 'cardio', 'mixed', 'flexibility', 'sport'] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'core', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EXERCISE_CATEGORIES = ['compound', 'isolation', 'cardio', 'flexibility', 'plyometric'] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export interface WorkoutNameOption {
  label: string;
  type: WorkoutType;
}

export const WORKOUT_NAME_OPTIONS: WorkoutNameOption[] = [
  { label: 'Walking', type: 'cardio' },
  { label: 'Running', type: 'cardio' },
  { label: 'Cycling', type: 'cardio' },
  { label: 'Swimming', type: 'cardio' },
  { label: 'Hiking', type: 'cardio' },
  { label: 'Rowing', type: 'cardio' },
  { label: 'HIIT', type: 'mixed' },
  { label: 'Boxing', type: 'sport' },
  { label: 'Strength Training', type: 'strength' },
  { label: 'Yoga', type: 'flexibility' },
  { label: 'Pilates', type: 'flexibility' },
  { label: 'Sport', type: 'sport' },
  { label: 'Other', type: 'mixed' },
];

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  mixed: 'Mixed',
  flexibility: 'Flexibility',
  sport: 'Sport',
};

export const WORKOUT_TYPE_COLORS: Record<WorkoutType, string> = {
  strength: '#8b5cf6',
  cardio: '#00d26a',
  mixed: '#00bcd4',
  flexibility: '#ff6b35',
  sport: '#ff3b5c',
};

// Per-activity colors — best colors reserved for most common activities
export const WORKOUT_NAME_COLORS: Record<string, string> = {
  'Strength Training': '#8b5cf6', // purple
  'Running':           '#00d26a', // vibrant green
  'HIIT':              '#ff3b5c', // hot red
  'Walking':           '#00bcd4', // teal
  'Cycling':           '#3b82f6', // blue
  'Swimming':          '#0ea5e9', // sky blue
  'Hiking':            '#22c55e', // earthy green
  'Rowing':            '#14b8a6', // teal-green
  'Boxing':            '#f97316', // orange
  'Yoga':              '#a78bfa', // lavender
  'Pilates':           '#f472b6', // pink
  'Sport':             '#fb923c', // light orange
  'Other':             '#6b7280', // gray
};

export function getWorkoutColor(name: string, type?: WorkoutType): string {
  return WORKOUT_NAME_COLORS[name] ?? (type ? WORKOUT_TYPE_COLORS[type] : '#6b7280');
}

export const STRAIN_COLORS = {
  low: '#ff3b5c',      // 0-5  red (low activity)
  moderate: '#ff6b35',  // 5-10 orange
  high: '#00bcd4',      // 10-15 blue
  extreme: '#00d26a',   // 15-21 green (high activity)
} as const;

// Heatmap: GitHub-style single-hue green, intensity = activity level
export const HEATMAP_SCALE = [
  { min: 0, max: 0, color: '#161b22', label: 'None' },
  { min: 0.1, max: 5, color: '#0e4429', label: 'Low' },
  { min: 5, max: 10, color: '#006d32', label: 'Moderate' },
  { min: 10, max: 15, color: '#26a641', label: 'High' },
  { min: 15, max: 21, color: '#00bcd4', label: 'Very High' },
] as const;

export function getHeatmapColor(strain: number): string {
  if (strain <= 0) return '#161b22';
  if (strain < 5) return '#0e4429';
  if (strain < 10) return '#006d32';
  if (strain < 15) return '#26a641';
  return '#00bcd4';
}

export function getStrainColor(strain: number): string {
  if (strain <= 0) return '#1a1a24';
  if (strain < 5) return STRAIN_COLORS.low;
  if (strain < 10) return STRAIN_COLORS.moderate;
  if (strain < 15) return STRAIN_COLORS.high;
  return STRAIN_COLORS.extreme;
}

export function getStrainLabel(strain: number): string {
  if (strain <= 0) return 'Rest';
  if (strain < 5) return 'Light';
  if (strain < 10) return 'Moderate';
  if (strain < 15) return 'High';
  return 'Very High';
}

export interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'streak' | 'intensity' | 'volume' | 'consistency' | 'variety';
}

export const BADGES: BadgeDefinition[] = [
  // Milestones
  { key: 'first_workout',        name: 'First Step',       description: 'Complete your first workout',               icon: '🏁', category: 'milestone' },
  { key: 'ten_workouts',         name: 'Getting Started',  description: 'Complete 10 workouts',                      icon: '💪', category: 'milestone' },
  { key: 'fifty_workouts',       name: 'Committed',        description: 'Complete 50 workouts',                      icon: '🔥', category: 'milestone' },
  { key: 'hundred_workouts',     name: 'Centurion',        description: 'Complete 100 workouts',                     icon: '💯', category: 'milestone' },
  { key: 'five_hundred_workouts',name: 'Veteran',          description: 'Complete 500 workouts',                     icon: '🎖️', category: 'milestone' },
  { key: 'thousand_workouts',    name: 'Legend',           description: 'Complete 1,000 workouts',                   icon: '🏆', category: 'milestone' },
  { key: 'strength_century',     name: 'Iron Century',     description: 'Complete 100 strength sessions',            icon: '🔩', category: 'milestone' },
  { key: 'comeback_kid',         name: 'Comeback Kid',     description: 'Log a workout after a 14+ day break',       icon: '🔄', category: 'milestone' },
  // Streaks
  { key: 'streak_3',             name: 'Hat Trick',        description: '3-day workout streak',                      icon: '🎯', category: 'streak' },
  { key: 'streak_7',             name: 'Week Warrior',     description: '7-day workout streak',                      icon: '⚡', category: 'streak' },
  { key: 'streak_14',            name: 'Fortnight Force',  description: '14-day workout streak',                     icon: '🌟', category: 'streak' },
  { key: 'streak_30',            name: 'Monthly Machine',  description: '30-day workout streak',                     icon: '👑', category: 'streak' },
  // Intensity
  { key: 'strain_15',            name: 'Pushing Limits',   description: 'Hit a daily strain of 15+',                 icon: '🔴', category: 'intensity' },
  { key: 'strain_19',            name: 'All Out',          description: 'Hit a daily strain of 19+',                 icon: '💀', category: 'intensity' },
  { key: 'double_peak',          name: 'Double Peak',      description: 'Hit 19+ strain on 2 consecutive days',      icon: '🌋', category: 'intensity' },
  { key: 'heat_wave',            name: 'Heat Wave',        description: '14 consecutive days with strain of 10+',    icon: '🌡️', category: 'intensity' },
  // Volume / Cardio
  { key: 'cardio_60',            name: 'Endurance Engine', description: '60+ minutes of cardio in one session',      icon: '🏃', category: 'volume' },
  { key: 'run_90',               name: 'Long Runner',      description: '90+ minutes of running in one session',     icon: '🛤️', category: 'volume' },
  { key: 'run_120',              name: 'Distance Warrior', description: '2 hours of running in one session',         icon: '🗺️', category: 'volume' },
  { key: 'run_180',              name: 'Ultra Runner',     description: '3 hours of running in one session',         icon: '🦅', category: 'volume' },
  { key: 'long_haul',            name: 'Long Haul',        description: 'Complete a single workout lasting 3+ hours',icon: '⌛', category: 'volume' },
  { key: 'step_master',          name: 'Step Master',      description: 'Accumulate 100,000 steps in a single week', icon: '👟', category: 'volume' },
  // Consistency
  { key: 'five_in_week',         name: 'Five-a-Week',      description: 'Work out 5 days in a single week',          icon: '📅', category: 'consistency' },
  { key: 'double_session',       name: 'Double Down',      description: 'Log 2 workouts in a single day',            icon: '✌️', category: 'consistency' },
  { key: 'weekend_warrior',      name: 'Weekend Warrior',  description: 'Work out both Sat & Sun across 4 weekends', icon: '🗓️', category: 'consistency' },
  { key: 'no_rest_month',        name: 'No Days Off',      description: 'A full calendar month with no 2 rest days in a row', icon: '📆', category: 'consistency' },
  { key: 'marathon_month',       name: 'Marathon Month',   description: 'Accumulate 26.2 hours of workouts in one calendar month', icon: '🏅', category: 'consistency' },
  { key: 'perfect_streak',       name: 'Perfect Streak',   description: 'Hit all 4 weekly goals for 4 consecutive weeks', icon: '💫', category: 'consistency' },
  // Variety
  { key: 'early_bird',           name: 'Early Bird',       description: 'Start a workout before 6 AM',               icon: '🌅', category: 'variety' },
  { key: 'night_owl',            name: 'Night Owl',        description: 'Start a workout after 9 PM',                icon: '🦉', category: 'variety' },
];

// Apple Health activity type mapping
export const APPLE_HEALTH_TYPE_MAP: Record<string, { type: WorkoutType; name: string }> = {
  HKWorkoutActivityTypeRunning: { type: 'cardio', name: 'Running' },
  HKWorkoutActivityTypeCycling: { type: 'cardio', name: 'Cycling' },
  HKWorkoutActivityTypeSwimming: { type: 'cardio', name: 'Swimming' },
  HKWorkoutActivityTypeWalking: { type: 'cardio', name: 'Walking' },
  HKWorkoutActivityTypeHiking: { type: 'cardio', name: 'Hiking' },
  HKWorkoutActivityTypeElliptical: { type: 'cardio', name: 'Elliptical' },
  HKWorkoutActivityTypeRowing: { type: 'cardio', name: 'Rowing' },
  HKWorkoutActivityTypeStairClimbing: { type: 'cardio', name: 'Stair Climbing' },
  HKWorkoutActivityTypeTraditionalStrengthTraining: { type: 'strength', name: 'Strength Training' },
  HKWorkoutActivityTypeFunctionalStrengthTraining: { type: 'strength', name: 'Functional Strength' },
  HKWorkoutActivityTypeCrossTraining: { type: 'mixed', name: 'Cross Training' },
  HKWorkoutActivityTypeHighIntensityIntervalTraining: { type: 'mixed', name: 'HIIT' },
  HKWorkoutActivityTypeMixedCardio: { type: 'mixed', name: 'Mixed Cardio' },
  HKWorkoutActivityTypeYoga: { type: 'flexibility', name: 'Yoga' },
  HKWorkoutActivityTypePilates: { type: 'flexibility', name: 'Pilates' },
  HKWorkoutActivityTypeFlexibility: { type: 'flexibility', name: 'Flexibility' },
  HKWorkoutActivityTypeMindAndBody: { type: 'flexibility', name: 'Mind & Body' },
  HKWorkoutActivityTypeSoccer: { type: 'sport', name: 'Soccer' },
  HKWorkoutActivityTypeBasketball: { type: 'sport', name: 'Basketball' },
  HKWorkoutActivityTypeTennis: { type: 'sport', name: 'Tennis' },
  HKWorkoutActivityTypeVolleyball: { type: 'sport', name: 'Volleyball' },
  HKWorkoutActivityTypeBoxing: { type: 'sport', name: 'Boxing' },
  HKWorkoutActivityTypeMartialArts: { type: 'sport', name: 'Martial Arts' },
  HKWorkoutActivityTypeBarre: { type: 'flexibility', name: 'Barre' },
  HKWorkoutActivityTypeDance: { type: 'cardio', name: 'Dance' },
  HKWorkoutActivityTypeCoreTraining: { type: 'strength', name: 'Core Training' },
  HKWorkoutActivityTypeCooldown: { type: 'flexibility', name: 'Cooldown' },
  HKWorkoutActivityTypeJumpRope: { type: 'cardio', name: 'Jump Rope' },
  HKWorkoutActivityTypeKickboxing: { type: 'mixed', name: 'Kickboxing' },
  HKWorkoutActivityTypeStepTraining: { type: 'cardio', name: 'Step Training' },
};
