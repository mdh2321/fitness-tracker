'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2, Salad, Pencil, Send, Camera } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { MealEntry, ManualMealInput } from '@/hooks/use-nutrition';

const TEAL = '#00bcd4';
const AMBER = '#f59e0b';
const PURPLE = '#8b5cf6';

// time | emoji | name | P | C | F | kcal | actions — carbs/fat collapse on mobile
const GRID = 'grid grid-cols-[46px_36px_1fr_70px_88px_60px] md:grid-cols-[52px_40px_1fr_80px_80px_80px_96px_60px] items-center';

interface MealListProps {
  meals: MealEntry[];
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, patch: Partial<ManualMealInput>) => Promise<void>;
  disabled?: boolean;
}

function EditMealDialog({
  meal,
  open,
  onOpenChange,
  onUpdate,
}: {
  meal: MealEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: number, patch: Partial<ManualMealInput>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    description: meal.description,
    calories: String(meal.calories ?? ''),
    protein: String(meal.protein_g ?? ''),
    carbs: String(meal.carbs_g ?? ''),
    fat: String(meal.fat_g ?? ''),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        description: meal.description,
        calories: String(meal.calories ?? ''),
        protein: String(meal.protein_g ?? ''),
        carbs: String(meal.carbs_g ?? ''),
        fat: String(meal.fat_g ?? ''),
      });
    }
  }, [open, meal]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(meal.id, {
        description: form.description,
        calories: form.calories !== '' ? parseFloat(form.calories) : undefined,
        protein_g: form.protein !== '' ? parseFloat(form.protein) : undefined,
        carbs_g: form.carbs !== '' ? parseFloat(form.carbs) : undefined,
        fat_g: form.fat !== '' ? parseFloat(form.fat) : undefined,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const numField = (key: 'calories' | 'protein' | 'carbs' | 'fat', label: string) => (
    <div className="min-w-0">
      <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{label}</label>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full px-2 py-1.5 rounded-lg text-sm outline-none tabular-nums border focus:border-[#00d26a]"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit meal</DialogTitle>
          <DialogDescription>
            Correct the description or macros after checking a label.
          </DialogDescription>
        </DialogHeader>
        {meal.assumptions && (
          <p className="text-xs italic -mt-2" style={{ color: 'var(--fg-muted)' }}>
            AI assumed: {meal.assumptions}
          </p>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg text-sm outline-none border focus:border-[#00d26a]"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {numField('calories', 'kcal')}
            {numField('protein', 'Protein g')}
            {numField('carbs', 'Carbs g')}
            {numField('fat', 'Fat g')}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.description.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MacroCell({ value, color, hideOnMobile }: { value: number | null; color: string; hideOnMobile?: boolean }) {
  return (
    <div className={`${hideOnMobile ? 'hidden md:flex' : 'flex'} items-center justify-end text-[13px] font-semibold tabular-nums`} style={{ color: 'var(--fg-secondary)' }}>
      {value != null ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ background: color }} />
          {Math.round(value)}
          <span className="font-normal ml-0.5" style={{ color: 'var(--fg-muted)' }}>g</span>
        </>
      ) : (
        <span style={{ color: 'var(--fg-muted)' }}>–</span>
      )}
    </div>
  );
}

function MealRow({
  meal,
  onDelete,
  onUpdate,
  disabled,
}: {
  meal: MealEntry;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, patch: Partial<ManualMealInput>) => Promise<void>;
  disabled?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [emojiPop, setEmojiPop] = useState(false);

  useEffect(() => {
    if (!meal.emoji) return;
    setEmojiPop(false);
    const t = setTimeout(() => setEmojiPop(true), 40);
    return () => clearTimeout(t);
  }, [meal.emoji]);

  const time = format(parseISO(meal.logged_at), 'HH:mm');

  return (
    <>
      <li
        className={`${GRID} group gap-x-2 px-2 py-3 border-t transition-colors hover:bg-[var(--bg-elevated)]`}
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>{time}</span>

        <span className="flex justify-center">
          {meal.emoji ? (
            <span
              className="text-[21px] leading-none select-none"
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
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--bg-hover)' }} />
          )}
        </span>

        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="min-w-0 text-[13.5px] font-medium truncate" style={{ color: 'var(--fg)' }}>
              {meal.description}
            </span>
            {meal.source === 'telegram' && (
              <Send className="h-3 w-3 shrink-0" style={{ color: 'var(--fg-muted)' }} aria-label="Logged via Telegram" />
            )}
            {meal.input_method === 'photo' && (
              <Camera className="h-3 w-3 shrink-0" style={{ color: 'var(--fg-muted)' }} aria-label="Logged from photo" />
            )}
          </div>
          {meal.assumptions && (
            <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--fg-muted)' }} title={meal.assumptions}>
              {meal.assumptions}
            </p>
          )}
        </div>

        <MacroCell value={meal.protein_g} color={TEAL} />
        <MacroCell value={meal.carbs_g} color={AMBER} hideOnMobile />
        <MacroCell value={meal.fat_g} color={PURPLE} hideOnMobile />

        <div className="flex items-baseline justify-end tabular-nums">
          <span className="text-[14.5px] font-bold" style={{ color: 'var(--fg)' }}>
            {(meal.calories ?? 0).toLocaleString()}
          </span>
          <span className="text-[11px] ml-1" style={{ color: 'var(--fg-muted)' }}>kcal</span>
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setEditOpen(true)}
            disabled={disabled}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:text-[#00bcd4] disabled:pointer-events-none"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Edit meal"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={disabled}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:text-[#ff3b5c] disabled:pointer-events-none"
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
        description="This meal entry will be removed and your day will be recalculated."
        confirmLabel="Delete"
        onConfirm={() => onDelete(meal.id)}
      />
      <EditMealDialog meal={meal} open={editOpen} onOpenChange={setEditOpen} onUpdate={onUpdate} />
    </>
  );
}

export function MealList({ meals, onDelete, onUpdate, disabled }: MealListProps) {
  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
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
            Type a meal, snap a photo, or enter macros
          </p>
        </div>
      </div>
    );
  }

  const head = 'text-[10px] font-semibold uppercase tracking-wider';

  return (
    <ul>
      <li className={`${GRID} gap-x-2 px-2 pb-2`} style={{ color: '#4b4b58' }}>
        <span className={head}>Time</span>
        <span />
        <span className={head}>Meal</span>
        <span className={`${head} text-right`}>Protein</span>
        <span className={`${head} text-right hidden md:block`}>Carbs</span>
        <span className={`${head} text-right hidden md:block`}>Fat</span>
        <span className={`${head} text-right`}>Calories</span>
        <span />
      </li>
      {meals.map((meal) => (
        <MealRow
          key={meal.id}
          meal={meal}
          onDelete={onDelete}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      ))}
    </ul>
  );
}
