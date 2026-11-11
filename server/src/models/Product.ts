import mongoose, { Schema, Document } from 'mongoose';
import { IProduct } from '../../../shared/types.js';

export interface IProductDocument extends Document, Omit<IProduct, 'id'> {
  id: string;
}

const ProductSchema = new Schema<IProductDocument>({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  name: { type: String },
  category: {
    type: String,
    required: true,
    index: true,
    enum: [
      'laptops',
      'smartphones',
      'headphones',
      'monitors',
      'keyboards',
      'mice',
      'gaming_accessories',
      'cameras',
      'smart_home'
    ]
  },
  brand: { type: String, required: true, index: true },
  price: { type: Number, required: true, index: true },
  currency: { type: String, default: 'USD' },
  originalListPrice: { type: Number },
  merchantId: { type: String, required: true, index: true },
  merchantName: { type: String, required: true },
  description: { type: String, required: true },
  specs: { type: Schema.Types.Mixed, default: {} },
  availability: { type: String, enum: ['in_stock', 'low_stock', 'out_of_stock'], default: 'in_stock' },
  inventoryCount: { type: Number, default: 10 },
  warrantyMonths: { type: Number, default: 12 },
  returnPolicyDays: { type: Number, default: 30 },
  returnPolicy: {
    days: { type: Number, default: 30 },
    conditions: { type: String, default: '30-day merchant warranty in original packaging' }
  },
  compatibilityMeta: { type: Schema.Types.Mixed, default: {} },
  images: { type: [String], default: [] },
  imageUrl: { type: String },
  samplePriceHistory: { type: [Schema.Types.Mixed], default: [] },
  rating: { type: Number, default: 4.5 },
  reviewCount: { type: Number, default: 100 },
  source: { type: String, default: 'sample' },
  isSampleData: { type: Boolean, default: true },
  isMaliciousSample: { type: Boolean, default: false },
  isSecurityTestFixture: { type: Boolean, default: false },
  maliciousPayloadExcerpt: { type: String }
});

// Full-text search index on title/name and description
ProductSchema.index({ title: 'text', name: 'text', description: 'text' });

export const ProductModel =
  mongoose.models.Product || mongoose.model<IProductDocument>('Product', ProductSchema);

