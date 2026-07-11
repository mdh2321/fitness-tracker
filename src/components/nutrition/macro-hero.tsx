'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

const GREEN = '#00d26a';
const TEAL = '#00bcd4';
const AMBER = '#f59e0b';
const PURPLE = '#8b5cf6';
const ORANGE = '#ff6b35';

function Gauge({
  pct,
  gradient,
  over,
  slim,
}: {
  pct: number;
  gradient: string;
  over?: boolean;
  slim?: boolean;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(pct, 1) * 100), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ height: slim ? 4 : 8, background: 'var(--bg-elevated)' }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: over ? `linear-gradient(90deg, ${ORANGE}88, ${ORANGE})` : gradient,
          opacity: slim ? 0.75 : 1,
          transition: 'width 0.9s ease-out',
        }}
      />
    </div>
  );
}

function MetricLabel({ label, chip }: { label: string; chip: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <span
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--fg-muted)' }}
      >
        {label}
      </span>
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
      >
        {chip}
      </span>
    </div>
  );
}

function BigNum({ value, unit, color }: { value: string; unit: string; color?: string }) {
  return (
    <div className="leading-none">
      <span
        className="font-bold tracking-tight tabular-nums"
        style={{ fontSize: 46, color: color ?? 'var(--fg)' }}
      >
        {value}
      </span>
      <span className="text-base font-medium ml-1.5" style={{ color: 'var(--fg-muted)' }}>
        {unit}
      </span>
    </div>
  );
}

function WeekRow({
  consumed,
  target,
  gradient,
  unit,
}: {
  consumed: number;
  target: number;
  gradient: string;
  unit: string;
}) {
  return (
    <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11.5px]" style={{ color: 'var(--fg-muted)' }}>This week</span>
        <span className="text-xs tabular-nums">
          <b className="font-semibold" style={{ color: 'var(--fg-secondary)' }}>
            {consumed.toLocaleString()}{unit}
          </b>
          <span style={{ color: 'var(--fg-muted)' }}> / {target.toLocaleString()}{unit}</span>
        </span>
      </div>
      <Gauge pct={target > 0 ? consumed / target : 0} gradient={gradient} over={consumed > target && unit === ''} slim />
    </div>
  );
}

interface MacroHeroProps {
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  targets: { calories: number; protein_g: number };
  week: { calories: number; protein_g: number };
  isLoading: boolean;
}

export function MacroHero({ totals, targets, week, isLoading }: MacroHeroProps) {
  const calLeft = targets.calories - totals.calories;
  const proLeft = targets.protein_g - totals.protein_g;
  const calOver = calLeft < 0;
  const proHit = proLeft <= 0;

  // Macro split as share of calories (P/C 4 kcal per g, F 9)
  const pCal = totals.protein_g * 4;
  const cCal = totals.carbs_g * 4;
  const fCal = totals.fat_g * 9;
  const splitTotal = pCal + cCal + fCal;
  const pct = (v: number) => (splitTotal > 0 ? Math.round((v / splitTotal) * 100) : 0);

  const calGrad = `linear-gradient(90deg, ${GREEN}88, ${GREEN})`;
  const proGrad = `linear-gradient(90deg, ${TEAL}88, ${TEAL})`;

  if (isLoading) {
    return (
      <Card className="grid grid-cols-1 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-6">
            <div className="h-36 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
          </div>
        ))}
      </Card>
    );
  }

  return (
    <Card className="grid grid-cols-1 md:grid-cols-[1.12fr_1.12fr_0.95fr]">
      {/* Calories: the ceiling */}
      <div className="px-7 py-6 border-b md:border-b-0" style={{ borderColor: 'var(--border)' }}>
        <MetricLabel label="Calories" chip={`stay under ${targets.calories.toLocaleString()}`} />
        {calOver ? (
          <BigNum value={Math.abs(calLeft).toLocaleString()} unit="kcal over" color={ORANGE} />
        ) : (
          <BigNum value={calLeft.toLocaleString()} unit="kcal left" />
        )}
        <div className="mt-4 mb-2">
          <Gauge pct={targets.calories > 0 ? totals.calories / targets.calories : 0} gradient={calGrad} over={calOver} />
        </div>
        <div className="flex justify-between text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
          <span><b className="font-semibold" style={{ color: 'var(--fg-secondary)' }}>{totals.calories.toLocaleString()}</b> eaten</span>
          <span>{targets.calories.toLocaleString()}</span>
        </div>
        <WeekRow consumed={week.calories} target={targets.calories * 7} gradient={calGrad} unit="" />
      </div>

      {/* Protein: the floor */}
      <div className="px-7 py-6 border-b md:border-b-0 md:border-l" style={{ borderColor: 'var(--border)' }}>
        <MetricLabel label="Protein" chip={`reach ${targets.protein_g}g`} />
        {proHit ? (
          <BigNum value={`+${Math.abs(proLeft)}`} unit="g over target" color={TEAL} />
        ) : (
          <BigNum value={String(proLeft)} unit="g to go" />
        )}
        <div className="mt-4 mb-2">
          <Gauge pct={targets.protein_g > 0 ? totals.protein_g / targets.protein_g : 0} gradient={proGrad} />
        </div>
        <div className="flex justify-between text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
          <span><b className="font-semibold" style={{ color: 'var(--fg-secondary)' }}>{totals.protein_g}g</b> so far</span>
          <span>{targets.protein_g}g</span>
        </div>
        <WeekRow consumed={week.protein_g} target={targets.protein_g * 7} gradient={proGrad} unit="g" />
      </div>

      {/* Macro split */}
      <div className="px-7 py-6 md:border-l" style={{ borderColor: 'var(--border)' }}>
        <MetricLabel label="Macro split" chip="today" />
        <div className="flex flex-col">
          {([
            ['Protein', totals.protein_g, TEAL],
            ['Carbs', totals.carbs_g, AMBER],
            ['Fat', totals.fat_g, PURPLE],
          ] as const).map(([label, value, color]) => (
            <div key={label} className="flex items-baseline justify-between py-1.5 text-[13px]">
              <span className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                {label}
              </span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>{value}g</span>
            </div>
          ))}
        </div>
        {splitTotal > 0 && (
          <>
            <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mt-2.5">
              <span style={{ width: `${pct(pCal)}%`, background: TEAL }} />
              <span style={{ width: `${pct(cCal)}%`, background: AMBER }} />
              <span style={{ width: `${pct(fCal)}%`, background: PURPLE }} />
            </div>
            <p className="text-[11px] mt-2 tabular-nums" style={{ color: 'var(--fg-muted)' }}>
              {pct(pCal)} / {pct(cCal)} / {pct(fCal)}% of calories
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
