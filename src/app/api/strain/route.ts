import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyStrain } from '@/db/schema';
import { gte, lte, and } from 'drizzle-orm';
import { format, subDays, subWeeks } from 'date-fns';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '90'; // days
  const from = searchParams.get('from') || format(subDays(new Date(), parseInt(range)), 'yyyy-MM-dd');
  const to = searchParams.get('to') || format(new Date(), 'yyyy-MM-dd');

  const data = await db
    .select()
    .from(dailyStrain)
    .where(and(gte(dailyStrain.date, from), lte(dailyStrain.date, to)));

  return NextResponse.json(data);
}
