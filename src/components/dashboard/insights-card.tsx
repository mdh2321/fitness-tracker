'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Flame, Moon, Footprints, Zap, Award } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TrendPair {
  current: number;
  previous: number;
}

interface InsightsCardProps {
  trendComparison: {
    strain: TrendPair;
    steps: TrendPair;
    sleep: TrendPair;
    nutrition: TrendPair;
  };
  streakCurrent: number;
  sleepHours: number | null;
  last7Days: {
    strain_score: number;
    steps: number;
    sleep_minutes: number;
    workout_count: number;
  }[];
}

interface Insight {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  body: string;
}

function generateInsights({ trendComparison, streakCurrent, sleepHours, last7Days }: InsightsCardProps): Insight[] {
  const insights: Insight[] = [];
  const tc = trendComparison;

  // Strain trend
  if (tc.strain.previous > 0) {
    const pct = ((tc.strain.current - tc.strain.previous) / tc.strain.previous) * 100;
    if (pct > 10) {
      insights.push({
        icon: Zap,
        iconColor: 'var(--accent)',
        title: 'Training load is rising',
        body: `Your average strain is up ${Math.round(pct)}% compared to the prior week. Make sure you're balancing intensity with recovery.`,
      });
    } else if (pct < -15) {
      insights.push({
        icon: Zap,
        iconColor: '#00bcd4',
        title: 'Lower training volume this week',
        body: `Strain is down ${Math.abs(Math.round(pct))}% vs last week. This could be a good recovery period, or a sign to ramp things back up.`,
      });
    }
  }

  // Sleep trend
  if (tc.sleep.previous > 0) {
    const pct = ((tc.sleep.current - tc.sleep.previous) / tc.sleep.previous) * 100;
    if (pct < -5) {
      insights.push({
        icon: Moon,
        iconColor: '#8b5cf6',
        title: 'Your sleep is trending down',
        body: `Sleep duration has dipped ${Math.abs(Math.round(pct))}% compared to the prior week. Consistency here directly impacts recovery and strain capacity.`,
      });
    } else if (pct > 5) {
      insights.push({
        icon: Moon,
        iconColor: '#8b5cf6',
        title: 'Sleep is improving',
        body: `You're averaging ${Math.round(tc.sleep.current / 60 * 10) / 10} hours — up ${Math.round(pct)}% from last week. Keep it up for better recovery.`,
      });
    }
  }

  // Steps trend
  if (tc.steps.previous > 0) {
    const pct = ((tc.steps.current - tc.steps.previous) / tc.steps.previous) * 100;
    if (pct > 15) {
      insights.push({
        icon: Footprints,
        iconColor: '#ff6b35',
        title: 'Great movement this week',
        body: `Daily steps are up ${Math.round(pct)}% — averaging ${Math.round(tc.steps.current).toLocaleString()} per day. Your overall activity level is strong.`,
      });
    } else if (pct < -15) {
      insights.push({
        icon: Footprints,
        iconColor: '#ff6b35',
        title: 'Steps have dropped off',
        body: `You're averaging ${Math.round(tc.steps.current).toLocaleString()} steps/day, down ${Math.abs(Math.round(pct))}% from last week. Even short walks can help.`,
      });
    }
  }

  // Streak
  if (streakCurrent >= 7) {
    insights.push({
      icon: Award,
      iconColor: 'var(--accent)',
      title: `${streakCurrent}-day workout streak`,
      body: `You've been consistently training for ${streakCurrent} days straight. Consistency beats intensity — this is where real progress happens.`,
    });
  }

  // High strain day yesterday
  if (last7Days.length >= 2) {
    const yesterday = last7Days[last7Days.length - 2];
    if (yesterday.strain_score >= 15) {
      insights.push({
        icon: Flame,
        iconColor: '#ff3b5c',
        title: 'Yesterday was a hard session',
        body: `You hit a strain of ${yesterday.strain_score.toFixed(1)} yesterday. Consider lighter activity today to let your body recover.`,
      });
    }
  }

  // If no insights generated, add a default
  if (insights.length === 0) {
    insights.push({
      icon: TrendingUp,
      iconColor: 'var(--accent)',
      title: 'Keep building your data',
      body: 'As you log more workouts, sleep, and nutrition, personalised insights about your trends will appear here.',
    });
  }

  return insights.slice(0, 3);
}

export function InsightsCard(props: InsightsCardProps) {
  const insights = generateInsights(props);

  return (
    <Card>
      <CardContent>
        <div className="mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Insights & Trends</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>What your recent data is telling you</p>
        </div>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 rounded-xl"
              style={{ background: 'var(--bg)' }}
            >
              <div
                className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
                style={{ backgroundColor: `${insight.iconColor}15` }}
              >
                <insight.icon className="h-4.5 w-4.5" style={{ color: insight.iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{insight.title}</h3>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                  {insight.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
