import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { IUnderstoodRequirements, IAgentEvent } from '../../../shared/types.js';
import { store } from '../db/inMemoryStore.js';

export const IntentOutputSchema = z.object({
  categories: z.array(z.string()).default([]),
  budget: z.object({
    amount: z.number().positive(),
    currency: z.literal('USD').default('USD')
  }).default({ amount: 1500, currency: 'USD' }),
  specs: z.record(z.any()).default({}),
  brandsInclude: z.array(z.string()).default([]),
  brandsExclude: z.array(z.string()).default([]),
  intendedUse: z.string().default(''),
  excludedProducts: z.array(z.string()).default([]),
  missingInfo: z.array(z.string()).default([]),
  clarifyingQuestion: z.string().nullable().default(null)
});

export type IntentAgentRawOutput = z.infer<typeof IntentOutputSchema>;

export interface IntentAgentResult {
  requirements: IUnderstoodRequirements;
  mode: 'ai_llm' | 'offline_rule_based';
  clarifyingQuestion: string | null;
  reasoning: string;
}

export function createDefaultRequirements(category?: string, budget = 1500): IUnderstoodRequirements {
  return {
    categories: category ? [category] : [],
    category: category,
    budget: { amount: budget, currency: 'USD' },
    budgetLimit: budget,
    specs: {},
    requiredSpecs: {},
    brandsInclude: [],
    preferredBrands: [],
    brandsExclude: [],
    excludedBrands: [],
    intendedUse: '',
    targetUse: '',
    excludedProducts: [],
    missingInfo: [],
    mustHaveFeatures: [],
    clarifyingQuestion: null
  };
}

const KNOWN_BRANDS = [
  'asus', 'dell', 'lenovo', 'apple', 'sony', 'logitech', 'keychron',
  'razer', 'google', 'samsung', 'anker', 'benq', 'darkforge'
];

/**
 * Deterministic offline extractor & merger.
 * Extracts categories, budget, specs, brand inclusion/exclusion, and merges with existing requirements.
 */
