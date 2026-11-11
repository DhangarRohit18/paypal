import mongoose, { Schema, Document } from 'mongoose';

export interface IPayPalOrderDocument extends Document {
  paypalOrderId: string;
  passportId: string;
  userId: string;
  approvalId: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
  status: string;
  approveUrl: string;
  debugId?: string;
  createdAt: string;
  updatedAt: string;
}

const PayPalOrderSchema = new Schema<IPayPalOrderDocument>(
  {
    paypalOrderId: { type: String, required: true, unique: true, index: true },
    passportId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    approvalId: { type: String, required: true, index: true },
    idempotencyKey: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, required: true, default: 'CREATED', index: true },
    approveUrl: { type: String, default: '' },
    debugId: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const PayPalOrderModel =
  mongoose.models.PayPalOrder ||
  mongoose.model<IPayPalOrderDocument>('PayPalOrder', PayPalOrderSchema);

