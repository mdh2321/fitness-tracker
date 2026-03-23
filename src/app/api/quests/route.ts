import { NextRequest, NextResponse } from 'next/server';
import { db, rawClient, dbReady } from '@/db';
import { workouts, dailyStrain, userSettings, dailySleep, dailyNutrition } from '@/db/schema';
import { and, gte, sql, eq } from 'drizzle-orm';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { buildWeekQuests, getLevel, getLevelTitle, getXpForLevel, getXpForNextLevel, PERFECT_WEEK_XP, DAILY_QUESTS, type DailyTargets } from '@/lib/quests';
import { PASSIVE_ACTIVITIES, getNewUnlocksForLevel, SHIELD_UNLOCK_LEVELS, getXpMultiplier } from '@/lib/constants';

/** Ensure a value is a finite number, defaulting to 0 */
function finite(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: NextRequest) {
  try {
  await dbReady;

  const { searchParams } = new URL(request.url);
  const today = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const now = parseISO(today);
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Get user targets
  const settings = await db.select().from(userSettings).get();
  const targets = {
    workouts: settings?.weekly_workout_target ?? 4,
    cardioMinutes: settings?.weekly_cardio_minutes_target ?? 150,
    strengthSessions: settings?.weekly_strength_sessions_target ?? 3,
    steps: settings?.weekly_steps_target ?? 70000,
  };

  // Check if quests exist for this week, create if not
  const existing = await rawClient.execute({
    sql: 'SELECT * FROM weekly_quests WHERE week_start = ? ORDER BY id',
    args: [weekStart],
  });

  if (existing.rows.length === 0) {
    // New week — evaluate previous week's core quest streak
    const prevWeekStart = format(startOfWeek(new Date(new Date(weekStart).getTime() - 7 * 86400000), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const prevWeekQuests = await rawClient.execute({
      sql: "SELECT * FROM weekly_quests WHERE week_start = ? AND quest_key IN ('weekly_workouts','weekly_cardio','weekly_strength','weekly_steps')",
      args: [prevWeekStart],
    });

    const xpState = await rawClient.execute('SELECT * FROM user_xp ORDER BY id DESC LIMIT 1');
    if (xpState.rows.length > 0) {
      const currentStreak = finite(xpState.rows[0].core_streak_weeks);
      const currentShields = finite(xpState.rows[0].streak_shields);
      const allCoreCompleted = prevWeekQuests.rows.length === 4 &&
        prevWeekQuests.rows.every((r) => Number(r.completed) === 1);

      let newStreak = currentStreak;
      let newShields = currentShields;
      if (allCoreCompleted) {
        newStreak = currentStreak + 1;
      } else if (currentShields > 0 && currentStreak > 0) {
        // Use a streak shield to preserve the streak
        newShields = currentShields - 1;
        // Streak stays the same (shield consumed)
      } else {
        newStreak = 0;
      }

      if (newStreak !== currentStreak || newShields !== currentShields) {
        await rawClient.execute({
          sql: 'UPDATE user_xp SET core_streak_weeks = ?, streak_shields = ?, updated_at = ? WHERE id = ?',
          args: [newStreak, newShields, new Date().toISOString(), finite(xpState.rows[0].id)],
        });
      }
    }

    const templates = buildWeekQuests(weekStart, targets);
    for (const t of templates) {
      await rawClient.execute({
        sql: 'INSERT OR IGNORE INTO weekly_quests (week_start, quest_key, title, description, target, xp_reward) VALUES (?, ?, ?, ?, ?, ?)',
        args: [weekStart, t.key, t.title, t.description, finite(t.target), finite(t.xp)],
      });
    }
  }

  // Fetch week data for progress evaluation (use local_date to match stats route)
  const weekWorkouts = await db.select().from(workouts).where(
    and(
      gte(workouts.local_date, weekStart),
      sql`${workouts.local_date} <= ${weekEnd}`
    )
  );
  const activeWorkouts = weekWorkouts.filter((w) => !PASSIVE_ACTIVITIES.has(w.name));

  const strainData = await db.select().from(dailyStrain).where(
    and(gte(dailyStrain.date, weekStart), sql`${dailyStrain.date} <= ${weekEnd}`)
  );

  const sleepData = await db.select().from(dailySleep).where(
    and(gte(dailySleep.date, weekStart), sql`${dailySleep.date} <= ${weekEnd}`)
  );

  const nutritionData = await db.select().from(dailyNutrition).where(
    and(gte(dailyNutrition.date, weekStart), sql`${dailyNutrition.date} <= ${weekEnd}`)
  );

  // Compute progress for each quest
  const workoutDays = new Set(activeWorkouts.map((w) => w.local_date || format(new Date(w.started_at), 'yyyy-MM-dd'))).size;
  const cardioMinutes = activeWorkouts.filter((w) => w.type === 'cardio' || w.type === 'mixed').reduce((s, w) => s + w.duration_minutes, 0);
  const strengthSessions = activeWorkouts.filter((w) => w.type === 'strength').length;
  const totalSteps = strainData.reduce((s, d) => s + d.steps, 0);
  const avgSleepHours = sleepData.length > 0 ? sleepData.reduce((s, d) => s + d.total_minutes, 0) / sleepData.length / 60 : 0;
  const nutritionDaysLogged = nutritionData.filter((d) => d.nutrition_score !== null).length;
  const strainAbove15 = strainData.filter((d) => d.strain_score >= 15).length;
  const longestWorkout = activeWorkouts.length > 0 ? Math.max(...activeWorkouts.map((w) => w.duration_minutes)) : 0;
  const nutritionAbove14 = nutritionData.filter((d) => d.nutrition_score !== null && d.nutrition_score >= 14).length;
  const maxDailySteps = strainData.length > 0 ? Math.max(...strainData.map((d) => d.steps)) : 0;
  const allWorkoutDays = new Set(weekWorkouts.map((w) => w.local_date || format(new Date(w.started_at), 'yyyy-MM-dd'))).size;
  const totalDuration = activeWorkouts.reduce((s, w) => s + w.duration_minutes, 0);
  const totalCalories = activeWorkouts.reduce((s, w) => s + (w.calories ?? 0), 0);
  const strainAbove10 = strainData.filter((d) => d.strain_score >= 10).length;
  const sleepNightsAbove7h = sleepData.filter((d) => d.total_minutes >= 420).length;

  const progressMap: Record<string, number> = {
    weekly_workouts: workoutDays,
    weekly_cardio: cardioMinutes,
    weekly_strength: strengthSessions,
    weekly_steps: totalSteps,
    // Easy
    nutrition_3d: nutritionDaysLogged,
    workout_30m: longestWorkout,
    sleep_3d_7h: sleepNightsAbove7h,
    steps_10k: maxDailySteps,
    active_3d: allWorkoutDays,
    // Medium
    sleep_7h: avgSleepHours,
    nutrition_5d: nutritionDaysLogged,
    workout_60m: longestWorkout,
    steps_15k: maxDailySteps,
    active_5d: allWorkoutDays,
    total_calories_2k: totalCalories,
    strain_10_5d: strainAbove10,
    // Hard
    strain_15_2d: strainAbove15,
    nutrition_14: nutritionAbove14,
    total_duration_300: totalDuration,
    workout_90m: longestWorkout,
  };

  // Refresh quest rows with current progress
  const questRows = await rawClient.execute({
    sql: 'SELECT * FROM weekly_quests WHERE week_start = ? ORDER BY id',
    args: [weekStart],
  });

  const quests = [];
  let allCompleted = true;

  const AVERAGE_QUESTS = new Set(['sleep_7h']);

  for (const row of questRows.rows) {
    const key = row.quest_key as string;
    const target = finite(row.target);
    const rawProgress = finite(progressMap[key]);
    // For average-based quests, don't cap current so the real average is visible
    const current = AVERAGE_QUESTS.has(key) ? rawProgress : Math.min(rawProgress, target);
    const wasCompleted = Number(row.completed) === 1;
    const nowCompleted = target > 0 && rawProgress >= target;

    // Update progress (store capped value in DB)
    const dbCurrent = Math.min(rawProgress, target);
    await rawClient.execute({
      sql: 'UPDATE weekly_quests SET current = ?, completed = ?, completed_at = ? WHERE id = ?',
      args: [
        dbCurrent,
        nowCompleted ? 1 : 0,
        nowCompleted && !wasCompleted ? new Date().toISOString() : (row.completed_at as string | null),
        finite(row.id),
      ],
    });

    // Award XP for newly completed quests
    if (nowCompleted && !wasCompleted) {
      const xpReward = finite(row.xp_reward);
      await awardXp(xpReward, 'quest', `${weekStart}-${key}`, `Completed: ${row.title}`);
    }

    if (!nowCompleted) allCompleted = false;

    quests.push({
      id: row.id,
      quest_key: key,
      title: row.title,
      description: row.description,
      target,
      current,
      xp_reward: row.xp_reward,
      completed: nowCompleted,
      completed_at: row.completed_at,
      type: ['weekly_workouts', 'weekly_cardio', 'weekly_strength', 'weekly_steps'].includes(key) ? 'core' : 'bonus',
    });
  }

  // Perfect week bonus
  if (allCompleted && quests.length > 0) {
    const existingBonus = await rawClient.execute({
      sql: "SELECT id FROM xp_history WHERE source = 'perfect_week' AND source_id = ?",
      args: [weekStart],
    });
    if (existingBonus.rows.length === 0) {
      await awardXp(PERFECT_WEEK_XP, 'perfect_week', weekStart, 'Perfect Week bonus');
    }
  }

  // --- Daily Quests ---
  const dailyTargets: DailyTargets = {
    activeMinutes: settings?.daily_active_minutes_target ?? 30,
    sleepMinutes: settings?.daily_sleep_minutes_target ?? 420,
    nutritionScore: settings?.daily_nutrition_score_target ?? 14,
    steps: settings?.daily_steps_target ?? 10000,
    strain: settings?.daily_strain_target ?? 10,
  };

  // Create daily quests for today if not exists
  const existingDaily = await rawClient.execute({
    sql: 'SELECT * FROM daily_quests WHERE date = ? ORDER BY id',
    args: [today],
  });

  if (existingDaily.rows.length === 0) {
    for (const dq of DAILY_QUESTS) {
      const target = finite(dq.targetFromSettings(dailyTargets));
      await rawClient.execute({
        sql: 'INSERT OR IGNORE INTO daily_quests (date, quest_key, title, description, target, xp_reward) VALUES (?, ?, ?, ?, ?, ?)',
        args: [today, dq.key, dq.title, dq.description, target, finite(dq.xp)],
      });
    }
  } else {
    // Update targets if settings changed since quest creation
    for (const dq of DAILY_QUESTS) {
      const expectedTarget = finite(dq.targetFromSettings(dailyTargets));
      const existingRow = existingDaily.rows.find((r) => r.quest_key === dq.key);
      if (existingRow && finite(existingRow.target) !== expectedTarget) {
        await rawClient.execute({
          sql: 'UPDATE daily_quests SET target = ? WHERE id = ?',
          args: [expectedTarget, finite(existingRow.id)],
        });
      }
    }
  }

  // Evaluate daily quest progress
  const todayStrain = strainData.find((d) => d.date === today);
  const todaySleep = sleepData.find((d) => d.date === today);
  const todayNutrition = nutritionData.find((d) => d.date === today);
  const todayWorkouts = activeWorkouts.filter(
    (w) => (w.local_date || format(new Date(w.started_at), 'yyyy-MM-dd')) === today
  );
  const todayAllWorkouts = weekWorkouts.filter(
    (w) => (w.local_date || format(new Date(w.started_at), 'yyyy-MM-dd')) === today
  );
  const todayActiveMinutes = todayAllWorkouts.reduce((s, w) => s + w.duration_minutes, 0);

  const dailyProgressMap: Record<string, number> = {
    daily_workout: todayWorkouts.length > 0 ? 1 : 0,
    daily_active_minutes: todayActiveMinutes,
    daily_sleep: todaySleep?.total_minutes ?? 0,
    daily_nutrition: todayNutrition?.nutrition_score ?? 0,
    daily_steps: todayStrain?.steps ?? 0,
    daily_strain: todayStrain?.strain_score ?? 0,
  };

  // Re-fetch daily quests (may have been updated above)
  const dailyQuestRows = await rawClient.execute({
    sql: 'SELECT * FROM daily_quests WHERE date = ? ORDER BY id',
    args: [today],
  });

  const dailyQuests = [];
  for (const row of dailyQuestRows.rows) {
    const key = row.quest_key as string;
    const target = finite(row.target);
    const rawDailyProgress = finite(dailyProgressMap[key]);
    const current = Math.min(rawDailyProgress, target);
    const wasCompleted = Number(row.completed) === 1;
    const nowCompleted = target > 0 && current >= target;

    await rawClient.execute({
      sql: 'UPDATE daily_quests SET current = ?, completed = ?, completed_at = ? WHERE id = ?',
      args: [
        current,
        nowCompleted ? 1 : 0,
        nowCompleted && !wasCompleted ? new Date().toISOString() : (row.completed_at as string | null),
        finite(row.id),
      ],
    });

    if (nowCompleted && !wasCompleted) {
      const xpReward = finite(row.xp_reward);
      await awardXp(xpReward, 'daily_quest', `${today}-${key}`, `Daily: ${row.title}`);
    }

    dailyQuests.push({
      id: row.id,
      quest_key: key,
      title: row.title,
      description: row.description,
      target,
      current,
      xp_reward: row.xp_reward,
      completed: nowCompleted,
      completed_at: row.completed_at,
      type: 'daily' as const,
    });
  }

  // Get XP status
  const xpRow = await rawClient.execute('SELECT * FROM user_xp ORDER BY id DESC LIMIT 1');
  const totalXp = xpRow.rows.length > 0 ? finite(xpRow.rows[0].total_xp) : 0;
  const level = getLevel(totalXp);
  const coreStreakWeeks = xpRow.rows.length > 0 ? finite(xpRow.rows[0].core_streak_weeks) : 0;
  const streakShields = xpRow.rows.length > 0 ? finite(xpRow.rows[0].streak_shields) : 0;
  const lastCelebratedLevel = xpRow.rows.length > 0 ? finite(xpRow.rows[0].last_celebrated_level) : 0;
  const multiplier = getXpMultiplier(coreStreakWeeks);

  // Check for uncelebrated level-ups
  let levelUp = null;
  if (level > lastCelebratedLevel && lastCelebratedLevel > 0) {
    const colorUnlocks = getNewUnlocksForLevel(level);
    const shieldEarned = SHIELD_UNLOCK_LEVELS.includes(level);
    levelUp = {
      newLevel: level,
      previousLevel: lastCelebratedLevel,
      newTitle: getLevelTitle(level),
      colorUnlocks: colorUnlocks.map((c) => ({ name: c.name, hex: c.hex })),
      shieldEarned,
    };
    // Mark as celebrated
    if (xpRow.rows.length > 0) {
      await rawClient.execute({
        sql: 'UPDATE user_xp SET last_celebrated_level = ? WHERE id = ?',
        args: [level, finite(xpRow.rows[0].id)],
      });
    }
  }

  return NextResponse.json({
    quests,
    dailyQuests,
    xp: {
      total: totalXp,
      level,
      title: getLevelTitle(level),
      currentLevelXp: getXpForLevel(level),
      nextLevelXp: getXpForNextLevel(level),
      multiplier,
      coreStreakWeeks,
      streakShields,
    },
    weekStart,
    allCompleted,
    levelUp,
  });
  } catch (error: any) {
    console.error('Quests API error:', error.message, error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Track level-ups that happened during this request */
let pendingLevelUp: { newLevel: number; oldLevel: number } | null = null;

async function awardXp(amount: number, source: string, sourceId: string, description: string) {
  amount = finite(amount);
  if (amount <= 0) return;

  // Check for duplicate
  const dup = await rawClient.execute({
    sql: 'SELECT id FROM xp_history WHERE source = ? AND source_id = ?',
    args: [source, sourceId],
  });
  if (dup.rows.length > 0) return;

  // Get current state for multiplier and level-up detection
  const existing = await rawClient.execute('SELECT * FROM user_xp ORDER BY id DESC LIMIT 1');
  const coreStreakWeeks = existing.rows.length > 0 ? finite(existing.rows[0].core_streak_weeks) : 0;
  const multiplier = getXpMultiplier(coreStreakWeeks);
  const finalAmount = Math.round(amount * multiplier);

  await rawClient.execute({
    sql: 'INSERT INTO xp_history (date, source, source_id, amount, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [format(new Date(), 'yyyy-MM-dd'), source, sourceId, finalAmount,
      multiplier > 1 ? `${description} (${multiplier}x)` : description,
      new Date().toISOString()],
  });

  // Upsert user_xp
  if (existing.rows.length === 0) {
    const level = getLevel(finalAmount);
    await rawClient.execute({
      sql: 'INSERT INTO user_xp (total_xp, level, last_celebrated_level, updated_at) VALUES (?, ?, ?, ?)',
      args: [finalAmount, level, level, new Date().toISOString()],
    });
  } else {
    const oldTotal = finite(existing.rows[0].total_xp);
    const newTotal = oldTotal + finalAmount;
    const oldLevel = getLevel(oldTotal);
    const newLevel = getLevel(newTotal);

    // Award streak shields for levels crossed
    let shieldsToAdd = 0;
    for (let l = oldLevel + 1; l <= newLevel; l++) {
      if (SHIELD_UNLOCK_LEVELS.includes(l)) shieldsToAdd++;
    }
    const currentShields = finite(existing.rows[0].streak_shields);
    const newShields = Math.min(currentShields + shieldsToAdd, 3);

    await rawClient.execute({
      sql: 'UPDATE user_xp SET total_xp = ?, level = ?, streak_shields = ?, updated_at = ? WHERE id = ?',
      args: [newTotal, newLevel, newShields, new Date().toISOString(), finite(existing.rows[0].id)],
    });

    if (newLevel > oldLevel) {
      pendingLevelUp = { newLevel, oldLevel };
    }
  }
}
