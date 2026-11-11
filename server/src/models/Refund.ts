import mongoose, { Schema, Document } from 'mongoose';

export interface IRefundDocument extends Document {
  refundId: string;
  orderId: string;
  userId: string;
  paypalCaptureId: string;
  paypalRefundId?: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'FAILED' | 'REJECTED';
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const RefundSchema = new Schema<IRefundDocument>(
  {
    refundId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    paypalCaptureId: { type: String, required: true, index: true },
    paypalRefundId: { type: String, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'PROCESSED', 'FAILED', 'REJECTED'],
      default: 'REQUESTED',
      index: true
    },
    processedAt: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const RefundModel =
  mongoose.models.Refund || mongoose.model<IRefundDocument>('Refund', RefundSchema);

