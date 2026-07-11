'use client';

import { useCallback, useMemo, useState } from 'react';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNutrition, useNutritionTrends, type ManualMealInput } from '@/hooks/use-nutrition';
import { MacroHero } from '@/components/nutrition/macro-hero';
import { MealInput } from '@/components/nutrition/meal-input';
import { MealList } from '@/components/nutrition/meal-list';
import { DailyTrendCard, WeeklyTotalsCard } from '@/components/nutrition/nutrition-charts';
import { Card, CardContent } from '@/components/ui/card';

function toLocalDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export default function NutritionPage() {
  const today = toLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [isMutating, setIsMutating] = useState(false);

  const {
    meals,
    totals,
    targets,
    week,
    isLoading,
    addMeal,
    addPhotoMeal,
    addManualMeal,
    updateMeal,
    deleteMeal,
  } = useNutrition(selectedDate);

  const { days: trendDays, targets: trendTargets, mutate: mutateTrends } = useNutritionTrends();

  const canGoForward = selectedDate < today;

  const handlePrevDay = () => setSelectedDate(toLocalDate(subDays(parseISO(selectedDate), 1)));
  const handleNextDay = () => {
    if (canGoForward) setSelectedDate(toLocalDate(addDays(parseISO(selectedDate), 1)));
  };

  const withRefresh = useCallback(
    <T extends unknown[]>(fn: (...args: T) => Promise<void>) =>
      async (...args: T) => {
        setIsMutating(true);
        try {
          await fn(...args);
          mutateTrends();
        } finally {
          setIsMutating(false);
        }
      },
    [mutateTrends],
  );

  const handleAddMeal = useMemo(() => withRefresh(addMeal), [withRefresh, addMeal]);
  const handleAddPhoto = useMemo(() => withRefresh(addPhotoMeal), [withRefresh, addPhotoMeal]);
  const handleAddManual = useMemo(() => withRefresh(addManualMeal), [withRefresh, addManualMeal]);
  const handleDelete = useMemo(() => withRefresh(deleteMeal), [withRefresh, deleteMeal]);
  const handleUpdate = useMemo(
    () => withRefresh((id: number, patch: Partial<ManualMealInput>) => updateMeal(id, patch)),
    [withRefresh, updateMeal],
  );

  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d');
  const isToday = selectedDate === today;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
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

      {/* State of the day: calories, protein, macro split, weekly trackers */}
      <MacroHero totals={totals} targets={targets} week={week} isLoading={isLoading} />

      {/* Meals: full-width tabular log with input */}
      <Card>
        <CardContent className="pt-4 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Meals</span>
            {meals.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium tabular-nums"
                style={{ background: 'rgba(0,210,106,0.12)', color: '#00d26a' }}
              >
                {meals.length} logged
              </span>
            )}
          </div>
          <MealList meals={meals} onDelete={handleDelete} onUpdate={handleUpdate} disabled={isMutating} />
          <div className="mt-4">
            <MealInput
              onAdd={handleAddMeal}
              onAddPhoto={handleAddPhoto}
              onAddManual={handleAddManual}
              disabled={isMutating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Daily trends vs targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DailyTrendCard metric="calories" days={trendDays} target={trendTargets.calories} />
        <DailyTrendCard metric="protein" days={trendDays} target={trendTargets.protein_g} />
      </div>

      {/* 7-day totals, week by week */}
      <WeeklyTotalsCard days={trendDays} targets={trendTargets} />
    </div>
  );
}
