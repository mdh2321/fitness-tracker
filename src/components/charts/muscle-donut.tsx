'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '@/components/providers/theme-provider';

interface MuscleDonutProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#00d26a', '#00bcd4', '#8b5cf6', '#ff6b35', '#ff3b5c', '#f59e0b', '#06b6d4', '#ec4899', '#10b981', '#6366f1', '#ef4444', '#14b8a6'];

export function MuscleDonut({ data }: MuscleDonutProps) {
  const { theme } = useTheme();
  const ct = {
    tooltipBg: theme === 'light' ? '#ffffff' : '#141419',
    tooltipBorder: theme === 'light' ? '#cccbda' : '#2a2a35',
    tooltipColor: theme === 'light' ? '#18181b' : '#e5e5e5',
  };

  if (data.length === 0) return <div className="text-center text-sm py-8" style={{ color: 'var(--fg-muted)' }}>No data yet</div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: ct.tooltipBg,
            border: `1px solid ${ct.tooltipBorder}`,
            borderRadius: '8px',
            color: ct.tooltipColor,
            fontSize: '12px',
          }}
          formatter={(value: unknown, name: unknown) => [String(value), String(name).replace('_', ' ')]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
