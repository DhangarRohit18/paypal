import mongoose, { Schema, Document } from 'mongoose';
import { IWebhookEvent } from '../../../shared/types.js';

export interface IWebhookEventDocument extends Document, Omit<IWebhookEvent, 'eventId'> {
  eventId: string;
}

const WebhookEventSchema = new Schema<IWebhookEventDocument>({
  eventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true, index: true },
  summary: { type: String },
  resourceType: { type: String },
  resourceId: { type: String, index: true },
  status: {
    type: String,
    enum: ['PROCESSED', 'IGNORED', 'FAILED', 'DUPLICATE'],
    default: 'PROCESSED'
  },
  verified: { type: Boolean, default: false },
  receivedAt: { type: String, default: () => new Date().toISOString() },
  processedAt: { type: String },
  rawPayloadSnippet: { type: String }
});

export const WebhookEventModel =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEventDocument>('WebhookEvent', WebhookEventSchema);
