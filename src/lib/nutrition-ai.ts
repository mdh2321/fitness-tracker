import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function scoreNutritionDay(
  meals: string[],
  date: string
): Promise<{ score: number; summary: string }> {
  const prompt = `You are evaluating a person's daily nutrition holistically.
They have logged these meals for ${date}:
${meals.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Score their day on a 0-21 scale where:
- 0-5: Very poor (ultra-processed, nutrient-void, excess sugar/alcohol)
- 5-10: Below average (mostly processed, limited vegetables/protein)
- 10-15: Good (balanced, mostly whole foods, adequate protein and vegetables)
- 15-18: Very good (excellent variety, whole foods, balanced macros)
- 18-21: Exceptional (near-optimal nutrition — diverse whole foods, lean protein, abundant vegetables, minimal processed food)

This is a low-friction logging system — users describe meals briefly and you must work with that. Never penalise vague descriptions or ask for more detail.
Use your general knowledge of dishes: bolognese contains vegetables, a stir fry contains vegetables, a curry contains vegetables. Score based on what a dish typically contains, not what the user has or hasn't spelled out.
Assume home-cooked and whole-food unless explicitly stated otherwise (e.g. "McDonald's", "ready meal", a brand name).
Plain coffee drinks (cappuccino, flat white, latte, long black, espresso) contain no added sugar unless the user says otherwise — do not treat them as sugary.
Only penalise things that are clearly poor nutritional choices — do not invent concerns from incomplete descriptions.
Do not comment on the absence of specific food groups (legumes, nuts, seeds, grains etc.) unless the overall day is clearly deficient. Score what is there, not what is missing.
Do not comment on hydration or water intake — the user does not log drinks.

Return ONLY valid JSON with no markdown:
{"score": <number 0-21 with one decimal>, "summary": "<1-2 sentences explaining the score>"}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as { type: 'text'; text: string }).text.trim();
  // Strip markdown code fences if the model wraps the JSON
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(text);
  return { score: Math.max(0, Math.min(21, parsed.score)), summary: parsed.summary };
}
