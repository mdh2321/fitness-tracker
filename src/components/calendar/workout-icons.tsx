'use client';

import { Dumbbell, Footprints, Bike, Waves, Mountain, Swords, Flame, PersonStanding, CircleDot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const WORKOUT_ICONS: Record<string, LucideIcon> = {
  'Strength Training': Dumbbell,
  'Running': Footprints,
  'Cycling': Bike,
  'Swimming': Waves,
  'Hiking': Mountain,
  'HIIT': Flame,
  'Boxing': Swords,
  'Yoga': PersonStanding,
  'Pilates': PersonStanding,
};

export function getWorkoutIcon(name: string): LucideIcon {
  return WORKOUT_ICONS[name] ?? CircleDot;
}
