'use client';

import { useEffect, useState } from 'react';
import { getStrainColor } from '@/lib/constants';

interface StrainRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
}

export function StrainRing({ value, max = 21, size = 160, strokeWidth = 10, animated = true }: StrainRingProps) {
  const [progress, setProgress] = useState(animated ? 0 : value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(progress / max, 1);
  const strokeDashoffset = circumference * (1 - percentage);
  const color = getStrainColor(value);
  const isHigh = value >= 18;

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => setProgress(value), 100);
    return () => clearTimeout(timer);
  }, [value, animated]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className={`-rotate-90 ${isHigh ? 'strain-pulse' : ''}`} style={{ color }}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: animated ? 'stroke-dashoffset 1.2s ease-out' : 'none',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {value.toFixed(1)}
        </span>
        <span className="text-xs uppercase tracking-wider mt-0.5" style={{ color: 'var(--fg-muted)' }}>Strain</span>
      </div>
    </div>
  );
}
