'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ArcLogo } from '@/components/ui/arc-logo';
import {
  LayoutDashboard,
  Dumbbell,
  Trophy,
  Upload,
  Settings,
  Salad,
  Moon,
  CalendarDays,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/nutrition', label: 'Nutrition', icon: Salad },
  { href: '/sleep', label: 'Sleep', icon: Moon },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <ArcLogo size={28} />
        <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>Arc</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#00d26a]/10 text-[#00d26a]'
                  : 'hover:bg-[var(--bg-elevated)]'
              )}
              style={isActive ? {} : { color: 'var(--fg-muted)' }}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
