'use client';

import { useRef, useState } from 'react';
import { CornerDownLeft, Loader2, Camera, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import type { ManualMealInput } from '@/hooks/use-nutrition';

interface MealInputProps {
  onAdd: (description: string) => Promise<void>;
  onAddPhoto: (
    photo: { data: string; media_type: 'image/jpeg' },
    note?: string,
  ) => Promise<void>;
  onAddManual: (manual: ManualMealInput) => Promise<void>;
  disabled?: boolean;
}

// Downscale + re-encode client-side so photo uploads stay well under body limits
async function fileToJpegBase64(file: File, maxDim = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export function MealInput({ onAdd, onAddPhoto, onAddManual, disabled }: MealInputProps) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = submitting || disabled;
  const canSubmitText = value.trim().length > 0 && !busy;
  const canSubmitManual =
    value.trim().length > 0 && manual.calories !== '' && manual.protein !== '' && !busy;

  const run = async (fn: () => Promise<void>) => {
    setSubmitting(true);
    try {
      await fn();
    } catch {
      toast.error('Failed to log meal');
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleText = () => {
    if (!canSubmitText) return;
    const text = value.trim();
    setValue('');
    run(() => onAdd(text));
  };

  const handleManualSubmit = () => {
    if (!canSubmitManual) return;
    const payload: ManualMealInput = {
      description: value.trim(),
      calories: parseFloat(manual.calories),
      protein_g: parseFloat(manual.protein),
      carbs_g: manual.carbs !== '' ? parseFloat(manual.carbs) : undefined,
      fat_g: manual.fat !== '' ? parseFloat(manual.fat) : undefined,
    };
    setValue('');
    setManual({ calories: '', protein: '', carbs: '', fat: '' });
    setManualOpen(false);
    run(() => onAddManual(payload));
  };

  const handlePhoto = async (file: File) => {
    const note = value.trim() || undefined;
    setValue('');
    await run(async () => {
      const data = await fileToJpegBase64(file);
      await onAddPhoto({ data, media_type: 'image/jpeg' }, note);
    });
  };

  const iconButton = (active: boolean) => ({
    background: active ? 'var(--bg-hover)' : 'transparent',
    color: active ? 'var(--fg)' : 'var(--fg-muted)',
  });

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-150"
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
          placeholder={manualOpen ? 'Meal name — e.g. protein shake' : 'Describe a meal, or snap a photo'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (manualOpen ? handleManualSubmit : handleText)();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={busy}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--fg-muted)] disabled:cursor-not-allowed min-w-0"
          style={{ color: 'var(--fg)' }}
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) handlePhoto(file);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors disabled:opacity-30 hover:bg-[var(--bg-elevated)]"
          style={iconButton(false)}
          aria-label="Log meal from photo"
          title="Photo — snap your plate"
        >
          <Camera className="h-4 w-4" />
        </button>
        <button
          onClick={() => setManualOpen((o) => !o)}
          disabled={busy}
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors disabled:opacity-30 hover:bg-[var(--bg-elevated)]"
          style={iconButton(manualOpen)}
          aria-label="Enter macros manually"
          title="Manual — type the macros yourself"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button
          onClick={manualOpen ? handleManualSubmit : handleText}
          disabled={manualOpen ? !canSubmitManual : !canSubmitText}
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 disabled:opacity-30"
          style={{
            background: (manualOpen ? canSubmitManual : canSubmitText) ? '#00d26a' : 'var(--bg-elevated)',
            color: (manualOpen ? canSubmitManual : canSubmitText) ? '#000' : 'var(--fg-muted)',
          }}
          aria-label="Add meal"
        >
          {submitting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <CornerDownLeft className="h-3.5 w-3.5" />
          }
        </button>
      </div>

      {manualOpen && (
        <div
          className="grid grid-cols-4 gap-2 px-3 py-2.5 rounded-xl border"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          {([
            ['calories', 'kcal', true],
            ['protein', 'Protein g', true],
            ['carbs', 'Carbs g', false],
            ['fat', 'Fat g', false],
          ] as const).map(([key, label, required]) => (
            <div key={key} className="min-w-0">
              <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>
                {label}{required ? '' : ' (opt)'}
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={manual[key]}
                onChange={(e) => setManual((m) => ({ ...m, [key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
                disabled={busy}
                className="w-full px-2 py-1.5 rounded-lg text-sm outline-none tabular-nums border focus:border-[#00d26a]"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg)' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
