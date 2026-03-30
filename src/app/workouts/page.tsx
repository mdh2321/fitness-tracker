'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useWorkouts } from '@/hooks/use-workouts';
import { WorkoutCard } from '@/components/workout/workout-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Dumbbell,
  List,
  CalendarDays,
  Table2,
  Clock,
  Flame,
  Heart,
  Route,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isFuture,
} from 'date-fns';
import { getWorkoutColor, getStrainColor } from '@/lib/constants';
import { MonthGrid } from '@/components/calendar/month-grid';
import { DayDetail } from '@/components/calendar/day-detail';
import type { Workout, DailyStrain, DailySleep } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';

const PAGE_SIZE = 50;
type ViewMode = 'list' | 'calendar' | 'table';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WorkoutsPage() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data: workouts, isLoading } = useWorkouts(limit);
  const [hiddenNames, setHiddenNames] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>('list');

  // Calendar state
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const canLoadMore = workouts && workouts.length === limit;

  // Calendar date range
  const { from, to } = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return {
      from: format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    };
  }, [month]);

  const allDates = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(from);
    const end = new Date(to);
    let d = start;
    while (d <= end) {
      dates.push(format(d, 'yyyy-MM-dd'));
      d = new Date(d.getTime() + 86400000);
    }
    return dates;
  }, [from, to]);

  // Calendar data fetching (only when calendar view is active)
  const { data: calWorkouts } = useSWR<Workout[]>(
    view === 'calendar' ? `/api/workouts?from=${from}T00:00:00&to=${to}T23:59:59&limit=500` : null,
    fetcher
  );
  const { data: strainData } = useSWR<DailyStrain[]>(
    view === 'calendar' ? `/api/strain?from=${from}&to=${to}` : null,
    fetcher
  );
  const { data: nutritionData } = useSWR<{ scores: Record<string, number | null> }>(
    view === 'calendar' ? `/api/nutrition/history?dates=${allDates.join(',')}` : null,
    fetcher
  );
  const { data: sleepHistoryData } = useSWR<DailySleep[]>(
    view === 'calendar' ? `/api/sleep/history?from=${from}&to=${to}` : null,
    fetcher
  );
  const { data: selectedDaySleep } = useSWR<{ daily: DailySleep | null }>(
    selectedDate ? `/api/sleep?date=${selectedDate}` : null,
    fetcher
  );

  const sleepData = useMemo(() => {
    const map: Record<string, number | null> = {};
    if (sleepHistoryData) {
      for (const s of sleepHistoryData) {
        map[s.date] = s.total_minutes;
      }
    }
    return map;
  }, [sleepHistoryData]);

  const nutritionScores = nutritionData?.scores ?? {};

  const calFilteredWorkouts = useMemo(() => {
    if (!calWorkouts) return [];
    return calWorkouts.filter((w) => w.name !== 'Walking');
  }, [calWorkouts]);

  const selectedWorkouts = useMemo(() => {
    if (!selectedDate) return [];
    return calFilteredWorkouts.filter((w) => {
      const d = w.local_date || format(new Date(w.started_at), 'yyyy-MM-dd');
      return d === selectedDate;
    });
  }, [calFilteredWorkouts, selectedDate]);

  const selectedStrain = useMemo(() => {
    if (!strainData || !selectedDate) return 0;
    return strainData.find((d) => d.date === selectedDate)?.strain_score ?? 0;
  }, [strainData, selectedDate]);

  const canGoForward = !isFuture(addMonths(month, 1));
  const closeModal = useCallback(() => setSelectedDate(null), []);

  useEffect(() => {
    if (!selectedDate) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedDate, closeModal]);

  // Unique workout names for filter toggles
  const workoutNames = useMemo(() => {
    if (!workouts) return [];
    const counts = new Map<string, { type: WorkoutType; count: number }>();
    for (const w of workouts) {
      const existing = counts.get(w.name);
      if (existing) {
        existing.count++;
      } else {
        counts.set(w.name, { type: w.type as WorkoutType, count: 1 });
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, { type, count }]) => ({ name, type, count }));
  }, [workouts]);

  const toggleName = (name: string) => {
    setHiddenNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!workouts) return [];
    return workouts.filter((w: Workout) => !hiddenNames.has(w.name));
  }, [workouts, hiddenNames]);

  const viewButtons: { mode: ViewMode; icon: typeof List; label: string }[] = [
    { mode: 'list', icon: List, label: 'List' },
    { mode: 'calendar', icon: CalendarDays, label: 'Calendar' },
    { mode: 'table', icon: Table2, label: 'Table' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Workouts</h1>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div
            className="flex rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--border)' }}
          >
            {viewButtons.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                style={
                  view === mode
                    ? { background: 'var(--bg-elevated)', color: 'var(--fg)' }
                    : { background: 'var(--bg-card)', color: 'var(--fg-muted)' }
                }
                title={label}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <Link href="/workouts/new">
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New Workout
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter toggles (list + table views) */}
      {view !== 'calendar' && workoutNames.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {workoutNames.map(({ name, type }) => {
            const active = !hiddenNames.has(name);
            const color = getWorkoutColor(name, type);
            return (
              <button
                key={name}
                onClick={() => toggleName(name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={active
                  ? { background: `${color}15`, borderColor: `${color}40`, color }
                  : { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)', opacity: 0.6 }
                }
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: active ? color : 'var(--fg-muted)' }}
                />
                {name}
              </button>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
          ))}
        </div>
      )}

      {workouts && workouts.length === 0 && (
        <div className="text-center py-16">
          <Dumbbell className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--fg-muted)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--fg-secondary)' }}>No workouts yet</h2>
          <p className="mt-1" style={{ color: 'var(--fg-muted)' }}>Log your first workout to get started.</p>
          <Link href="/workouts/new" className="mt-4 inline-block">
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New Workout
            </Button>
          </Link>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((workout: Workout, i: number) => {
            const m = format(parseISO(workout.started_at), 'MMMM yyyy');
            const prevMonth = i > 0 ? format(parseISO(filtered[i - 1].started_at), 'MMMM yyyy') : null;
            const showDivider = i === 0 || m !== prevMonth;
            return (
              <div key={workout.id}>
                {showDivider && (
                  <div className={`flex items-center gap-3 ${i === 0 ? 'pb-1' : 'pt-4 pb-1'}`}>
                    <span className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--fg-muted)' }}>
                      {m}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>
                )}
                <WorkoutCard workout={workout} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && workouts && workouts.length > 0 && (
        <>
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setMonth((m) => subMonths(m, 1))}
                  className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-secondary)' }}>
                  {format(month, 'MMMM yyyy')}
                </h2>
                <button
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  disabled={!canGoForward}
                  className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-20"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <MonthGrid
                month={month}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                workouts={calFilteredWorkouts}
                strainData={strainData ?? []}
                nutritionScores={nutritionScores}
                sleepData={sleepData}
              />
            </div>
          </Card>

          {selectedDate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeModal}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div
                className="relative rounded-2xl border p-5 w-[380px] max-w-[90vw] max-h-[80vh] overflow-y-auto shadow-2xl"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closeModal}
                  className="absolute top-3 right-3 p-1 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  <X className="h-4 w-4" />
                </button>
                <DayDetail
                  date={selectedDate}
                  workouts={selectedWorkouts}
                  strain={selectedStrain}
                  nutritionScore={nutritionScores[selectedDate] ?? null}
                  sleepMinutes={selectedDaySleep?.daily?.total_minutes ?? null}
                  sleepDetail={selectedDaySleep?.daily ?? null}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TABLE VIEW ── */}
      {view === 'table' && filtered.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--fg)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Workout</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Strain</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Min</span>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                    <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />Avg HR</span>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                    <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" />Cal</span>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                    <span className="inline-flex items-center gap-1"><Route className="h-3 w-3" />Dist</span>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Pace</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((workout: Workout) => {
                  const color = getWorkoutColor(workout.name, workout.type as WorkoutType);
                  const hasDist = workout.distance_km != null && workout.distance_km > 0;
                  let paceStr = '—';
                  if (hasDist && workout.duration_minutes > 0) {
                    const pace = workout.duration_minutes / workout.distance_km!;
                    const mins = Math.floor(pace);
                    const secs = Math.round((pace - mins) * 60);
                    paceStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                  }
                  return (
                    <tr
                      key={workout.id}
                      className="border-t transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => window.location.href = `/workouts/${workout.id}`}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {format(parseISO(workout.started_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-medium text-sm">{workout.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold" style={{ color: getStrainColor(workout.strain_score) }}>
                        {workout.strain_score.toFixed(1)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--fg-secondary)' }}>
                        {workout.duration_minutes}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--fg-secondary)' }}>
                        {workout.avg_heart_rate ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--fg-secondary)' }}>
                        {workout.calories ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: hasDist ? '#00bcd4' : 'var(--fg-muted)' }}>
                        {hasDist ? `${workout.distance_km!.toFixed(2)} km` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: hasDist ? '#00bcd4' : 'var(--fg-muted)' }}>
                        {paceStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view !== 'calendar' && workouts && workouts.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>All workout types are hidden. Toggle some back on above.</p>
        </div>
      )}

      {view !== 'calendar' && canLoadMore && (
        <div className="flex justify-center pt-2">
          <Button variant="ghost" onClick={() => setLimit(l => l + PAGE_SIZE)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
