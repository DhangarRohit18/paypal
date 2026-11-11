import { describe, it, expect } from 'vitest';
import { searchProducts, parseNumericSpec, getCategories } from '../services/discovery.js';

describe('Discovery Service (Deterministic, No LLM)', () => {
  it('parses numeric specifications with units accurately', () => {
    expect(parseNumericSpec('16GB')).toBe(16);
    expect(parseNumericSpec('32 GB')).toBe(32);
    expect(parseNumericSpec('1TB')).toBe(1000); // 1TB -> 1000GB
    expect(parseNumericSpec('2TB SSD')).toBe(2000);
    expect(parseNumericSpec(512)).toBe(512);
    expect(parseNumericSpec('144Hz')).toBe(144);
    expect(parseNumericSpec('invalid')).toBeNull();
  });

  it('retrieves distinct categories', () => {
    const cats = getCategories();
    expect(cats).toContain('laptops');
    expect(cats).toContain('monitors');
    expect(cats).toContain('headphones');
  });

  it('filters products by free-text query including specs', () => {
    const results = searchProducts({ query: 'OLED', limit: 10 });
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      const match =
        p.title.toLowerCase().includes('oled') ||
        p.description.toLowerCase().includes('oled') ||
        JSON.stringify(p.specs).toLowerCase().includes('oled');
      expect(match).toBe(true);
    }
  });

  it('filters products by price range', () => {
    const min = 300;
    const max = 700;
    const results = searchProducts({ minPrice: min, maxPrice: max, limit: 20 });
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.price).toBeGreaterThanOrEqual(min);
      expect(p.price).toBeLessThanOrEqual(max);
    }
  });

  it('filters by category and excludes specific brands', () => {
    const results = searchProducts({
      category: 'laptops',
      brandsExclude: ['Dell'],
      limit: 20
    });
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.category).toBe('laptops');
      expect(p.brand.toLowerCase()).not.toBe('dell');
    }
  });

  it('filters by spec constraints (RAM >= 16)', () => {
    const results = searchProducts({
      category: 'laptops',
      specConstraints: { ram: 16 },
      limit: 20
    });
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      const ram = parseNumericSpec(p.specs?.ram);
      expect(ram).toBeGreaterThanOrEqual(16);
    }
  });

  it('sorts by price ascending and descending', () => {
    const asc = searchProducts({ category: 'headphones', sortBy: 'price_asc', limit: 10 });
    for (let i = 1; i < asc.length; i++) {
      expect(asc[i].price).toBeGreaterThanOrEqual(asc[i - 1].price);
    }

    const desc = searchProducts({ category: 'headphones', sortBy: 'price_desc', limit: 10 });
    for (let i = 1; i < desc.length; i++) {
      expect(desc[i].price).toBeLessThanOrEqual(desc[i - 1].price);
    }
  });

  it('searches and finds the malicious security test fixture', () => {
    const results = searchProducts({ query: 'StealthOverclock' });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('prod-malicious-exploit-01');
    expect(results[0].isSecurityTestFixture).toBe(true);
  });
});

