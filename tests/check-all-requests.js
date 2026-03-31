import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';

const MONGODB_URI = 'mongodb://localhost:27017/test';

async function checkAllRequests() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find citizen1
    const citizen1 = await User.findOne({ email: 'citizen1@test.com' });
    console.log('📋 Citizen1:');
    console.log('- ID:', citizen1._id);
    console.log('- Email:', citizen1.email);
    console.log('- UserName:', citizen1.userName);

    // Query requests collection directly
    const requestsCollection = mongoose.connection.db.collection('requests');
    const allRequests = await requestsCollection.find({}).toArray();
    
    console.log(`\n📊 Total requests in collection: ${allRequests.length}`);
    
    if (allRequests.length > 0) {
      console.log('\n📋 All requests:');
      allRequests.forEach((req, index) => {
        console.log(`\nRequest ${index + 1}:`);
        console.log('- _id:', req._id);
        console.log('- userId:', req.userId);
        console.log('- createdBy:', req.createdBy);
        console.log('- userName:', req.userName);
        console.log('- status:', req.status);
        console.log('- description:', req.description);
        console.log('- type:', req.type);
      });
    }

    // Check for requests matching citizen1's ID
    const citizen1Requests = await requestsCollection.find({
      userId: citizen1._id
    }).toArray();
    
    console.log(`\n🔍 Requests with userId = citizen1._id: ${citizen1Requests.length}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllRequests();
