import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Request from '../src/modules/requests/request.model.js';
import User from '../src/modules/users/user.model.js';

dotenv.config({ path: '.env.test' });

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGODB_CONNECTIONSTRING || 'mongodb://localhost:27017/test';

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find all citizens
    const citizens = await User.find({ 
      email: { $in: [
        'citizen1@test.com',
        'citizen2@test.com', 
        'citizen3@test.com',
        'citizen4@test.com',
        'citizen5@test.com'
      ]}
    });

    console.log(`📋 Found ${citizens.length} citizens\n`);

    // Delete all requests
    const result = await Request.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} requests\n`);

    // Verify each citizen has no requests
    for (const citizen of citizens) {
      const requests = await Request.find({
        $or: [
          { userId: citizen._id },
          { createdBy: citizen._id }
        ]
      });
      console.log(`- ${citizen.email}: ${requests.length} requests remaining`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Cleanup completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();
