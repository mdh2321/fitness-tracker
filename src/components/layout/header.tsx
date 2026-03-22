'use client';

import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { ArcLogo } from '@/components/ui/arc-logo';
import { useTheme } from '@/components/providers/theme-provider';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/workouts': 'Workouts',
  '/workouts/new': 'New Workout',
  '/stats': 'Stats',
  '/achievements': 'Achievements',
  '/quests': 'Quests',
  '/reports': 'Reports',
  '/import': 'Import',
  '/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || (pathname.startsWith('/workouts/') ? 'Workout' : 'Arc');
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: 'color-mix(in srgb, var(--bg) 80%, transparent)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-2 lg:hidden">
          <ArcLogo size={20} />
          <span className="font-bold" style={{ color: 'var(--fg)' }}>Arc</span>
        </div>
        <h1 className="hidden lg:block text-lg font-semibold" style={{ color: 'var(--fg)' }}>{title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
