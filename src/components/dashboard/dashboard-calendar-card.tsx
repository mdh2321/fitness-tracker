'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MonthGrid } from '@/components/calendar/month-grid';
import { DayDetail } from '@/components/calendar/day-detail';
import type { Workout, DailyStrain, DailySleep } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function DashboardCalendarCard() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Compute date range for the visible grid (includes overflow days from adjacent months)
  const { from, to } = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return {
      from: format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    };
  }, [month]);

  // All dates in range for nutrition batch query
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

  // Data fetching
  const { data: workoutsData } = useSWR<Workout[]>(
    `/api/workouts?from=${from}T00:00:00&to=${to}T23:59:59&limit=500`,
    fetcher
  );
  const { data: strainData } = useSWR<DailyStrain[]>(
    `/api/strain?from=${from}&to=${to}`,
    fetcher
  );
  const { data: nutritionData } = useSWR<{ scores: Record<string, number | null> }>(
    `/api/nutrition/history?dates=${allDates.join(',')}`,
    fetcher
  );
  const { data: sleepHistoryData } = useSWR<DailySleep[]>(
    `/api/sleep/history?from=${from}&to=${to}`,
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

  const filteredWorkouts = useMemo(() => {
    if (!workoutsData) return [];
    return workoutsData.filter((w) => w.name !== 'Walking');
  }, [workoutsData]);

  // Selected day data
  const selectedWorkouts = useMemo(() => {
    if (!selectedDate) return [];
    return filteredWorkouts.filter((w) => {
      const d = w.local_date || format(new Date(w.started_at), 'yyyy-MM-dd');
      return d === selectedDate;
    });
  }, [filteredWorkouts, selectedDate]);

  const selectedStrain = useMemo(() => {
    if (!strainData || !selectedDate) return 0;
    return strainData.find((d) => d.date === selectedDate)?.strain_score ?? 0;
  }, [strainData, selectedDate]);

  const canGoForward = !isFuture(addMonths(month, 1));

  const closeModal = useCallback(() => setSelectedDate(null), []);

  // Close on Escape
  useEffect(() => {
    if (!selectedDate) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedDate, closeModal]);

  return (
    <>
      <Card>
        <div className="p-3">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
              style={{ color: 'var(--fg-secondary)' }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
              {format(month, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setMonth((m) => addMonths(m, 1))}
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
            workouts={filteredWorkouts}
            strainData={strainData ?? []}
            nutritionScores={nutritionScores}
            sleepData={sleepData}
            compact
          />
        </div>
      </Card>

      {/* Day detail modal */}
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
  );
}
