import mongoose, { Schema, Document } from 'mongoose';
import { ICart } from '../../../shared/types.js';

export interface ICartDocument extends Document, Omit<ICart, 'id'> {
  cartId: string;
}

const CartItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    productSnapshot: { type: Schema.Types.Mixed, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    itemTotal: { type: Number, required: true }
  },
  { _id: false }
);

const CartSchema = new Schema<ICartDocument>({
  cartId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  version: { type: Number, required: true, default: 1 },
  items: { type: [CartItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const CartModel =
  mongoose.models.Cart || mongoose.model<ICartDocument>('Cart', CartSchema);

