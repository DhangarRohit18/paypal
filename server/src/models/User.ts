import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../../../shared/types.js';

export interface IUserDocument extends Document {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

const UserSchema = new Schema<IUserDocument>({
  userId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

