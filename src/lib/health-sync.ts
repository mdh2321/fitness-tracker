import { z } from 'zod';

export function normalizeMetricName(name: string): string {
  const n = name.toLowerCase().replace(/[\s_-]+/g, '');
  if (n === 'sleep' || (n.includes('sleep') && n.includes('analys'))) return 'sleep_analysis';
  if (n === 'steps' || (n.includes('step') && n.includes('count'))) return 'step_count';
  return name;
}

export function parseFlexibleDate(value: string): Date {
  return new Date(value.trim().replace(' ', 'T')
    .replace(/\s+([+-]\d{2}:?\d{2})$/, '$1')
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
}

export function extractLocalDate(value: string): string {
  return value.trim().slice(0, 10);
}

export function extractQty(value: unknown): number | null {
  const raw = typeof value === 'object' && value !== null && 'qty' in value
    ? (value as { qty: unknown }).qty : value;
  if (raw == null || (typeof raw === 'string' && raw.trim() === '') || (typeof raw !== 'number' && typeof raw !== 'string')) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function unitsOf(value: unknown): string {
  return typeof value === 'object' && value !== null && 'units' in value
    ? String((value as { units: unknown }).units ?? '').trim().toLowerCase() : '';
}

export function extractDistanceKm(value: unknown): number | null {
  const qty = extractQty(value);
  if (qty === null) return null;
  const factors: Record<string, number> = {
    '': 1, km: 1, kilometer: 1, kilometers: 1, kilometre: 1, kilometres: 1,
    m: .001, meter: .001, meters: .001, metre: .001, metres: .001,
    mi: 1.609344, mile: 1.609344, miles: 1.609344,
  };
  const factor = factors[unitsOf(value)];
  const result = factor === undefined ? NaN : qty * factor;
  return Number.isFinite(result) ? result : null;
}

export function extractKcal(value: unknown): number | null {
  const qty = extractQty(value);
  if (qty === null) return null;
  const units = unitsOf(value);
  if (units === 'kj') return qty / 4.184;
  return ['', 'kcal', 'cal', 'calories', 'kilocalories'].includes(units) ? qty : null;
}

const date = z.string().max(80).refine(
  v => {
    const value = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}(?:$|[T ])/.test(value) || !Number.isFinite(parseFlexibleDate(value).getTime())) return false;
    const calendarDate = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    return Number.isFinite(calendarDate.getTime()) && calendarDate.toISOString().slice(0, 10) === value.slice(0, 10);
  },
  'Invalid date',
);
const amount = z.union([z.number(), z.string().min(1).max(40)])
  .refine(v => extractQty(v) !== null, 'Expected a finite non-negative number');
const quantity = z.union([amount, z.object({ qty: amount, units: z.string().max(30).optional() }).passthrough()]);
const distance = quantity.refine(v => extractDistanceKm(v) !== null, 'Unsupported distance unit');
const energy = quantity.refine(v => extractKcal(v) !== null, 'Unsupported energy unit');
const optionalQuantity = quantity.nullish();
const workout = z.object({
  id: z.union([z.string().trim().min(1).max(200), z.number().finite()]).optional(),
  name: z.string().min(1).max(200),
  start: date.nullish(), startDate: date.nullish(),
  end: date.nullish(), endDate: date.nullish(),
  duration: amount.optional(),
  avgHeartRate: optionalQuantity, maxHeartRate: optionalQuantity,
  heartRate: z.object({ avg: optionalQuantity, max: optionalQuantity }).passthrough().nullish(),
  totalDistance: distance.nullish(), distance: distance.nullish(),
  activeEnergyBurned: energy.nullish(), totalEnergy: energy.nullish(), activeEnergy: energy.nullish(),
}).passthrough().superRefine((w, ctx) => {
  const start = w.start ?? w.startDate;
  const end = w.end ?? w.endDate;
  if (!start) ctx.addIssue({ code: 'custom', path: ['start'], message: 'Start date required' });
  if (start && end && parseFlexibleDate(end) < parseFlexibleDate(start)) {
    ctx.addIssue({ code: 'custom', path: ['end'], message: 'End precedes start' });
  }
  if (w.duration == null && !end) ctx.addIssue({ code: 'custom', path: ['duration'], message: 'Duration or end required' });
});
const hours = z.number().finite().min(0).max(72).nullish();
const sleep = z.object({
  asleep: hours, totalSleep: hours, deep: hours, rem: hours, core: hours, inBed: hours, awake: hours,
  sleepStart: date.nullish(), sleepEnd: date.nullish(), inBedStart: date.nullish(), inBedEnd: date.nullish(), date: date.nullish(),
}).passthrough().refine(s => !!(s.sleepEnd || s.inBedEnd || s.date), 'Sleep date required');
const steps = z.object({ date, qty: amount }).passthrough();
const metric = z.object({ name: z.string().min(1).max(200), data: z.array(z.unknown()).max(10000) }).passthrough()
  .superRefine((m, ctx) => {
    const name = normalizeMetricName(m.name);
    const schema = name === 'step_count' ? steps : name === 'sleep_analysis' ? sleep : null;
    if (!schema) return;
    m.data.forEach((entry, i) => {
      const result = schema.safeParse(entry);
      if (!result.success) result.error.issues.forEach(issue => ctx.addIssue({
        code: 'custom', path: ['data', i, ...issue.path], message: issue.message,
      }));
    });
  });
const payload = z.object({ workouts: z.array(workout).max(2000).default([]), metrics: z.array(metric).max(100).default([]) }).passthrough();

export function validateHealthSync(body: unknown) {
  const data = body && typeof body === 'object' && 'data' in body ? body.data : body;
  return payload.safeParse(data);
}
