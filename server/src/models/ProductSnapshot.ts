import mongoose, { Schema, Document } from 'mongoose';

export interface IProductSnapshotDocument extends Document {
  productId: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  brand: string;
  merchantId: string;
  merchantName: string;
  specs: Record<string, any>;
  warrantyMonths: number;
  returnPolicyDays: number;
  snapshotTimestamp: string;
}

export const ProductSnapshotSchema = new Schema<IProductSnapshotDocument>(
  {
    productId: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    category: { type: String, required: true },
    brand: { type: String, required: true },
    merchantId: { type: String, required: true },
    merchantName: { type: String, required: true },
    specs: { type: Schema.Types.Mixed, default: {} },
    warrantyMonths: { type: Number, default: 12 },
    returnPolicyDays: { type: Number, default: 30 },
    snapshotTimestamp: { type: String, default: () => new Date().toISOString() }
  },
  { _id: false }
);

export const ProductSnapshotModel =
  mongoose.models.ProductSnapshot ||
  mongoose.model<IProductSnapshotDocument>('ProductSnapshot', ProductSnapshotSchema);
