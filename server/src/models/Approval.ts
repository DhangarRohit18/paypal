import mongoose, { Schema, Document } from 'mongoose';
import { IApprovalMandate } from '../../../shared/types.js';

export interface IApprovalDocument extends Document, Omit<IApprovalMandate, 'approvalId'> {
  approvalId: string;
  cartId?: string;
  status: 'approved' | 'used' | 'invalidated' | 'expired';
}

const ApprovalSchema = new Schema<IApprovalDocument>(
  {
    approvalId: { type: String, required: true, unique: true, index: true },
    passportId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    cartId: { type: String, index: true },
    cartVersion: { type: Number, required: true },
    orderFingerprint: { type: String, required: true, index: true },
    canonicalHashPayload: { type: String, default: '' },
    finalTotal: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    isSingleUse: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['approved', 'used', 'invalidated', 'expired'],
      default: 'approved',
      index: true
    },
    requiresCoApproval: { type: Boolean, default: false },
    coApprovedAt: { type: String },
    approvedAt: { type: String, default: () => new Date().toISOString() },
    expiresAt: { type: String, required: true },
    usedAt: { type: String }
  },
  { timestamps: true }
);

export const ApprovalModel =
  mongoose.models.Approval || mongoose.model<IApprovalDocument>('Approval', ApprovalSchema);
