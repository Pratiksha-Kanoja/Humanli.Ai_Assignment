import mongoose from 'mongoose';
import { env } from './env';

export async function connectToDatabase() {
  mongoose.set('strictQuery', true);

  if (env.MONGODB_URI === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    // Sandbox-friendly: keep downloaded MongoDB binaries inside the workspace
    const downloadDir = path.join(process.cwd(), '.cache', 'mongodb-binaries');
    await fs.mkdir(downloadDir, { recursive: true });

    const mongod = await MongoMemoryServer.create({
      binary: { downloadDir },
    });
    const uri = mongod.getUri();
    console.log('[memory-mongo] uri:', uri);
    await mongoose.connect(uri);
    return;
  }

  await mongoose.connect(env.MONGODB_URI);
}

