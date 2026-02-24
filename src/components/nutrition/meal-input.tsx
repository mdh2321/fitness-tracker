'use client';

import { useState, useRef } from 'react';
import { CornerDownLeft, Loader2 } from 'lucide-react';

interface MealInputProps {
  onAdd: (description: string) => Promise<void>;
  disabled?: boolean;
}

export function MealInput({ onAdd, disabled }: MealInputProps) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = value.trim().length > 0 && !submitting && !disabled;

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setValue('');
    try {
      await onAdd(trimmed);
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-150"
      style={{
        background: 'var(--bg)',
        borderColor: focused ? '#00d26a' : 'var(--border)',
        boxShadow: focused ? '0 0 0 3px rgba(0, 210, 106, 0.12)' : 'none',
        opacity: disabled && !submitting ? 0.6 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Describe a meal or snack…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled || submitting}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--fg-muted)] disabled:cursor-not-allowed"
        style={{ color: 'var(--fg)' }}
      />
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 disabled:opacity-30"
        style={{
          background: canSubmit ? '#00d26a' : 'var(--bg-elevated)',
          color: canSubmit ? '#000' : 'var(--fg-muted)',
        }}
        aria-label="Add meal"
      >
        {submitting
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <CornerDownLeft className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  );
}
