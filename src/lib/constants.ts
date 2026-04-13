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
  category: 'milestone' | 'streak' | 'intensity' | 'volume' | 'consistency' | 'variety' | 'sleep' | 'nutrition';
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
  // Sleep
  { key: 'sleep_7_streak_7',     name: 'Sleep Scholar',    description: '7+ hours of sleep for 7 consecutive nights', icon: '😴', category: 'sleep' },
  { key: 'sleep_7h_avg_month',   name: 'Dream Machine',    description: 'Average 7+ hours of sleep for a calendar month', icon: '🌙', category: 'sleep' },
  { key: 'sleep_8h_avg_week',    name: 'Well Rested',      description: 'Average 8+ hours of sleep across a full week', icon: '💤', category: 'sleep' },
  // Nutrition
  { key: 'nutrition_streak_7',   name: 'Clean Eater',      description: 'Score 14+ nutrition for 7 consecutive days', icon: '🥗', category: 'nutrition' },
  { key: 'nutrition_14_avg_month', name: 'Nutrition Master', description: 'Average 14+ nutrition score for a calendar month', icon: '🏅', category: 'nutrition' },
  { key: 'nutrition_perfect',    name: 'Perfect Plate',    description: 'Score a perfect 21/21 nutrition day',        icon: '🍽️', category: 'nutrition' },
];

// Accent colors unlockable by level
export interface AccentColor {
  name: string;
  hex: string;
  level: number;
  gradient?: string; // for special animated gradient
}

export const ACCENT_COLORS: AccentColor[] = [
  { name: 'Arc Green',      hex: '#00d26a', level: 1 },
  { name: 'Ocean Teal',     hex: '#00bcd4', level: 3 },
  { name: 'Electric Blue',  hex: '#3b82f6', level: 5 },
  { name: 'Sunset Orange',  hex: '#ff6b35', level: 6 },
  { name: 'Hot Pink',       hex: '#ec4899', level: 7 },
  { name: 'Royal Purple',   hex: '#8b5cf6', level: 8 },
  { name: 'Crimson',        hex: '#ef4444', level: 9 },
  { name: 'Gold',           hex: '#eab308', level: 10 },
  { name: 'Prismatic',      hex: '#00d26a', level: 10, gradient: 'linear-gradient(135deg, #00d26a, #3b82f6, #8b5cf6, #ec4899, #eab308)' },
];

export function getUnlockedColors(level: number): AccentColor[] {
  return ACCENT_COLORS.filter((c) => c.level <= level);
}

export function getNewUnlocksForLevel(level: number): AccentColor[] {
  return ACCENT_COLORS.filter((c) => c.level === level);
}

// Level definitions with icons and accent colors
export interface LevelDefinition {
  level: number;
  title: string;
  icon: string;
  color: string; // theme color for this level
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  { level: 1,  title: 'Rookie',        icon: '🌱', color: '#00d26a' },
  { level: 2,  title: 'Mover',         icon: '👟', color: '#00d26a' },
  { level: 3,  title: 'Challenger',    icon: '🔥', color: '#00bcd4' },
  { level: 4,  title: 'Contender',     icon: '⚡', color: '#00bcd4' },
  { level: 5,  title: 'Athlete',       icon: '🏔️', color: '#3b82f6' },
  { level: 6,  title: 'Warrior',       icon: '⚔️', color: '#ff6b35' },
  { level: 7,  title: 'Champion',      icon: '🏆', color: '#ec4899' },
  { level: 8,  title: 'Titan',         icon: '🔱', color: '#8b5cf6' },
  { level: 9,  title: 'Legend',        icon: '👑', color: '#ef4444' },
  { level: 10, title: 'Transcendent',  icon: '✦',  color: '#eab308' },
];

export function getLevelDefinition(level: number): LevelDefinition {
  // Find highest matching level definition
  const clamped = Math.min(level, 10);
  return LEVEL_DEFINITIONS.find(d => d.level === clamped) ?? LEVEL_DEFINITIONS[0];
}

// Streak shield unlock levels
export const SHIELD_UNLOCK_LEVELS = [5, 10, 15, 20];

// XP multiplier tiers
export function getXpMultiplier(coreStreakWeeks: number): number {
  if (coreStreakWeeks >= 8) return 1.5;
  if (coreStreakWeeks >= 4) return 1.25;
  if (coreStreakWeeks >= 2) return 1.1;
  return 1.0;
}

// Sleep duration color scale (AutoSleep-style)
export const SLEEP_COLORS = [
  { min: 0, max: 300, color: '#ff3b5c', label: 'Terrible' },   // < 5h
  { min: 300, max: 360, color: '#ff6b35', label: 'Poor' },      // 5-6h
  { min: 360, max: 420, color: '#f59e0b', label: 'Fair' },      // 6-7h
  { min: 420, max: 480, color: '#00d26a', label: 'Good' },      // 7-8h
  { min: 480, max: Infinity, color: '#00bcd4', label: 'Excellent' }, // 8h+
] as const;

export function getSleepColor(minutes: number): string {
  if (minutes <= 0) return '#161b22';
  if (minutes < 300) return '#ff3b5c';
  if (minutes < 360) return '#ff6b35';
  if (minutes < 420) return '#f59e0b';
  if (minutes < 480) return '#00d26a';
  return '#00bcd4';
}

