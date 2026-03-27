'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkout, deleteWorkout } from '@/hooks/use-workouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getStrainColor, getStrainLabel, getWorkoutColor } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Clock, Flame, Activity, Heart, Trash2, Route, Timer, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkoutType } from '@/lib/constants';

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: workout, isLoading } = useWorkout(id);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    if (!workout) return;
    try {
      await deleteWorkout(workout.id);
      toast.success('Workout deleted');
      router.push('/workouts');
      router.refresh();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (isLoading) {
    return <div className="max-w-2xl mx-auto"><div className="h-48 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} /></div>;
  }

  if (!workout) {
    return <div className="text-center py-16" style={{ color: 'var(--fg-secondary)' }}>Workout not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{workout.name}</CardTitle>
              <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                {format(parseISO(workout.started_at), 'EEEE, MMM d, yyyy · h:mm a')}
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-sm border-transparent"
              style={{
                backgroundColor: `${getWorkoutColor(workout.name, workout.type as WorkoutType)}33`,
                color: getWorkoutColor(workout.name, workout.type as WorkoutType),
              }}
            >
              {workout.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
              <div className="text-2xl font-bold tabular-nums" style={{ color: getStrainColor(workout.strain_score) }}>
                {workout.strain_score.toFixed(1)}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Strain ({getStrainLabel(workout.strain_score)})</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
              <div className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                <Clock className="h-5 w-5" style={{ color: 'var(--fg-secondary)' }} />
                {workout.duration_minutes}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Minutes</div>
            </div>
            {workout.source === 'manual' && (
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                  <Activity className="h-5 w-5" style={{ color: 'var(--fg-secondary)' }} />
                  {workout.perceived_effort}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>RPE</div>
              </div>
            )}
            {workout.source === 'apple_health' && workout.avg_heart_rate && (
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                  <Heart className="h-5 w-5 text-[#ff3b5c]" />
                  {workout.avg_heart_rate}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Avg HR (bpm)</div>
              </div>
            )}
            {workout.source === 'apple_health' && workout.max_heart_rate && (
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                  <Heart className="h-5 w-5 text-[#ff3b5c]" />
                  {workout.max_heart_rate}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Max HR (bpm)</div>
              </div>
            )}
            {workout.calories && (
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                  <Flame className="h-5 w-5 text-[#ff6b35]" />
                  {workout.calories}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Calories</div>
              </div>
            )}
          </div>

          {workout.distance_km != null && workout.distance_km > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums" style={{ color: '#00bcd4' }}>
                  <Route className="h-5 w-5" />
                  {workout.distance_km.toFixed(2)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Distance (km)</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums" style={{ color: '#00bcd4' }}>
                  <Timer className="h-5 w-5" />
                  {(() => {
                    const paceMinPerKm = workout.duration_minutes / workout.distance_km!;
                    const mins = Math.floor(paceMinPerKm);
                    const secs = Math.round((paceMinPerKm - mins) * 60);
                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                  })()}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Pace (min/km)</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums" style={{ color: '#00bcd4' }}>
                  <Gauge className="h-5 w-5" />
                  {(workout.distance_km! / (workout.duration_minutes / 60)).toFixed(1)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Avg Speed (km/h)</div>
              </div>
            </div>
          )}

          {workout.exercises && workout.exercises.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-secondary)' }}>Exercises</h3>
              {workout.exercises.map((ex) => (
                <div key={ex.id} className="border rounded-lg p-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium" style={{ color: 'var(--fg)' }}>{ex.name}</span>
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{ex.muscle_group.replace('_', ' ')}</span>
                  </div>
                  {ex.sets && ex.sets.length > 0 && (
                    <div className="space-y-1">
                      {ex.sets.map((set) => (
                        <div key={set.id} className="flex items-center gap-3 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                          <span className="w-6" style={{ color: 'var(--fg-muted)' }}>{set.set_number}</span>
                          {set.reps && <span>{set.reps} reps</span>}
                          {set.weight_kg && <span>@ {set.weight_kg} kg</span>}
                          {set.distance_km && <span>{set.distance_km} km</span>}
                          {set.duration_seconds && <span>{Math.floor(set.duration_seconds / 60)}:{(set.duration_seconds % 60).toString().padStart(2, '0')}</span>}
                          {set.is_warmup && <Badge variant="secondary" className="text-[10px]">Warmup</Badge>}
                          {set.is_pr && <Badge className="text-[10px] bg-[#ff6b35]/20 text-[#ff6b35]">PR</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {workout.notes && (
            <div className="mt-6 p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
              <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{workout.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete workout"
        description="This workout and all its data will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
