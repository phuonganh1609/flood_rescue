// Debug script to test supply name matching
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Request from './src/modules/requests/request.model.js';
import MissionRequest from './src/modules/missionRequests/missionRequest.model.js';

dotenv.config({ path: '.env.test' });

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Find a test request
    const request = await Request.findOne({ 
      requestSupplies: { $exists: true, $ne: [] } 
    }).limit(1);

    if (!request) {
      console.log('❌ No request with supplies found');
      return;
    }

    console.log('\n📋 Request Data:');
    console.log('  _id:', request._id);
    console.log('  requestSupplies:', JSON.stringify(request.requestSupplies, null, 2));

    // Find corresponding MissionRequest
    const missionRequest = await MissionRequest.findOne({ requestId: request._id });

    if (!missionRequest) {
      console.log('❌ No MissionRequest found for this request');
      return;
    }

    console.log('\n📦 MissionRequest Data:');
    console.log('  _id:', missionRequest._id);
    console.log('  requestSuppliesSnapshot:', JSON.stringify(missionRequest.requestSuppliesSnapshot, null, 2));
    console.log('  suppliesDelivered:', JSON.stringify(missionRequest.suppliesDelivered, null, 2));
    console.log('  peopleNeeded:', missionRequest.peopleNeeded);
    console.log('  peopleRescued:', missionRequest.peopleRescued);
    console.log('  fulfillmentPercent:', missionRequest.fulfillmentPercent);
    console.log('  status:', missionRequest.status);

    // Calculate what it should be
    const totalTarget = missionRequest.peopleNeeded + 20;
    const totalDelivered = missionRequest.peopleRescued + (missionRequest.suppliesDelivered?.length > 0 ? 20 : 0);
    const expectedPercent = Math.round((totalDelivered / totalTarget) * 100);
    console.log('\n🧮 Expected Calculation:');
    console.log(`  totalTarget = ${missionRequest.peopleNeeded} + 20 = ${totalTarget}`);
    console.log(`  totalDelivered = ${missionRequest.peopleRescued} + ${missionRequest.suppliesDelivered?.length > 0 ? 20 : 0} = ${totalDelivered}`);
    console.log(`  expectedPercent = ${expectedPercent}%`);

    // Test normalization
    console.log('\n🔍 Supply Name Normalization Test:');
    if (request.requestSupplies && request.requestSupplies.length > 0) {
      const originalName = request.requestSupplies[0].name;
      const normalized = originalName.trim().toLowerCase();
      console.log(`  Original: "${originalName}"`);
      console.log(`  Normalized: "${normalized}"`);
    }

    if (missionRequest.requestSuppliesSnapshot && missionRequest.requestSuppliesSnapshot.length > 0) {
      const originalName = missionRequest.requestSuppliesSnapshot[0].name;
      const normalized = originalName.trim().toLowerCase();
      console.log(`  Snapshot Original: "${originalName}"`);
      console.log(`  Snapshot Normalized: "${normalized}"`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

debug();
