'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { getStrainColor, getStrainLabel } from '@/lib/constants';

interface StrainHeroProps {
  strain: number;
  workouts: number;
  duration: number;
  calories: number;
  target: number;
}

export function StrainHero({ strain, workouts, duration, calories, target }: StrainHeroProps) {
  const size = 190;
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getStrainColor(strain);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(strain), 100);
    return () => clearTimeout(timer);
  }, [strain]);

  const strokeDashoffset = circumference * (1 - Math.min(progress / 21, 1));

  return (
    <Card
      className="relative flex flex-col items-center justify-center gap-4 h-full"
      style={{
        background: `radial-gradient(ellipse 90% 70% at 50% 0%, color-mix(in srgb, ${color} 12%, transparent), transparent 60%), var(--bg-card)`,
      }}
    >
      <span className="tile-label absolute top-5 left-6">Daily strain</span>
      <div className="relative inline-flex items-center justify-center mt-4" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display text-[52px] font-bold leading-none tabular-nums" style={{ color: 'var(--fg)' }}>
            {strain.toFixed(1)}
          </span>
          <span className="text-sm font-semibold mt-1" style={{ color }}>{getStrainLabel(strain)}</span>
          <span className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>target {target}</span>
        </div>
      </div>
      <div className="flex gap-8 pb-1">
        <div className="text-center">
          <div className="font-display text-lg font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>{workouts}</div>
          <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{workouts === 1 ? 'workout' : 'workouts'}</div>
        </div>
        <div className="text-center">
          <div className="font-display text-lg font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>{duration}m</div>
          <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>active</div>
        </div>
        <div className="text-center">
          <div className="font-display text-lg font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>{calories}</div>
          <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>kcal</div>
        </div>
      </div>
    </Card>
  );
}
