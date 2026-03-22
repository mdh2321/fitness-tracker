'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Dumbbell, Target, Settings, UtensilsCrossed, Moon, CalendarDays, FileText, User } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/nutrition', label: 'Nutrition', icon: UtensilsCrossed },
  { href: '/sleep', label: 'Sleep', icon: Moon },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/quests', label: 'Quests', icon: Target },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t px-2 pb-[env(safe-area-inset-bottom)]" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-3 text-xs transition-colors',
                isActive ? 'text-[var(--accent)]' : ''
              )}
              style={isActive ? {} : { color: 'var(--fg-muted)' }}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
