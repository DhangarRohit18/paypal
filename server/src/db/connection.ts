import mongoose from 'mongoose';

let isConnecting = false;

export async function connectDB(customUri?: string): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (isConnecting) {
    return false;
  }

  const mongoUri = customUri || process.env.MONGODB_URI;

  if (!mongoUri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: MONGODB_URI environment variable is required in production.');
    }
    console.log('[DB_AEGIS] MONGODB_URI not configured. Operating in high-performance memory-backed mode for dev/test.');
    return false;
  }

  isConnecting = true;
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 5000
    });
    console.log('[DB_AEGIS] ✅ Successfully connected to MongoDB database.');
    isConnecting = false;
    return true;
  } catch (err: any) {
    isConnecting = false;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`FATAL: MongoDB connection failed in production: ${err.message}`);
    }
    console.warn(`[DB_AEGIS] ⚠️ MongoDB connection skipped (${err.message}). Using hybrid fallback store for local session.`);
    return false;
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

