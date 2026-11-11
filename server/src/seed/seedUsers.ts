import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { UserModel } from '../models/User.js';
import { AgentModel } from '../models/Agent.js';
import { SpendingPolicyModel } from '../models/SpendingPolicy.js';
import { MemoryProfileModel } from '../models/MemoryProfile.js';
import { store } from '../db/inMemoryStore.js';

export async function runSeedUsers() {
  console.log('🌱 Seeding demo and admin users...');

  const demoHash = await bcrypt.hash('DemoPass123!', 10);
  const adminHash = await bcrypt.hash('AdminPass123!', 10);

  const demoUser = {
    userId: 'usr-demo-shopper-001',
    email: 'demo@shopmate.ai',
    name: 'Jane Doe',
    role: 'user' as const,
    passwordHash: demoHash,
    createdAt: new Date().toISOString()
  };

  const adminUser = {
    userId: 'usr-admin-aegis-001',
    email: 'admin@shopmate.ai',
    name: 'Alex Vance (AEGIS Security)',
    role: 'admin' as const,
    passwordHash: adminHash,
    createdAt: new Date().toISOString()
  };

  store.users.set(demoUser.userId, demoUser);
  store.initUserRecords(demoUser.userId);

  store.users.set(adminUser.userId, adminUser);
  store.initUserRecords(adminUser.userId);

  // If MongoDB URI is configured, seed database
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
      }
      await UserModel.deleteMany({ email: { $in: ['demo@shopmate.ai', 'admin@shopmate.ai'] } });
      await UserModel.create([demoUser, adminUser]);
      console.log('✅ MongoDB users seeded successfully.');
    } catch (err) {
      console.warn('⚠️ MongoDB connection skipped (using in-memory store):', err);
    }
  }

  console.log('✅ Demo user seeded: demo@shopmate.ai / DemoPass123!');
  console.log('✅ Admin user seeded: admin@shopmate.ai / AdminPass123!');
}

if (process.argv[1]?.includes('seedUsers')) {
  runSeedUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

