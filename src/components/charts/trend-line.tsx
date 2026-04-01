'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/components/providers/theme-provider';

interface TrendLineProps {
  data: { date: string; value: number }[];
  color?: string;
  label?: string;
  formatter?: (value: number) => string;
}

export function TrendLine({ data, color = '#00d26a', label = 'Value', formatter }: TrendLineProps) {
  const { theme } = useTheme();
  const ct = {
    tick: theme === 'light' ? '#8a8378' : '#706c66',
    grid: theme === 'light' ? '#ddd6c9' : '#2a2a2e',
    tooltipBg: theme === 'light' ? '#faf8f4' : '#1e1e22',
    tooltipBorder: theme === 'light' ? '#ddd6c9' : '#2a2a2e',
    tooltipColor: theme === 'light' ? '#1a1a1a' : '#e8e6e1',
    cardBg: theme === 'light' ? '#faf8f4' : '#1e1e22',
  };

  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'MMM d'),
  }));

  const formatYAxis = (value: number) => {
    if (formatter) return formatter(value);
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value % 1 === 0 ? String(value) : value.toFixed(1);
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: ct.tick, fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: ct.tick, fontSize: 11 }}
          tickFormatter={formatYAxis}
          width={45}
          domain={['auto', 'auto']}
        />
        <Tooltip
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
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          dot={{ r: 3, fill: color, stroke: ct.cardBg, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: color, stroke: ct.cardBg, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
