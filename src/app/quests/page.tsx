'use client';

import { useState, useEffect, useRef } from 'react';
import { useWeeklyQuests, useXpStatus, type Quest, type DailyQuest, type LevelUpInfo } from '@/hooks/use-quests';
import { useAchievements } from '@/hooks/use-stats';
import { BadgeCard } from '@/components/achievements/badge-card';
import { BADGES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Trophy, Sparkles, Zap, RefreshCw, Sun, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { LevelUpModal } from '@/components/ui/level-up-modal';

function XpHeader({ xp }: { xp: { total: number; level: number; title: string; currentLevelXp: number; nextLevelXp: number; multiplier?: number; coreStreakWeeks?: number; streakShields?: number } }) {
  const progress = xp.nextLevelXp > xp.currentLevelXp
    ? ((xp.total - xp.currentLevelXp) / (xp.nextLevelXp - xp.currentLevelXp)) * 100
    : 100;
  const multiplier = xp.multiplier ?? 1;
  const shields = xp.streakShields ?? 0;

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl border"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Level circle */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, var(--accent))', color: 'white' }}
      >
        {xp.level}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{xp.title}</span>
          <span className="text-[11px] tabular-nums font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}>{xp.total} XP</span>
          {multiplier > 1 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#ff6b3520', color: '#ff6b35' }}
            >
              {multiplier}x
            </span>
          )}
          {shields > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#3b82f620', color: '#3b82f6' }}
            >
              <Shield className="w-2.5 h-2.5" /> {shields}
            </span>
          )}
        </div>
        {/* XP progress bar */}
        <div className="mt-2 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, #8b5cf6, var(--accent))' }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>{xp.currentLevelXp} XP</span>
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>{xp.nextLevelXp} XP</span>
        </div>
      </div>
    </div>
  );
}

function formatQuestValue(key: string, value: number): string {
  if (key.includes('steps') || key === 'weekly_steps' || key === 'daily_steps') {
    return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(Math.round(value));
  }
  if (key === 'daily_sleep') {
    const hours = value / 60;
    return `${hours.toFixed(1)}h`;
  }
  // Average-based quests — show decimal value with unit
  if (key === 'sleep_7h') {
    return `${value.toFixed(1)}h`;
  }
  return String(Math.round(value));
}

