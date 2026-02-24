'use client';

import { useState, useCallback, useMemo } from 'react';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNutrition } from '@/hooks/use-nutrition';
import { NutritionScoreCard } from '@/components/nutrition/nutrition-score-card';
import { MealInput } from '@/components/nutrition/meal-input';
import { MealList } from '@/components/nutrition/meal-list';
import { NutritionHistory } from '@/components/nutrition/nutrition-history';
import { Card, CardContent } from '@/components/ui/card';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function toLocalDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function toViewMonth(dateStr: string) {
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

function datesForMonth(viewMonth: string): string[] {
  const [yearStr, monthStr] = viewMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`);
}

export default function NutritionPage() {
  const today = toLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMonth, setViewMonth] = useState(() => toViewMonth(today));
  const [isScoring, setIsScoring] = useState(false);

  const { meals, score, summary, isLoading, addMeal, deleteMeal } = useNutrition(selectedDate);

  const monthDates = useMemo(() => datesForMonth(viewMonth), [viewMonth]);

  const { data: historyData, mutate: mutateHistory } = useSWR(
    `/api/nutrition/history?dates=${monthDates.join(',')}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const scores: Record<string, number | null> = historyData?.scores ?? {};

  // Month navigation
  const currentMonth = toViewMonth(today);
  const canGoNextMonth = viewMonth < currentMonth;

  const handlePrevMonth = () => {
    const [y, m] = viewMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setViewMonth(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    const [y, m] = viewMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setViewMonth(format(next, 'yyyy-MM'));
  };

  // Day navigation (arrows in header)
  const canGoForward = selectedDate < today;

  const handlePrevDay = () => {
    const newDate = toLocalDate(subDays(parseISO(selectedDate), 1));
    setSelectedDate(newDate);
    const newMonth = toViewMonth(newDate);
    if (newMonth !== viewMonth) setViewMonth(newMonth);
  };

  const handleNextDay = () => {
    if (!canGoForward) return;
    const newDate = toLocalDate(addDays(parseISO(selectedDate), 1));
    setSelectedDate(newDate);
    const newMonth = toViewMonth(newDate);
    if (newMonth !== viewMonth) setViewMonth(newMonth);
  };

  // Calendar day click — if it's in a different month from viewMonth, follow it
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    const newMonth = toViewMonth(date);
    if (newMonth !== viewMonth) setViewMonth(newMonth);
  };

  const handleAddMeal = useCallback(async (description: string) => {
    setIsScoring(true);
    try {
      await addMeal(description);
      mutateHistory();
    } finally {
      setIsScoring(false);
    }
  }, [addMeal, mutateHistory]);

  const handleDeleteMeal = useCallback(async (id: number) => {
    setIsScoring(true);
    try {
      await deleteMeal(id);
      mutateHistory();
    } finally {
      setIsScoring(false);
    }
  }, [deleteMeal, mutateHistory]);

  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d');
  const isToday = selectedDate === today;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header + selected day nav */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Nutrition</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium min-w-[160px] text-center" style={{ color: 'var(--fg)' }}>
            {isToday ? 'Today' : displayDate}
          </span>
          <button
            onClick={handleNextDay}
            disabled={!canGoForward}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-30"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Score card + meal log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NutritionScoreCard
          score={score}
          summary={summary}
          isLoading={isLoading}
          isScoring={isScoring}
          mealCount={meals.length}
        />

        <Card className="flex flex-col">
          <CardContent className="pt-4 flex flex-col gap-4 flex-1 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Meals</span>
              {meals.length > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(0,210,106,0.12)', color: '#00d26a' }}
                >
                  {meals.length} logged
                </span>
              )}
            </div>
            <MealList meals={meals} onDelete={handleDeleteMeal} disabled={isScoring} />
            <div className="mt-auto pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <MealInput onAdd={handleAddMeal} disabled={isScoring} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month calendar */}
      <NutritionHistory
        viewMonth={viewMonth}
        scores={scores}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        canGoNext={canGoNextMonth}
      />
    </div>
  );
}
