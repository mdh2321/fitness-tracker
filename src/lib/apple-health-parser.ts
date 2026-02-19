import { APPLE_HEALTH_TYPE_MAP } from './constants';
import type { AppleHealthWorkout } from './types';

interface WorkoutNode {
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  durationUnit: string;
  totalEnergyBurned: number | null;
  totalDistance: number | null;
  sourceId: string;
}

export function parseAppleHealthXML(xmlContent: string): AppleHealthWorkout[] {
  const workouts: AppleHealthWorkout[] = [];

  // Use regex-based parsing for reliability (sax can be complex for this use case)
  const workoutRegex = /<Workout\s+([^>]+)(?:\/>|>[\s\S]*?<\/Workout>)/g;
  const attrRegex = /(\w+)="([^"]*)"/g;

  let match;
  while ((match = workoutRegex.exec(xmlContent)) !== null) {
    const attrs: Record<string, string> = {};
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    const activityType = attrs.workoutActivityType;
    if (!activityType) continue;

    const mapping = APPLE_HEALTH_TYPE_MAP[activityType];
    if (!mapping) continue;

    const startDate = attrs.startDate;
    const endDate = attrs.endDate;
    const duration = parseFloat(attrs.duration || '0');
    const calories = attrs.totalEnergyBurned ? parseFloat(attrs.totalEnergyBurned) : null;
    const distance = attrs.totalDistance ? parseFloat(attrs.totalDistance) : null;

    // Generate a unique ID from the workout data
    const sourceId = `apple_health_${startDate}_${activityType}`;

    workouts.push({
      activityType,
      type: mapping.type,
      name: mapping.name,
      startDate,
      endDate,
      duration: Math.round(duration),
      calories: calories ? Math.round(calories) : null,
      avgHeartRate: null,
      maxHeartRate: null,
      distance,
      sourceId,
      selected: true,
    });
  }

  // Sort by date descending
  workouts.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return workouts;
}

export function parseAppleHealthChunked(xmlContent: string, onProgress?: (pct: number) => void): AppleHealthWorkout[] {
  // For large files, process in chunks
  const totalLength = xmlContent.length;
  const chunkSize = 1024 * 1024; // 1MB chunks
  const workouts: AppleHealthWorkout[] = [];
  const workoutRegex = /<Workout\s+([^>]+)(?:\/>|>[\s\S]*?<\/Workout>)/g;
  const attrRegex = /(\w+)="([^"]*)"/g;

  let lastIndex = 0;
  let overlap = '';

  while (lastIndex < totalLength) {
    const chunk = overlap + xmlContent.slice(lastIndex, lastIndex + chunkSize);
    lastIndex += chunkSize;

    let match;
    let lastMatchEnd = 0;
    workoutRegex.lastIndex = 0;

    while ((match = workoutRegex.exec(chunk)) !== null) {
      lastMatchEnd = match.index + match[0].length;
      const attrs: Record<string, string> = {};
      let attrMatch;
      attrRegex.lastIndex = 0;
      while ((attrMatch = attrRegex.exec(match[1])) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      const activityType = attrs.workoutActivityType;
      if (!activityType) continue;

      const mapping = APPLE_HEALTH_TYPE_MAP[activityType];
      if (!mapping) continue;

      const sourceId = `apple_health_${attrs.startDate}_${activityType}`;

      workouts.push({
        activityType,
        type: mapping.type,
        name: mapping.name,
        startDate: attrs.startDate,
        endDate: attrs.endDate,
        duration: Math.round(parseFloat(attrs.duration || '0')),
        calories: attrs.totalEnergyBurned ? Math.round(parseFloat(attrs.totalEnergyBurned)) : null,
        avgHeartRate: null,
        maxHeartRate: null,
        distance: attrs.totalDistance ? parseFloat(attrs.totalDistance) : null,
        sourceId,
        selected: true,
      });
    }

    // Keep overlap for cross-boundary matches
    overlap = chunk.slice(Math.max(0, chunk.length - 1000));

    if (onProgress) {
      onProgress(Math.min(100, Math.round((lastIndex / totalLength) * 100)));
    }
  }

  workouts.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  return workouts;
}
