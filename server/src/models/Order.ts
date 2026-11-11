import mongoose, { Schema, Document } from 'mongoose';
import { IOrder } from '../../../shared/types.js';

export interface IOrderDocument extends Document, Omit<IOrder, 'orderId'> {
  orderId: string;
}

const OrderSchema = new Schema<IOrderDocument>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    passportId: { type: String, required: true, index: true },
    paypalOrderId: { type: String, required: true, index: true },
    paypalCaptureId: { type: String, required: true, index: true },
    items: { type: [Schema.Types.Mixed] as any, default: [] },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUND_REQUESTED', 'REFUNDED'],
      default: 'PLACED',
      index: true
    },
    returnDeadlineDate: { type: String, required: true },
    warrantyEndDate: { type: String, required: true },
    placedAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const OrderModel =
  mongoose.models.Order || mongoose.model<IOrderDocument>('Order', OrderSchema);
