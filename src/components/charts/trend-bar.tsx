'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface TrendBarProps {
  data: { date: string; value: number }[];
  color?: string;
  label?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

export function TrendBar({ data, color = '#00d26a', label = 'Value', period = 'daily' }: TrendBarProps) {
  const dateFormat = period === 'monthly' ? 'MMM' : 'MMM d';
  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), dateFormat),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            backgroundColor: '#141419',
            border: '1px solid #2a2a35',
            borderRadius: '8px',
            color: '#e5e5e5',
            fontSize: '12px',
          }}
          formatter={(value: unknown) => [Number(value).toFixed(1), label]}
        />
        <Bar dataKey="value" fill={color} fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
