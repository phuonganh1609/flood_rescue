import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment variables
dotenv.config({ path: join(__dirname, '../../.env.test') });

let isConnected = false;

export async function connectTestDb() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('✅ Connected to test database');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    throw error;
  }
}

export async function disconnectTestDb() {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('✅ Disconnected from test database');
  } catch (error) {
    console.error('❌ Test database disconnection failed:', error);
    throw error;
  }
}

export async function clearTestDb() {
  if (!isConnected) {
    await connectTestDb();
  }

  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('✅ Test database cleared');
  } catch (error) {
    console.error('❌ Failed to clear test database:', error);
    throw error;
  }
}

export async function dropTestDb() {
  if (!isConnected) {
    await connectTestDb();
  }

  try {
    await mongoose.connection.dropDatabase();
    console.log('✅ Test database dropped');
  } catch (error) {
    console.error('❌ Failed to drop test database:', error);
    throw error;
  }
}
