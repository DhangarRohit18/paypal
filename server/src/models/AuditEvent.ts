import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditEventDocument extends Document {
  auditId: string;
  userId?: string;
  eventType: string;
  entityType: 'MISSION' | 'TOOL' | 'PASSPORT' | 'APPROVAL' | 'PAYMENT' | 'WEBHOOK' | 'ORDER' | 'SYSTEM';
  entityId?: string;
  actor: 'USER' | 'AI_AGENT' | 'AEGIS_BACKEND' | 'PAYPAL_WEBHOOK' | 'CO_APPROVER';
  action: string;
  payloadSummary: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

const AuditEventSchema = new Schema<IAuditEventDocument>(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    eventType: { type: String, required: true, index: true },
    entityType: {
      type: String,
      enum: ['MISSION', 'TOOL', 'PASSPORT', 'APPROVAL', 'PAYMENT', 'WEBHOOK', 'ORDER', 'SYSTEM'],
      required: true,
      index: true
    },
    entityId: { type: String, index: true },
    actor: {
      type: String,
      enum: ['USER', 'AI_AGENT', 'AEGIS_BACKEND', 'PAYPAL_WEBHOOK', 'CO_APPROVER'],
      required: true
    },
    action: { type: String, required: true },
    payloadSummary: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const AuditEventModel =
  mongoose.models.AuditEvent ||
  mongoose.model<IAuditEventDocument>('AuditEvent', AuditEventSchema);