export function getSleepLabel(minutes: number): string {
  if (minutes <= 0) return 'No data';
  if (minutes < 300) return 'Terrible';
  if (minutes < 360) return 'Poor';
  if (minutes < 420) return 'Fair';
  if (minutes < 480) return 'Good';
  return 'Excellent';
}

// Sleep stage colors
export const SLEEP_STAGE_COLORS = {
  deep: '#8b5cf6',
  rem: '#00bcd4',
  light: '#f59e0b',
  awake: '#ff3b5c',
} as const;

// ─── Nutrition v2: A–F grading ───────────────────────────────────────────────

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const GRADE_COLORS: Record<Grade, string> = {
  A: '#00d26a', // green — Arc primary
  B: '#00bcd4', // teal
  C: '#f5c518', // yellow
  D: '#f59e0b', // amber
  E: '#ff6b35', // orange
  F: '#ff3b5c', // red
};

export const GRADE_LABELS: Record<Grade, string> = {
  A: 'Excellent',
  B: 'Solid',
  C: 'Average',
  D: 'Poor',
  E: 'Weak',
  F: 'Off track',
};

// Score thresholds on the 0-21 scale. Average lands in C, not at the bottom.
// Full 6-band spectrum is reachable — a genuinely good whole-food day earns an A,
// a junk-dominated day an F.
export function getGradeFromScore(score: number | null | undefined): Grade | null {
  if (score == null) return null;
  if (score >= 17) return 'A';
  if (score >= 13) return 'B';
  if (score >= 10) return 'C';
  if (score >= 7)  return 'D';
  if (score >= 4)  return 'E';
  return 'F';
}

export function getGradeColor(grade: Grade | null | undefined): string {
  if (!grade) return 'var(--bg-hover)';
  return GRADE_COLORS[grade];
}

export function getGradeLabel(grade: Grade | null | undefined): string {
  if (!grade) return 'No grade';
  return GRADE_LABELS[grade];
}

// Grade-aware micro-copy for the score card — plays back to the user based on the day
export function getGradeMicroCopy(grade: Grade | null | undefined, mealCount: number): string {
  if (!grade) {
    if (mealCount === 0) return 'Log your first meal to get started.';
    return 'Analysing your day…';
  }
  switch (grade) {
    case 'A': return "You're cooking today.";
    case 'B': return 'Solid day — keep it rolling.';
    case 'C': return "Dinner's your chance to lift this.";
    case 'D': return 'Reset at the next meal.';
    case 'E': return 'Rough day — tomorrow is yours.';
    case 'F': return 'Tomorrow is a fresh ring.';
  }
}

// ─── Fitness goals ───────────────────────────────────────────────────────────

export type FitnessGoal = 'lose_fat' | 'gain_muscle' | 'maintain' | 'endurance' | 'recomp';

export const FITNESS_GOALS: FitnessGoal[] = ['lose_fat', 'gain_muscle', 'maintain', 'endurance', 'recomp'];

export const FITNESS_GOAL_LABELS: Record<FitnessGoal, string> = {
  lose_fat:    'Lose fat',
  gain_muscle: 'Gain muscle',
  maintain:    'Maintain',
  endurance:   'Endurance',
  recomp:      'Recomp',
};

export const FITNESS_GOAL_DESCRIPTIONS: Record<FitnessGoal, string> = {
  lose_fat:    'Calorie-aware, protein-first, veg-heavy',
  gain_muscle: 'Protein-heavy, calorie surplus friendly',
  maintain:    'Balanced — whole foods, variety',
  endurance:   'Carb-fuelled, timing matters',
  recomp:      'High protein, calories roughly balanced',
};

// Prompt-ready guidance strings per goal — used by the nutrition AI prompt
export const FITNESS_GOAL_PROMPT_GUIDANCE: Record<FitnessGoal, string> = {
  lose_fat:
    "Goal: fat loss. Reward high protein (esp. lean), fibre, volume-rich low-density foods (vegetables, fruit, legumes). Penalise calorie-dense / high-sugar / high-fat foods more than you would for maintenance. A modest calorie deficit is good; a large surplus is bad. Don't invent calorie counts — use your general food knowledge.",
  gain_muscle:
    "Goal: muscle gain. Reward high protein *heavily* (aim ~1.6-2.2g/kg bodyweight/day). A calorie surplus is GOOD, not a penalty — don't ding for size or density. Reward post-workout carbs on training days. Only penalise ultra-processed / nutrient-void choices.",
  maintain:
    "Goal: maintenance. Reward balance, whole foods, variety, adequate protein, plenty of vegetables. Neither surplus nor deficit is a penalty — quality is what counts.",
  endurance:
    "Goal: endurance performance. Reward carbohydrates (rice, potatoes, pasta, oats, fruit), adequate protein, good peri-workout fuelling. Low-carb days are a penalty if training was hard. Hydration-adjacent foods (fruit, electrolyte-rich veg) are a plus — but don't comment on drinks.",
  recomp:
    "Goal: body recomposition. Reward high protein (~1.8-2.2g/kg), a small calorie balance (slight deficit or surplus both OK), vegetables, whole foods. Large surpluses or large deficits are both penalties.",
};

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
