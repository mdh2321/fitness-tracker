'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getGradeFromScore, getGradeColor, getGradeLabel } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';

function NutritionRing({ score, size = 180, strokeWidth = 11, isScoring = false }: {
  score: number;
  size?: number;
  strokeWidth?: number;
  isScoring?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [gradePop, setGradePop] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress / 21, 1));
  const grade = getGradeFromScore(score);
  const color = getGradeColor(grade);

  useEffect(() => {
    const t = setTimeout(() => setProgress(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  useEffect(() => {
    if (grade == null) return;
    setGradePop(false);
    const t = setTimeout(() => setGradePop(true), 50);
    return () => clearTimeout(t);
  }, [grade]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className={`-rotate-90 ${isScoring ? 'opacity-60' : ''}`}
        style={{ transition: 'opacity 0.3s' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
        />
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

      <div className="absolute flex flex-col items-center">
        <span
          className="font-bold leading-none tracking-tight select-none"
          style={{
            color,
            fontSize: '80px',
            transform: gradePop ? 'scale(1)' : 'scale(0.7)',
            opacity: gradePop ? 1 : 0,
            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out',
          }}
        >
          {grade ?? ''}
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-widest mt-2 leading-none"
          style={{ color }}
        >
          {getGradeLabel(grade)}
        </span>
        <span
          className="text-[10px] tabular-nums mt-1 leading-none"
          style={{ color: 'var(--fg-muted)' }}
        >
          {score.toFixed(1)}/21
        </span>
      </div>
    </div>
  );
}

function EmptyRing({ size = 180, strokeWidth = 11 }: { size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
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
      <div className="absolute flex flex-col items-center gap-1">
        <span className="text-5xl font-bold leading-none" style={{ color: 'var(--fg-muted)' }}>—</span>
        <span className="text-[10px] font-medium uppercase tracking-widest leading-none" style={{ color: 'var(--fg-muted)' }}>
          No grade yet
        </span>
      </div>
    </div>
  );
}

interface NutritionScoreCardProps {
  score: number | null;
  summary: string | null;
  isLoading: boolean;
  isScoring: boolean;
  mealCount: number;
}

export function NutritionScoreCard({
  score,
  summary,
  isLoading,
  isScoring,
  mealCount,
}: NutritionScoreCardProps) {
  const grade = score != null ? getGradeFromScore(score) : null;
  const gradeColor = grade ? getGradeColor(grade) : null;

  // Tinted top fade tied to the current grade. Falls back to the plain card bg
  // when there is no grade yet so the empty state stays neutral.
  const cardBackground = gradeColor
    ? `linear-gradient(180deg, ${gradeColor}1F 0%, ${gradeColor}0A 35%, var(--bg-card) 75%)`
    : 'var(--bg-card)';

  return (
    <Card
      className="flex flex-col relative overflow-hidden"
      style={{ background: cardBackground, transition: 'background 0.6s ease' }}
    >
      <CardContent className="flex flex-col items-center gap-6 pt-2">
        {isLoading ? (
          <div
            className="rounded-full animate-pulse shrink-0"
            style={{ width: 180, height: 180, background: 'var(--bg-elevated)' }}
          />
        ) : score !== null ? (
          <NutritionRing score={score} isScoring={isScoring} />
        ) : (
          <EmptyRing />
        )}

        <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />

        <div className="w-full min-h-[4rem] flex items-start">
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
              <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: gradeColor ?? '#00d26a', opacity: 0.8 }} />
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                {summary}
              </p>
            </div>
          )}

          {!isScoring && !summary && !isLoading && (
            <p className="text-sm text-center w-full" style={{ color: 'var(--fg-muted)' }}>
              {mealCount === 0
                ? 'Log your first meal to get started.'
                : 'Score pending…'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
