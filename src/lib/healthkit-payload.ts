import { z } from 'zod';

const finite = z.number().finite().nonnegative();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => {
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
});
const instant = z.string().datetime({ offset: true });
const uuid = z.string().uuid().transform(s => s.toLowerCase());
const sleep = z.object({
  totalMinutes: finite.max(1440), inBedMinutes: finite.max(1440).nullish().transform(v => v ?? null),
  deepMinutes: finite.max(1440).nullish().transform(v => v ?? null), remMinutes: finite.max(1440).nullish().transform(v => v ?? null),
  coreMinutes: finite.max(1440).nullish().transform(v => v ?? null), awakeMinutes: finite.max(1440).nullish().transform(v => v ?? null),
  // Only explicit HealthKit tombstones may clear a previously imported day.
  confirmedDeletion: z.boolean().default(false),
}).strict();
export const healthkitPayload = z.object({
  version: z.literal(1), batchId: uuid, deviceId: uuid,
  workouts: z.array(z.object({
    id: uuid, name: z.string().min(1).max(100), start: instant, end: instant, localDate: date,
    durationSeconds: finite.positive().max(604800), distanceKm: finite.max(10000).nullish().transform(v => v ?? null),
    averageHeartRate: finite.max(300).nullish().transform(v => v ?? null), maximumHeartRate: finite.max(300).nullish().transform(v => v ?? null),
    activeCalories: finite.max(100000).nullish().transform(v => v ?? null),
  }).strict().refine(w => new Date(w.end) >= new Date(w.start), 'End precedes start')).max(100),
  deletedWorkoutIds: z.array(uuid).max(100),
  days: z.array(z.object({
    date, steps: finite.int().max(1000000).optional(),
    stepsConfirmedDeletion: z.boolean().default(false), sleep: sleep.optional(),
  }).strict()).max(200),
}).strict().superRefine((p, ctx) => {
  if (new Set(p.workouts.map(w => w.id)).size !== p.workouts.length || new Set(p.days.map(d => d.date)).size !== p.days.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate IDs or dates in batch' });
  if (p.workouts.some(w => p.deletedWorkoutIds.includes(w.id)))
    ctx.addIssue({ code: 'custom', message: 'Workout cannot be updated and deleted together' });
  for (const d of p.days) {
    if (d.steps === 0 && !d.stepsConfirmedDeletion) ctx.addIssue({ code: 'custom', message: 'Zero steps require a confirmed deletion' });
    if (d.sleep?.totalMinutes === 0 && !d.sleep.confirmedDeletion) ctx.addIssue({ code: 'custom', message: 'Empty sleep requires a confirmed deletion' });
  }
});
export type HealthKitPayload = z.infer<typeof healthkitPayload>;
