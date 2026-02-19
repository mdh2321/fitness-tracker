'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MuscleDonutProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#00d26a', '#00bcd4', '#8b5cf6', '#ff6b35', '#ff3b5c', '#f59e0b', '#06b6d4', '#ec4899', '#10b981', '#6366f1', '#ef4444', '#14b8a6'];

export function MuscleDonut({ data }: MuscleDonutProps) {
  if (data.length === 0) return <div className="text-center text-gray-500 text-sm py-8">No data yet</div>;

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
            backgroundColor: '#141419',
            border: '1px solid #2a2a35',
            borderRadius: '8px',
            color: '#e5e5e5',
            fontSize: '12px',
          }}
          formatter={(value: unknown, name: unknown) => [String(value), String(name).replace('_', ' ')]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
