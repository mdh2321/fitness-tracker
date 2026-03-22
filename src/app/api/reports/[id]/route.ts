import { NextRequest, NextResponse } from 'next/server';
import { rawClient, dbReady } from '@/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbReady;
  const { id } = await params;
  await rawClient.execute({ sql: 'DELETE FROM weekly_reports WHERE id = ?', args: [parseInt(id)] });
  return NextResponse.json({ success: true });
}
