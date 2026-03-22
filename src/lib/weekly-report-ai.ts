import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface WeekData {
  weekStart: string;
  weekEnd: string;
  workoutCount: number;
  totalDuration: number;
  avgStrain: number;
  avgSleepHours: number | null;
  avgNutritionScore: number | null;
  totalSteps: number;
}

export async function generateWeeklySummary(
  data: WeekData
): Promise<{ summary: string; highlights: string[] }> {
  const prompt = `You are a concise fitness coach reviewing someone's weekly health data.

Week: ${data.weekStart} to ${data.weekEnd}

Data:
- Workouts: ${data.workoutCount}
- Total active time: ${data.totalDuration} minutes
- Average daily strain: ${data.avgStrain.toFixed(1)} / 21
- Average sleep: ${data.avgSleepHours !== null ? `${data.avgSleepHours.toFixed(1)} hours` : 'No data'}
- Average nutrition score: ${data.avgNutritionScore !== null ? `${data.avgNutritionScore.toFixed(1)} / 21` : 'No data'}
- Total steps: ${data.totalSteps.toLocaleString()}

Write a brief, encouraging weekly summary. Be direct and specific — reference the actual numbers. Note what went well and one area to improve. Keep it to 2-3 sentences.

Also provide 3-4 short bullet-point highlights (achievements, patterns, or suggestions). Each highlight should be one short sentence.

Return ONLY valid JSON with no markdown:
{"summary": "<2-3 sentence summary>", "highlights": ["<highlight 1>", "<highlight 2>", "<highlight 3>"]}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as { type: 'text'; text: string }).text.trim();
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(text);
  return { summary: parsed.summary, highlights: parsed.highlights };
}
