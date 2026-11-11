import mongoose from 'mongoose';
import { ProductModel } from '../models/Product.js';
import { MerchantModel } from '../models/Merchant.js';
import { SAMPLE_PRODUCTS, SAMPLE_MERCHANTS } from './sampleCatalogue.js';
import { store } from '../db/inMemoryStore.js';

export async function seedCatalogue(): Promise<{ productCount: number; merchantCount: number }> {
  console.log('📦 Seeding product catalogue and merchants (idempotent)...');

  // 1. Sync In-Memory store (No duplicates)
  const productMap = new Map<string, any>();
  for (const p of store.products) {
    productMap.set(p.id, p);
  }
  for (const p of SAMPLE_PRODUCTS) {
    productMap.set(p.id, {
      ...p,
      name: p.name || p.title,
      imageUrl: p.imageUrl || p.images[0],
      source: 'sample' as const,
      returnPolicy: p.returnPolicy || {
        days: p.returnPolicyDays,
        conditions: `${p.returnPolicyDays}-day merchant return protection`
      }
    });
  }
  store.products = Array.from(productMap.values());

  const merchantMap = new Map<string, any>();
  for (const m of store.merchants) {
    merchantMap.set(m.id, m);
  }
  for (const m of SAMPLE_MERCHANTS) {
    merchantMap.set(m.id, m);
  }
  store.merchants = Array.from(merchantMap.values());

  // 2. Sync MongoDB if connected (Upsert idempotently)
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
      }

      // Upsert merchants
      const merchantOps = store.merchants.map((m) => ({
        updateOne: {
          filter: { id: m.id },
          update: { $set: m },
          upsert: true
        }
      }));
      await MerchantModel.bulkWrite(merchantOps);

      // Upsert products
      const productOps = store.products.map((p) => ({
        updateOne: {
          filter: { id: p.id },
          update: { $set: p },
          upsert: true
        }
      }));
      await ProductModel.bulkWrite(productOps);

      console.log(`✅ MongoDB synced: ${store.products.length} products, ${store.merchants.length} merchants.`);
    } catch (err) {
      console.warn('⚠️ MongoDB connection skipped (using in-memory store):', err);
    }
  }

  console.log(`✅ Catalogue ready: ${store.products.length} products, ${store.merchants.length} merchants.`);
  return { productCount: store.products.length, merchantCount: store.merchants.length };
}

// Direct CLI execution check
if (process.argv[1]?.includes('seedCatalogue')) {
  seedCatalogue()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

