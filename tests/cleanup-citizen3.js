import mongoose from 'mongoose';
import Request from '../src/modules/requests/request.model.js';
import User from '../src/modules/users/user.model.js';

const MONGODB_URI = 'mongodb://localhost:27017/test';

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find citizen3
    const citizen3 = await User.findOne({ email: 'citizen3@test.com' });
    if (!citizen3) {
      console.log('❌ Citizen3 not found');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 Citizen3 ID:', citizen3._id);

    // Delete all requests for citizen3
    const result = await Request.deleteMany({
      $or: [
        { userId: citizen3._id },
        { createdBy: citizen3._id }
      ]
    });

    console.log(`✅ Deleted ${result.deletedCount} requests for citizen3`);

    // Verify
    const remaining = await Request.find({
      $or: [
        { userId: citizen3._id },
        { createdBy: citizen3._id }
      ]
    });

    console.log(`📊 Remaining requests: ${remaining.length}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();
