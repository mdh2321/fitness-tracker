import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  await dbReady;
  let settings = await db.select().from(userSettings).get();
  if (!settings) {
    const result = await db.insert(userSettings).values({}).returning();
    settings = result[0];
  }
  // Fix legacy sleep target stored as hours instead of minutes
  if (settings.daily_sleep_minutes_target < 60) {
    const corrected = Math.round(settings.daily_sleep_minutes_target * 60);
    await db.update(userSettings).set({ daily_sleep_minutes_target: corrected }).where(eq(userSettings.id, settings.id));
    settings = { ...settings, daily_sleep_minutes_target: corrected };
  }
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  await dbReady;

  try {
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
      daily_active_minutes_target,
      daily_sleep_minutes_target,
      daily_nutrition_score_target,
      daily_steps_target,
      daily_strain_target,
      theme,
      dashboard_layout,
      accent_color,
      pinned_badges,
      fitness_goal,
    } = body;

    let settings = await db.select().from(userSettings).get();
    if (!settings) {
      const result = await db.insert(userSettings).values({}).returning();
      settings = result[0];
    }

    await db
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
        daily_active_minutes_target: daily_active_minutes_target ?? settings.daily_active_minutes_target,
        daily_sleep_minutes_target: daily_sleep_minutes_target != null
          ? (daily_sleep_minutes_target < 60 ? Math.round(daily_sleep_minutes_target * 60) : daily_sleep_minutes_target)
          : settings.daily_sleep_minutes_target,
        daily_nutrition_score_target: daily_nutrition_score_target ?? settings.daily_nutrition_score_target,
        daily_steps_target: daily_steps_target ?? settings.daily_steps_target,
        daily_strain_target: daily_strain_target ?? settings.daily_strain_target,
        theme: theme ?? settings.theme,
        dashboard_layout: dashboard_layout !== undefined ? dashboard_layout : settings.dashboard_layout,
        accent_color: accent_color ?? settings.accent_color,
        pinned_badges: pinned_badges !== undefined ? (typeof pinned_badges === 'string' ? pinned_badges : JSON.stringify(pinned_badges)) : settings.pinned_badges,
        fitness_goal: fitness_goal ?? settings.fitness_goal,
      })
      .where(eq(userSettings.id, settings.id));

    const updated = await db.select().from(userSettings).where(eq(userSettings.id, settings.id)).get();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('Settings PUT error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
