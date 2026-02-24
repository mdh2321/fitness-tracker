'use client';

import { useState } from 'react';
import { Trash2, Salad } from 'lucide-react';
import type { MealEntry } from '@/hooks/use-nutrition';

interface MealListProps {
  meals: MealEntry[];
  onDelete: (id: number) => Promise<void>;
  disabled?: boolean;
}

function formatTime(isoString: string) {
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function MealRow({
  meal,
  index,
  onDelete,
  disabled,
}: {
  meal: MealEntry;
  index: number;
  onDelete: (id: number) => Promise<void>;
  disabled?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(meal.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li
      className="group flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors"
      style={{ background: 'var(--bg-elevated)' }}
    >
      {/* Index badge */}
      <span
        className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums"
        style={{ background: 'rgba(0,210,106,0.12)', color: '#00d26a' }}
      >
        {index + 1}
      </span>

      {/* Description */}
      <span className="flex-1 text-sm leading-snug" style={{ color: 'var(--fg)' }}>
        {meal.description}
      </span>

      {/* Time + delete */}
      <div className="shrink-0 flex items-center gap-2 mt-0.5">
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
          {formatTime(meal.logged_at)}
        </span>
        <button
          onClick={handleDelete}
          disabled={disabled || deleting}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:text-[#ff3b5c] disabled:pointer-events-none"
          style={{ color: 'var(--fg-muted)' }}
          aria-label="Delete meal"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

export function MealList({ meals, onDelete, disabled }: MealListProps) {
  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <Salad className="h-6 w-6" style={{ color: 'var(--fg-muted)' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
            Nothing logged yet
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            Add a meal above to get your score
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {meals.map((meal, i) => (
        <MealRow
          key={meal.id}
          meal={meal}
          index={i}
          onDelete={onDelete}
          disabled={disabled}
        />
      ))}
    </ul>
  );
}
