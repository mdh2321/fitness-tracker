'use client';

import { useEffect, useState } from 'react';
import { Trash2, Salad } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getGradeColor } from '@/lib/constants';
import type { MealEntry } from '@/hooks/use-nutrition';

interface MealListProps {
  meals: MealEntry[];
  onDelete: (id: number) => Promise<void>;
  disabled?: boolean;
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emojiPop, setEmojiPop] = useState(false);

  // Bounce the emoji in the first time it appears for this row
  useEffect(() => {
    if (!meal.emoji) return;
    setEmojiPop(false);
    const t = setTimeout(() => setEmojiPop(true), 40);
    return () => clearTimeout(t);
  }, [meal.emoji]);

  const gradeColor = getGradeColor(meal.grade);

  return (
    <>
      <li
        className="group flex items-center gap-3 px-3 py-2 rounded-xl transition-colors"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <span
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: meal.emoji ? 'transparent' : 'rgba(0,210,106,0.12)',
          }}
        >
          {meal.emoji ? (
            <span
              className="text-xl leading-none select-none"
              style={{
                display: 'inline-block',
                transform: emojiPop ? 'scale(1)' : 'scale(0.3)',
                opacity: emojiPop ? 1 : 0,
                transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out',
              }}
            >
              {meal.emoji}
            </span>
          ) : (
            <span className="text-[10px] font-bold tabular-nums" style={{ color: '#00d26a' }}>
              {index + 1}
            </span>
          )}
        </span>

        <span
          className="flex-1 min-w-0 text-sm truncate"
          style={{ color: 'var(--fg)' }}
          title={meal.description}
        >
          {meal.description}
        </span>

        <div className="shrink-0 flex items-center gap-2">
          {meal.grade && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none"
              style={{
                background: `${gradeColor}22`,
                color: gradeColor,
              }}
            >
              {meal.grade}
            </span>
          )}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={disabled}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:text-[#ff3b5c] disabled:pointer-events-none"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Delete meal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </li>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete meal"
        description="This meal entry will be removed and your nutrition score will be recalculated."
        confirmLabel="Delete"
        onConfirm={() => onDelete(meal.id)}
      />
    </>
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
            Add a meal above to get your grade
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
