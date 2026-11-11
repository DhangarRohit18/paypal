import mongoose, { Schema, Document } from 'mongoose';
import { IAgentEvent } from '../../../shared/types.js';

export interface IAgentEventDocument extends Document, Omit<IAgentEvent, 'id'> {
  id: string;
}

const AgentEventSchema = new Schema<IAgentEventDocument>({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  agentId: { type: String, required: true },
  action: { type: String, required: true },
  toolName: { type: String },
  inputSummary: { type: String, default: '' },
  outputSummary: { type: String, default: '' },
  permissionCheck: { type: String, enum: ['PASSED', 'DENIED'], default: 'PASSED' },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' }
});

export const AgentEventModel =
  mongoose.models.AgentEvent ||
  mongoose.model<IAgentEventDocument>('AgentEvent', AgentEventSchema);

