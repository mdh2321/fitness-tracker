import useSWR from 'swr';
import type { UserSettings } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<UserSettings>('/api/settings', fetcher);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    const updated = await res.json();
    mutate(updated);
    return updated;
  };

  return { settings: data, error, isLoading, updateSettings, mutate };
}
