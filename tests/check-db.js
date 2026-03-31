import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';

// Connect to the database that backend is using (from .env, not .env.test)
const MONGODB_URI = 'mongodb://localhost:27017/test';

async function checkDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database:', MONGODB_URI);

    const users = await User.find({}).select('email userName displayName role');
    
    console.log(`\n📊 Found ${users.length} users in database:`);
    users.forEach(user => {
      console.log(`- ${user.email} (${user.userName}) - ${user.role}`);
    });

    // Check for specific test users
    const citizen1 = await User.findOne({ email: 'citizen1@test.com' });
    const coordinator1 = await User.findOne({ email: 'coordinator1@test.com' });

    console.log('\n🔍 Test users check:');
    console.log('- citizen1@test.com:', citizen1 ? '✅ EXISTS' : '❌ NOT FOUND');
    console.log('- coordinator1@test.com:', coordinator1 ? '✅ EXISTS' : '❌ NOT FOUND');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase();