export function parseIntentOffline(
  userMessage: string,
  existingReqs?: IUnderstoodRequirements
): IUnderstoodRequirements {
  const msgLower = userMessage.toLowerCase().trim();

  // 1. Start with existing or clean defaults
  const base: IUnderstoodRequirements = existingReqs
    ? {
        ...existingReqs,
        categories: [...(existingReqs.categories || [])],
        specs: { ...(existingReqs.specs || {}) },
        brandsInclude: [...(existingReqs.brandsInclude || [])],
        brandsExclude: [...(existingReqs.brandsExclude || [])],
        mustHaveFeatures: [...(existingReqs.mustHaveFeatures || [])],
        missingInfo: []
      }
    : createDefaultRequirements();

  // 2. Detect category
  let detectedCategory: string | undefined = undefined;
  if (msgLower.includes('laptop') || msgLower.includes('notebook') || msgLower.includes('macbook') || msgLower.includes('ultrabook')) {
    detectedCategory = 'laptops';
  } else if (msgLower.includes('monitor') || msgLower.includes('screen') || msgLower.includes('display')) {
    detectedCategory = 'monitors';
  } else if (msgLower.includes('headphone') || msgLower.includes('audio') || msgLower.includes('earbud') || msgLower.includes('headset')) {
    detectedCategory = 'headphones';
  } else if (msgLower.includes('keyboard')) {
    detectedCategory = 'keyboards';
  } else if (msgLower.includes('mouse') || msgLower.includes('mice')) {
    detectedCategory = 'mice';
  } else if (msgLower.includes('phone') || msgLower.includes('smartphone') || msgLower.includes('iphone') || msgLower.includes('android')) {
    detectedCategory = 'smartphones';
  } else if (msgLower.includes('camera') || msgLower.includes('webcam')) {
    detectedCategory = 'cameras';
  } else if (msgLower.includes('smart home') || msgLower.includes('smart bulb') || msgLower.includes('thermostat')) {
    detectedCategory = 'smart_home';
  } else if (msgLower.includes('adapter') || msgLower.includes('gaming') || msgLower.includes('dock') || msgLower.includes('accessory')) {
    detectedCategory = 'gaming_accessories';
  }

  if (detectedCategory) {
    if (!base.categories.includes(detectedCategory)) {
      base.categories = [detectedCategory];
    }
  }

  // 3. Detect Budget & Relative Budget Follow-ups ("make it cheaper", "cheaper")
  const isCheaperFollowUp =
    msgLower.includes('cheaper') ||
    msgLower.includes('lower budget') ||
    msgLower.includes('less expensive') ||
    msgLower.includes('reduce budget') ||
    msgLower.includes('cut budget');

  const budgetExplicitMatch =
    userMessage.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:budget|dollars?|usd|\$)/i) ||
    userMessage.match(/budget(?:\s+is|\s+of|:)?\s*\$?\s*(\d+(?:,\d{3})*)/i) ||
    userMessage.match(/under\s+\$?\s*(\d+(?:,\d{3})*)/i) ||
    userMessage.match(/max(?:imum)?\s+\$?\s*(\d+(?:,\d{3})*)/i);

  if (budgetExplicitMatch) {
    const rawNum = budgetExplicitMatch[1].replace(/,/g, '');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      base.budget = { amount: parsed, currency: 'USD' };
    }
  } else if (isCheaperFollowUp) {
    // Reduce current budget by 20% (minimum floor $100)
    const currentBudget = base.budget?.amount || 1500;
    const reduced = Math.max(100, Math.round(currentBudget * 0.8));
    base.budget = { amount: reduced, currency: 'USD' };
  }

  // 4. Detect Brand Inclusions and Exclusions ("exclude Dell", "remove Dell", "no Dell")
  for (const brand of KNOWN_BRANDS) {
    const brandCapitalized = brand.charAt(0).toUpperCase() + brand.slice(1);
    const excludePatterns = [
      new RegExp(`(?:exclude|remove|no|without|drop)\\s+${brand}`, 'i'),
      new RegExp(`${brand}\\s+(?:is\\s+excluded|out)`, 'i')
    ];

    const isExcluded = excludePatterns.some(p => p.test(msgLower));
    if (isExcluded) {
      if (!base.brandsExclude.includes(brandCapitalized)) {
        base.brandsExclude.push(brandCapitalized);
      }
      base.brandsInclude = base.brandsInclude.filter(b => b.toLowerCase() !== brand);
    } else if (msgLower.includes(brand)) {
      if (!base.brandsExclude.includes(brandCapitalized) && !base.brandsInclude.includes(brandCapitalized)) {
        base.brandsInclude.push(brandCapitalized);
      }
    }
  }

  // 5. Detect Specs (RAM, Storage, Screen, Audio, Connectivity, GPU)
  // RAM
  const ramMatch =
    msgLower.match(/(\d+)\s*gb\s*ram/i) ||
    msgLower.match(/ram(?:\s*:\s*|\s+of\s+|\s+)(\d+)\s*gb/i) ||
    msgLower.match(/make\s+it\s+(\d+)\s*gb/i) ||
    msgLower.match(/upgrade\s+to\s+(\d+)\s*gb/i);
  if (ramMatch) {
    const ramVal = parseInt(ramMatch[1], 10);
    base.specs.ram = ramVal;
    if (!base.mustHaveFeatures.includes(`${ramVal}GB RAM`)) {
      base.mustHaveFeatures = base.mustHaveFeatures.filter(f => !f.includes('RAM'));
      base.mustHaveFeatures.push(`${ramVal}GB RAM`);
    }
  }

  // Storage
  const storageMatch =
    msgLower.match(/(\d+)\s*tb\s*(?:ssd|storage)/i) ||
    msgLower.match(/(\d+)\s*gb\s*(?:ssd|storage)/i) ||
    msgLower.match(/(\d+)\s*tb\b/i);
  if (storageMatch) {
    const isTB = storageMatch[0].toLowerCase().includes('tb');
    const storageVal = parseInt(storageMatch[1], 10);
    const inGB = isTB ? storageVal * 1000 : storageVal;
    base.specs.storage = inGB;
    const label = isTB ? `${storageVal}TB SSD` : `${storageVal}GB SSD`;
    if (!base.mustHaveFeatures.includes(label)) {
      base.mustHaveFeatures = base.mustHaveFeatures.filter(f => !f.includes('SSD') && !f.includes('storage'));
      base.mustHaveFeatures.push(label);
    }
  }

  // Display / Resolution
  if (msgLower.includes('4k')) {
    base.specs.resolution = '4K UHD';
    if (!base.mustHaveFeatures.includes('4K Resolution')) base.mustHaveFeatures.push('4K Resolution');
  }
  if (msgLower.includes('oled')) {
    base.specs.panelType = 'OLED';
    if (!base.mustHaveFeatures.includes('OLED Display')) base.mustHaveFeatures.push('OLED Display');
  }

  // Audio / Noise Cancellation
  if (msgLower.includes('anc') || msgLower.includes('noise cancel') || msgLower.includes('noise-cancel')) {
    base.specs.noiseCancellation = true;
    if (!base.mustHaveFeatures.includes('Active Noise Cancellation')) {
      base.mustHaveFeatures.push('Active Noise Cancellation');
    }
  }

  // Wireless / Connectivity
  if (msgLower.includes('wireless') || msgLower.includes('bluetooth')) {
    base.specs.connectivity = 'Wireless';
    if (!base.mustHaveFeatures.includes('Wireless Connectivity')) {
      base.mustHaveFeatures.push('Wireless Connectivity');
    }
  }

  // Dedicated GPU
  if (msgLower.includes('rtx') || msgLower.includes('gpu') || msgLower.includes('graphics card')) {
    base.specs.gpu = 'Dedicated GPU';
    if (!base.mustHaveFeatures.includes('Dedicated GPU')) {
      base.mustHaveFeatures.push('Dedicated GPU');
    }
  }

  // Intended Use
  if (!existingReqs || !base.intendedUse) {
    if (msgLower.includes('programming') || msgLower.includes('coding') || msgLower.includes('developer')) {
      base.intendedUse = 'Software development and programming';
    } else if (msgLower.includes('gaming')) {
      base.intendedUse = 'Gaming and high performance';
    } else if (msgLower.includes('office') || msgLower.includes('work')) {
      base.intendedUse = 'Productivity and office work';
    } else {
      base.intendedUse = userMessage.slice(0, 100);
    }
  }

  // 6. Clarifying Question: Only ask when essential info is completely missing
  const hasCategory = base.categories.length > 0;
  const hasBudget = base.budget && base.budget.amount > 0;
  const isVagueGreeting =
    /^(hi|hello|hey|greetings|help|shop|what can you do|recommend something)\b/i.test(msgLower) &&
    msgLower.split(' ').length < 5;

  if (isVagueGreeting || (!hasCategory && !hasBudget && Object.keys(base.specs).length === 0)) {
    base.clarifyingQuestion =
      'What type of product are you looking for (e.g. laptops, monitors, headphones), and what is your approximate budget?';
    base.missingInfo = ['category', 'budget'];
  } else {
    base.clarifyingQuestion = null;
    base.missingInfo = [];
  }

  // 7. Synchronize legacy helper aliases
  base.category = base.categories[0];
  base.budgetLimit = base.budget.amount;
  base.preferredBrands = [...base.brandsInclude];
  base.excludedBrands = [...base.brandsExclude];
  base.requiredSpecs = { ...base.specs };
  base.targetUse = base.intendedUse;

  return base;
}

