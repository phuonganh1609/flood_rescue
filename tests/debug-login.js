import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/modules/users/user.model.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.test') });

async function debugLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Find citizen1
    const user = await User.findOne({ email: 'citizen1@test.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📋 User info:');
    console.log('- Email:', user.email);
    console.log('- UserName:', user.userName);
    console.log('- DisplayName:', user.displayName);
    console.log('- Role:', user.role);
    console.log('- HashedPassword (first 50 chars):', user.hashedPassword?.substring(0, 50));

    // Test password comparison
    const testPassword = 'Test123!';
    const isMatch = await bcrypt.compare(testPassword, user.hashedPassword);
    
    console.log('\n🔐 Password test:');
    console.log('- Test password:', testPassword);
    console.log('- Password matches:', isMatch);

    if (!isMatch) {
      console.log('\n❌ Password does not match!');
      console.log('Trying to hash the test password and compare:');
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('- New hash (first 50 chars):', newHash.substring(0, 50));
      console.log('- Stored hash (first 50 chars):', user.hashedPassword.substring(0, 50));
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugLogin();
