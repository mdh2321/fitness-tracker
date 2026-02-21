'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createWorkout } from '@/hooks/use-workouts';
import { WORKOUT_NAME_OPTIONS, MUSCLE_GROUPS, EXERCISE_CATEGORIES } from '@/lib/constants';
import { Plus, Trash2, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { WorkoutType, ExerciseCategory, MuscleGroup } from '@/lib/constants';

interface SetForm {
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  distance_km: number | null;
  duration_seconds: number | null;
  is_warmup: boolean;
  is_pr: boolean;
}

interface ExerciseForm {
  name: string;
  category: ExerciseCategory;
  muscle_group: MuscleGroup;
  sets: SetForm[];
}

interface WorkoutFormData {
  type: WorkoutType;
  name: string;
  started_at: string;
  duration_minutes: number;
  perceived_effort: number;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  notes: string;
  exerciseList: ExerciseForm[];
}

export function WorkoutForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, control } = useForm<WorkoutFormData>({
    defaultValues: {
      type: 'strength',
      name: '',
      started_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      duration_minutes: 60,
      perceived_effort: 7,
      avg_heart_rate: null,
      max_heart_rate: null,
      calories: null,
      notes: '',
      exerciseList: [],
    },
  });

  const { fields: exerciseFields, append: appendExercise, remove: removeExercise } = useFieldArray({
    control,
    name: 'exerciseList',
  });

  const workoutType = watch('type');
  const workoutName = watch('name');
  const exerciseList = watch('exerciseList');

  const selectActivity = (label: string, type: WorkoutType) => {
    setSelectedActivity(label);
    setValue('type', type);
    if (label !== 'Other') {
      setValue('name', label);
    } else {
      setValue('name', '');
    }
  };

  const addExercise = () => {
    appendExercise({
      name: '',
      category: workoutType === 'cardio' ? 'cardio' : 'compound',
      muscle_group: 'full_body',
      sets: [{ set_number: 1, reps: null, weight_kg: null, distance_km: null, duration_seconds: null, is_warmup: false, is_pr: false }],
    });
  };

  const addSet = (exerciseIndex: number) => {
    const currentSets = exerciseList[exerciseIndex]?.sets || [];
    const newSets = [...currentSets, {
      set_number: currentSets.length + 1,
      reps: null,
      weight_kg: null,
      distance_km: null,
      duration_seconds: null,
      is_warmup: false,
      is_pr: false,
    }];
    setValue(`exerciseList.${exerciseIndex}.sets`, newSets);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const currentSets = exerciseList[exerciseIndex]?.sets || [];
    const newSets = currentSets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, set_number: i + 1 }));
    setValue(`exerciseList.${exerciseIndex}.sets`, newSets);
  };

  const onSubmit = async (data: WorkoutFormData) => {
    setSaving(true);
    try {
      const result = await createWorkout({
        ...data,
        started_at: new Date(data.started_at).toISOString(),
        ended_at: null,
      });
      if (result.newBadges && result.newBadges.length > 0) {
        result.newBadges.forEach((badge: any) => {
          toast.success(`${badge.icon} ${badge.name}`, { description: badge.description });
        });
      }
      toast.success('Workout saved!');
      router.push('/workouts');
      router.refresh();
    } catch {
      toast.error('Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  const isStrengthLike = workoutType === 'strength' || workoutType === 'mixed';
  const isCardioLike = workoutType === 'cardio';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WORKOUT_NAME_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => selectActivity(option.label, option.type)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    selectedActivity === option.label
                      ? 'border-[#00d26a] bg-[#00d26a]/10 text-[#00d26a]'
                      : 'border-[#2a2a35] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {selectedActivity === 'Other' && (
              <div>
                <Label htmlFor="name">Activity Name</Label>
                <Input {...register('name', { required: true })} placeholder="e.g., Pickleball, Boxing..." autoFocus />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="started_at">Date & Time</Label>
                <Input type="datetime-local" {...register('started_at')} max={format(new Date(), "yyyy-MM-dd'T'HH:mm")} />
              </div>
              <div>
                <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                <Input type="number" {...register('duration_minutes', { valueAsNumber: true })} min={1} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!workoutName}
                onClick={() => {
                  if (!workoutName) {
                    toast.error('Please select an activity');
                    return;
                  }
                  setStep(2);
                }}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Exercises</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                <Plus className="mr-1 h-4 w-4" /> Add Exercise
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {exerciseFields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No exercises added yet.</p>
                <p className="text-sm mt-1">Add exercises or skip this step for cardio-only workouts.</p>
              </div>
            )}

            {exerciseFields.map((field, exIdx) => (
              <div key={field.id} className="border border-[#2a2a35] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Exercise {exIdx + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeExercise(exIdx)}>
                    <Trash2 className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input {...register(`exerciseList.${exIdx}.name`)} placeholder="e.g., Bench Press" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={exerciseList[exIdx]?.category}
                      onValueChange={(v) => setValue(`exerciseList.${exIdx}.category`, v as ExerciseCategory)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXERCISE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Muscle Group</Label>
                    <Select
                      value={exerciseList[exIdx]?.muscle_group}
                      onValueChange={(v) => setValue(`exerciseList.${exIdx}.muscle_group`, v as MuscleGroup)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MUSCLE_GROUPS.map((mg) => (
                          <SelectItem key={mg} value={mg}>{mg.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Sets</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => addSet(exIdx)}>
                      <Plus className="h-3 w-3 mr-1" /> Set
                    </Button>
                  </div>

                  {(exerciseList[exIdx]?.sets || []).map((set, setIdx) => (
                    <div key={setIdx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-6">{setIdx + 1}</span>
                      {isStrengthLike && (
                        <>
                          <Input
                            type="number"
                            placeholder="Reps"
                            className="w-20"
                            {...register(`exerciseList.${exIdx}.sets.${setIdx}.reps`, { valueAsNumber: true })}
                          />
                          <Input
                            type="number"
                            placeholder="kg"
                            className="w-20"
                            step="0.5"
                            {...register(`exerciseList.${exIdx}.sets.${setIdx}.weight_kg`, { valueAsNumber: true })}
                          />
                        </>
                      )}
                      {isCardioLike && (
                        <>
                          <Input
                            type="number"
                            placeholder="km"
                            className="w-20"
                            step="0.01"
                            {...register(`exerciseList.${exIdx}.sets.${setIdx}.distance_km`, { valueAsNumber: true })}
                          />
                          <Input
                            type="number"
                            placeholder="sec"
                            className="w-20"
                            {...register(`exerciseList.${exIdx}.sets.${setIdx}.duration_seconds`, { valueAsNumber: true })}
                          />
                        </>
                      )}
                      {!isStrengthLike && !isCardioLike && (
                        <>
                          <Input
                            type="number"
                            placeholder="Reps"
                            className="w-20"
                            {...register(`exerciseList.${exIdx}.sets.${setIdx}.reps`, { valueAsNumber: true })}
                          />
                          <Input
                            type="number"
                            placeholder="sec"
                            className="w-20"
                            {...register(`exerciseList.${exIdx}.sets.${setIdx}.duration_seconds`, { valueAsNumber: true })}
                          />
                        </>
                      )}
                      <label className="flex items-center gap-1 text-xs text-gray-500">
                        <input
                          type="checkbox"
                          {...register(`exerciseList.${exIdx}.sets.${setIdx}.is_warmup`)}
                          className="rounded"
                        />
                        W
                      </label>
                      <label className="flex items-center gap-1 text-xs text-[#ff6b35]">
                        <input
                          type="checkbox"
                          {...register(`exerciseList.${exIdx}.sets.${setIdx}.is_pr`)}
                          className="rounded"
                        />
                        PR
                      </label>
                      {(exerciseList[exIdx]?.sets || []).length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSet(exIdx, setIdx)}>
                          <Trash2 className="h-3 w-3 text-gray-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Effort & Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Perceived Effort (RPE 1-10)</Label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="range"
                  min={1}
                  max={10}
                  {...register('perceived_effort', { valueAsNumber: true })}
                  className="flex-1 accent-[#00d26a]"
                />
                <span className="text-2xl font-bold tabular-nums text-gray-100 w-8 text-center">
                  {watch('perceived_effort')}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Easy</span>
                <span>Moderate</span>
                <span>Maximum</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Avg Heart Rate</Label>
                <Input type="number" {...register('avg_heart_rate', { valueAsNumber: true })} placeholder="bpm" />
              </div>
              <div>
                <Label>Max Heart Rate</Label>
                <Input type="number" {...register('max_heart_rate', { valueAsNumber: true })} placeholder="bpm" />
              </div>
            </div>

            <div>
              <Label>Calories</Label>
              <Input type="number" {...register('calories', { valueAsNumber: true })} placeholder="kcal" />
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                {...register('notes')}
                className="flex min-h-[80px] w-full rounded-lg border border-[#2a2a35] bg-[#0a0a0f] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d26a]"
                placeholder="How did it feel?"
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving...' : 'Save Workout'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step indicators */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              s === step ? 'bg-[#00d26a]' : 'bg-[#2a2a35]'
            }`}
          />
        ))}
      </div>
    </form>
  );
}
