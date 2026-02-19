'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StrainRing } from '@/components/charts/strain-ring';
import { Clock, Flame, Dumbbell, Footprints } from 'lucide-react';

interface TodayCardProps {
  strain: number;
  workouts: number;
  duration: number;
  calories: number;
  steps: number;
}

export function TodayCard({ strain, workouts, duration, calories, steps }: TodayCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent>
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Today</h2>
        <div className="flex items-center gap-10">
          <StrainRing value={strain} />
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Dumbbell className="h-4 w-4" />
                <span className="text-xs">Workouts</span>
              </div>
              <div className="text-2xl font-bold tabular-nums text-gray-100">{workouts}</div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Duration</span>
              </div>
              <div className="text-2xl font-bold tabular-nums text-gray-100">{duration}<span className="text-sm font-normal text-gray-500">m</span></div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Flame className="h-4 w-4" />
                <span className="text-xs">Calories</span>
              </div>
              <div className="text-2xl font-bold tabular-nums text-gray-100">{calories.toLocaleString()}</div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Footprints className="h-4 w-4" />
                <span className="text-xs">Steps</span>
              </div>
              <div className="text-2xl font-bold tabular-nums text-gray-100">{steps.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
