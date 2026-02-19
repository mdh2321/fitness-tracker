'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface VolumeBarProps {
  data: { date: string; total_volume: number; total_duration: number; strain_score: number }[];
  dataKey?: 'total_volume' | 'total_duration' | 'strain_score';
  color?: string;
}

export function VolumeBar({ data, dataKey = 'total_volume', color = '#00d26a' }: VolumeBarProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'EEE'),
  }));

  const labels: Record<string, string> = {
    total_volume: 'Volume (kg)',
    total_duration: 'Duration (min)',
    strain_score: 'Strain',
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            backgroundColor: '#141419',
            border: '1px solid #2a2a35',
            borderRadius: '8px',
            color: '#e5e5e5',
            fontSize: '12px',
          }}
          formatter={(value: unknown) => [
            dataKey === 'strain_score' ? Number(value).toFixed(1) : Math.round(Number(value)).toLocaleString(),
            labels[dataKey],
          ]}
          labelFormatter={(label) => label}
        />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
