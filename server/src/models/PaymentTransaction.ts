import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentTransactionDocument extends Document {
  transactionId: string;
  userId: string;
  passportId: string;
  approvalId: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  amount: number;
  currency: string;
  status: 'INITIALIZED' | 'IN_FLIGHT' | 'CAPTURED' | 'FAILED' | 'VOIDED' | 'REFUNDED';
  lockKey: string;
  lockedAt?: string;
  completedAt?: string;
  failedReason?: string;
  rawCaptureResponse?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const PaymentTransactionSchema = new Schema<IPaymentTransactionDocument>(
  {
    transactionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    passportId: { type: String, required: true, index: true },
    approvalId: { type: String, required: true, index: true },
    paypalOrderId: { type: String, required: true, unique: true, index: true },
    paypalCaptureId: { type: String, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['INITIALIZED', 'IN_FLIGHT', 'CAPTURED', 'FAILED', 'VOIDED', 'REFUNDED'],
      default: 'INITIALIZED',
      index: true
    },
    lockKey: { type: String, required: true, unique: true, index: true },
    lockedAt: { type: String },
    completedAt: { type: String },
    failedReason: { type: String },
    rawCaptureResponse: { type: Schema.Types.Mixed },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const PaymentTransactionModel =
  mongoose.models.PaymentTransaction ||
  mongoose.model<IPaymentTransactionDocument>('PaymentTransaction', PaymentTransactionSchema);

