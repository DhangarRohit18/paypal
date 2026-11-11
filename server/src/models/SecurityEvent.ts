import mongoose, { Schema, Document } from 'mongoose';
import { ISecurityEvent } from '../../../shared/types.js';

export interface ISecurityEventDocument extends Document, Omit<ISecurityEvent, 'id'> {
  id: string;
}

const SecurityEventSchema = new Schema<ISecurityEventDocument>({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  eventType: { type: String, required: true },
  source: { type: String, required: true },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'HIGH' },
  payloadExcerpt: { type: String, required: true },
  actionTaken: { type: String, enum: ['BLOCKED', 'SANITIZED', 'FLAGGED'], default: 'BLOCKED' },
  defenceLayer: { type: String, required: true },
  remedySuggested: { type: String }
});

export const SecurityEventModel =
  mongoose.models.SecurityEvent ||
  mongoose.model<ISecurityEventDocument>('SecurityEvent', SecurityEventSchema);

