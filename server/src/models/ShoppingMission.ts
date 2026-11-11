import mongoose, { Schema, Document } from 'mongoose';
import { IMission } from '../../../shared/types.js';

export interface IShoppingMissionDocument extends Document, Omit<IMission, 'id'> {
  missionId: string;
}

const ShoppingMissionSchema = new Schema<IShoppingMissionDocument>(
  {
    missionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    goal: { type: String, required: true },
    targetBudget: { type: Number, required: true },
    status: {
      type: String,
      enum: ['active', 'evaluating', 'plans_ready', 'cart_proposed', 'checkout_ready', 'completed'],
      default: 'active'
    },
    understoodRequirements: { type: Schema.Types.Mixed, required: true },
    plans: { type: [Schema.Types.Mixed] as any, default: [] },
    selectedPlanId: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const ShoppingMissionModel =
  mongoose.models.ShoppingMission ||
  mongoose.model<IShoppingMissionDocument>('ShoppingMission', ShoppingMissionSchema);
