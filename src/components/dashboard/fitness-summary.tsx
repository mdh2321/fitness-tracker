'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getWorkoutColor } from '@/lib/constants';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { Workout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';

interface FitnessSummaryProps {
  workouts: Workout[];
}

type ViewMode = 'time' | 'count';

function NameRow({ name, type, count, minutes, maxValue, mode }: { name: string; type: WorkoutType; count: number; minutes: number; maxValue: number; mode: ViewMode }) {
  const value = mode === 'time' ? minutes : count;
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const color = getWorkoutColor(name, type);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-sm text-gray-300 w-28 flex-shrink-0 truncate">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-[#1a1a24] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-medium text-gray-200 tabular-nums w-20 text-right flex-shrink-0">
        {mode === 'time' ? (
          hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
        ) : (
          `${count} ${count === 1 ? 'session' : 'sessions'}`
        )}
      </span>
    </div>
  );
}

function BreakdownView({ workouts, mode }: { workouts: Workout[]; mode: ViewMode }) {
  const breakdown = useMemo(() => {
    const totals: Record<string, { count: number; minutes: number; type: WorkoutType }> = {};
    for (const w of workouts) {
      if (!totals[w.name]) totals[w.name] = { count: 0, minutes: 0, type: w.type as WorkoutType };
      totals[w.name].count++;
      totals[w.name].minutes += w.duration_minutes;
    }
    return Object.entries(totals)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => (mode === 'time' ? b.minutes - a.minutes : b.count - a.count));
  }, [workouts, mode]);

  const totalMinutes = workouts.reduce((s, w) => s + w.duration_minutes, 0);
  const maxValue = breakdown.length > 0
    ? (mode === 'time' ? breakdown[0].minutes : breakdown[0].count)
    : 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  if (workouts.length === 0) {
    return <div className="text-center text-gray-500 text-sm py-4">No workouts this period</div>;
  }

  return (
    <div className="space-y-3">
      {/* Stacked percentage bar */}
      <div className="flex h-3 rounded-full overflow-hidden">
        {breakdown.map((b) => {
          const pct = totalMinutes > 0 ? (b.minutes / totalMinutes) * 100 : 0;
          return (
            <div
              key={b.name}
              style={{ width: `${pct}%`, backgroundColor: getWorkoutColor(b.name, b.type) }}
              className="transition-all duration-500"
            />
          );
        })}
      </div>

      {/* Summary line */}
      <div className="text-sm text-gray-400">
        {mode === 'time' ? (
          <>
            {totalHours > 0 && <><span className="text-lg font-bold text-gray-100">{totalHours}</span><span className="text-gray-500">h </span></>}
            <span className="text-lg font-bold text-gray-100">{remainingMins}</span>
            <span className="text-gray-500">m total</span>
          </>
        ) : (
          <>
            <span className="text-lg font-bold text-gray-100">{workouts.length}</span>
            <span className="text-gray-500"> sessions total</span>
          </>
        )}
      </div>

      {/* Per-activity rows */}
      <div>
        {breakdown.map((b) => (
          <NameRow key={b.name} name={b.name} type={b.type} count={b.count} minutes={b.minutes} maxValue={maxValue} mode={mode} />
        ))}
      </div>
    </div>
  );
}

export function FitnessSummary({ workouts }: FitnessSummaryProps) {
  const [mode, setMode] = useState<ViewMode>('time');
  const now = new Date();

  const weekWorkouts = useMemo(() => {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return workouts.filter((w) =>
      isWithinInterval(parseISO(w.started_at), { start, end })
    );
  }, [workouts]);

  const monthWorkouts = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return workouts.filter((w) =>
      isWithinInterval(parseISO(w.started_at), { start, end })
    );
  }, [workouts]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Workouts</CardTitle>
          <div className="flex items-center gap-1 bg-[#0a0a0f] rounded-lg p-0.5">
            <button
              onClick={() => setMode('time')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                mode === 'time' ? 'bg-[#2a2a35] text-gray-200' : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              Time
            </button>
            <button
              onClick={() => setMode('count')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                mode === 'count' ? 'bg-[#2a2a35] text-gray-200' : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              Count
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="week">
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
          <TabsContent value="week" className="mt-4">
            <BreakdownView workouts={weekWorkouts} mode={mode} />
          </TabsContent>
          <TabsContent value="month" className="mt-4">
            <BreakdownView workouts={monthWorkouts} mode={mode} />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <BreakdownView workouts={workouts} mode={mode} />
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}
