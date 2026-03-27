'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, ChevronRight, Dumbbell, Activity, Zap, Moon, Salad, Footprints } from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import Link from 'next/link';
import { useReportsList, type WeeklyReport } from '@/hooks/use-reports';

export function WeeklySummaryCard() {
  const { data: reports, mutate } = useReportsList();
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekLabel = `${format(startOfWeek(now, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(now, { weekStartsOn: 1 }), 'MMM d')}`;

  const currentWeekReport = reports?.find((r) => r.week_start === weekStart);
  const latestReport = reports?.[0]; // reports are ordered DESC by week_start
  const report = currentWeekReport ?? latestReport;
  const isCurrentWeek = report?.week_start === weekStart;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart }),
      });
      mutate();
    } finally {
      setGenerating(false);
    }
  };

  const highlights: string[] = report?.ai_highlights ? JSON.parse(report.ai_highlights) : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              Your Week
            </CardTitle>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
              {report && !isCurrentWeek
                ? `${format(parseISO(report.week_start), 'MMM d')} – ${format(parseISO(report.week_end), 'MMM d')}`
                : weekLabel}
            </p>
          </div>
          <Link href="/reports" className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--fg-muted)' }}>
            All reports <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!report ? (
          <div className="text-center py-6">
            <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
              Generate an AI summary of your week
            </p>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate Summary</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metrics row */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <MetricPill icon={Dumbbell} label="Workouts" value={String(report.workout_count)} color="#8b5cf6" />
              <MetricPill icon={Activity} label="Active" value={`${report.total_duration}m`} color="#00bcd4" />
              <MetricPill icon={Zap} label="Avg Strain" value={report.avg_strain?.toFixed(1) ?? '—'} color="var(--accent)" />
              <MetricPill icon={Moon} label="Avg Sleep" value={report.avg_sleep_hours ? `${report.avg_sleep_hours}h` : '—'} color="#00bcd4" />
              <MetricPill icon={Salad} label="Nutrition" value={report.avg_nutrition_score?.toFixed(1) ?? '—'} color="var(--accent)" />
              <MetricPill icon={Footprints} label="Steps" value={report.total_steps >= 1000 ? `${(report.total_steps / 1000).toFixed(0)}k` : String(report.total_steps)} color="#ff6b35" />
            </div>

            {/* AI Summary */}
            {report.ai_summary && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                {report.ai_summary}
              </p>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
              <ul className="space-y-1.5">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    <span style={{ color: 'var(--accent)' }}>•</span>
                    {h}
                  </li>
                ))}
              </ul>
            )}

            {/* Generate current week if showing an older report */}
            {!isCurrentWeek && (
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generating} className="w-full">
                  {generating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Generate this week&apos;s summary</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricPill({ icon: Icon, label, value, color }: { icon: typeof Dumbbell; label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <Icon className="h-3.5 w-3.5 mx-auto mb-1" style={{ color }} />
      <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{value}</div>
      <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{label}</div>
    </div>
  );
}
