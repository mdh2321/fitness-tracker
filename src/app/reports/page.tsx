'use client';

import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

function ReportCard({ report, priorAvg, onDelete }: { report: WeeklyReport; priorAvg: PriorAverages; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const highlights: string[] = report.ai_highlights ? JSON.parse(report.ai_highlights) : [];
  const weekLabel = `${format(parseISO(report.week_start), 'MMM d')} – ${format(parseISO(report.week_end), 'MMM d, yyyy')}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{weekLabel}</CardTitle>
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
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
    mutate();
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
