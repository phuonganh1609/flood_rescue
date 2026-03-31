import { test, expect } from '@playwright/test';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../setup/testDb.js';
import { seedTestData } from '../setup/seedTestData.js';
import Request from '../../src/modules/requests/request.model.js';
import Mission from '../../src/modules/missions/mission.model.js';
import Timeline from '../../src/modules/timelines/timeline.model.js';

let testData;
let coordinatorToken;
let team1Token;
let team2Token;

test.beforeAll(async () => {
  await connectTestDb();
  testData = await seedTestData();
});

test.afterAll(async () => {
  await disconnectTestDb();
});

test.beforeEach(async ({ request }) => {
  // Login as coordinator
  const coordinatorLogin = await request.post('/api/auth/login', {
    data: {
      email: 'coordinator1@test.com',
      password: 'Test123!',
    },
  });
  const coordinatorData = await coordinatorLogin.json();
  coordinatorToken = coordinatorData.data.accessToken;

  // Login as team1 leader
  const team1Login = await request.post('/api/auth/login', {
    data: {
      email: 'team1_leader@test.com',
      password: 'Test123!',
    },
  });
  const team1Data = await team1Login.json();
  team1Token = team1Data.data.accessToken;

  // Login as team2 leader
  const team2Login = await request.post('/api/auth/login', {
    data: {
      email: 'team2_leader@test.com',
      password: 'Test123!',
    },
  });
  const team2Data = await team2Login.json();
  team2Token = team2Data.data.accessToken;
});

async function createAndStartMission(request) {
  // Create mission
  const missionResponse = await request.post('/api/missions', {
    headers: { Authorization: `Bearer ${coordinatorToken}` },
    data: {
      name: 'Test Mission',
      type: 'RELIEF',
      description: 'Test',
      priority: 'High',
    },
  });
  const missionData = await missionResponse.json();
  const missionId = missionData.data._id;

  // Add request
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

  // Assign teams
  await request.post(`/api/missions/${missionId}/teams`, {
    headers: { Authorization: `Bearer ${coordinatorToken}` },
    data: {
      teamIds: [
        testData.teams[0]._id.toString(),
        testData.teams[1]._id.toString(),
      ],
    },
  });

  // Start mission
  await request.patch(`/api/missions/${missionId}/start`, {
    headers: { Authorization: `Bearer ${coordinatorToken}` },
  });

  return { missionId, requestId: req._id };
}

