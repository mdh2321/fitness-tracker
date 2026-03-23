'use client';

import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useReportsList, type WeeklyReport } from '@/hooks/use-reports';
import { useStrainData } from '@/hooks/use-stats';
import { Sparkles, Loader2, Trash2, ChevronDown, ChevronUp, Dumbbell, Activity, Zap, Moon, Salad, Footprints } from 'lucide-react';
import { format, parseISO, startOfWeek, subWeeks, eachWeekOfInterval } from 'date-fns';

interface PriorAverages {
  workout_count: number | null;
  total_duration: number | null;
  avg_strain: number | null;
  avg_sleep_hours: number | null;
  avg_nutrition_score: number | null;
  total_steps: number | null;
}

function computePriorAverages(reports: WeeklyReport[], index: number): PriorAverages {
  // Reports are sorted DESC — prior weeks are at higher indices
  const prior = reports.slice(index + 1);
  if (prior.length === 0) return { workout_count: null, total_duration: null, avg_strain: null, avg_sleep_hours: null, avg_nutrition_score: null, total_steps: null };

  // Only include weeks where the metric has real data (not null/undefined/0)
  const avg = (vals: (number | null | undefined)[], allowZero = false) => {
    const valid = vals.filter((v): v is number =>
      v !== null && v !== undefined && (allowZero || v > 0)
    );
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };

  return {
    workout_count: avg(prior.map((r) => r.workout_count), true),
    total_duration: avg(prior.map((r) => r.total_duration), true),
    avg_strain: avg(prior.map((r) => r.avg_strain)),
    avg_sleep_hours: avg(prior.map((r) => r.avg_sleep_hours)),
    avg_nutrition_score: avg(prior.map((r) => r.avg_nutrition_score)),
    total_steps: avg(prior.map((r) => r.total_steps)),
  };
}

// ── Weekly Grade ──
// Composite score from 0–100 based on available metrics, mapped to letter grade.
// Each metric is scored 0–100 against reasonable weekly benchmarks, then averaged.
const GRADE_THRESHOLDS: { min: number; grade: string; color: string }[] = [
  { min: 95, grade: 'A+', color: '#00d26a' },
  { min: 88, grade: 'A',  color: '#00d26a' },
  { min: 80, grade: 'A-', color: '#22c55e' },
  { min: 73, grade: 'B+', color: '#00bcd4' },
  { min: 65, grade: 'B',  color: '#00bcd4' },
  { min: 58, grade: 'B-', color: '#3b82f6' },
  { min: 50, grade: 'C+', color: '#f59e0b' },
  { min: 42, grade: 'C',  color: '#f59e0b' },
  { min: 35, grade: 'C-', color: '#ff6b35' },
  { min: 25, grade: 'D+', color: '#ff6b35' },
  { min: 15, grade: 'D',  color: '#ff3b5c' },
  { min: 0,  grade: 'F',  color: '#ff3b5c' },
];

function getWeeklyGrade(report: WeeklyReport): { grade: string; color: string; score: number } {
  const scores: number[] = [];

  // Workouts: 0 at 0, 100 at 5+
  scores.push(Math.min((report.workout_count / 5) * 100, 100));

  // Active minutes: 0 at 0, 100 at 300+ (≈ 5h/week)
  scores.push(Math.min((report.total_duration / 300) * 100, 100));

  // Strain: 0 at 0, 100 at 14+ (high activity)
  if (report.avg_strain != null && report.avg_strain > 0) {
    scores.push(Math.min((report.avg_strain / 14) * 100, 100));
  }

  // Sleep: 0 at <5h, 100 at 7.5h+
  if (report.avg_sleep_hours != null && report.avg_sleep_hours > 0) {
    const sleepScore = Math.min(Math.max((report.avg_sleep_hours - 5) / 2.5, 0) * 100, 100);
    scores.push(sleepScore);
  }

  // Nutrition: 0 at 0, 100 at 16+ (out of 21)
  if (report.avg_nutrition_score != null && report.avg_nutrition_score > 0) {
    scores.push(Math.min((report.avg_nutrition_score / 16) * 100, 100));
  }

  // Steps: 0 at 0, 100 at 70k+ (10k/day)
  if (report.total_steps > 0) {
    scores.push(Math.min((report.total_steps / 70000) * 100, 100));
  }

  const composite = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const threshold = GRADE_THRESHOLDS.find((t) => composite >= t.min) ?? GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];

  return { grade: threshold.grade, color: threshold.color, score: Math.round(composite) };
}

function TrendDelta({ current, prior }: { current: number | null; prior: number | null }) {
  if (current === null || current === undefined || prior === null || prior === undefined || prior === 0) return null;
  const pct = ((current - prior) / prior) * 100;
  if (Math.abs(pct) < 1) return null;
  const isUp = pct > 0;
  return (
    <span
      className="text-[9px] font-semibold tabular-nums"
      style={{ color: isUp ? 'var(--accent)' : '#ff3b5c' }}
    >
      {isUp ? '+' : ''}{pct.toFixed(0)}%
    </span>
  );
}

