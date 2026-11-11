import mongoose, { Schema, Document } from 'mongoose';

export interface IMemoryProfileDocument extends Document {
  userId: string;
  personalizationEnabled: boolean;
  preferredCategories: string[];
  brandAffinities: string[];
  notes: string[];
  updatedAt: string;
}

const MemoryProfileSchema = new Schema<IMemoryProfileDocument>({
  userId: { type: String, required: true, unique: true, index: true },
  personalizationEnabled: { type: Boolean, default: false }, // OFF by default as required
  preferredCategories: { type: [String], default: [] },
  brandAffinities: { type: [String], default: [] },
  notes: { type: [String], default: [] },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const MemoryProfileModel =
  mongoose.models.MemoryProfile ||
  mongoose.model<IMemoryProfileDocument>('MemoryProfile', MemoryProfileSchema);

