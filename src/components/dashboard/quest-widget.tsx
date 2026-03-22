'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWeeklyQuests } from '@/hooks/use-quests';
import { Target, Sun } from 'lucide-react';
import Link from 'next/link';

export function QuestWidget() {
  const { data, isLoading } = useWeeklyQuests();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-24 animate-pulse rounded-lg" style={{ background: 'var(--bg-elevated)' }} />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { quests, dailyQuests = [], xp, allCompleted } = data;
  const weeklyCompleted = quests.filter((q) => q.completed).length;
  const dailyCompleted = dailyQuests.filter((q) => q.completed).length;
  const completed = weeklyCompleted + dailyCompleted;
  const total = quests.length + dailyQuests.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <Link href="/quests">
      <Card className="cursor-pointer hover:border-[var(--fg-muted)] transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Target className="w-4 h-4" style={{ color: '#8b5cf6' }} />
              Weekly Quests
            </CardTitle>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, var(--accent))', color: 'white' }}
              >
                {xp.level}
              </div>
              {allCompleted && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#00d26a20', color: 'var(--accent)' }}>
                  Perfect!
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-black tabular-nums" style={{ color: 'var(--fg)' }}>
              {completed}/{total}
            </span>
            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>quests completed</span>
          </div>

          {/* Overall progress bar */}
          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: allCompleted ? 'var(--accent)' : '#8b5cf6' }}
            />
          </div>

          {/* Mini quest indicators */}
          <div className="flex gap-1.5 flex-wrap items-center">
            {dailyQuests.length > 0 && (
              <>
                <Sun className="w-2.5 h-2.5" style={{ color: '#fbbf24' }} />
                {dailyQuests.map((q) => (
                  <div
                    key={`d-${q.id}`}
                    className="w-2 h-2 rounded-full"
                    style={{ background: q.completed ? 'var(--accent)' : '#fbbf2440' }}
                    title={`${q.title}: ${Math.round(q.current)}/${Math.round(q.target)}`}
                  />
                ))}
                <div className="w-px h-3 mx-0.5" style={{ background: 'var(--border)' }} />
              </>
            )}
            {quests.map((q) => (
              <div
                key={q.id}
                className="w-2 h-2 rounded-full"
                style={{
                  background: q.completed ? 'var(--accent)' : q.type === 'core' ? '#8b5cf640' : '#ff6b3540',
                }}
                title={`${q.title}: ${Math.round(q.current)}/${Math.round(q.target)}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