test.describe('Timeline Execution', () => {
  test('Team accepts timeline: ASSIGNED → CLAIMING_SUPPLIES', async ({ request }) => {
    const { missionId } = await createAndStartMission(request);

    // Get team1's timeline
    const timelinesResponse = await request.get(`/api/timelines?missionId=${missionId}`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });
    const timelinesData = await timelinesResponse.json();
    const team1Timeline = timelinesData.data.find(
      t => t.teamId._id === testData.teams[0]._id.toString()
    );

    // Accept timeline
    const acceptResponse = await request.patch(`/api/timelines/${team1Timeline._id}/accept`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });

    expect(acceptResponse.status()).toBe(200);
    const acceptData = await acceptResponse.json();
    expect(acceptData.data.status).toBe('CLAIMING_SUPPLIES');

    // Verify mission status changed to IN_PROGRESS
    const mission = await Mission.findById(missionId);
    expect(mission.status).toBe('IN_PROGRESS');
  });

  test('Team confirms supply claim: CLAIMING_SUPPLIES → EN_ROUTE', async ({ request }) => {
    const { missionId } = await createAndStartMission(request);

    // Get and accept timeline
    const timelinesResponse = await request.get(`/api/timelines?missionId=${missionId}`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });
    const timelinesData = await timelinesResponse.json();
    const team1Timeline = timelinesData.data.find(
      t => t.teamId._id === testData.teams[0]._id.toString()
    );

    await request.patch(`/api/timelines/${team1Timeline._id}/accept`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });

    // Confirm supply claim
    const confirmResponse = await request.post(
      `/api/timelines/${team1Timeline._id}/confirm-supply-claim`,
      {
        headers: { Authorization: `Bearer ${team1Token}` },
        data: {},
      }
    );

    expect(confirmResponse.status()).toBe(200);
    const confirmData = await confirmResponse.json();
    expect(confirmData.data.status).toBe('EN_ROUTE');
  });

  test('Team arrives on site: EN_ROUTE → ON_SITE', async ({ request }) => {
    const { missionId } = await createAndStartMission(request);

    // Get timeline
    const timelinesResponse = await request.get(`/api/timelines?missionId=${missionId}`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });
    const timelinesData = await timelinesResponse.json();
    const team1Timeline = timelinesData.data.find(
      t => t.teamId._id === testData.teams[0]._id.toString()
    );

    // Accept and confirm supply
    await request.patch(`/api/timelines/${team1Timeline._id}/accept`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });

    await request.post(`/api/timelines/${team1Timeline._id}/confirm-supply-claim`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {},
    });

    // Arrive on site
    const arriveResponse = await request.patch(`/api/timelines/${team1Timeline._id}/arrive`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });

    expect(arriveResponse.status()).toBe(200);
    const arriveData = await arriveResponse.json();
    expect(arriveData.data.status).toBe('ON_SITE');
  });

  test('Team completes timeline with auto-calculated outcome', async ({ request }) => {
    const { missionId } = await createAndStartMission(request);

    // Get timeline
    const timelinesResponse = await request.get(`/api/timelines?missionId=${missionId}`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });
    const timelinesData = await timelinesResponse.json();
    const team1Timeline = timelinesData.data.find(
      t => t.teamId._id === testData.teams[0]._id.toString()
    );

    // Progress through states
    await request.patch(`/api/timelines/${team1Timeline._id}/accept`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });

    await request.post(`/api/timelines/${team1Timeline._id}/confirm-supply-claim`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {},
    });

    await request.patch(`/api/timelines/${team1Timeline._id}/arrive`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });

    // Complete timeline
    const completeResponse = await request.post(`/api/timelines/${team1Timeline._id}/complete`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        note: 'Mission completed',
      },
    });

    expect(completeResponse.status()).toBe(200);
    const completeData = await completeResponse.json();
    
    // Timeline should have a terminal status after completion
    expect(completeData.data).toBeDefined();
    expect(completeData.data.status).toBeDefined();
    expect(['COMPLETED', 'PARTIAL', 'FAILED']).toContain(completeData.data.status);
  });

  test('Team can withdraw before EN_ROUTE', async ({ request }) => {
    const { missionId } = await createAndStartMission(request);

    // Get timeline
    const timelinesResponse = await request.get(`/api/timelines?missionId=${missionId}`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });
    const timelinesData = await timelinesResponse.json();
    const team1Timeline = timelinesData.data.find(
      t => t.teamId._id === testData.teams[0]._id.toString()
    );

    // Withdraw from ASSIGNED state
    const withdrawResponse = await request.patch(`/api/timelines/${team1Timeline._id}/withdraw`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        withdrawalReason: 'Team unavailable',
        note: 'Additional context',
      },
    });

    expect(withdrawResponse.status()).toBe(200);
    const withdrawData = await withdrawResponse.json();
    expect(withdrawData.data.status).toBe('WITHDRAWN');
  });

  test('Invalid state transitions are rejected', async ({ request }) => {
    const { missionId } = await createAndStartMission(request);

    // Get timeline
    const timelinesResponse = await request.get(`/api/timelines?missionId=${missionId}`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });
    const timelinesData = await timelinesResponse.json();
    const team1Timeline = timelinesData.data.find(
      t => t.teamId._id === testData.teams[0]._id.toString()
    );

    // Try to arrive without accepting first (ASSIGNED → ON_SITE is invalid)
    const invalidResponse = await request.patch(`/api/timelines/${team1Timeline._id}/arrive`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });

    expect(invalidResponse.status()).toBe(400);
    const errorData = await invalidResponse.json();
    expect(errorData.message).toMatch(/transition|trạng thái/i);
  });
});
