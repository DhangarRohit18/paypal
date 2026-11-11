import mongoose, { Schema, Document } from 'mongoose';
import { IPurchasePassport } from '../../../shared/types.js';

export interface IPurchasePassportDocument extends Document, Omit<IPurchasePassport, 'passportId'> {
  passportId: string;
}

const PurchasePassportSchema = new Schema<IPurchasePassportDocument>({
  passportId: { type: String, required: true, unique: true, index: true },
  version: { type: Number, default: 1 },
  userId: { type: String, required: true, index: true },
  cartId: { type: String, index: true },
  cartVersion: { type: Number, required: true },
  items: { type: [Schema.Types.Mixed] as any, default: [] },
  missionGoal: { type: String, default: '' },
  understoodRequirements: { type: Schema.Types.Mixed },
  merchantInfo: { type: [Schema.Types.Mixed] as any, default: [] },
  priceBreakdown: { type: Schema.Types.Mixed, required: true },
  budgetComparison: { type: Schema.Types.Mixed, required: true },
  fitCheckSummary: { type: Schema.Types.Mixed },
  trustScoreOverall: { type: Schema.Types.Mixed },
  riskAssessment: { type: Schema.Types.Mixed },
  recommendationReasoning: { type: [String] as any, default: [] },
  alternativesConsidered: { type: [Schema.Types.Mixed] as any, default: [] },
  warrantyReturnSummary: { type: [Schema.Types.Mixed] as any, default: [] },
  agentActivityCount: { type: Number, default: 0 },
  approvalStatus: {
    type: String,
    enum: [
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'expired',
      'invalidated',
      'consumed',
      'DRAFT',
      'CO_APPROVAL_PENDING',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
      'COMPLETED',
      'INVALIDATED'
    ],
    default: 'draft'
  },
  invalidationReason: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  expiresAt: { type: String, default: () => new Date().toISOString() }
});

export const PurchasePassportModel =
  mongoose.models.PurchasePassport ||
  mongoose.model<IPurchasePassportDocument>('PurchasePassport', PurchasePassportSchema);
