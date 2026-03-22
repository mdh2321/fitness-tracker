'use client';

import { getWorkoutColor, getStrainColor, getStrainLabel, getSleepColor, getSleepLabel } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import type { Workout, DailySleep } from '@/lib/types';

interface DayDetailProps {
  date: string;
  workouts: Workout[];
  strain: number;
  nutritionScore: number | null;
  sleepMinutes?: number | null;
  sleepDetail?: DailySleep | null;
}

export function DayDetail({ date, workouts, strain, nutritionScore, sleepMinutes, sleepDetail }: DayDetailProps) {
  const formattedDate = format(parseISO(date), 'EEEE, MMMM d');
  const hasData = workouts.length > 0 || strain > 0 || (sleepMinutes != null && sleepMinutes > 0);
  const totalCalories = workouts.reduce((s, w) => s + (w.calories ?? 0), 0);
  const totalDuration = workouts.reduce((s, w) => s + w.duration_minutes, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>{formattedDate}</h3>

      {/* Strain */}
      {strain > 0 && (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: getStrainColor(strain) }}
          >
            {strain.toFixed(1)}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Daily Strain</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{getStrainLabel(strain)}</p>
          </div>
        </div>
      )}

      {/* Nutrition */}
      {nutritionScore !== null && (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{
              background: nutritionScore >= 14 ? '#00d26a' : nutritionScore >= 7 ? '#ff6b35' : '#ff3b5c',
            }}
          >
            {Math.round(nutritionScore)}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Nutrition Score</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>out of 21</p>
          </div>
        </div>
      )}

      {/* Sleep with stage breakdown */}
      {sleepMinutes != null && sleepMinutes > 0 && (
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: getSleepColor(sleepMinutes) }}
            >
              {Math.round(sleepMinutes / 60 * 10) / 10}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Sleep</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                {Math.floor(sleepMinutes / 60)}h {sleepMinutes % 60}m · {getSleepLabel(sleepMinutes)}
              </p>
            </div>
          </div>

          {/* Sleep stage breakdown bar */}
          {sleepDetail && (sleepDetail.deep_minutes || sleepDetail.rem_minutes || sleepDetail.light_minutes) && (
            <div className="mt-2 ml-[52px]">
              <div className="flex rounded-full overflow-hidden h-2 w-full" style={{ background: 'var(--bg-elevated)' }}>
                {sleepDetail.deep_minutes != null && sleepDetail.deep_minutes > 0 && (
                  <div
                    style={{ width: `${(sleepDetail.deep_minutes / sleepMinutes) * 100}%`, background: '#8b5cf6' }}
                    title={`Deep: ${sleepDetail.deep_minutes}m`}
                  />
                )}
                {sleepDetail.rem_minutes != null && sleepDetail.rem_minutes > 0 && (
                  <div
                    style={{ width: `${(sleepDetail.rem_minutes / sleepMinutes) * 100}%`, background: '#00bcd4' }}
                    title={`REM: ${sleepDetail.rem_minutes}m`}
                  />
                )}
                {sleepDetail.light_minutes != null && sleepDetail.light_minutes > 0 && (
                  <div
                    style={{ width: `${(sleepDetail.light_minutes / sleepMinutes) * 100}%`, background: '#f59e0b' }}
                    title={`Light: ${sleepDetail.light_minutes}m`}
                  />
                )}
                {sleepDetail.awake_minutes != null && sleepDetail.awake_minutes > 0 && (
                  <div
                    style={{ width: `${(sleepDetail.awake_minutes / sleepMinutes) * 100}%`, background: '#ff3b5c' }}
                    title={`Awake: ${sleepDetail.awake_minutes}m`}
                  />
                )}
              </div>
              <div className="flex gap-3 mt-1.5 flex-wrap">
                {sleepDetail.deep_minutes != null && sleepDetail.deep_minutes > 0 && (
                  <span className="text-[9px] flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#8b5cf6' }} />
                    Deep {sleepDetail.deep_minutes}m
                  </span>
                )}
                {sleepDetail.rem_minutes != null && sleepDetail.rem_minutes > 0 && (
                  <span className="text-[9px] flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#00bcd4' }} />
                    REM {sleepDetail.rem_minutes}m
                  </span>
                )}
                {sleepDetail.light_minutes != null && sleepDetail.light_minutes > 0 && (
                  <span className="text-[9px] flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#f59e0b' }} />
                    Light {sleepDetail.light_minutes}m
                  </span>
                )}
                {sleepDetail.awake_minutes != null && sleepDetail.awake_minutes > 0 && (
                  <span className="text-[9px] flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#ff3b5c' }} />
                    Awake {sleepDetail.awake_minutes}m
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workouts */}
      {workouts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--fg-muted)' }}>
            Workouts ({workouts.length})
            {totalDuration > 0 && (
              <span className="font-normal ml-1">
                · {totalDuration}m{totalCalories > 0 ? ` · ${totalCalories} cal` : ''}
              </span>
            )}
          </h4>
          <div className="space-y-1.5">
            {workouts.map((w) => (
              <div key={w.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: getWorkoutColor(w.name, w.type) }}
                />
                <span className="text-sm font-medium flex-1" style={{ color: 'var(--fg)' }}>{w.name}</span>
                <span className="text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                  {w.duration_minutes}m
                  {w.calories ? ` · ${w.calories}cal` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasData && (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--fg-muted)' }}>No activity recorded</p>
      )}
    </div>
  );
}
