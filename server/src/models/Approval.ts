import mongoose, { Schema, Document } from 'mongoose';
import { IApproval } from '../../../shared/types.js';

export interface IApprovalDocument extends Document, Omit<IApproval, 'approvalId'> {
  approvalId: string;
}

const ApprovalSchema = new Schema<IApprovalDocument>({
  approvalId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  cartId: { type: String, required: true, index: true },
  cartVersion: { type: Number, required: true },
  orderFingerprint: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: {
    type: String,
    enum: ['approved', 'used', 'invalidated', 'expired'],
    default: 'approved'
  },
  approvedAt: { type: String, default: () => new Date().toISOString() },
  expiresAt: { type: String, required: true },
  usedAt: { type: String }
});

export const ApprovalModel =
  mongoose.models.Approval || mongoose.model<IApprovalDocument>('Approval', ApprovalSchema);

