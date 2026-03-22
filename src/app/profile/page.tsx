'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { useWeeklyQuests } from '@/hooks/use-quests';
import { useAchievements } from '@/hooks/use-stats';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BADGES, getLevelDefinition, LEVEL_DEFINITIONS } from '@/lib/constants';
import { getLevel, getXpForLevel, getXpForNextLevel, getLevelTitle } from '@/lib/quests';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import { Dumbbell, Clock, Flame, Footprints, CalendarDays, X } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface ProfileStats {
  stats: { STR: number; END: number; REC: number; NUT: number; DSC: number };
  lifetime: {
    totalWorkouts: number;
    totalHours: number;
    totalCalories: number;
    avgStrain: number;
    totalSteps: number;
    activeDays: number;
    memberSince: string | null;
  };
}

const STAT_LABELS: Record<string, string> = {
  STR: 'Strength',
  END: 'Endurance',
  REC: 'Sleep',
  NUT: 'Nutrition',
  DSC: 'Discipline',
};

export default function ProfilePage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: profileData, isLoading: profileLoading } = useSWR<ProfileStats>(
    `/api/profile/stats?date=${today}`, fetcher
  );
  const { data: questData } = useWeeklyQuests();
  const { data: earned } = useAchievements();
  const { settings, updateSettings } = useSettings();

  const [pinPickerOpen, setPinPickerOpen] = useState(false);
  const [pinSlotIndex, setPinSlotIndex] = useState<number>(0);

  const xp = questData?.xp;
  const level = xp?.level ?? 1;
  const title = xp?.title ?? 'Rookie';
  const totalXp = xp?.total ?? 0;
  const currentLevelXp = xp?.currentLevelXp ?? 0;
  const nextLevelXp = xp?.nextLevelXp ?? 100;
  const levelDef = getLevelDefinition(level);
  const xpProgress = nextLevelXp > currentLevelXp
    ? ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 100;

  // Pinned badges from settings
  const pinnedBadges: string[] = (() => {
    try {
      const raw = settings?.pinned_badges;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();

  const earnedKeys = new Set((earned || []).map(a => a.badge_key));

  async function handlePin(badgeKey: string) {
    const newPinned = [...pinnedBadges];
    newPinned[pinSlotIndex] = badgeKey;
    await updateSettings({ pinned_badges: JSON.stringify(newPinned) });
    setPinPickerOpen(false);
  }

  async function handleUnpin(index: number) {
    const newPinned = pinnedBadges.filter((_, i) => i !== index);
    await updateSettings({ pinned_badges: JSON.stringify(newPinned) });
  }

  // Radar chart data
  const radarData = profileData
    ? Object.entries(profileData.stats).map(([key, value]) => ({
        stat: key,
        label: STAT_LABELS[key],
        value,
        fullMark: 100,
      }))
    : [];

  const lifetime = profileData?.lifetime;

  if (profileLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-48 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
        <div className="h-64 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Profile</h1>

      {/* ── Level Card ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            {/* Level icon */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ background: `${levelDef.color}18`, border: `2px solid ${levelDef.color}40` }}
            >
              {levelDef.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${levelDef.color}20`, color: levelDef.color }}
                >
                  Level {level}
                </span>
                <span className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{title}</span>
              </div>
              <div className="text-xs mb-2" style={{ color: 'var(--fg-muted)' }}>
                {totalXp} XP total
              </div>
              {/* XP progress bar */}
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(xpProgress, 100)}%`, background: `linear-gradient(90deg, ${levelDef.color}, var(--accent))` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>{currentLevelXp} XP</span>
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>{nextLevelXp} XP</span>
              </div>
            </div>
          </div>

          {/* Level progression strip */}
          <div className="mt-5 flex items-center gap-1 overflow-x-auto pb-1">
            {LEVEL_DEFINITIONS.map((def) => (
              <div
                key={def.level}
                className="flex flex-col items-center flex-shrink-0"
                style={{ opacity: def.level <= level ? 1 : 0.3 }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{
                    background: def.level <= level ? `${def.color}20` : 'var(--bg-elevated)',
                    border: def.level === level ? `2px solid ${def.color}` : '2px solid transparent',
                  }}
                >
                  {def.icon}
                </div>
                <span className="text-[8px] mt-0.5 font-medium" style={{ color: def.level <= level ? 'var(--fg-muted)' : 'var(--border)' }}>
                  {def.level}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── RPG Stats Radar ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="stat"
                  tick={{ fill: 'var(--fg-muted)', fontSize: 12, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  dataKey="value"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Stat breakdown */}
          <div className="grid grid-cols-5 gap-2 mt-2">
            {radarData.map((s) => (
              <div key={s.stat} className="text-center">
                <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{s.value}</div>
                <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Pinned Badges ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pinned Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[0, 1, 2].map((slotIdx) => {
              const badgeKey = pinnedBadges[slotIdx];
              const badge = badgeKey ? BADGES.find(b => b.key === badgeKey) : null;
              const earnedEntry = badge && earned ? earned.find(a => a.badge_key === badgeKey) : null;

              if (badge) {
                return (
                  <div
                    key={slotIdx}
                    className="relative flex-1 rounded-xl p-4 text-center group"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  >
                    <button
                      onClick={() => handleUnpin(slotIdx)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--bg-card)', color: 'var(--fg-muted)' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="text-3xl">{badge.icon}</span>
                    <p className="text-xs font-semibold mt-2" style={{ color: 'var(--fg)' }}>{badge.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>{badge.description}</p>
                  </div>
                );
              }

              return (
                <button
                  key={slotIdx}
                  onClick={() => { setPinSlotIndex(slotIdx); setPinPickerOpen(true); }}
                  className="flex-1 rounded-xl p-4 text-center transition-colors"
                  style={{
                    background: 'transparent',
                    border: '2px dashed var(--border)',
                    color: 'var(--fg-muted)',
                  }}
                >
                  <span className="text-2xl">+</span>
                  <p className="text-[10px] mt-1">Pin Badge</p>
                </button>
              );
            })}
          </div>

          {/* Badge picker modal */}
          {pinPickerOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPinPickerOpen(false)}>
              <div
                className="rounded-xl p-5 max-w-md w-full mx-4 max-h-[70vh] overflow-y-auto"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Choose a Badge</h3>
                  <button onClick={() => setPinPickerOpen(false)} style={{ color: 'var(--fg-muted)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {BADGES.filter(b => earnedKeys.has(b.key) && !pinnedBadges.includes(b.key)).map(badge => (
                    <button
                      key={badge.key}
                      onClick={() => handlePin(badge.key)}
                      className="rounded-lg p-3 text-center transition-colors hover:opacity-80"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-2xl">{badge.icon}</span>
                      <p className="text-[10px] font-medium mt-1 truncate" style={{ color: 'var(--fg)' }}>{badge.name}</p>
                    </button>
                  ))}
                  {BADGES.filter(b => earnedKeys.has(b.key) && !pinnedBadges.includes(b.key)).length === 0 && (
                    <p className="col-span-3 text-xs text-center py-4" style={{ color: 'var(--fg-muted)' }}>
                      No earned badges available to pin
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Lifetime Stats ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lifetime Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <Dumbbell className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{lifetime?.totalWorkouts ?? 0}</div>
                <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>Workouts</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{lifetime?.totalHours ?? 0}<span className="text-xs font-normal" style={{ color: 'var(--fg-muted)' }}>h</span></div>
                <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>Total Time</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <Flame className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{lifetime?.avgStrain ?? 0}</div>
                <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>Avg Strain</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <Footprints className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                  {lifetime ? (lifetime.totalSteps >= 1000000 ? `${(lifetime.totalSteps / 1000000).toFixed(1)}M` : `${Math.round(lifetime.totalSteps / 1000)}k`) : 0}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>Total Steps</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <CalendarDays className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{lifetime?.activeDays ?? 0}</div>
                <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>Active Days</div>
              </div>
            </div>
            {lifetime?.memberSince && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: 'var(--bg-elevated)' }}>
                  🏁
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
                    {format(new Date(lifetime.memberSince), 'MMM yyyy')}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>Member Since</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