function QuestCard({ quest }: { quest: Quest }) {
  const pct = quest.target > 0 ? Math.min((quest.current / quest.target) * 100, 100) : 0;
  const isCore = quest.type === 'core';
  const accentColor = quest.completed ? '#00d26a' : isCore ? '#8b5cf6' : '#ff6b35';

  const currentDisplay = formatQuestValue(quest.quest_key, quest.current);
  const targetDisplay = formatQuestValue(quest.quest_key, quest.target);

  return (
    <div
      className="p-3 rounded-xl transition-all overflow-hidden relative"
      style={{
        background: quest.completed ? '#00d26a08' : 'var(--bg-card)',
        border: `1px solid ${quest.completed ? '#00d26a25' : 'var(--border)'}`,
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: accentColor, opacity: quest.completed ? 1 : 0.5 }}
      />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {isCore ? (
                <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8b5cf6' }} />
              ) : (
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ff6b35' }} />
              )}
              <span className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{quest.title}</span>
            </div>
            <p className="text-[11px] mt-0.5 ml-5" style={{ color: 'var(--fg-muted)' }}>{quest.description}</p>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: quest.completed ? '#00d26a20' : `${accentColor}15`,
              color: quest.completed ? 'var(--accent)' : accentColor,
            }}
          >
            {quest.completed ? '✓ Done' : `${quest.xp_reward} XP`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: accentColor,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
            {currentDisplay} / {targetDisplay}
          </span>
          <span className="text-[10px] tabular-nums font-medium" style={{ color: quest.completed ? 'var(--accent)' : 'var(--fg-muted)' }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function DailyQuestCard({ quest }: { quest: DailyQuest }) {
  const pct = quest.target > 0 ? Math.min((quest.current / quest.target) * 100, 100) : 0;
  const accentColor = quest.completed ? '#00d26a' : '#fbbf24';
  const currentDisplay = formatQuestValue(quest.quest_key, quest.current);
  const targetDisplay = formatQuestValue(quest.quest_key, quest.target);

  return (
    <div
      className="p-3 rounded-xl transition-all overflow-hidden relative"
      style={{
        background: quest.completed ? '#00d26a08' : 'var(--bg-card)',
        border: `1px solid ${quest.completed ? '#00d26a25' : 'var(--border)'}`,
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: accentColor, opacity: quest.completed ? 1 : 0.5 }}
      />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fbbf24' }} />
              <span className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{quest.title}</span>
            </div>
            <p className="text-[11px] mt-0.5 ml-5" style={{ color: 'var(--fg-muted)' }}>{quest.description}</p>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: quest.completed ? '#00d26a20' : '#fbbf2415',
              color: quest.completed ? 'var(--accent)' : '#fbbf24',
            }}
          >
            {quest.completed ? '✓ Done' : `${quest.xp_reward} XP`}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%`, background: accentColor }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
            {currentDisplay} / {targetDisplay}
          </span>
          <span className="text-[10px] tabular-nums font-medium" style={{ color: quest.completed ? 'var(--accent)' : 'var(--fg-muted)' }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
    </div>
  );
}

type Tab = 'quests' | 'badges' | 'xp';

export default function QuestsPage() {
  const [tab, setTab] = useState<Tab>('quests');
  const { data: questData, isLoading: questsLoading } = useWeeklyQuests();
  const { data: xpData, isLoading: xpLoading } = useXpStatus();
  const { data: earned, progress, isLoading: badgesLoading, mutate: mutateBadges } = useAchievements();
  const [recalculating, setRecalculating] = useState(false);
  const [levelUpData, setLevelUpData] = useState<LevelUpInfo | null>(null);

  // Detect level-up from quest API response
  useEffect(() => {
    if (questData?.levelUp) {
      setLevelUpData(questData.levelUp);
    }
  }, [questData?.levelUp]);

  const earnedKeys = new Set((earned || []).map((a) => a.badge_key));
  const earnedMap = new Map((earned || []).map((a) => [a.badge_key, a.earned_at]));
  const progressMap = new Map((progress || []).map((p) => [p.badge_key, p]));

  const coreQuests = questData?.quests.filter((q) => q.type === 'core') ?? [];
  const bonusQuests = questData?.quests.filter((q) => q.type === 'bonus') ?? [];
  const dailyQuests = questData?.dailyQuests ?? [];
  const dailyCompletedCount = dailyQuests.filter((q) => q.completed).length;
  const weeklyCompletedCount = questData?.quests.filter((q) => q.completed).length ?? 0;
  const completedCount = weeklyCompletedCount + dailyCompletedCount;
  const totalQuests = (questData?.quests.length ?? 0) + dailyQuests.length;

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const res = await fetch('/api/achievements', { method: 'POST' });
      const data = await res.json();
      await mutateBadges();
      const count = data.newBadges?.length ?? 0;
      toast.success(count > 0 ? `Unlocked ${count} new badge${count > 1 ? 's' : ''}!` : 'All badges up to date');
    } catch {
      toast.error('Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  }

  const isLoading = questsLoading || xpLoading;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Quests</h1>

      {/* XP Header */}
      {questData?.xp && <XpHeader xp={questData.xp} />}

      {/* Tab toggle */}
      <div
        className="flex rounded-xl p-1 w-fit gap-0.5"
        style={{ background: 'var(--bg-elevated)' }}
      >
        {([
          { key: 'quests' as Tab, label: 'Quests' },
          { key: 'badges' as Tab, label: 'Badges' },
          { key: 'xp' as Tab, label: 'XP History' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={{
              background: tab === key ? 'var(--bg-card)' : 'transparent',
              color: tab === key ? 'var(--fg)' : 'var(--fg-muted)',
              boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Quests tab */}
      {tab === 'quests' && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
              ))}
            </div>
          ) : (
            <>
              {/* Daily quests */}
              {dailyQuests.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                    <Sun className="w-3 h-3" style={{ color: '#fbbf24' }} />
                    Today&apos;s Quests
                    <span className="flex items-center gap-1 ml-auto">
                      {Array.from({ length: dailyQuests.length }, (_, i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ background: i < dailyCompletedCount ? 'var(--accent)' : 'var(--border)' }}
                        />
                      ))}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dailyQuests.map((q) => <DailyQuestCard key={q.id} quest={q} />)}
                  </div>
                </div>
              )}

              {/* Core quests */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                  <Target className="w-3 h-3" style={{ color: '#8b5cf6' }} />
                  Weekly Goals
                  <span className="flex items-center gap-1 ml-auto">
                    {Array.from({ length: coreQuests.length }, (_, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ background: i < coreQuests.filter(q => q.completed).length ? 'var(--accent)' : 'var(--border)' }}
                      />
                    ))}
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {coreQuests.map((q) => <QuestCard key={q.id} quest={q} />)}
                </div>
              </div>

              {/* Bonus quests */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                  <Sparkles className="w-3 h-3" style={{ color: '#ff6b35' }} />
                  Bonus Challenges
                  <span className="flex items-center gap-1 ml-auto">
                    {Array.from({ length: bonusQuests.length }, (_, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ background: i < bonusQuests.filter(q => q.completed).length ? 'var(--accent)' : 'var(--border)' }}
                      />
                    ))}
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {bonusQuests.map((q) => <QuestCard key={q.id} quest={q} />)}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Badges tab */}
      {tab === 'badges' && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
              {earnedKeys.size} / {BADGES.length} earned
            </span>
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
              style={{ color: 'var(--fg-secondary)', borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
            >
              <RefreshCw className={`h-3 w-3 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Checking…' : 'Recalculate'}
            </button>
          </div>

          {badgesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-36 rounded-xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {BADGES.map((badge) => (
                <BadgeCard
                  key={badge.key}
                  badgeKey={badge.key}
                  earnedAt={earnedMap.get(badge.key)}
                  locked={!earnedKeys.has(badge.key)}
                  progress={progressMap.get(badge.key)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* XP History tab */}
      {tab === 'xp' && (
        <>
          {xpLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />
              ))}
            </div>
          ) : !xpData?.history || xpData.history.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Zap className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--fg-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No XP earned yet. Complete quests to earn XP!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {xpData.history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#00d26a15', color: 'var(--accent)' }}
                  >
                    +{entry.amount}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{entry.description}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>{entry.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Level-up celebration modal */}
      {levelUpData && (
        <LevelUpModal levelUp={levelUpData} onClose={() => setLevelUpData(null)} />
      )}
    </div>
  );
}
