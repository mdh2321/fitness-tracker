import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  let settings = await db.select().from(userSettings).get();
  if (!settings) {
    const result = await db.insert(userSettings).values({}).returning();
    settings = result[0];
  }
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const {
    weight_kg,
    birth_year,
    max_heart_rate,
    resting_hr,
    weekly_workout_target,
    weekly_cardio_minutes_target,
    weekly_strength_sessions_target,
    weekly_steps_target,
    theme,
    dashboard_layout,
  } = body;

  let settings = await db.select().from(userSettings).get();
  if (!settings) {
    const result = await db.insert(userSettings).values({}).returning();
    settings = result[0];
  }

  const updated = await db
    .update(userSettings)
    .set({
      weight_kg: weight_kg ?? settings.weight_kg,
      birth_year: birth_year ?? settings.birth_year,
      max_heart_rate: max_heart_rate ?? settings.max_heart_rate,
      resting_hr: resting_hr ?? settings.resting_hr,
      weekly_workout_target: weekly_workout_target ?? settings.weekly_workout_target,
      weekly_cardio_minutes_target: weekly_cardio_minutes_target ?? settings.weekly_cardio_minutes_target,
      weekly_strength_sessions_target: weekly_strength_sessions_target ?? settings.weekly_strength_sessions_target,
      weekly_steps_target: weekly_steps_target ?? settings.weekly_steps_target,
      theme: theme ?? settings.theme,
      dashboard_layout: dashboard_layout !== undefined ? dashboard_layout : settings.dashboard_layout,
    })
    .where(eq(userSettings.id, settings.id))
    .returning();

  return NextResponse.json(updated[0]);
}
