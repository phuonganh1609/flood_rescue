import mongoose from 'mongoose';
import Request from '../src/modules/requests/request.model.js';
import User from '../src/modules/users/user.model.js';

const MONGODB_URI = 'mongodb://localhost:27017/test';

async function checkRequests() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find citizen1
    const citizen1 = await User.findOne({ email: 'citizen1@test.com' });
    console.log('📋 Citizen1 ID:', citizen1._id);

    // Find all requests
    const allRequests = await Request.find({});
    console.log(`\n📊 Total requests in database: ${allRequests.length}`);

    // Find requests for citizen1
    const citizen1Requests = await Request.find({ 
      $or: [
        { userId: citizen1._id },
        { createdBy: citizen1._id }
      ]
    });
    
    console.log(`\n📋 Requests for citizen1: ${citizen1Requests.length}`);
    citizen1Requests.forEach((req, index) => {
      console.log(`\nRequest ${index + 1}:`);
      console.log('- ID:', req._id);
      console.log('- Status:', req.status);
      console.log('- Description:', req.description);
      console.log('- Created:', req.createdAt);
    });

    // Delete all requests
    console.log('\n🗑️ Deleting all requests...');
    const result = await Request.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} requests`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRequests();
