import mongoose from 'mongoose';
import { authService } from '../src/modules/auth/auth.service.js';

const MONGODB_URI = 'mongodb://localhost:27017/test';

async function testAuth() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database');

    console.log('\n🔐 Testing login with citizen1...');
    try {
      const result = await authService.login({
        email: 'citizen1@test.com',
        password: 'Test123!',
      });
      
      console.log('✅ Login successful!');
      console.log('- Access token (first 50 chars):', result.accessToken?.substring(0, 50));
      console.log('- User ID:', result.user?.id);
      console.log('- User email:', result.user?.email);
    } catch (error) {
      console.log('❌ Login failed:', error.message);
      console.log('Error stack:', error.stack);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAuth();