function ReportCard({ report, priorAvg, onDelete }: { report: WeeklyReport; priorAvg: PriorAverages; onDelete: () => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const highlights: string[] = report.ai_highlights ? JSON.parse(report.ai_highlights) : [];
  const weekLabel = `${format(parseISO(report.week_start), 'MMM d')} – ${format(parseISO(report.week_end), 'MMM d, yyyy')}`;
  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{weekLabel}</CardTitle>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setConfirmOpen(true)}
              className="p-1.5 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              title="Delete report"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
              style={{ color: 'var(--fg-muted)' }}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
          <Metric icon={Dumbbell} label="Workouts" value={String(report.workout_count)} color="#8b5cf6" delta={<TrendDelta current={report.workout_count} prior={priorAvg.workout_count} />} />
          <Metric icon={Activity} label="Active" value={`${report.total_duration}m`} color="#00bcd4" delta={<TrendDelta current={report.total_duration} prior={priorAvg.total_duration} />} />
          <Metric icon={Zap} label="Avg Strain" value={report.avg_strain?.toFixed(1) ?? '—'} color="var(--accent)" delta={<TrendDelta current={report.avg_strain} prior={priorAvg.avg_strain} />} />
          <Metric icon={Moon} label="Avg Sleep" value={report.avg_sleep_hours ? `${report.avg_sleep_hours}h` : '—'} color="#00bcd4" delta={<TrendDelta current={report.avg_sleep_hours} prior={priorAvg.avg_sleep_hours} />} />
          <Metric icon={Salad} label="Avg Nutrition" value={report.avg_nutrition_score?.toFixed(1) ?? '—'} color="var(--accent)" delta={<TrendDelta current={report.avg_nutrition_score} prior={priorAvg.avg_nutrition_score} />} />
          <Metric icon={Footprints} label="Steps" value={report.total_steps >= 1000 ? `${(report.total_steps / 1000).toFixed(0)}k` : String(report.total_steps)} color="#ff6b35" delta={<TrendDelta current={report.total_steps} prior={priorAvg.total_steps} />} />
        </div>

        {report.ai_summary && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
            {report.ai_summary}
          </p>
        )}

        {expanded && highlights.length > 0 && (
          <ul className="space-y-1.5 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                <span style={{ color: 'var(--accent)' }}>•</span>
                {h}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Delete report"
      description={`Delete the report for ${weekLabel}? This cannot be undone.`}
      confirmLabel="Delete"
      onConfirm={onDelete}
    />
    </>
  );
}

function Metric({ icon: Icon, label, value, color, delta }: { icon: typeof Dumbbell; label: string; value: string; color: string; delta?: ReactNode }) {
  return (
    <div className="text-center">
      <Icon className="h-3.5 w-3.5 mx-auto mb-1" style={{ color }} />
      <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{value}</div>
      <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{label}</div>
      {delta && <div className="mt-0.5">{delta}</div>}
    </div>
  );
}

async function generateReport(weekStart: string) {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week_start: weekStart }),
  });
  return res.ok;
}

export default function ReportsPage() {
  const { data: reports, isLoading, mutate } = useReportsList();
  const { data: strainData } = useStrainData(365);
  const [generating, setGenerating] = useState<'last' | 'all' | null>(null);

  const lastWeekStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const existingWeeks = new Set(reports?.map((r) => r.week_start) || []);
  const hasLastWeek = existingWeeks.has(lastWeekStart);

  const handleGenerateLastWeek = async () => {
    setGenerating('last');
    try {
      await generateReport(lastWeekStart);
      mutate();
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!strainData || strainData.length === 0) return;
    setGenerating('all');
    try {
      const dates = strainData.map((d) => d.date).sort();
      const firstDate = parseISO(dates[0]);
      const lastDate = parseISO(dates[dates.length - 1]);
      const weeks = eachWeekOfInterval({ start: firstDate, end: lastDate }, { weekStartsOn: 1 });

      for (const weekStart of weeks) {
        const ws = format(weekStart, 'yyyy-MM-dd');
        if (!existingWeeks.has(ws)) {
          await generateReport(ws);
        }
      }
      mutate();
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    await mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Reports</h1>
        <div className="flex items-center gap-2">
          {!hasLastWeek && (
            <Button onClick={handleGenerateLastWeek} disabled={generating !== null}>
              {generating === 'last' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Last Week</>
              )}
            </Button>
          )}
          <Button onClick={handleGenerateAll} disabled={generating !== null} variant="outline">
            {generating === 'all' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <>Generate All</>
            )}
          </Button>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
        AI-generated weekly summaries of your workouts, sleep, and nutrition.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
          ))}
        </div>
      ) : !reports || reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--fg-muted)' }} />
            <p className="text-sm mb-1" style={{ color: 'var(--fg-secondary)' }}>No reports yet</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Generate your first weekly report using the buttons above
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report, i) => (
            <ReportCard key={report.id} report={report} priorAvg={computePriorAverages(reports, i)} onDelete={() => handleDelete(report.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
