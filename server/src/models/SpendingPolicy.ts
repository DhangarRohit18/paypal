import mongoose, { Schema, Document } from 'mongoose';

export interface ISpendingPolicyDocument extends Document {
  userId: string;
  totalBudget: number;
  maxPricePerItem: number;
  maxCartValue: number;
  allowedCategories: string[];
  restrictedCategories: string[];
  approvedMerchants: string[];
  maxQuantityPerItem: number;
  requireCoApprovalAboveAmount: number;
  killSwitchActive: boolean;
}

const SpendingPolicySchema = new Schema<ISpendingPolicyDocument>({
  userId: { type: String, required: true, unique: true, index: true },
  totalBudget: { type: Number, default: 2500 },
  maxPricePerItem: { type: Number, default: 1500 },
  maxCartValue: { type: Number, default: 2500 },
  allowedCategories: { type: [String], default: [] },
  restrictedCategories: { type: [String], default: [] },
  approvedMerchants: { type: [String], default: [] },
  maxQuantityPerItem: { type: Number, default: 4 },
  requireCoApprovalAboveAmount: { type: Number, default: 1000 },
  killSwitchActive: { type: Boolean, default: false }
});

export const SpendingPolicyModel =
  mongoose.models.SpendingPolicy ||
  mongoose.model<ISpendingPolicyDocument>('SpendingPolicy', SpendingPolicySchema);

