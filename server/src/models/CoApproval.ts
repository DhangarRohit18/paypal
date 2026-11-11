import mongoose, { Schema, Document } from 'mongoose';
import { ICoApproverShare } from '../../../shared/types.js';

export interface ICoApprovalDocument extends Document, ICoApproverShare {
  approverIdentity?: string;
  rejectionReason?: string;
}

const CoApprovalSchema = new Schema<ICoApprovalDocument>(
  {
    token: { type: String, required: true, unique: true, index: true },
    passportId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    creatorName: { type: String, required: true },
    expiresAt: { type: String, required: true },
    approved: { type: Boolean, default: false, index: true },
    approvedAt: { type: String },
    approvedBy: { type: String },
    approverIdentity: { type: String },
    rejectionReason: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const CoApprovalModel =
  mongoose.models.CoApproval ||
  mongoose.model<ICoApprovalDocument>('CoApproval', CoApprovalSchema);
