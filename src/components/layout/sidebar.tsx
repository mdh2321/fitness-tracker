'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ArcLogo } from '@/components/ui/arc-logo';
import {
  LayoutDashboard,
  Dumbbell,
  Target,
  Upload,
  Settings,
  Salad,
  Moon,
  FileText,
  User,
  Footprints,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/running', label: 'Running', icon: Footprints },
  { href: '/nutrition', label: 'Nutrition', icon: Salad },
  { href: '/sleep', label: 'Sleep', icon: Moon },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/quests', label: 'Quests', icon: Target },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:items-center lg:w-16 lg:fixed lg:inset-y-0 border-r py-4 z-50"
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
    >
      <Link href="/" className="mb-5 flex items-center justify-center" aria-label="Arc dashboard">
        <ArcLogo size={28} />
      </Link>
      <nav className="flex flex-col items-center gap-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                'group relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
                isActive
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'hover:bg-[var(--bg-elevated)]'
              )}
              style={isActive ? {} : { color: 'var(--fg-muted)' }}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span
                className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border shadow-lg"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--fg)' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
