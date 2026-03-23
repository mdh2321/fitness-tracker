'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/components/providers/theme-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Sun, Moon, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { ExportCard } from '@/components/settings/export-card';
import { ACCENT_COLORS } from '@/lib/constants';
import { useWeeklyQuests } from '@/hooks/use-quests';

export default function SettingsPage() {
  const { settings, isLoading, updateSettings } = useSettings();
  const { register, handleSubmit, reset } = useForm();
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const { data: questData } = useWeeklyQuests();
  const userLevel = questData?.xp?.level ?? 1;
  useEffect(() => {
    if (settings) {
      // Convert sleep target from minutes (DB) to hours (UI)
      reset({
        ...settings,
        daily_sleep_minutes_target: settings.daily_sleep_minutes_target >= 60
          ? settings.daily_sleep_minutes_target / 60
          : settings.daily_sleep_minutes_target,
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: any) => {
    try {
      await updateSettings({
        weight_kg: parseFloat(data.weight_kg),
        birth_year: parseInt(data.birth_year),
        max_heart_rate: parseInt(data.max_heart_rate),
        resting_hr: parseInt(data.resting_hr),
        weekly_workout_target: parseInt(data.weekly_workout_target),
        weekly_cardio_minutes_target: parseInt(data.weekly_cardio_minutes_target),
        weekly_strength_sessions_target: parseInt(data.weekly_strength_sessions_target),
        weekly_steps_target: parseInt(data.weekly_steps_target),
        daily_active_minutes_target: parseInt(data.daily_active_minutes_target),
        daily_sleep_minutes_target: Math.round(parseFloat(data.daily_sleep_minutes_target) * 60),
        daily_nutrition_score_target: parseInt(data.daily_nutrition_score_target),
        daily_steps_target: parseInt(data.daily_steps_target),
        daily_strain_target: parseFloat(data.daily_strain_target),
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="h-64 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Settings</h1>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose your preferred color theme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-2 rounded-lg p-1 w-fit" style={{ background: 'var(--bg)' }}>
            <button
              onClick={() => setTheme('light')}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={theme === 'light'
                ? { background: 'var(--bg-elevated)', color: 'var(--fg)' }
                : { color: 'var(--fg-muted)' }}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={theme === 'dark'
                ? { background: 'var(--bg-elevated)', color: 'var(--fg)' }
                : { color: 'var(--fg-muted)' }}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
          </div>

          {/* Accent color picker */}
          <div>
            <Label className="mb-2 block">Accent Color</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((c) => {
                const isSelected = accentColor === c.hex;
                const isLocked = c.level > userLevel;
                return (
                  <button
                    key={c.hex + c.name}
                    onClick={() => !isLocked && setAccentColor(c.hex)}
                    className="relative group flex flex-col items-center gap-1"
                    title={isLocked ? `Unlocks at Level ${c.level}` : c.name}
                    disabled={isLocked}
                    style={{ opacity: isLocked ? 0.4 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full transition-all relative"
                      style={{
                        background: c.gradient || c.hex,
                        outline: isSelected ? '2px solid var(--fg)' : '2px solid transparent',
                        outlineOffset: '2px',
                      }}
                    >
                      {isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }}>
                          <Lock className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px]" style={{ color: 'var(--fg-muted)' }}>
                      {isLocked ? `Lv.${c.level}` : c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Used for strain calibration and heart rate zones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.1" {...register('weight_kg')} />
              </div>
              <div>
                <Label>Birth Year</Label>
                <Input type="number" {...register('birth_year')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Heart Rate (bpm)</Label>
                <Input type="number" {...register('max_heart_rate')} />
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Highest HR ever recorded</p>
              </div>
              <div>
                <Label>Resting Heart Rate (bpm)</Label>
                <Input type="number" {...register('resting_hr')} />
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Morning resting HR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Targets</CardTitle>
            <CardDescription>Set your weekly goals to track progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Workout Days per Week</Label>
              <Input type="number" min={1} max={7} {...register('weekly_workout_target')} />
            </div>
            <div>
              <Label>Cardio Minutes per Week</Label>
              <Input type="number" min={0} {...register('weekly_cardio_minutes_target')} />
            </div>
            <div>
              <Label>Strength Sessions per Week</Label>
              <Input type="number" min={0} max={7} {...register('weekly_strength_sessions_target')} />
            </div>
            <div>
              <Label>Weekly Steps Target</Label>
              <Input type="number" min={0} step={1000} {...register('weekly_steps_target')} />
              <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total steps goal for the week (e.g. 70,000 = 10k/day)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Targets</CardTitle>
            <CardDescription>Set your daily goals — these drive daily quests and streak thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Active Minutes</Label>
                <Input type="number" min={10} max={120} {...register('daily_active_minutes_target')} />
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Minutes of exercise per day</p>
              </div>
              <div>
                <Label>Sleep (hours)</Label>
                <Input type="number" min={5} max={10} step={0.5} {...register('daily_sleep_minutes_target', {
                  setValueAs: (v: string) => v,
                })} />
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Target hours of sleep per night</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nutrition Score</Label>
                <Input type="number" min={1} max={21} {...register('daily_nutrition_score_target')} />
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Out of 21</p>
              </div>
              <div>
                <Label>Daily Steps</Label>
                <Input type="number" min={1000} step={1000} {...register('daily_steps_target')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Strain Target</Label>
                <Input type="number" min={1} max={21} step={0.5} {...register('daily_strain_target')} />
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Daily strain score goal</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-4 z-10 pt-4">
          <Button type="submit" className="w-full shadow-lg">
            <Save className="mr-2 h-4 w-4" /> Save Settings
          </Button>
        </div>
      </form>

      <ExportCard />
    </div>
  );
}
