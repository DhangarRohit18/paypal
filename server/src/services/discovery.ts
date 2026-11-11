import { IProduct } from '../../../shared/types.js';
import { store } from '../db/inMemoryStore.js';

export interface SpecConstraint {
  min?: number;
  max?: number;
  eq?: string | number | boolean;
  contains?: string;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  brandsInclude?: string[];
  brandsExclude?: string[];
  specConstraints?: Record<string, SpecConstraint | any>;
  specs?: Record<string, any>;
  availability?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'any';
  inStockOnly?: boolean;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating';
  limit?: number;
}

// Helper to extract numeric value from string representations (e.g. "32GB" -> 32, "1TB" -> 1000)
export function parseNumericSpec(val: any): number | null {
  if (typeof val === 'number') return val;
  if (!val) return null;
  const str = String(val).toLowerCase().trim();

  // If TB, convert to GB equivalent for storage comparison (e.g. 1TB -> 1000)
  if (str.includes('tb')) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : num * 1000;
  }

  // General numbers (e.g. 16GB, 120Hz, 5000mAh, 15.6-inch)
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
}

export function searchProducts(filters: SearchFilters): IProduct[] {
  let results = [...store.products];

  // 1. Free-Text Search
  if (filters.query && filters.query.trim()) {
    const q = filters.query.toLowerCase().trim();
    results = results.filter(p => {
      const inTitle = p.title.toLowerCase().includes(q);
      const inName = p.name ? p.name.toLowerCase().includes(q) : false;
      const inBrand = p.brand.toLowerCase().includes(q);
      const inCategory = p.category.toLowerCase().includes(q);
      const inDescription = p.description.toLowerCase().includes(q);
      const inSpecs = Object.values(p.specs || {}).some(val =>
        String(val).toLowerCase().includes(q)
      );
      return inTitle || inName || inBrand || inCategory || inDescription || inSpecs;
    });
  }

  // 2. Category Filter (single or multiple)
  if (filters.category && filters.category !== 'all') {
    results = results.filter(p => p.category === filters.category);
  }
  if (filters.categories && filters.categories.length > 0) {
    results = results.filter(p => filters.categories!.includes(p.category));
  }

  // 3. Price Filter
  if (filters.minPrice !== undefined && !isNaN(filters.minPrice)) {
    results = results.filter(p => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined && !isNaN(filters.maxPrice)) {
    results = results.filter(p => p.price <= filters.maxPrice!);
  }

  // 4. Brand Include / Exclude
  if (filters.brand) {
    results = results.filter(p => p.brand.toLowerCase() === filters.brand!.toLowerCase());
  }
  if (filters.brandsInclude && filters.brandsInclude.length > 0) {
    const inc = filters.brandsInclude.map(b => b.toLowerCase().trim());
    results = results.filter(p => inc.includes(p.brand.toLowerCase()));
  }
  if (filters.brandsExclude && filters.brandsExclude.length > 0) {
    const exc = filters.brandsExclude.map(b => b.toLowerCase().trim());
    results = results.filter(p => !exc.includes(p.brand.toLowerCase()));
  }

  // 5. Spec Constraints
  const constraints = filters.specConstraints || filters.specs;
  if (constraints && Object.keys(constraints).length > 0) {
    results = results.filter(p => {
      for (const [key, constraint] of Object.entries(constraints)) {
        const productVal = p.specs?.[key];
        if (productVal === undefined) {
          // If product doesn't have the spec key directly, check spec values for string matches
          if (typeof constraint === 'string') {
            const hasMatch = Object.values(p.specs || {}).some(v =>
              String(v).toLowerCase().includes(constraint.toLowerCase())
            );
            if (!hasMatch) return false;
          }
          continue;
        }

        // Case A: Simple string / number comparison
        if (typeof constraint !== 'object' || constraint === null) {
          if (typeof constraint === 'number') {
            const numProd = parseNumericSpec(productVal);
            if (numProd === null || numProd < constraint) return false;
          } else {
            if (!String(productVal).toLowerCase().includes(String(constraint).toLowerCase())) {
              return false;
            }
          }
          continue;
        }

        // Case B: Structured { min, max, eq, contains }
        const parsedProdNum = parseNumericSpec(productVal);
        if (constraint.min !== undefined && constraint.min !== null) {
          if (parsedProdNum === null || parsedProdNum < constraint.min) return false;
        }
        if (constraint.max !== undefined && constraint.max !== null) {
          if (parsedProdNum === null || parsedProdNum > constraint.max) return false;
        }
        if (constraint.contains !== undefined && constraint.contains !== null) {
          if (!String(productVal).toLowerCase().includes(String(constraint.contains).toLowerCase())) {
            return false;
          }
        }
        if (constraint.eq !== undefined && constraint.eq !== null) {
          if (String(productVal).toLowerCase() !== String(constraint.eq).toLowerCase()) {
            return false;
          }
        }
      }
      return true;
    });
  }

  // 6. Availability
  if (filters.inStockOnly || filters.availability === 'in_stock') {
    results = results.filter(p => p.availability === 'in_stock');
  } else if (filters.availability && filters.availability !== 'any') {
    results = results.filter(p => p.availability === filters.availability);
  }

  // 7. Sort
  if (filters.sortBy === 'price_asc') {
    results.sort((a, b) => a.price - b.price);
  } else if (filters.sortBy === 'price_desc') {
    results.sort((a, b) => b.price - a.price);
  } else if (filters.sortBy === 'rating') {
    results.sort((a, b) => b.rating - a.rating);
  } else {
    // Default relevance / popularity
    results.sort((a, b) => b.reviewCount - a.reviewCount);
  }

  const limit = filters.limit || 50;
  return results.slice(0, limit);
}

export function getProductById(id: string): IProduct | undefined {
  return store.products.find(p => p.id === id);
}

export function getCategories(): string[] {
  const cats = new Set<string>();
  for (const p of store.products) {
    cats.add(p.category);
  }
  return Array.from(cats);
}
