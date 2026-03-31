import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';

const MONGODB_URI = 'mongodb://localhost:27017/test';

async function compareHashes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get seeded user
    const seededUser = await User.findOne({ email: 'citizen1@test.com' });
    console.log('📋 Seeded user (citizen1):');
    console.log('- Email:', seededUser.email);
    console.log('- Hashed password:', seededUser.hashedPassword);
    console.log('- Hash length:', seededUser.hashedPassword.length);
    console.log('- Hash prefix:', seededUser.hashedPassword.substring(0, 7));

    // Get registered user
    const registeredUser = await User.findOne({ email: 'testuser999@test.com' });
    console.log('\n📋 Registered user (testuser999):');
    console.log('- Email:', registeredUser.email);
    console.log('- Hashed password:', registeredUser.hashedPassword);
    console.log('- Hash length:', registeredUser.hashedPassword.length);
    console.log('- Hash prefix:', registeredUser.hashedPassword.substring(0, 7));

    // Test password comparison
    const testPassword = 'Test123!';
    
    console.log('\n🔐 Testing password comparison:');
    const seededMatch = await bcrypt.compare(testPassword, seededUser.hashedPassword);
    const registeredMatch = await bcrypt.compare(testPassword, registeredUser.hashedPassword);
    
    console.log('- Seeded user password matches:', seededMatch);
    console.log('- Registered user password matches:', registeredMatch);

    // Generate new hash with same method as factory
    console.log('\n🔨 Generating new hash with factory method:');
    const factoryHash = await bcrypt.hash(testPassword, 10);
    console.log('- Factory hash:', factoryHash);
    console.log('- Factory hash length:', factoryHash.length);
    console.log('- Factory hash prefix:', factoryHash.substring(0, 7));
    
    // Generate new hash with genSalt (like backend)
    console.log('\n🔨 Generating new hash with backend method:');
    const salt = await bcrypt.genSalt(10);
    const backendHash = await bcrypt.hash(testPassword, salt);
    console.log('- Backend hash:', backendHash);
    console.log('- Backend hash length:', backendHash.length);
    console.log('- Backend hash prefix:', backendHash.substring(0, 7));

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

compareHashes();
