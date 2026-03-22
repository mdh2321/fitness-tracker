'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StrainRing } from '@/components/charts/strain-ring';
import { Zap, Moon, Salad, Heart, Footprints, TrendingUp, TrendingDown } from 'lucide-react';
import type { DashboardMetrics } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';

interface MetricCardRowProps {
  metrics: DashboardMetrics;
}

function getDelta(current: number | null, previous: number | null): { value: number; label: string } | null {
  if (current === null || previous === null || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return { value: pct, label: `${pct >= 0 ? '+' : ''}${Math.round(pct)}%` };
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta: { value: number; label: string } | null;
  invertDelta?: boolean; // true for resting HR where lower is better
  color: string;
  children?: React.ReactNode;
}

function MetricCard({ icon: Icon, label, value, delta, invertDelta, color, children }: MetricCardProps) {
  const deltaColor = delta
    ? (invertDelta ? delta.value <= 0 : delta.value >= 0)
      ? 'var(--accent)'
      : '#ff3b5c'
    : undefined;

  return (
    <Card className="min-w-[140px] flex-1">
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className="h-3.5 w-3.5" style={{ color }} />
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</span>
        </div>
        <div className="flex items-end gap-2">
          {children}
          <div>
            <div className="text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--fg)' }}>
              {value}
            </div>
            {delta && (
              <div className="flex items-center gap-0.5 mt-1">
                {delta.value >= 0 ? (
                  <TrendingUp className="h-3 w-3" style={{ color: deltaColor }} />
                ) : (
                  <TrendingDown className="h-3 w-3" style={{ color: deltaColor }} />
                )}
                <span className="text-xs font-medium" style={{ color: deltaColor }}>
                  {delta.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricCardRow({ metrics }: MetricCardRowProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
      <MetricCard
        icon={Zap}
        label="Strain"
        value={(metrics.strain.value ?? 0).toFixed(1)}
        delta={getDelta(metrics.strain.value, metrics.strain.previousValue)}
        color="var(--accent)"
      >
        <StrainRing value={metrics.strain.value ?? 0} size={44} strokeWidth={4} animated={false} />
      </MetricCard>

      <MetricCard
        icon={Moon}
        label="Sleep Score"
        value={metrics.sleepScore.value !== null ? String(metrics.sleepScore.value) : '—'}
        delta={getDelta(metrics.sleepScore.value, metrics.sleepScore.previousValue)}
        color="#00bcd4"
      />

      <MetricCard
        icon={Salad}
        label="Nutrition"
        value={metrics.nutritionScore.value !== null ? String(Math.round(metrics.nutritionScore.value)) : '—'}
        delta={getDelta(metrics.nutritionScore.value, metrics.nutritionScore.previousValue)}
        color="var(--accent)"
      />

      <MetricCard
        icon={Heart}
        label="Resting HR"
        value={`${metrics.restingHr.value}`}
        delta={null}
        invertDelta
        color="#ff3b5c"
      >
        <span className="text-xs mb-0.5" style={{ color: 'var(--fg-muted)' }}>bpm</span>
      </MetricCard>

      <MetricCard
        icon={Footprints}
        label="Steps"
        value={(metrics.steps.value ?? 0).toLocaleString()}
        delta={getDelta(metrics.steps.value, metrics.steps.previousValue)}
        color="#ff6b35"
      />
    </div>
  );
}
