'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isFuture,
} from 'date-fns';
import { MonthGrid } from '@/components/calendar/month-grid';
import { WeekGrid } from '@/components/calendar/week-grid';
import { DayDetail } from '@/components/calendar/day-detail';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useSWR from 'swr';
import type { Workout, DailyStrain, DailySleep } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ViewMode = 'month' | 'week';

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Compute date range based on view mode
  const { from, to } = useMemo(() => {
    if (viewMode === 'week') {
      const ws = startOfWeek(weekStart, { weekStartsOn: 1 });
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      return {
        from: format(ws, 'yyyy-MM-dd'),
        to: format(we, 'yyyy-MM-dd'),
      };
    }
    // month and list both use the full month range
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return {
      from: format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    };
  }, [viewMode, month, weekStart]);

  // Fetch workouts for the range
  const { data: workoutsData } = useSWR<Workout[]>(
    `/api/workouts?from=${from}T00:00:00&to=${to}T23:59:59&limit=500`,
    fetcher
  );

  // Fetch strain data
  const { data: strainData } = useSWR<DailyStrain[]>(
    `/api/strain?from=${from}&to=${to}`,
    fetcher
  );

  // Collect all dates in the range for nutrition score fetch
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

  const { data: nutritionData } = useSWR<{ scores: Record<string, number | null> }>(
    `/api/nutrition/history?dates=${allDates.join(',')}`,
    fetcher
  );

  // Fetch sleep data for the grid
  const { data: sleepHistoryData } = useSWR<DailySleep[]>(
    `/api/sleep/history?from=${from}&to=${to}`,
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

  // Fetch sleep detail for selected date (for stage breakdown)
  const { data: selectedDaySleep } = useSWR<{ daily: DailySleep | null }>(
    selectedDate ? `/api/sleep?date=${selectedDate}` : null,
    fetcher
  );

  const nutritionScores = nutritionData?.scores ?? {};

  // Filter out walking
  const filteredWorkouts = useMemo(() => {
    if (!workoutsData) return [];
    return workoutsData.filter((w) => w.name !== 'Walking');
  }, [workoutsData]);

  // Filter workouts for the selected day
  const selectedWorkouts = useMemo(() => {
    if (!selectedDate) return [];
    return filteredWorkouts.filter((w) => {
      const d = (w as any).local_date || format(new Date(w.started_at), 'yyyy-MM-dd');
      return d === selectedDate;
    });
  }, [filteredWorkouts, selectedDate]);

  // Get strain for selected day
  const selectedStrain = useMemo(() => {
    if (!strainData || !selectedDate) return 0;
    const day = strainData.find((d) => d.date === selectedDate);
    return day?.strain_score ?? 0;
  }, [strainData, selectedDate]);

  // Navigation
  const navigateBack = () => {
    if (viewMode === 'week') setWeekStart((w) => subWeeks(w, 1));
    else setMonth((m) => subMonths(m, 1));
  };

  const navigateForward = () => {
    if (viewMode === 'week') setWeekStart((w) => addWeeks(w, 1));
    else setMonth((m) => addMonths(m, 1));
  };

  const canGoForward = viewMode === 'week'
    ? !isFuture(addWeeks(weekStart, 1))
    : !isFuture(addMonths(month, 1));

  const headerLabel = viewMode === 'week'
    ? `${format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
    : format(month, 'MMMM yyyy');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Calendar</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main grid */}
        <div className="flex-1">
          <Card>
            <div className="p-4">
              {/* Navigation + view toggle */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={navigateBack}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                  style={{ color: 'var(--fg-secondary)' }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                  {headerLabel}
                </h2>
                <button
                  onClick={navigateForward}
                  disabled={!canGoForward}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-30"
                  style={{ color: 'var(--fg-secondary)' }}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center justify-center mb-3">
                <div
                  className="flex rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {(['month', 'week'] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className="px-3 py-1 text-xs font-medium transition-colors capitalize"
                      style={{
                        background: viewMode === mode ? 'var(--bg-elevated)' : 'transparent',
                        color: viewMode === mode ? 'var(--fg)' : 'var(--fg-muted)',
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* View content */}
              {viewMode === 'month' && (
                <MonthGrid
                  month={month}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  workouts={filteredWorkouts}
                  strainData={strainData ?? []}
                  nutritionScores={nutritionScores}
                  sleepData={sleepData}
                />
              )}

              {viewMode === 'week' && (
                <WeekGrid
                  weekStart={weekStart}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  workouts={filteredWorkouts}
                  strainData={strainData ?? []}
                  nutritionScores={nutritionScores}
                  sleepData={sleepData}
                />
              )}

            </div>
          </Card>
        </div>

        {/* Day detail panel */}
        <div className="lg:w-80">
          <Card>
            <div className="p-4">
              <DayDetail
                date={selectedDate}
                workouts={selectedWorkouts}
                strain={selectedStrain}
                nutritionScore={nutritionScores[selectedDate] ?? null}
                sleepMinutes={selectedDaySleep?.daily?.total_minutes ?? null}
                sleepDetail={selectedDaySleep?.daily ?? null}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
