import { test, expect } from '@playwright/test';
import { connectTestDb, disconnectTestDb } from '../setup/testDb.js';
import { seedTestData } from '../setup/seedTestData.js';
import Request from '../../src/modules/requests/request.model.js';
import MissionRequest from '../../src/modules/missionRequests/missionRequest.model.js';
import TeamRequest from '../../src/modules/teamRequests/teamRequest.model.js';

let testData;
let coordinatorToken;
let team1Token;

test.beforeAll(async () => {
  await connectTestDb();
  testData = await seedTestData();
});

test.afterAll(async () => {
  await disconnectTestDb();
});

test.beforeEach(async ({ request }) => {
  const coordinatorLogin = await request.post('/api/auth/login', {
    data: { email: 'coordinator1@test.com', password: 'Test123!' },
  });
  coordinatorToken = (await coordinatorLogin.json()).data.accessToken;

  const team1Login = await request.post('/api/auth/login', {
    data: { email: 'team1_leader@test.com', password: 'Test123!' },
  });
  team1Token = (await team1Login.json()).data.accessToken;
});

async function setupMissionToOnSite(request) {
  // Create and start mission
  const missionResponse = await request.post('/api/missions', {
    headers: { Authorization: `Bearer ${coordinatorToken}` },
    data: { name: 'Test Mission', type: 'RELIEF', description: 'Test', priority: 'High' },
  });
  const missionId = (await missionResponse.json()).data._id;

  const req = await Request.create({
    type: 'Relief',
    userId: testData.citizens[0]._id,
    userName: 'Citizen One',
    phoneNumber: '0902000001',
    createdBy: testData.citizens[0]._id,
    location: { type: 'Point', coordinates: [106.66, 10.76], address: 'Test' },
    peopleCount: 10,
    requestSupplies: [
      { name: 'Water', requestedQty: 20, unit: 'L' },
      { name: 'Rice', requestedQty: 10, unit: 'kg' },
    ],
    description: 'Test',
    status: 'VERIFIED',
  });

  await request.post(`/api/missions/${missionId}/requests`, {
    headers: { Authorization: `Bearer ${coordinatorToken}` },
    data: { requestIds: [req._id.toString()] },
  });

  await request.post(`/api/missions/${missionId}/teams`, {
    headers: { Authorization: `Bearer ${coordinatorToken}` },
    data: { teamIds: [testData.teams[0]._id.toString()] },
  });

  await request.patch(`/api/missions/${missionId}/start`, {
    headers: { Authorization: `Bearer ${coordinatorToken}` },
  });

  // Get timeline and progress to ON_SITE
  const timelinesResponse = await request.get(`/api/timelines?missionId=${missionId}`, {
    headers: { Authorization: `Bearer ${team1Token}` },
  });
  const timeline = (await timelinesResponse.json()).data[0];

  await request.patch(`/api/timelines/${timeline._id}/accept`, {
    headers: { Authorization: `Bearer ${team1Token}` },
  });

  await request.post(`/api/timelines/${timeline._id}/confirm-supply-claim`, {
    headers: { Authorization: `Bearer ${team1Token}` },
    data: {},
  });

  await request.patch(`/api/timelines/${timeline._id}/arrive`, {
    headers: { Authorization: `Bearer ${team1Token}` },
  });

  // Get missionRequest
  const missionRequests = await MissionRequest.find({ missionId });
  const missionRequestId = missionRequests[0]._id;

  return { missionId, missionRequestId, timelineId: timeline._id };
}

