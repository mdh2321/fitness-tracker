'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Activity, Footprints, Moon, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DayData {
  strain_score: number;
  steps: number;
  total_duration: number;
  total_calories: number;
  sleep_minutes: number;
  nutrition_score: number;
}

interface Last7DaysCardProps {
  last7Days: DayData[];
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-8">
      {data.map((v, i) => {
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm min-w-[4px] transition-all"
            style={{
              height: `${Math.max((v / max) * 100, 4)}%`,
              backgroundColor: color,
              opacity: isLast ? 1 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}

interface MetricTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  color: string;
  barData: number[];
}

function MetricTile({ icon: Icon, label, value, unit, color, barData }: MetricTileProps) {
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{label}</span>
      </div>
      <MiniBarChart data={barData} color={color} />
      <div className="mt-3">
        <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
          {value}
        </span>
        {unit && (
          <span className="text-sm font-normal ml-1" style={{ color: 'var(--fg-muted)' }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

export function Last7DaysCard({ last7Days }: Last7DaysCardProps) {
  const len = last7Days.length || 1;
  const avgStrain = last7Days.reduce((s, d) => s + d.strain_score, 0) / len;
  const avgSteps = Math.round(last7Days.reduce((s, d) => s + d.steps, 0) / len);
  const avgDuration = Math.round(last7Days.reduce((s, d) => s + d.total_duration, 0) / len);
  const avgSleep = last7Days.reduce((s, d) => s + d.sleep_minutes, 0) / len / 60;

  return (
    <Card>
      <CardContent>
        <div className="mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Last 7 Days</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>Daily averages</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile
            icon={Flame}
            label="Avg Strain"
            value={avgStrain.toFixed(1)}
            color="#00d26a"
            barData={last7Days.map(d => d.strain_score)}
          />
          <MetricTile
            icon={Footprints}
            label="Avg Steps"
            value={avgSteps.toLocaleString()}
            color="#ff6b35"
            barData={last7Days.map(d => d.steps)}
          />
          <MetricTile
            icon={Activity}
            label="Avg Active"
            value={`${avgDuration}`}
            unit="min"
            color="#00bcd4"
            barData={last7Days.map(d => d.total_duration)}
          />
          <MetricTile
            icon={Moon}
            label="Avg Sleep"
            value={avgSleep.toFixed(1)}
            unit="hrs"
            color="#8b5cf6"
            barData={last7Days.map(d => d.sleep_minutes / 60)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
