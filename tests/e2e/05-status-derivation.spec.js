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

test.describe('Status Derivation', () => {
  test('Request IN_PROGRESS when first team accepts', async ({ request }) => {
    // Create mission
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Test', type: 'RELIEF', description: 'Test', priority: 'High' },
    });
    const missionId = (await missionResponse.json()).data._id;

    const req = await Request.create({
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

    // Get timeline
    const timelinesResponse = await request.get(`/api/timelines?missionId=${missionId}`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });
    const timeline = (await timelinesResponse.json()).data[0];

    // Accept timeline
    await request.patch(`/api/timelines/${timeline._id}/accept`, {
      headers: { Authorization: `Bearer ${team1Token}` },
    });

    // Verify request status changed to IN_PROGRESS
    const updatedReq = await Request.findById(req._id);
    expect(updatedReq.status).toBe('IN_PROGRESS');
  });

  test('Request PARTIALLY_FULFILLED when partial delivery', async ({ request }) => {
    // Setup mission to completion with partial delivery
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Test', type: 'RELIEF', description: 'Test', priority: 'High' },
    });
    const missionId = (await missionResponse.json()).data._id;

    const req = await Request.create({
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

    // Deliver only partial supplies
    const missionRequests = await MissionRequest.find({ missionId });
    await request.post(`/api/mission-requests/${missionRequests[0]._id}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 5, // Only 5 out of 10
        suppliesDelivered: [{ name: 'Water', deliveredQty: 10 }], // Only 10 out of 20
      },
    });

    // Complete timeline
    await request.post(`/api/timelines/${timeline._id}/complete`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: { note: 'Partial completion' },
    });

    // Verify request status
    const updatedReq = await Request.findById(req._id);
    expect(updatedReq.status).toBe('PARTIALLY_FULFILLED');
  });

  test('Request CLOSED when fully met', async ({ request }) => {
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Test', type: 'RELIEF', description: 'Test', priority: 'High' },
    });
    const missionId = (await missionResponse.json()).data._id;

    const req = await Request.create({
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

    // Deliver all supplies
    const missionRequests = await MissionRequest.find({ missionId });
    await request.post(`/api/mission-requests/${missionRequests[0]._id}/progress`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: {
        peopleRescuedIncrement: 10, // All 10
        suppliesDelivered: [{ name: 'Water', deliveredQty: 20 }], // All 20
      },
    });

    await request.post(`/api/timelines/${timeline._id}/complete`, {
      headers: { Authorization: `Bearer ${team1Token}` },
      data: { note: 'Full completion' },
    });

    // Verify request status
    const updatedReq = await Request.findById(req._id);
    expect(updatedReq.status).toBe('CLOSED');
  });

  test('Mission IN_PROGRESS when any timeline EN_ROUTE/ON_SITE', async ({ request }) => {
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Test', type: 'RELIEF', description: 'Test', priority: 'High' },
    });
    const missionId = (await missionResponse.json()).data._id;

    const req = await Request.create({
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

    // Mission should be IN_PROGRESS
    const mission = await Mission.findById(missionId);
    expect(mission.status).toBe('IN_PROGRESS');
  });

  test('Mission COMPLETED when all MissionRequests closed', async ({ request }) => {
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Test', type: 'RELIEF', description: 'Test', priority: 'High' },
    });
    const missionId = (await missionResponse.json()).data._id;

    const req = await Request.create({
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

    // Verify mission status
    const mission = await Mission.findById(missionId);
    expect(mission.status).toBe('COMPLETED');
  });

  test('MissionRequest CLOSED when fulfillment 100%', async ({ request }) => {
    const missionResponse = await request.post('/api/missions', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      data: { name: 'Test', type: 'RELIEF', description: 'Test', priority: 'High' },
    });
    const missionId = (await missionResponse.json()).data._id;

    const req = await Request.create({
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

    // Verify MissionRequest status and fulfillment
    const updatedMR = await MissionRequest.findById(missionRequests[0]._id);
    expect(updatedMR.fulfillmentPercent).toBe(100);
    expect(updatedMR.status).toBe('CLOSED');
  });
});
