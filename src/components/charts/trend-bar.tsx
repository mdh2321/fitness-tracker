'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/components/providers/theme-provider';

interface TrendBarProps {
  data: { date: string; value: number }[];
  color?: string;
  label?: string;
  period?: 'daily' | 'weekly' | 'monthly';
  formatter?: (value: number) => string;
}

export function TrendBar({ data, color = '#00d26a', label = 'Value', period = 'daily', formatter }: TrendBarProps) {
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
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 5 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke={ct.tooltipBorder} vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: ct.tick, fontSize: 11 }}
          interval={0}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: 'rgba(128,128,128,0.06)', radius: 4 }}
          contentStyle={{
            backgroundColor: ct.tooltipBg,
            border: `1px solid ${ct.tooltipBorder}`,
            borderRadius: '10px',
            color: ct.tooltipColor,
            fontSize: '12px',
            padding: '8px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
          formatter={(value: unknown) => [formatter ? formatter(Number(value)) : Number(value).toFixed(1), label]}
        />
        <Bar dataKey="value" fill={color} fillOpacity={0.9} radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
