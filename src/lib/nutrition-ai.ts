import Anthropic from '@anthropic-ai/sdk';
import {
  FITNESS_GOAL_LABELS,
  FITNESS_GOAL_PROMPT_GUIDANCE,
  type FitnessGoal,
  type Grade,
} from './constants';

const client = new Anthropic();

export interface NutritionAIMeal {
  id: number;
  description: string;
}

export interface NutritionAIContext {
  fitness_goal: FitnessGoal;
  weight_kg: number;
  today_strain?: number | null;
  today_workouts?: Array<{ name: string; duration_minutes: number }>;
  last_night_sleep_hours?: number | null;
}

export interface NutritionAIResult {
  daily: {
    score: number;
    summary: string;
  };
  meals: Array<{
    id: number;
    emoji: string;
    grade: Grade;
  }>;
}

export async function analyseNutrition(
  meals: NutritionAIMeal[],
  date: string,
  context: NutritionAIContext,
): Promise<NutritionAIResult> {
  const goalLabel = FITNESS_GOAL_LABELS[context.fitness_goal];
  const goalGuidance = FITNESS_GOAL_PROMPT_GUIDANCE[context.fitness_goal];

  const trainingLine =
    context.today_workouts && context.today_workouts.length > 0
      ? context.today_workouts
          .map(w => `${w.name} (${w.duration_minutes} min)`)
          .join(', ') +
        (context.today_strain != null
          ? ` · day strain ${context.today_strain.toFixed(1)}/21`
          : '')
      : '';

  const sleepLine =
    context.last_night_sleep_hours != null
      ? `${context.last_night_sleep_hours.toFixed(1)}h`
      : '';

  const prompt = `You are Arc's nutrition coach. You evaluate the user's day holistically with a strong emphasis on their specific fitness goal.

USER CONTEXT
- Fitness goal: ${goalLabel}
- ${goalGuidance}
- Bodyweight: ${context.weight_kg}kg
${trainingLine ? `- Training today: ${trainingLine}` : '- No training logged today.'}
${sleepLine ? `- Last night's sleep: ${sleepLine}` : ''}

MEALS LOGGED FOR ${date}
${meals.map((m, i) => `${i + 1}. [id ${m.id}] ${m.description}`).join('\n')}

PORTION SIZE
Read portion from the description itself. Words like "small", "little", "handful", "mini", "half" mean smaller than typical; "big", "large", "huge", "loaded", "double" mean larger. Otherwise assume a normal home-cooked serving. Don't ask for more detail.

GRADING PHILOSOPHY
Use the full 0-21 range. Do NOT hug the middle. Your job is to produce varied, decisive grades that reflect the real quality of the day — not safe middle scores. Over a month a real user's calendar should show a mix of A, B, C, D, E, and F days. If every day you grade is landing in 10-15, you are being too conservative. Be willing to reward a genuinely good day with a 17+ and punish a junk-dominated day with a 2.

SCORE BANDS (on 0-21 scale)
- A (17-21): High-quality day. Clear protein across meals, vegetables or fruit at most main meals, dominated by whole foods. Minor processed snacks (a bit of chocolate, some crackers) do NOT pull this down — the shape of the day matters more than the snacks.
- B (13-16): Good but uneven. One main meal was processed or light on veg, or snacks tilted a bit heavy. Still supportive of the goal.
- C (10-12): Average. Roughly half processed / half whole. Protein inconsistent, vegetables present but light. Neither helping nor hurting.
- D (7-9): Poor. Processed-heavy, thin on whole foods, weak protein or missing vegetables.
- E (4-6): Bad. Mostly processed or junk, almost no vegetables, low-quality protein, skipping meals.
- F (0-3): Off-track. Ultra-processed, junk/sugar/alcohol dominated, or actively working against the goal.

REFERENCE DAYS (for calibration)
- A-day: "Eggs on toast, chicken and rice with broccoli, salmon and sweet potato, a banana, a bit of dark chocolate." Protein at every meal, veg twice, whole foods dominating → score 18.
- B-day: "Cappuccino, ham sandwich, pasta bolognese, a cookie, chicken stir fry." Solid dinner saves a white-bread lunch → score 14.
- C-day: "Coffee, croissant, chicken wrap, bag of crisps, frozen pizza." Protein exists but whole-food content is thin → score 11.
- D-day: "Pastries, pot noodle, energy drink, takeaway burger and chips." Almost no whole food, weak protein → score 8.
- E-day: "Skipped breakfast, bag of crisps, chocolate bar, McDonald's dinner, ice cream." Junk-dominated with one real meal → score 5.
- F-day: "McDonald's breakfast, Monster, pizza, six beers, chocolate." Ultra-processed, high sugar/alcohol → score 2.

Assign a letter grade per meal using the same philosophy. A plain cappuccino is an A (neutral whole-food beverage), a pastry is a C, a McDonald's breakfast is a D, a home-cooked dinner of chicken + rice + broccoli is an A, a bag of crisps is an E, a six-pack of beer is an F.

For each meal pick ONE emoji that captures the dish. Be specific and characterful (🥗 for a salad, 🍔 for a burger, 🍜 for ramen, 🥞 for pancakes, 🥚 for eggs, 🍎 for an apple, 🥑 for avocado toast, 🍲 for a stew, 🍱 for a bento, 🍛 for a curry, 🌮 for tacos). Never default to 🍽️ or 🥘 — pick something that captures the dish. If truly nothing fits, use the closest whole-food emoji.

GUARDRAILS (these override grading temptation)
- This is a low-friction text input. Users describe meals briefly. NEVER penalise vague descriptions or demand more detail.
- Assume home-cooked whole food unless the user names a brand or fast-food chain ("McDonald's", "ready meal", "frozen pizza").
- Use general dish knowledge: a bolognese contains vegetables, a stir fry contains vegetables, a curry contains vegetables. Score what the dish typically contains, not what the user spelled out.
- Plain coffee drinks (cappuccino, flat white, latte, long black, espresso) contain NO added sugar unless the user says so — do not treat as sugary.
- Do NOT comment on the absence of specific food groups (legumes, nuts, seeds, grains) unless the day is clearly deficient overall.
- Do NOT comment on hydration or water intake — the user does not log drinks.
- The score reflects the day SO FAR. Don't complain that dinner hasn't been logged at breakfast time — just grade what's on the table.

SUMMARY
Write a single short paragraph (2-4 sentences, ~40-70 words) that captures the day: what's working, what's soft, and how it sits against the ${goalLabel.toLowerCase()} goal. Friendly, direct, second-person. No bullet points, no "make sure to…", no coach-speak.

OUTPUT
Call record_nutrition_analysis with the full analysis. Every meal above must appear in the meals array with its exact id.`;

  const tools: Anthropic.Tool[] = [
    {
      name: 'record_nutrition_analysis',
      description: 'Record the nutrition analysis for the day.',
      input_schema: {
        type: 'object',
        properties: {
          daily: {
            type: 'object',
            description: 'Day-level analysis',
            properties: {
              score: { type: 'number', description: '0-21 overall score for the day so far, one decimal OK' },
              summary: {
                type: 'string',
                description: '2-4 sentence paragraph capturing the day (~40-70 words).',
              },
            },
            required: ['score', 'summary'],
          },
          meals: {
            type: 'array',
            description: 'Per-meal analysis — one entry per meal in the input, matching ids.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'The meal id from the input list' },
                emoji: { type: 'string', description: 'A single emoji that represents the dish' },
                grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F'] },
              },
              required: ['id', 'emoji', 'grade'],
            },
          },
        },
        required: ['daily', 'meals'],
      },
    },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools,
    tool_choice: { type: 'tool', name: 'record_nutrition_analysis' },
    messages: [{ role: 'user', content: prompt }],
  });

  const toolUse = response.content.find(
    (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use',
  );
  if (!toolUse || toolUse.name !== 'record_nutrition_analysis') {
    throw new Error('Model did not call record_nutrition_analysis');
  }

  const result = toolUse.input as NutritionAIResult;
  result.daily.score = Math.max(0, Math.min(21, result.daily.score));

  const returnedIds = new Set(result.meals.map(m => m.id));
  for (const meal of meals) {
    if (!returnedIds.has(meal.id)) {
      result.meals.push({ id: meal.id, emoji: '🍽️', grade: 'C' });
    }
  }

  return result;
}