/**
 * Invokes LLM (Gemini or OpenAI) with structured Zod output validation.
 * Retries once if malformed, then safely falls back to deterministic offline parser.
 */
export async function runIntentAgent(
  userMessage: string,
  existingReqs?: IUnderstoodRequirements
): Promise<IntentAgentResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    try {
      const result = await callGeminiIntent(userMessage, geminiKey, existingReqs);
      if (result) return result;
    } catch (err) {
      console.warn('[INTENT_AGENT] Gemini structured call failed, retrying once...', err);
      try {
        const retryResult = await callGeminiIntent(userMessage, geminiKey, existingReqs);
        if (retryResult) return retryResult;
      } catch (retryErr) {
        console.warn('[INTENT_AGENT] Gemini retry failed, falling back to offline rule-based mode.');
      }
    }
  } else if (openAIKey) {
    try {
      const result = await callOpenAIIntent(userMessage, openAIKey, existingReqs);
      if (result) return result;
    } catch (err) {
      console.warn('[INTENT_AGENT] OpenAI structured call failed, retrying once...', err);
      try {
        const retryResult = await callOpenAIIntent(userMessage, openAIKey, existingReqs);
        if (retryResult) return retryResult;
      } catch (retryErr) {
        console.warn('[INTENT_AGENT] OpenAI retry failed, falling back to offline rule-based mode.');
      }
    }
  }

  // Fallback: Deterministic offline mode
  const requirements = parseIntentOffline(userMessage, existingReqs);

  // Log AgentEvent
  const agentEvent: IAgentEvent = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    agentId: 'intent',
    action: 'EXTRACT_REQUIREMENTS_OFFLINE',
    toolName: 'parseIntentOffline',
    inputSummary: userMessage.slice(0, 100),
    outputSummary: `Category: ${requirements.category || 'Any'}, Budget: $${requirements.budget.amount}, Specs: ${JSON.stringify(requirements.specs)}`,
    permissionCheck: 'PASSED',
    riskLevel: 'LOW'
  };
  store.addAgentEvent(agentEvent);

  return {
    requirements,
    mode: 'offline_rule_based',
    clarifyingQuestion: requirements.clarifyingQuestion,
    reasoning:
      'Evaluated using AEGIS deterministic pattern and keyword matcher (Offline rule-based mode).'
  };
}

