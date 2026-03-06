import useSWR from 'swr';
import type { SleepSession, DailySleep } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SleepDay {
  sessions: SleepSession[];
  daily: DailySleep | null;
}

export function useSleep(date: string) {
  const { data, mutate, isLoading } = useSWR<SleepDay>(
    `/api/sleep?date=${date}`,
    fetcher
  );

  return {
    sessions: data?.sessions ?? [],
    daily: data?.daily ?? null,
    isLoading,
    mutate,
  };
}

export function useSleepHistory(from: string, to: string) {
  const { data, isLoading } = useSWR<DailySleep[]>(
    from && to ? `/api/sleep/history?from=${from}&to=${to}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    history: data ?? [],
    isLoading,
  };
}
