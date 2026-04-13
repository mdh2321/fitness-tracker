import useSWR from 'swr';
import type { Grade } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const API_KEY = process.env.NEXT_PUBLIC_SYNC_API_KEY ?? '';

export interface MealEntry {
  id: number;
  date: string;
  description: string;
  order_index: number;
  logged_at: string;
  emoji: string | null;
  grade: Grade | null;
}

export interface NutritionDay {
  meals: MealEntry[];
  score: number | null;
  summary: string | null;
  scored_at: string | null;
}

export function useNutrition(date: string) {
  const { data, mutate, isLoading } = useSWR<NutritionDay>(
    `/api/nutrition?date=${date}`,
    fetcher,
  );

  const addMeal = async (description: string) => {
    await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ date, description }),
    });
    mutate();
  };

  const deleteMeal = async (id: number) => {
    await fetch(`/api/nutrition/${id}`, {
      method: 'DELETE',
      headers: { 'x-api-key': API_KEY },
    });
    mutate();
  };

  return {
    meals: data?.meals ?? [],
    score: data?.score ?? null,
    summary: data?.summary ?? null,
    isLoading,
    addMeal,
    deleteMeal,
  };
}
