'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Eye, EyeOff, X } from 'lucide-react';

export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'today', label: 'Today', visible: true },
  { id: 'weekly', label: 'Weekly Overview', visible: true },
  { id: 'streaks', label: 'Streaks', visible: true },
  { id: 'fitness-summary', label: 'Fitness Summary', visible: true },
  { id: 'monthly-strain', label: 'Monthly Strain Rings', visible: true },
  { id: 'heatmap', label: 'Activity Heatmap', visible: true },
  { id: 'trends', label: 'Trends', visible: true },
  { id: 'totals', label: 'Summary Stats', visible: true },
];

interface LayoutEditorProps {
  layout: WidgetConfig[];
  onSave: (layout: WidgetConfig[]) => void;
  onClose: () => void;
}

export function LayoutEditor({ layout, onSave, onClose }: LayoutEditorProps) {
  const [items, setItems] = useState<WidgetConfig[]>(layout);

  const move = useCallback((index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const toggleVisibility = useCallback((index: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], visible: !next[index].visible };
      return next;
    });
  }, []);

  const handleReset = () => setItems(DEFAULT_LAYOUT);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-sm mx-4 max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Customize Dashboard</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-elevated)]">
            <X className="h-4 w-4" style={{ color: 'var(--fg-muted)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-2 py-2 px-3 rounded-lg"
              style={{
                background: item.visible ? 'var(--bg-elevated)' : 'transparent',
                opacity: item.visible ? 1 : 0.5,
              }}
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="p-0.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-20"
                >
                  <ChevronUp className="h-3 w-3" style={{ color: 'var(--fg-muted)' }} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="p-0.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-20"
                >
                  <ChevronDown className="h-3 w-3" style={{ color: 'var(--fg-muted)' }} />
                </button>
              </div>
              <span className="flex-1 text-sm font-medium" style={{ color: 'var(--fg)' }}>{item.label}</span>
              <button
                onClick={() => toggleVisibility(i)}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
              >
                {item.visible
                  ? <Eye className="h-4 w-4 text-[var(--accent)]" />
                  : <EyeOff className="h-4 w-4" style={{ color: 'var(--fg-muted)' }} />
                }
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
          <Button variant="outline" onClick={handleReset} className="flex-1">Reset</Button>
          <Button onClick={() => onSave(items)} className="flex-1">Save</Button>
        </div>
      </Card>
    </div>
  );
}
