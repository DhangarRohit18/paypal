import mongoose, { Schema, Document } from 'mongoose';

export interface IReconciliationRecordDocument extends Document {
  reconciliationId: string;
  orderId: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  internalStatus: string;
  externalStatus: string;
  internalAmount: number;
  externalAmount: number;
  amountMatches: boolean;
  currencyMatches: boolean;
  discrepancyDetected: boolean;
  notes?: string;
  reconciledAt: string;
}

const ReconciliationRecordSchema = new Schema<IReconciliationRecordDocument>(
  {
    reconciliationId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    paypalOrderId: { type: String, required: true, index: true },
    paypalCaptureId: { type: String, index: true },
    internalStatus: { type: String, required: true },
    externalStatus: { type: String, required: true },
    internalAmount: { type: Number, required: true },
    externalAmount: { type: Number, required: true },
    amountMatches: { type: Boolean, required: true },
    currencyMatches: { type: Boolean, required: true },
    discrepancyDetected: { type: Boolean, default: false, index: true },
    notes: { type: String },
    reconciledAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const ReconciliationRecordModel =
  mongoose.models.ReconciliationRecord ||
  mongoose.model<IReconciliationRecordDocument>('ReconciliationRecord', ReconciliationRecordSchema);
