import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';

const MONGODB_URI = 'mongodb://localhost:27017/test';

async function checkDuplicates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Check for duplicate emails
    const users = await User.find({});
    const emailCounts = {};
    
    users.forEach(user => {
      emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
    });

    console.log('📊 Total users:', users.length);
    console.log('\n🔍 Checking for duplicates:');
    
    let hasDuplicates = false;
    Object.entries(emailCounts).forEach(([email, count]) => {
      if (count > 1) {
        console.log(`❌ DUPLICATE: ${email} appears ${count} times`);
        hasDuplicates = true;
      }
    });

    if (!hasDuplicates) {
      console.log('✅ No duplicate emails found');
    }

    // Show all citizen1 users
    console.log('\n📋 All users with email citizen1@test.com:');
    const citizen1Users = await User.find({ email: 'citizen1@test.com' });
    citizen1Users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log('- ID:', user._id);
      console.log('- UserName:', user.userName);
      console.log('- DisplayName:', user.displayName);
      console.log('- Role:', user.role);
      console.log('- IsActive:', user.isActive);
      console.log('- Hash (first 30 chars):', user.hashedPassword.substring(0, 30));
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDuplicates();
