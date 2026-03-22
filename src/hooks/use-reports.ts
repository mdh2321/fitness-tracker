import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface WeeklyReport {
  id: number;
  week_start: string;
  week_end: string;
  workout_count: number;
  total_duration: number;
  avg_strain: number | null;
  avg_sleep_hours: number | null;
  avg_nutrition_score: number | null;
  total_steps: number;
  ai_summary: string | null;
  ai_highlights: string | null; // JSON array
  generated_at: string;
}

export function useReportsList() {
  return useSWR<WeeklyReport[]>('/api/reports', fetcher);
}
