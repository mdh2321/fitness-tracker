'use client';

import { Toaster } from 'sonner';
import { useTheme } from './theme-provider';

export function ThemedToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme}
      toastOptions={{
        style: {
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--fg)',
        },
      }}
    />
  );
}
