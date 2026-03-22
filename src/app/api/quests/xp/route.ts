import { NextResponse } from 'next/server';
import { rawClient, dbReady } from '@/db';
import { getLevel, getLevelTitle, getXpForLevel, getXpForNextLevel } from '@/lib/quests';

export async function GET() {
  await dbReady;
  const xpRow = await rawClient.execute('SELECT * FROM user_xp ORDER BY id DESC LIMIT 1');
  const totalXp = xpRow.rows.length > 0 ? (xpRow.rows[0].total_xp as number) : 0;
  const level = getLevel(totalXp);

  const history = await rawClient.execute('SELECT * FROM xp_history ORDER BY created_at DESC LIMIT 20');

  return NextResponse.json({
    total: totalXp,
    level,
    title: getLevelTitle(level),
    currentLevelXp: getXpForLevel(level),
    nextLevelXp: getXpForNextLevel(level),
    history: history.rows,
  });
}
