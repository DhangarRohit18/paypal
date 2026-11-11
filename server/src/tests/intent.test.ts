import { describe, it, expect } from 'vitest';
import {
  parseIntentOffline,
  IntentOutputSchema,
  createDefaultRequirements
} from '../agents/intentAgent.js';

describe('Intent Agent & Requirements Parsing', () => {
  it('validates structured intent with Zod schema', () => {
    const rawData = {
      categories: ['laptops'],
      budget: { amount: 1000, currency: 'USD' },
      specs: { ram: 16, storage: 1000 },
      brandsInclude: ['Asus'],
      brandsExclude: ['Dell'],
      intendedUse: 'AI Development',
      excludedProducts: [],
      missingInfo: [],
      clarifyingQuestion: null
    };

    const parsed = IntentOutputSchema.safeParse(rawData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.budget.amount).toBe(1000);
      expect(parsed.data.categories).toContain('laptops');
      expect(parsed.data.brandsExclude).toContain('Dell');
    }
  });

  it('rejects invalid budget or negative values in Zod schema', () => {
    const invalidData = {
      categories: ['laptops'],
      budget: { amount: -500, currency: 'USD' }
    };
    const parsed = IntentOutputSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('extracts structured requirements from complex initial user prompt', () => {
    const prompt = 'I need a laptop for programming and AI development, budget $1,000, 16GB RAM, 1TB SSD';
    const reqs = parseIntentOffline(prompt);

    expect(reqs.categories).toContain('laptops');
    expect(reqs.category).toBe('laptops');
    expect(reqs.budget.amount).toBe(1000);
    expect(reqs.budgetLimit).toBe(1000);
    expect(reqs.specs.ram).toBe(16);
    expect(reqs.specs.storage).toBe(1000);
    expect(reqs.intendedUse).toContain('Software development and programming');
    expect(reqs.clarifyingQuestion).toBeNull();
  });

  it('preserves existing requirements on "make it cheaper" follow-up and reduces budget', () => {
    const initialPrompt = 'I need a laptop for programming and AI development, budget $1,000, 16GB RAM, 1TB SSD';
    const initialReqs = parseIntentOffline(initialPrompt);

    // Follow-up: "make it cheaper"
    const updatedReqs = parseIntentOffline('make it cheaper', initialReqs);

    // Budget reduced by 20% from 1000 to 800
    expect(updatedReqs.budget.amount).toBe(800);
    expect(updatedReqs.budgetLimit).toBe(800);
    // Category & specs preserved
    expect(updatedReqs.categories).toContain('laptops');
    expect(updatedReqs.specs.ram).toBe(16);
    expect(updatedReqs.specs.storage).toBe(1000);
  });

  it('preserves existing requirements on "exclude Dell" follow-up', () => {
    const initialPrompt = 'I need a laptop for programming, budget $1,000, 16GB RAM';
    const initialReqs = parseIntentOffline(initialPrompt);

    // Follow-up: "exclude Dell"
    const updatedReqs = parseIntentOffline('exclude Dell', initialReqs);

    expect(updatedReqs.brandsExclude).toContain('Dell');
    expect(updatedReqs.brandsInclude).not.toContain('Dell');
    expect(updatedReqs.categories).toContain('laptops');
    expect(updatedReqs.budget.amount).toBe(1000);
    expect(updatedReqs.specs.ram).toBe(16);
  });

  it('updates specs on follow-up "make it 32GB"', () => {
    const initialPrompt = 'I need a laptop for programming, budget $1,200, 16GB RAM';
    const initialReqs = parseIntentOffline(initialPrompt);

    const updatedReqs = parseIntentOffline('make it 32GB', initialReqs);

    expect(updatedReqs.specs.ram).toBe(32);
    expect(updatedReqs.categories).toContain('laptops');
    expect(updatedReqs.budget.amount).toBe(1200);
  });

  it('asks clarifying question when essential info is missing from vague query', () => {
    const vaguePrompt = 'hi';
    const reqs = parseIntentOffline(vaguePrompt);

    expect(reqs.clarifyingQuestion).not.toBeNull();
    expect(reqs.clarifyingQuestion).toContain('What type of product are you looking for');
    expect(reqs.missingInfo).toContain('category');
  });
});

