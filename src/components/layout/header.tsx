'use client';

import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/workouts': 'Workouts',
  '/workouts/new': 'New Workout',
  '/stats': 'Stats',
  '/achievements': 'Achievements',
  '/import': 'Import',
  '/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || (pathname.startsWith('/workouts/') ? 'Workout' : 'FitTrack');

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-[#2a2a35]">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-2 lg:hidden">
          <Activity className="h-5 w-5 text-[#00d26a]" />
          <span className="font-bold text-gray-100">FitTrack</span>
        </div>
        <h1 className="hidden lg:block text-lg font-semibold text-gray-100">{title}</h1>
        <div className="flex items-center gap-2">
          {/* Future: notifications, quick add */}
        </div>
      </div>
    </header>
  );
}
