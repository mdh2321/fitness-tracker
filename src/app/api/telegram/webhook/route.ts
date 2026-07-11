import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { db, dbReady } from '@/db';
import { mealEntries } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { rescoreDay } from '@/lib/nutrition-scoring';
import { logMeal, getDaySummary, todayLocalDate, type MealEntryRow } from '@/lib/meal-logging';

export const maxDuration = 60;

// ── Telegram Bot API types (the slice we use) ────────────────────────────────
interface TgPhotoSize { file_id: string; width: number; height: number; file_size?: number }
interface TgMessage {
  message_id: number;
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
}
interface TgUpdate { update_id: number; message?: TgMessage; edited_message?: TgMessage }

const TG_API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId: number, html: string) {
  try {
    await fetch(`${TG_API()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.error('telegram sendMessage failed:', e);
  }
}

async function downloadPhoto(sizes: TgPhotoSize[]): Promise<{ data: string; media_type: 'image/jpeg' } | null> {
  // Telegram sends multiple resolutions; the largest ≤1600px is plenty for the model
  const sorted = [...sizes].sort((a, b) => a.width - b.width);
  const pick = sorted.filter(s => s.width <= 1600).pop() ?? sorted[0];
  if (!pick) return null;

  const fileRes = await fetch(`${TG_API()}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: pick.file_id }),
  });
  const fileJson = await fileRes.json();
  const filePath = fileJson?.result?.file_path;
  if (!filePath) return null;

  const imgRes = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`);
  if (!imgRes.ok) return null;
  const buf = Buffer.from(await imgRes.arrayBuffer());
  return { data: buf.toString('base64'), media_type: 'image/jpeg' };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

async function dayLine(date: string): Promise<string> {
  const day = await getDaySummary(date);
  const overUnder = day.totals.calories > day.targets.calories ? ' ⚠️ over' : '';
  return `Today: <b>${fmt(day.totals.calories)}</b> / ${fmt(day.targets.calories)} kcal${overUnder} · <b>${day.totals.protein_g}</b> / ${day.targets.protein_g}g protein · ${day.meals.length} meal${day.meals.length === 1 ? '' : 's'}`;
}

function mealReply(meal: MealEntryRow): string {
  const macros = `~<b>${fmt(meal.calories ?? 0)}</b> kcal · ${Math.round(meal.protein_g ?? 0)}g P · ${Math.round(meal.carbs_g ?? 0)}g C · ${Math.round(meal.fat_g ?? 0)}g F`;
  const gradeChip = meal.grade ? ` — grade ${meal.grade}` : '';
  const assumptions = meal.assumptions ? `\n<i>${esc(meal.assumptions)}</i>` : '';
  return `${meal.emoji ?? '🍽'} <b>${esc(meal.description)}</b>${gradeChip}\n${macros}${assumptions}`;
}

const HELP = [
  '<b>Arc nutrition bot</b>',
  'Send a meal description ("chicken wrap and a flat white") or a photo of your plate and I\'ll log it with estimated calories and macros.',
  '',
  '/today — day so far vs targets',
  '/undo — remove the last meal logged today',
  '/help — this message',
].join('\n');

export async function POST(request: NextRequest) {
  await dbReady;

  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });
  }

  const update = (await request.json()) as TgUpdate;
  const message = update.message ?? update.edited_message;
  // Always 200 for non-message updates so Telegram doesn't retry
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const allowed = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (!allowed.includes(String(chatId))) {
    await sendMessage(chatId, `This bot is private. Your chat id is <code>${chatId}</code> — add it to TELEGRAM_ALLOWED_CHAT_IDS to enable it.`);
    return NextResponse.json({ ok: true });
  }

  const date = todayLocalDate();
  const text = (message.text ?? message.caption ?? '').trim();

  try {
    if (text === '/start' || text === '/help') {
      await sendMessage(chatId, HELP);
      return NextResponse.json({ ok: true });
    }

    if (text === '/today') {
      const day = await getDaySummary(date);
      if (day.meals.length === 0) {
        await sendMessage(chatId, 'Nothing logged today yet. Send a meal description or photo.');
        return NextResponse.json({ ok: true });
      }
      const lines = day.meals.map(m => `${m.emoji ?? '•'} ${esc(m.description)} — ${fmt(m.calories ?? 0)} kcal, ${Math.round(m.protein_g ?? 0)}g P`);
      const summary = day.summary ? `\n\n<i>${esc(day.summary)}</i>` : '';
      await sendMessage(chatId, `${lines.join('\n')}\n\n${await dayLine(date)}${summary}`);
      return NextResponse.json({ ok: true });
    }

    if (text === '/undo') {
      const last = await db
        .select()
        .from(mealEntries)
        .where(eq(mealEntries.date, date))
        .orderBy(desc(mealEntries.id))
        .get();
      if (!last) {
        await sendMessage(chatId, 'Nothing to undo today.');
        return NextResponse.json({ ok: true });
      }
      await db.delete(mealEntries).where(eq(mealEntries.id, last.id));
      after(async () => { await rescoreDay(date).catch(e => console.error('rescore failed:', e)); });
      await sendMessage(chatId, `Removed <b>${esc(last.description)}</b>.\n${await dayLine(date)}`);
      return NextResponse.json({ ok: true });
    }

    // Meal logging — photo (optionally captioned) or plain text
    let image: { data: string; media_type: 'image/jpeg' } | null = null;
    if (message.photo && message.photo.length > 0) {
      image = await downloadPhoto(message.photo);
      if (!image) {
        await sendMessage(chatId, 'Couldn\'t download that photo — try again or describe the meal in text.');
        return NextResponse.json({ ok: true });
      }
    }

    if (!image && !text) return NextResponse.json({ ok: true });

    const meal = await logMeal({
      date,
      text: text || undefined,
      image: image ?? undefined,
      source: 'telegram',
    });

    after(async () => { await rescoreDay(date).catch(e => console.error('rescore failed:', e)); });

    await sendMessage(chatId, `${mealReply(meal)}\n\n${await dayLine(date)}\n\n/undo to remove`);
  } catch (e) {
    console.error('telegram webhook failed:', e);
    await sendMessage(chatId, 'Something went wrong logging that — try again in a moment.');
  }

  return NextResponse.json({ ok: true });
}
