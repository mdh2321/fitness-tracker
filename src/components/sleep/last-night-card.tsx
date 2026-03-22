'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Moon } from 'lucide-react';
import { getSleepColor, getSleepLabel, SLEEP_STAGE_COLORS } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import type { DailySleep, SleepSession } from '@/lib/types';

interface LastNightCardProps {
  daily: DailySleep | null;
  session: SleepSession | null;
  isLoading: boolean;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTime(dateStr: string): string {
  // Parse Auto Export format "2026-03-06 01:07:31 +1100" or ISO strings
  const offsetMatch = dateStr.trim().match(/([+-])(\d{2}):?(\d{2})$/);
  if (offsetMatch) {
    const normalized = dateStr.trim().replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const date = new Date(normalized);
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const offsetH = parseInt(offsetMatch[2]);
    const offsetM = parseInt(offsetMatch[3]);
    const totalOffsetMs = sign * (offsetH * 60 + offsetM) * 60000;
    const localMs = date.getTime() + totalOffsetMs;
    const localDate = new Date(localMs);
    const h = localDate.getUTCHours();
    const m = localDate.getUTCMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  return format(parseISO(dateStr), 'h:mm a');
}

export function LastNightCard({ daily, session, isLoading }: LastNightCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Moon className="h-5 w-5" style={{ color: 'var(--fg-muted)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Last Night</span>
          </div>
          <div className="h-24 animate-pulse rounded-lg" style={{ background: 'var(--bg-elevated)' }} />
        </CardContent>
      </Card>
    );
  }

  if (!daily) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Moon className="h-5 w-5" style={{ color: 'var(--fg-muted)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Last Night</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No sleep data recorded</p>
        </CardContent>
      </Card>
    );
  }

  const color = getSleepColor(daily.total_minutes);
  const label = getSleepLabel(daily.total_minutes);
  const stages = [
    { key: 'deep', minutes: daily.deep_minutes, color: SLEEP_STAGE_COLORS.deep, label: 'Deep' },
    { key: 'rem', minutes: daily.rem_minutes, color: SLEEP_STAGE_COLORS.rem, label: 'REM' },
    { key: 'light', minutes: daily.light_minutes, color: SLEEP_STAGE_COLORS.light, label: 'Light' },
    { key: 'awake', minutes: daily.awake_minutes, color: SLEEP_STAGE_COLORS.awake, label: 'Awake' },
  ].filter((s) => s.minutes && s.minutes > 0);

  const totalStageMinutes = stages.reduce((sum, s) => sum + (s.minutes ?? 0), 0);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Moon className="h-5 w-5" style={{ color }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Last Night</span>
          <span
            className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {label}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>
            {formatDuration(daily.total_minutes)}
          </span>
          {daily.efficiency != null && (
            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              {daily.efficiency}% efficiency
            </span>
          )}
        </div>

        {/* Bedtime → Wake time */}
        {session?.bedtime && session?.wake_time && (
          <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: 'var(--fg-secondary)' }}>
            <span>{formatTime(session.bedtime)}</span>
            <span style={{ color: 'var(--fg-muted)' }}>→</span>
            <span>{formatTime(session.wake_time)}</span>
          </div>
        )}

        {/* Sleep stages bar */}
        {stages.length > 0 && totalStageMinutes > 0 && (
          <div className="space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden">
              {stages.map((s) => (
                <div
                  key={s.key}
                  style={{
                    width: `${((s.minutes ?? 0) / totalStageMinutes) * 100}%`,
                    background: s.color,
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {stages.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {s.label} {formatDuration(s.minutes ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
