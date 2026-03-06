import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sleepSessions, dailySleep } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  // Get the session to find its date before deleting
  const session = await db.select().from(sleepSessions).where(eq(sleepSessions.id, numId)).get();
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.delete(sleepSessions).where(eq(sleepSessions.id, numId));

  // Recalculate daily_sleep for this date
  const remaining = await db.select().from(sleepSessions).where(eq(sleepSessions.date, session.date));

  if (remaining.length === 0) {
    await db.delete(dailySleep).where(eq(dailySleep.date, session.date));
  } else {
    const totalMins = remaining.reduce((s, r) => s + r.duration_minutes, 0);
    const totalInBed = remaining.reduce((s, r) => s + (r.time_in_bed_minutes ?? 0), 0);
    const efficiency = totalInBed > 0 ? Math.round((totalMins / totalInBed) * 1000) / 10 : null;

    await db.update(dailySleep).set({
      total_minutes: totalMins,
      time_in_bed_minutes: totalInBed || null,
      deep_minutes: remaining.reduce((s, r) => s + (r.deep_minutes ?? 0), 0) || null,
      rem_minutes: remaining.reduce((s, r) => s + (r.rem_minutes ?? 0), 0) || null,
      light_minutes: remaining.reduce((s, r) => s + (r.light_minutes ?? 0), 0) || null,
      awake_minutes: remaining.reduce((s, r) => s + (r.awake_minutes ?? 0), 0) || null,
      efficiency,
      sessions: remaining.length,
    }).where(eq(dailySleep.date, session.date));
  }

  return NextResponse.json({ success: true });
}
