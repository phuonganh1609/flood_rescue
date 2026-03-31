import { test, expect } from '@playwright/test';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../setup/testDb.js';
import { seedTestData } from '../setup/seedTestData.js';
import Request from '../../src/modules/requests/request.model.js';
import Mission from '../../src/modules/missions/mission.model.js';
import MissionRequest from '../../src/modules/missionRequests/missionRequest.model.js';
import Timeline from '../../src/modules/timelines/timeline.model.js';
import TeamRequest from '../../src/modules/teamRequests/teamRequest.model.js';

let testData;
let coordinatorToken;

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
});

test.describe('Mission Planning', () => {
  test('Coordinator creates mission in DRAFT state', async ({ request }) => {
    const response = await request.post('/api/missions', {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        name: 'Test Relief Mission',
        type: 'RELIEF',
        description: 'E2E test mission',
        priority: 'High',
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.data.status).toBe('DRAFT');
    expect(data.data.name).toBe('Test Relief Mission');
    expect(data.data.type).toBe('RELIEF');
  });

  test('Coordinator adds multiple requests to mission', async ({ request }) => {
    // Create mission
    const missionResponse = await request.post('/api/missions', {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        name: 'Multi-Request Mission',
        type: 'RELIEF',
        description: 'Test',
        priority: 'High',
      },
    });
    const missionData = await missionResponse.json();
    const missionId = missionData.data._id;

    // Create verified requests
    const req1 = await Request.create({
      userName: 'Citizen One',
      userId: testData.citizens[0]._id,
      createdBy: testData.citizens[0]._id,
      phoneNumber: '0902000001',
      type: 'Relief',
      location: { type: 'Point', coordinates: [106.66, 10.76] },
      peopleCount: 10,
      requestSupplies: [{ name: 'Water', requestedQty: 20 }],
      description: 'Request 1 for mission planning test',
      status: 'VERIFIED',
    });

    const req2 = await Request.create({
      userName: 'Citizen Two',
      userId: testData.citizens[1]._id,
      createdBy: testData.citizens[1]._id,
      phoneNumber: '0902000002',
      type: 'Relief',
      location: { type: 'Point', coordinates: [106.67, 10.77] },
      peopleCount: 5,
      requestSupplies: [{ name: 'Rice', requestedQty: 10 }],
      description: 'Request 2 for mission planning test',
      status: 'VERIFIED',
    });

    // Add requests to mission
    const addResponse = await request.post(`/api/missions/${missionId}/requests`, {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        requestIds: [req1._id.toString(), req2._id.toString()],
      },
    });

    expect(addResponse.status()).toBe(200);
    const addData = await addResponse.json();
    expect(addData.data.addedCount).toBe(2);

    // Verify MissionRequests created
    const missionRequests = await MissionRequest.find({ missionId });
    expect(missionRequests).toHaveLength(2);
    expect(missionRequests[0].status).toBe('PENDING');
  });

  test('Coordinator assigns multiple teams to mission', async ({ request }) => {
    // Create mission
    const missionResponse = await request.post('/api/missions', {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        name: 'Multi-Team Mission',
        type: 'RELIEF',
        description: 'Test',
        priority: 'High',
      },
    });
    const missionData = await missionResponse.json();
    const missionId = missionData.data._id;

    // Assign teams
    const assignResponse = await request.post(`/api/missions/${missionId}/teams`, {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        teamIds: [
          testData.teams[0]._id.toString(),
          testData.teams[1]._id.toString(),
        ],
      },
    });

    expect(assignResponse.status()).toBe(200);
    const assignData = await assignResponse.json();
    expect(assignData.data.addedCount).toBe(2);

    // Verify Timelines created
    const timelines = await Timeline.find({ missionId });
    expect(timelines).toHaveLength(2);
    expect(timelines[0].status).toBe('PLANNED');
    expect(timelines[1].status).toBe('PLANNED');
  });

  test('Cannot start mission without requests', async ({ request }) => {
    // Create mission without requests
    const missionResponse = await request.post('/api/missions', {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        name: 'Empty Mission',
        type: 'RELIEF',
        description: 'Test',
        priority: 'High',
      },
    });
    const missionData = await missionResponse.json();
    const missionId = missionData.data._id;

    // Try to start mission
    const startResponse = await request.patch(`/api/missions/${missionId}/start`, {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });

    expect(startResponse.status()).toBe(400);
    const errorData = await startResponse.json();
    expect(errorData.message).toContain('without requests');
  });

  test('Cannot start mission without teams', async ({ request }) => {
    // Create mission with request but no teams
    const missionResponse = await request.post('/api/missions', {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        name: 'No Teams Mission',
        type: 'RELIEF',
        description: 'Test',
        priority: 'High',
      },
    });
    const missionData = await missionResponse.json();
    const missionId = missionData.data._id;

    // Add request
    const req = await Request.create({
      userName: 'Citizen One',
      userId: testData.citizens[0]._id,
      createdBy: testData.citizens[0]._id,
      phoneNumber: '0902000001',
      type: 'Relief',
      location: { type: 'Point', coordinates: [106.66, 10.76] },
      peopleCount: 10,
      requestSupplies: [],
      description: 'Test request without supplies',
      status: 'VERIFIED',
    });

    await request.post(`/api/missions/${missionId}/requests`, {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        requestIds: [req._id.toString()],
      },
    });

    // Try to start mission
    const startResponse = await request.patch(`/api/missions/${missionId}/start`, {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });

    expect(startResponse.status()).toBe(400);
    const errorData = await startResponse.json();
    expect(errorData.message).toContain('PLANNED');
  });

  test('Start mission creates TeamRequest matrix', async ({ request }) => {
    // Create complete mission
    const missionResponse = await request.post('/api/missions', {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        name: 'Complete Mission',
        type: 'RELIEF',
        description: 'Test',
        priority: 'High',
      },
    });
    const missionData = await missionResponse.json();
    const missionId = missionData.data._id;

    // Add 2 requests
    const req1 = await Request.create({
      userName: 'Citizen One',
      userId: testData.citizens[0]._id,
      createdBy: testData.citizens[0]._id,
      phoneNumber: '0902000001',
      type: 'Relief',
      location: { type: 'Point', coordinates: [106.66, 10.76] },
      peopleCount: 10,
      requestSupplies: [{ name: 'Water', requestedQty: 20 }],
      description: 'Request 1 for team matrix test',
      status: 'VERIFIED',
    });

    const req2 = await Request.create({
      userName: 'Citizen Two',
      userId: testData.citizens[1]._id,
      createdBy: testData.citizens[1]._id,
      phoneNumber: '0902000002',
      type: 'Relief',
      location: { type: 'Point', coordinates: [106.67, 10.77] },
      peopleCount: 5,
      requestSupplies: [{ name: 'Rice', requestedQty: 10 }],
      description: 'Request 2 for team matrix test',
      status: 'VERIFIED',
    });

    await request.post(`/api/missions/${missionId}/requests`, {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        requestIds: [req1._id.toString(), req2._id.toString()],
      },
    });

    // Assign 2 teams
    await request.post(`/api/missions/${missionId}/teams`, {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        teamIds: [
          testData.teams[0]._id.toString(),
          testData.teams[1]._id.toString(),
        ],
      },
    });

    // Start mission
    const startResponse = await request.patch(`/api/missions/${missionId}/start`, {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });

    expect(startResponse.status()).toBe(200);

    // Verify mission status
    const mission = await Mission.findById(missionId);
    expect(mission.status).toBe('PLANNED');

    // Verify timelines updated
    const timelines = await Timeline.find({ missionId });
    expect(timelines).toHaveLength(2);
    timelines.forEach(timeline => {
      expect(timeline.status).toBe('ASSIGNED');
    });

    // Verify TeamRequest matrix created (2 requests × 2 teams = 4 TeamRequests)
    const teamRequests = await TeamRequest.find({ missionId });
    expect(teamRequests).toHaveLength(4);
  });
});
