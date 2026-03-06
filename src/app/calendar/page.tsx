'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isFuture,
} from 'date-fns';
import { MonthGrid } from '@/components/calendar/month-grid';
import { DayDetail } from '@/components/calendar/day-detail';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useSWR from 'swr';
import type { Workout, DailyStrain, DailySleep } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Compute date range covering the full calendar grid (may include prev/next month days)
  const { from, to } = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return {
      from: format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    };
  }, [month]);

  // Fetch workouts for the month range
  const { data: workoutsData } = useSWR<Workout[]>(
    `/api/workouts?from=${from}T00:00:00&to=${to}T23:59:59&limit=500`,
    fetcher
  );

  // Fetch strain data
  const { data: strainData } = useSWR<DailyStrain[]>(
    `/api/strain?from=${from}&to=${to}`,
    fetcher
  );

  // Collect all dates in the grid for nutrition score fetch
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

  // Fetch sleep for selected date
  const { data: selectedDaySleep } = useSWR<{ daily: DailySleep | null }>(
    selectedDate ? `/api/sleep?date=${selectedDate}` : null,
    fetcher
  );

  const nutritionScores = nutritionData?.scores ?? {};

  // Filter workouts for the selected day
  const selectedWorkouts = useMemo(() => {
    if (!workoutsData || !selectedDate) return [];
    return workoutsData.filter((w) => {
      const d = (w as any).local_date || format(new Date(w.started_at), 'yyyy-MM-dd');
      return d === selectedDate;
    });
  }, [workoutsData, selectedDate]);

  // Get strain for selected day
  const selectedStrain = useMemo(() => {
    if (!strainData || !selectedDate) return 0;
    const day = strainData.find((d) => d.date === selectedDate);
    return day?.strain_score ?? 0;
  }, [strainData, selectedDate]);

  const canGoForward = !isFuture(addMonths(month, 1));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Calendar</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Month grid */}
        <div className="flex-1">
          <Card>
            <div className="p-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setMonth((m) => subMonths(m, 1))}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                  style={{ color: 'var(--fg-secondary)' }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                  {format(month, 'MMMM yyyy')}
                </h2>
                <button
                  onClick={() => canGoForward && setMonth((m) => addMonths(m, 1))}
                  disabled={!canGoForward}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-30"
                  style={{ color: 'var(--fg-secondary)' }}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <MonthGrid
                month={month}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                workouts={workoutsData ?? []}
                strainData={strainData ?? []}
                nutritionScores={nutritionScores}
                sleepData={sleepData}
              />
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
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
