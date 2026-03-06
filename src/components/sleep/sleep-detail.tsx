'use client';

import { Card, CardContent } from '@/components/ui/card';
import { getSleepColor, getSleepLabel, SLEEP_STAGE_COLORS } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import type { SleepSession, DailySleep } from '@/lib/types';

interface SleepDetailProps {
  date: string;
  sessions: SleepSession[];
  daily: DailySleep | null;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SleepDetail({ date, sessions, daily }: SleepDetailProps) {
  const formattedDate = format(parseISO(date), 'EEEE, MMMM d');

  if (!daily) {
    return (
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--fg)' }}>{formattedDate}</h3>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No sleep data</p>
        </CardContent>
      </Card>
    );
  }

  const color = getSleepColor(daily.total_minutes);
  const label = getSleepLabel(daily.total_minutes);

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{formattedDate}</h3>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: color }}
          >
            {Math.round(daily.total_minutes / 60 * 10) / 10}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{formatDuration(daily.total_minutes)}</p>
            {daily.efficiency != null && (
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{daily.efficiency}% efficiency</p>
            )}
          </div>
        </div>

        {/* Stage breakdown */}
        {(daily.deep_minutes || daily.rem_minutes || daily.light_minutes) && (
          <div className="space-y-1.5">
            {daily.deep_minutes != null && daily.deep_minutes > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: SLEEP_STAGE_COLORS.deep }} />
                  <span style={{ color: 'var(--fg-secondary)' }}>Deep</span>
                </div>
                <span style={{ color: 'var(--fg)' }}>{formatDuration(daily.deep_minutes)}</span>
              </div>
            )}
            {daily.rem_minutes != null && daily.rem_minutes > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: SLEEP_STAGE_COLORS.rem }} />
                  <span style={{ color: 'var(--fg-secondary)' }}>REM</span>
                </div>
                <span style={{ color: 'var(--fg)' }}>{formatDuration(daily.rem_minutes)}</span>
              </div>
            )}
            {daily.light_minutes != null && daily.light_minutes > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: SLEEP_STAGE_COLORS.light }} />
                  <span style={{ color: 'var(--fg-secondary)' }}>Light</span>
                </div>
                <span style={{ color: 'var(--fg)' }}>{formatDuration(daily.light_minutes)}</span>
              </div>
            )}
          </div>
        )}

        {/* Sessions */}
        {sessions.length > 1 && (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {sessions.length} sleep sessions
          </p>
        )}
      </CardContent>
    </Card>
  );
}
