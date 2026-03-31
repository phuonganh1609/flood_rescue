import { test, expect } from '@playwright/test';
import { connectTestDb, disconnectTestDb } from '../setup/testDb.js';
import { seedTestData } from '../setup/seedTestData.js';
import Request from '../../src/modules/requests/request.model.js';
import Mission from '../../src/modules/missions/mission.model.js';
import MissionRequest from '../../src/modules/missionRequests/missionRequest.model.js';

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

test.describe('Edge Cases', () => {
  test('Mission with zero supplies (rescue only)', async ({ request }) => {
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Rescue Only', type: 'RELIEF', description: 'Test', priority: 'High' },
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
      requestSupplies: [], // No supplies requested
      description: 'Rescue only',
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

    const startResponse = await request.patch(`/api/missions/${missionId}/start`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });

    expect(startResponse.status()).toBe(200);

    // Progress through mission
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

    // Update progress with only people rescued
    const missionRequests = await MissionRequest.find({ missionId });
    const progressResponse = await request.post(`/api/mission-requests/${missionRequests[0]._id}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 10,
      },
    });

    expect(progressResponse.status()).toBe(200);
  });

  test('Mission with zero people (supplies only)', async ({ request }) => {
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Supplies Only', type: 'RELIEF', description: 'Test', priority: 'High' },
    });
    const missionId = (await missionResponse.json()).data._id;

    const req = await Request.create({
      type: 'Relief',
      userId: testData.citizens[0]._id,
      userName: 'Citizen One',
      phoneNumber: '0902000001',
      createdBy: testData.citizens[0]._id,
      location: { type: 'Point', coordinates: [106.66, 10.76], address: 'Test' },
      peopleCount: 0, // No people to rescue
      requestSupplies: [{ name: 'Water', requestedQty: 20, unit: 'L' }],
      description: 'Supplies only',
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

    const startResponse = await request.patch(`/api/missions/${missionId}/start`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });

    expect(startResponse.status()).toBe(200);

    // Progress through mission
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

    // Update progress with only supplies
    const missionRequests = await MissionRequest.find({ missionId });
    const progressResponse = await request.post(`/api/mission-requests/${missionRequests[0]._id}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        suppliesDelivered: [{ name: 'Water', deliveredQty: 20 }],
      },
    });

    expect(progressResponse.status()).toBe(200);
  });

  test('All teams withdraw - mission status', async ({ request }) => {
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'All Withdraw', type: 'RELIEF', description: 'Test', priority: 'High' },
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
      requestSupplies: [],
      description: 'Test',
      status: 'VERIFIED',
    });

    await request.post(`/api/missions/${missionId}/requests`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { requestIds: [req._id.toString()] },
    });

    await request.post(`/api/missions/${missionId}/teams`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: {
        teamIds: [
          testData.teams[0]._id.toString(),
          testData.teams[1]._id.toString(),
        ],
      },
    });

    await request.patch(`/api/missions/${missionId}/start`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });

    // Get both timelines
    const timelinesResponse = await request.get(`/api/timelines?missionId=${missionId}`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    const timelines = (await timelinesResponse.json()).data;

    // Team 1 withdraws
    await request.patch(`/api/timelines/${timelines[0]._id}/withdraw`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: { note: 'Unavailable' },
    });

    // Team 2 withdraws
    const team2Login = await request.post('/api/auth/login', {
      data: { email: 'team2_leader@test.com', password: 'Test123!' },
    });
    const team2Token = (await team2Login.json()).data.accessToken;

    await request.patch(`/api/timelines/${timelines[1]._id}/withdraw`, {
      headers: { Authorization: `Bearer ${team2Token}` },
      data: { note: 'Unavailable' },
    });

    // Mission should still be PLANNED or IN_PROGRESS depending on implementation
    const mission = await Mission.findById(missionId);
    expect(['PLANNED', 'IN_PROGRESS', 'PARTIAL']).toContain(mission.status);
  });

  test('Coordinator aborts mission mid-execution', async ({ request }) => {
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Abort Test', type: 'RELIEF', description: 'Test', priority: 'High' },
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
      requestSupplies: [],
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

    // Team accepts and starts
    const timelinesResponse = await request.get(`/api/timelines?missionId=${missionId}`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });
    const timeline = (await timelinesResponse.json()).data[0];

    await request.patch(`/api/timelines/${timeline._id}/accept`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });

    // Coordinator aborts mission
    const abortResponse = await request.patch(`/api/missions/${missionId}/abort`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { note: 'Emergency abort' },
    });

    expect(abortResponse.status()).toBe(200);

    // Verify mission status
    const mission = await Mission.findById(missionId);
    expect(mission.status).toBe('ABORTED');
  });

  test('Timeline complete when already completed (idempotent)', async ({ request }) => {
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Idempotent Test', type: 'RELIEF', description: 'Test', priority: 'High' },
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

    const missionRequests = await MissionRequest.find({ missionId });
    await request.post(`/api/mission-requests/${missionRequests[0]._id}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 10,
        suppliesDelivered: [{ name: 'Water', deliveredQty: 20 }],
      },
    });

    // Complete timeline first time
    const completeResponse1 = await request.post(`/api/timelines/${timeline._id}/complete`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: { note: 'Complete' },
    });

    expect(completeResponse1.status()).toBe(200);

    // Try to complete again - should be idempotent
    const completeResponse2 = await request.post(`/api/timelines/${timeline._id}/complete`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: { note: 'Complete again' },
    });

    expect(completeResponse2.status()).toBe(200);
    const data = await completeResponse2.json();
    expect(data.message).toContain('completed');
  });

  test('Progress update when mission already completed', async ({ request }) => {
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Completed Mission', type: 'RELIEF', description: 'Test', priority: 'High' },
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

    const missionRequests = await MissionRequest.find({ missionId });
    await request.post(`/api/mission-requests/${missionRequests[0]._id}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 10,
        suppliesDelivered: [{ name: 'Water', deliveredQty: 20 }],
      },
    });

    await request.post(`/api/timelines/${timeline._id}/complete`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: { note: 'Complete' },
    });

    // Try to update progress after completion
    const progressResponse = await request.post(`/api/mission-requests/${missionRequests[0]._id}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 5,
      },
    });

    // Should return 200 with message or 400 depending on implementation
    expect([200, 400]).toContain(progressResponse.status());
  });
});
