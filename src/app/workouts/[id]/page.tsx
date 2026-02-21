'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkout, deleteWorkout } from '@/hooks/use-workouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStrainColor, getStrainLabel } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Clock, Flame, Activity, Heart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkoutType } from '@/lib/constants';

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: workout, isLoading } = useWorkout(id);

  const handleDelete = async () => {
    if (!workout) return;
    if (!confirm('Delete this workout?')) return;
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
    return <div className="max-w-2xl mx-auto"><div className="h-48 rounded-xl bg-[#141419] border border-[#2a2a35] animate-pulse" /></div>;
  }

  if (!workout) {
    return <div className="text-center py-16 text-gray-400">Workout not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{workout.name}</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                {format(parseISO(workout.started_at), 'EEEE, MMM d, yyyy · h:mm a')}
              </p>
            </div>
            <Badge variant={workout.type as WorkoutType} className="text-sm">
              {workout.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-[#0a0a0f]">
              <div className="text-2xl font-bold tabular-nums" style={{ color: getStrainColor(workout.strain_score) }}>
                {workout.strain_score.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Strain ({getStrainLabel(workout.strain_score)})</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#0a0a0f]">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-100 tabular-nums">
                <Clock className="h-5 w-5 text-gray-400" />
                {workout.duration_minutes}
              </div>
              <div className="text-xs text-gray-500 mt-1">Minutes</div>
            </div>
            {workout.source === 'manual' && (
              <div className="text-center p-3 rounded-lg bg-[#0a0a0f]">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-100 tabular-nums">
                  <Activity className="h-5 w-5 text-gray-400" />
                  {workout.perceived_effort}
                </div>
                <div className="text-xs text-gray-500 mt-1">RPE</div>
              </div>
            )}
            {workout.source === 'apple_health' && workout.avg_heart_rate && (
              <div className="text-center p-3 rounded-lg bg-[#0a0a0f]">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-100 tabular-nums">
                  <Heart className="h-5 w-5 text-[#ff3b5c]" />
                  {workout.avg_heart_rate}
                </div>
                <div className="text-xs text-gray-500 mt-1">Avg HR (bpm)</div>
              </div>
            )}
            {workout.source === 'apple_health' && workout.max_heart_rate && (
              <div className="text-center p-3 rounded-lg bg-[#0a0a0f]">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-100 tabular-nums">
                  <Heart className="h-5 w-5 text-[#ff3b5c]" />
                  {workout.max_heart_rate}
                </div>
                <div className="text-xs text-gray-500 mt-1">Max HR (bpm)</div>
              </div>
            )}
            {workout.calories && (
              <div className="text-center p-3 rounded-lg bg-[#0a0a0f]">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-100 tabular-nums">
                  <Flame className="h-5 w-5 text-[#ff6b35]" />
                  {workout.calories}
                </div>
                <div className="text-xs text-gray-500 mt-1">Calories</div>
              </div>
            )}
          </div>

          {workout.exercises && workout.exercises.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Exercises</h3>
              {workout.exercises.map((ex) => (
                <div key={ex.id} className="border border-[#2a2a35] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-200">{ex.name}</span>
                    <span className="text-xs text-gray-500">{ex.muscle_group.replace('_', ' ')}</span>
                  </div>
                  {ex.sets && ex.sets.length > 0 && (
                    <div className="space-y-1">
                      {ex.sets.map((set) => (
                        <div key={set.id} className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="w-6 text-gray-600">{set.set_number}</span>
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
            <div className="mt-6 p-3 rounded-lg bg-[#0a0a0f]">
              <p className="text-sm text-gray-400">{workout.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
