import mongoose, { Schema, Document } from 'mongoose';
import { IMerchant } from '../../../shared/types.js';

export interface IMerchantDocument extends Document, Omit<IMerchant, 'id'> {
  id: string;
}

const MerchantSchema = new Schema<IMerchantDocument>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  trustRating: { type: Number, required: true, min: 0, max: 100 },
  policyClarity: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
  returnDays: { type: Number, required: true },
  contactEmail: { type: String, required: true },
  isVerified: { type: Boolean, default: true },
  country: { type: String, default: 'United States' }
});

export const MerchantModel =
  mongoose.models.Merchant || mongoose.model<IMerchantDocument>('Merchant', MerchantSchema);

