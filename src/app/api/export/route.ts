import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  userSettings,
  workouts,
  exercises,
  exerciseSets,
  dailyStrain,
  mealEntries,
  dailyNutrition,
  achievements,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { zipSync, strToU8 } from 'fflate';

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'json';

  // Fetch all data
  const [
    settingsRows,
    workoutRows,
    exerciseRows,
    setRows,
    strainRows,
    mealRows,
    nutritionRows,
    achievementRows,
  ] = await Promise.all([
    db.select().from(userSettings),
    db.select().from(workouts),
    db.select().from(exercises),
    db.select().from(exerciseSets),
    db.select().from(dailyStrain),
    db.select().from(mealEntries),
    db.select().from(dailyNutrition),
    db.select().from(achievements),
  ]);

  // Nest exercises + sets into workouts for JSON
  const workoutsWithExercises = workoutRows.map((w) => {
    const wExercises = exerciseRows
      .filter((e) => e.workout_id === w.id)
      .map((e) => ({
        ...e,
        sets: setRows.filter((s) => s.exercise_id === e.id),
      }));
    return { ...w, exercises: wExercises };
  });

  if (format === 'csv') {
    return exportCSV({
      settings: settingsRows,
      workouts: workoutRows,
      exercises: exerciseRows,
      exercise_sets: setRows,
      daily_strain: strainRows,
      meal_entries: mealRows,
      daily_nutrition: nutritionRows,
      achievements: achievementRows,
    });
  }

  // JSON export
  const exportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    settings: settingsRows[0] || null,
    workouts: workoutsWithExercises,
    daily_strain: strainRows,
    nutrition: {
      meals: mealRows,
      daily: nutritionRows,
    },
    achievements: achievementRows,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="arc-export-${formatDate()}.json"`,
    },
  });
}

function formatDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Escape CSV values containing commas, quotes, or newlines
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    ),
  ];
  return lines.join('\n');
}

function exportCSV(tables: Record<string, Record<string, unknown>[]>): NextResponse {
  const files: Record<string, Uint8Array> = {};

  for (const [name, rows] of Object.entries(tables)) {
    const csv = toCsv(rows);
    files[`${name}.csv`] = strToU8(csv);
  }

  const zipped = zipSync(files);

  return new NextResponse(zipped as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="arc-export-${formatDate()}.zip"`,
    },
  });
}
