'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/components/providers/theme-provider';

interface TrendBarProps {
  data: { date: string; value: number }[];
  color?: string;
  label?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

export function TrendBar({ data, color = '#00d26a', label = 'Value', period = 'daily' }: TrendBarProps) {
  const { theme } = useTheme();
  const ct = {
    tick: theme === 'light' ? '#71717a' : '#6b7280',
    tooltipBg: theme === 'light' ? '#ffffff' : '#141419',
    tooltipBorder: theme === 'light' ? '#cccbda' : '#2a2a35',
    tooltipColor: theme === 'light' ? '#18181b' : '#e5e5e5',
  };

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
          tick={{ fill: ct.tick, fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: 'rgba(128,128,128,0.08)' }}
          contentStyle={{
            backgroundColor: ct.tooltipBg,
            border: `1px solid ${ct.tooltipBorder}`,
            borderRadius: '8px',
            color: ct.tooltipColor,
            fontSize: '12px',
          }}
          formatter={(value: unknown) => [Number(value).toFixed(1), label]}
        />
        <Bar dataKey="value" fill={color} fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
