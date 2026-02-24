'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getStrainColor } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';

function getNutritionRating(score: number): string {
  if (score < 4)  return 'Poor';
  if (score < 7)  return 'Fair';
  if (score < 10) return 'Moderate';
  if (score < 13) return 'Good';
  if (score < 16) return 'Great';
  if (score < 19) return 'Excellent';
  return 'Optimal';
}

// ─── Utensil SVGs ────────────────────────────────────────────────────────────
// Both are 80 px tall so they sit centred against the 160 px ring.

function Fork() {
  return (
    <svg width="16" height="80" viewBox="0 0 16 80" fill="none" aria-hidden="true">
      {/* 3 tines */}
      <line x1="3"  y1="2" x2="3"  y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8"  y1="2" x2="8"  y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="2" x2="13" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Bridge arching tines into stem */}
      <path d="M3 22 Q3 30 8 30 Q13 30 13 22" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Handle stem */}
      <line x1="8" y1="30" x2="8" y2="78" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Knife() {
  // Knife sits to the RIGHT of the ring — blade faces left (inward toward the plate)
  return (
    <svg width="14" height="80" viewBox="0 0 14 80" fill="none" aria-hidden="true">
      {/* Spine — the straight back edge, runs full height */}
      <line x1="9" y1="2" x2="9" y2="78" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Blade — curves out to the left from the spine then tapers back */}
      <path d="M9 2 Q3 22 6 30 L9 30" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Guard — crosspiece between blade and handle */}
      <line x1="5" y1="30" x2="13" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Ring ────────────────────────────────────────────────────────────────────

function NutritionRing({ value, size = 160, strokeWidth = 10, isScoring = false }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  isScoring?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress / 21, 1));
  const color = getStrainColor(value);
  const rating = getNutritionRating(value);

  useEffect(() => {
    const t = setTimeout(() => setProgress(value), 100);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Soft radial glow behind the ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${color} 0%, transparent 68%)`,
          opacity: 0.13,
          transform: 'scale(0.9)',
        }}
      />

      <svg
        width={size}
        height={size}
        className={`-rotate-90 ${isScoring ? 'opacity-60' : ''}`}
        style={{ transition: 'opacity 0.3s' }}
      >
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth={strokeWidth} />
        {/* Progress arc */}
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
          style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.6s ease' }}
        />
      </svg>

      {/* Centre label */}
      <div className="absolute flex flex-col items-center gap-0.5">
        <span className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>
          {value.toFixed(1)}
        </span>
        <span
          className="text-[11px] font-semibold uppercase tracking-widest leading-none"
          style={{ color }}
        >
          {rating}
        </span>
      </div>
    </div>
  );
}

function EmptyRing({ size = 160, strokeWidth = 10 }: { size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Dashed empty track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference / 24} ${circumference / 24}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-0.5">
        <span className="text-3xl font-bold leading-none" style={{ color: 'var(--fg-muted)' }}>—</span>
        <span className="text-[11px] font-medium uppercase tracking-widest leading-none" style={{ color: 'var(--fg-muted)' }}>
          No score
        </span>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface NutritionScoreCardProps {
  score: number | null;
  summary: string | null;
  isLoading: boolean;
  isScoring: boolean;
  mealCount: number;
}

export function NutritionScoreCard({ score, summary, isLoading, isScoring, mealCount }: NutritionScoreCardProps) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-col items-center gap-5 p-6">

        {/* Utensils + ring row */}
        <div className="flex items-center gap-5" style={{ color: 'var(--border)' }}>
          <Fork />

          {isLoading ? (
            <div
              className="rounded-full animate-pulse shrink-0"
              style={{ width: 160, height: 160, background: 'var(--bg-elevated)' }}
            />
          ) : score !== null ? (
            <NutritionRing value={score} isScoring={isScoring} />
          ) : (
            <EmptyRing />
          )}

          <Knife />
        </div>

        {/* Divider */}
        <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />

        {/* Summary / status */}
        <div className="w-full min-h-[3rem] flex items-start">
          {isScoring && (
            <div className="flex items-center gap-2 w-full justify-center" style={{ color: 'var(--fg-muted)' }}>
              <span className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-[#00d26a] animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
              <span className="text-sm">Analysing your day…</span>
            </div>
          )}

          {!isScoring && summary && (
            <div className="flex gap-2 items-start">
              <Sparkles
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                style={{ color: '#00d26a', opacity: 0.7 }}
              />
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                {summary}
              </p>
            </div>
          )}

          {!isScoring && !summary && !isLoading && (
            <p className="text-sm text-center w-full" style={{ color: 'var(--fg-muted)' }}>
              {mealCount === 0
                ? 'Log your first meal to get a score.'
                : 'Score pending…'}
            </p>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
