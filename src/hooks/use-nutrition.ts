import useSWR from 'swr';
import type { Grade } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const API_KEY = process.env.NEXT_PUBLIC_SYNC_API_KEY ?? '';

export interface MealItem {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealEntry {
  id: number;
  date: string;
  description: string;
  order_index: number;
  logged_at: string;
  emoji: string | null;
  grade: Grade | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  items: string | null; // JSON MealItem[]
  assumptions: string | null;
  source: 'app' | 'telegram';
  input_method: 'text' | 'photo' | 'manual';
}

export interface NutritionDay {
  meals: MealEntry[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  targets: { calories: number; protein_g: number };
  week: { calories: number; protein_g: number };
  score: number | null;
  summary: string | null;
  scored_at: string | null;
}

export interface ManualMealInput {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g?: number;
  fat_g?: number;
}

/** True while the day-level AI pass (grade ring + summary) hasn't caught up with the meal list. */
function scorePending(data: NutritionDay | undefined): boolean {
  if (!data || data.meals.length === 0) return false;
  if (data.scored_at == null) return true;
  return data.meals.some((m) => m.logged_at > data.scored_at! || m.grade == null);
}

export function useNutrition(date: string) {
  const { data, mutate, isLoading } = useSWR<NutritionDay>(
    `/api/nutrition?date=${date}`,
    fetcher,
    {
      // Day scoring runs server-side after each change — poll until it lands
      refreshInterval: (latest) => (scorePending(latest) ? 4000 : 0),
    },
  );

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ date, ...body }),
    });
    if (!res.ok) throw new Error('Failed to log meal');
    mutate();
  };

  const addMeal = (description: string) => post({ description });

  const addPhotoMeal = (
    photo: { data: string; media_type: 'image/jpeg' | 'image/png' | 'image/webp' },
    note?: string,
  ) => post({ photo, description: note });

  const addManualMeal = (manual: ManualMealInput) => post({ manual });

  const updateMeal = async (id: number, patch: Partial<ManualMealInput>) => {
    const res = await fetch(`/api/nutrition/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('Failed to update meal');
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
    totals: data?.totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    targets: data?.targets ?? { calories: 2400, protein_g: 140 },
    week: data?.week ?? { calories: 0, protein_g: 0 },
    score: data?.score ?? null,
    summary: data?.summary ?? null,
    isScorePending: scorePending(data),
    isLoading,
    addMeal,
    addPhotoMeal,
    addManualMeal,
    updateMeal,
    deleteMeal,
    mutate,
  };
}

export interface TrendDay {
  date: string;
  calories: number;
  protein_g: number;
  meals: number;
  score: number | null;
}

export interface NutritionTrends {
  days: TrendDay[];
  targets: { calories: number; protein_g: number };
}

export function useNutritionTrends(days = 84) {
  const { data, isLoading, mutate } = useSWR<NutritionTrends>(
    `/api/nutrition/trends?days=${days}`,
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    days: data?.days ?? [],
    targets: data?.targets ?? { calories: 2400, protein_g: 140 },
    isLoading,
    mutate,
  };
}