async function callGeminiIntent(
  userMessage: string,
  apiKey: string,
  existingReqs?: IUnderstoodRequirements
): Promise<IntentAgentResult | null> {
  const prompt = `You are the SHOPMATE AI Intent Agent. Extract shopping requirements from the user message.
Existing requirements: ${JSON.stringify(existingReqs || null)}
User message: "${userMessage}"

Respond STRICTLY with a valid JSON object matching this schema:
{
  "categories": ["laptops" | "monitors" | "headphones" | "keyboards" | "mice" | "smartphones" | "cameras" | "gaming_accessories" | "smart_home"],
  "budget": { "amount": number, "currency": "USD" },
  "specs": { "ram"?: number, "storage"?: number, "resolution"?: string, "connectivity"?: string },
  "brandsInclude": string[],
  "brandsExclude": string[],
  "intendedUse": string,
  "excludedProducts": string[],
  "missingInfo": string[],
  "clarifyingQuestion": string | null
}
Ask at most one clarifying question, ONLY when essential info (category or budget) is completely missing. Otherwise clarifyingQuestion must be null.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsedJson = JSON.parse(rawText);
  const validated = IntentOutputSchema.parse(parsedJson);

  const requirements: IUnderstoodRequirements = {
    categories: validated.categories,
    category: validated.categories[0],
    budget: validated.budget,
    budgetLimit: validated.budget.amount,
    specs: validated.specs,
    requiredSpecs: validated.specs,
    brandsInclude: validated.brandsInclude,
    preferredBrands: validated.brandsInclude,
    brandsExclude: validated.brandsExclude,
    excludedBrands: validated.brandsExclude,
    intendedUse: validated.intendedUse || userMessage,
    targetUse: validated.intendedUse || userMessage,
    excludedProducts: validated.excludedProducts,
    missingInfo: validated.missingInfo,
    mustHaveFeatures: Object.entries(validated.specs).map(([k, v]) => `${k}: ${v}`),
    clarifyingQuestion: validated.clarifyingQuestion
  };

  return {
    requirements,
    mode: 'ai_llm',
    clarifyingQuestion: validated.clarifyingQuestion,
    reasoning: 'Extracted via Gemini 1.5 Flash structured agent.'
  };
}

async function callOpenAIIntent(
  userMessage: string,
  apiKey: string,
  existingReqs?: IUnderstoodRequirements
): Promise<IntentAgentResult | null> {
  const prompt = `You are the SHOPMATE AI Intent Agent. Extract shopping requirements from the user message.
Existing requirements: ${JSON.stringify(existingReqs || null)}
User message: "${userMessage}"`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are SHOPMATE AI Intent Agent. Return strictly JSON matching: { categories: string[], budget: { amount: number, currency: "USD" }, specs: Record<string,any>, brandsInclude: string[], brandsExclude: string[], intendedUse: string, excludedProducts: string[], missingInfo: string[], clarifyingQuestion: string | null }'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || '{}';
  const parsedJson = JSON.parse(rawText);
  const validated = IntentOutputSchema.parse(parsedJson);

  const requirements: IUnderstoodRequirements = {
    categories: validated.categories,
    category: validated.categories[0],
    budget: validated.budget,
    budgetLimit: validated.budget.amount,
    specs: validated.specs,
    requiredSpecs: validated.specs,
    brandsInclude: validated.brandsInclude,
    preferredBrands: validated.brandsInclude,
    brandsExclude: validated.brandsExclude,
    excludedBrands: validated.brandsExclude,
    intendedUse: validated.intendedUse || userMessage,
    targetUse: validated.intendedUse || userMessage,
    excludedProducts: validated.excludedProducts,
    missingInfo: validated.missingInfo,
    mustHaveFeatures: Object.entries(validated.specs).map(([k, v]) => `${k}: ${v}`),
    clarifyingQuestion: validated.clarifyingQuestion
  };

  return {
    requirements,
    mode: 'ai_llm',
    clarifyingQuestion: validated.clarifyingQuestion,
    reasoning: 'Extracted via OpenAI GPT-4o-mini structured agent.'
  };
}