test.describe('Progress Tracking', () => {
  test('Team updates progress with people rescued', async ({ request }) => {
    const { missionRequestId } = await setupMissionToOnSite(request);

    const progressResponse = await request.post(`/api/mission-requests/${missionRequestId}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 5,
      },
    });

    expect(progressResponse.status()).toBe(200);
    const progressData = await progressResponse.json();
    expect(progressData.data.peopleRescued).toBe(5);
    expect(progressData.data.peopleRemaining).toBe(5);
  });

  test('Team updates progress with supplies delivered', async ({ request }) => {
    const { missionRequestId } = await setupMissionToOnSite(request);

    const progressResponse = await request.post(`/api/mission-requests/${missionRequestId}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        suppliesDelivered: [
          { name: 'Water', deliveredQty: 10 },
          { name: 'Rice', deliveredQty: 5 },
        ],
      },
    });

    expect(progressResponse.status()).toBe(200);
    const progressData = await progressResponse.json();
    expect(progressData.data.suppliesDelivered).toHaveLength(2);
    expect(progressData.data.suppliesDelivered[0].name).toBe('Water');
    expect(progressData.data.suppliesDelivered[0].deliveredQty).toBe(10);
  });

  test('Progress validation: cannot exceed target', async ({ request }) => {
    const { missionRequestId } = await setupMissionToOnSite(request);

    // Try to deliver more than requested
    const progressResponse = await request.post(`/api/mission-requests/${missionRequestId}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        suppliesDelivered: [
          { name: 'Water', deliveredQty: 100 }, // Requested only 20
        ],
      },
    });

    expect(progressResponse.status()).toBe(400);
    const errorData = await progressResponse.json();
    expect(errorData.message).toContain('exceed');
  });

  test('Progress validation: must be in EN_ROUTE or ON_SITE', async ({ request }) => {
    // Create mission but don't progress timeline
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Test', type: 'RELIEF', description: 'Test', priority: 'High' },
    });
    const missionId = (await missionResponse.json()).data._id;

    const req = await Request.create({
      type: 'Relief',
      userId: testData.citizens[0]._id,
      userName: 'Citizen One',
      phoneNumber: '0902000001',
      createdBy: testData.citizens[0]._id,
      location: { type: 'Point', coordinates: [106.66, 10.76], address: 'Test' },
      peopleCount: 10,
      requestSupplies: [{ name: 'Water', requestedQty: 20, unit: 'L' }],
      description: 'Test',
      status: 'VERIFIED',
    });

    await request.post(`/api/missions/${missionId}/requests`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { requestIds: [req._id.toString()] },
    });

    await request.post(`/api/missions/${missionId}/teams`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { teamIds: [testData.teams[0]._id.toString()] },
    });

    await request.patch(`/api/missions/${missionId}/start`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });

    const missionRequests = await MissionRequest.find({ missionId });
    const missionRequestId = missionRequests[0]._id;

    // Try to update progress without accepting timeline
    const progressResponse = await request.post(`/api/mission-requests/${missionRequestId}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 5,
      },
    });

    expect(progressResponse.status()).toBe(400);
  });

  test('TeamRequest contribution is recorded correctly', async ({ request }) => {
    const { missionRequestId, missionId } = await setupMissionToOnSite(request);

    await request.post(`/api/mission-requests/${missionRequestId}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 5,
        suppliesDelivered: [{ name: 'Water', deliveredQty: 10 }],
      },
    });

    // Verify TeamRequest updated
    const teamRequests = await TeamRequest.find({
      missionId,
      missionRequestId,
      teamId: testData.teams[0]._id,
    });

    expect(teamRequests).toHaveLength(1);
    expect(teamRequests[0].rescuedCountTotal).toBe(5);
    expect(teamRequests[0].suppliesDeliveredTotal).toHaveLength(1);
    expect(teamRequests[0].suppliesDeliveredTotal[0].name).toBe('Water');
    expect(teamRequests[0].suppliesDeliveredTotal[0].deliveredQty).toBe(10);
  });

  test('MissionRequest aggregate is synced from TeamRequests', async ({ request }) => {
    const { missionRequestId } = await setupMissionToOnSite(request);

    // Update progress twice
    await request.post(`/api/mission-requests/${missionRequestId}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 3,
        suppliesDelivered: [{ name: 'Water', deliveredQty: 5 }],
      },
    });

    await request.post(`/api/mission-requests/${missionRequestId}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 2,
        suppliesDelivered: [{ name: 'Water', deliveredQty: 5 }],
      },
    });

    // Verify MissionRequest aggregate
    const missionRequest = await MissionRequest.findById(missionRequestId);
    expect(missionRequest.peopleRescued).toBe(5); // 3 + 2
    expect(missionRequest.suppliesDelivered[0].deliveredQty).toBe(10); // 5 + 5
    expect(missionRequest.fulfillmentPercent).toBeGreaterThan(0);
  });
});
