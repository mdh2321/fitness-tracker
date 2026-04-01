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
    tick: theme === 'light' ? '#8a8378' : '#706c66',
    grid: theme === 'light' ? '#ddd6c9' : '#2a2a2e',
    tooltipBg: theme === 'light' ? '#faf8f4' : '#1e1e22',
    tooltipBorder: theme === 'light' ? '#ddd6c9' : '#2a2a2e',
    tooltipColor: theme === 'light' ? '#1a1a1a' : '#e8e6e1',
  };

  const dateFormat = period === 'monthly' ? 'MMM' : 'MMM d';
  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), dateFormat),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 5 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: ct.tick, fontSize: 11 }}
          interval={period === 'monthly' ? 0 : 'preserveStartEnd'}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: ct.tick, fontSize: 11 }}
          width={45}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
        />
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
