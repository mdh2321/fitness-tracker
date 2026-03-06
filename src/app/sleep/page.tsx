'use client';

import { useState } from 'react';
import { format, subWeeks } from 'date-fns';
import { useSleep, useSleepHistory } from '@/hooks/use-sleep';
import { LastNightCard } from '@/components/sleep/last-night-card';
import { SleepCalendar } from '@/components/sleep/sleep-calendar';
import { SleepYearHeatmap } from '@/components/sleep/sleep-year-heatmap';
import { SleepTrends } from '@/components/sleep/sleep-trends';
import { SleepDetail } from '@/components/sleep/sleep-detail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function toLocalDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export default function SleepPage() {
  const today = toLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch last night's sleep (today's date since sleep data is keyed to wake date)
  const { sessions: todaySessions, daily: todayDaily, isLoading } = useSleep(today);

  // Fetch 52 weeks of history for calendar + trends
  const from = format(subWeeks(new Date(), 52), 'yyyy-MM-dd');
  const { history } = useSleepHistory(from, today);

  // Fetch selected date detail
  const { sessions: selectedSessions, daily: selectedDaily } = useSleep(selectedDate ?? '');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Sleep</h1>

      {/* Last Night summary */}
      <LastNightCard
        daily={todayDaily}
        session={todaySessions[0] ?? null}
        isLoading={isLoading}
      />

      {/* Monthly Sleep Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Sleep Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <SleepCalendar
            data={history}
            onSelectDate={setSelectedDate}
          />
        </CardContent>
      </Card>

      {/* Selected day detail */}
      {selectedDate && (
        <SleepDetail
          date={selectedDate}
          sessions={selectedSessions}
          daily={selectedDaily}
        />
      )}

      {/* Trends */}
      <SleepTrends data={history} />

      {/* Year Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Year Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <SleepYearHeatmap
            data={history}
            onSelectDate={setSelectedDate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
