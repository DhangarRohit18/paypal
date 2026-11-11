import mongoose, { Schema, Document } from 'mongoose';
import { IConversation } from '../../../shared/types.js';

export interface IConversationDocument extends Document, Omit<IConversation, 'conversationId'> {
  conversationId: string;
}

const ConversationSchema = new Schema<IConversationDocument>({
  conversationId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, default: 'New Hardware Mission' },
  understoodRequirements: { type: Schema.Types.Mixed, default: {} },
  messages: { type: [Schema.Types.Mixed] as any, default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const ConversationModel =
  mongoose.models.Conversation ||
  mongoose.model<IConversationDocument>('Conversation', ConversationSchema);

