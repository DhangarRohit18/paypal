import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentDocument extends Document {
  agentId: string;
  userId: string;
  name: string;
  role: string;
  status: 'active' | 'paused';
  scopedPermissions: string[];
  maxDailyBudget: number;
  createdAt: string;
  updatedAt: string;
}

const AgentSchema = new Schema<IAgentDocument>({
  agentId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true, default: 'BUYWISE Shopping Co-Pilot' },
  role: { type: String, required: true, default: 'Autonomous Research & Recommendation Agent' },
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  scopedPermissions: {
    type: [String],
    default: ['read_catalogue', 'evaluate_fit', 'prepare_cart', 'request_approval']
  },
  maxDailyBudget: { type: Number, default: 2500 },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const AgentModel = mongoose.models.Agent || mongoose.model<IAgentDocument>('Agent', AgentSchema);

