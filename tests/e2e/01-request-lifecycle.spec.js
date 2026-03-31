import { test, expect } from '@playwright/test';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../setup/testDb.js';
import { seedTestData } from '../setup/seedTestData.js';
import User from '../../src/modules/users/user.model.js';
import Request from '../../src/modules/requests/request.model.js';

let testData;
let coordinatorToken;

// Helper function to login as different citizens
async function loginAsCitizen(request, citizenNumber) {
  const login = await request.post('/api/auth/login', {
    data: {
      email: `citizen${citizenNumber}@test.com`,
      password: 'Test123!',
    },
  });
  const data = await login.json();
  return data.data.accessToken;
}

test.beforeAll(async () => {
  await connectTestDb();
  // Clean up all requests from previous test runs
  await Request.deleteMany({});
  // Note: Test data should be seeded manually before running tests
  // Run: npm run test:seed
});

test.afterAll(async () => {
  await disconnectTestDb();
});

test.afterEach(async () => {
  // Clean up requests created during this test
  await Request.deleteMany({});
});

test.beforeEach(async ({ request }) => {
  // Login as coordinator (each test will login as different citizen)
  const coordinatorLogin = await request.post('/api/auth/login', {
    data: {
      email: 'coordinator1@test.com',
      password: 'Test123!',
    },
  });
  const coordinatorData = await coordinatorLogin.json();
  coordinatorToken = coordinatorData.data.accessToken;
});

test.describe('Request Lifecycle', () => {
  test('Citizen can create request with location and supplies', async ({ request }) => {
    // Login as citizen1 for this test
    const citizenToken = await loginAsCitizen(request, 1);
    
    const response = await request.post('/api/requests', {
      headers: {
        Authorization: `Bearer ${citizenToken}`,
      },
      data: {
        type: 'Relief',
        location: {
          type: 'Point',
          coordinates: [106.660172, 10.762622],
        },
        peopleCount: 10,
        requestSupplies: [
          { name: 'Water', requestedQty: 20 },
          { name: 'Rice', requestedQty: 10 },
        ],
        description: 'E2E Test Request for relief supplies',
      },
    });

    const data = await response.json();
    if (response.status() !== 201) {
      console.log('Request creation failed:', JSON.stringify(data, null, 2));
    }
    expect(response.status()).toBe(201);
    expect(data.data.status).toBe('SUBMITTED');
    expect(data.data.peopleCount).toBe(10);
    expect(data.data.requestSupplies).toHaveLength(2);
  });

  test('Coordinator can verify request', async ({ request }) => {
    // Login as citizen2 for this test
    const citizenToken = await loginAsCitizen(request, 2);
    
    // Create request first
    const createResponse = await request.post('/api/requests', {
      headers: {
        Authorization: `Bearer ${citizenToken}`,
      },
      data: {
        type: 'Relief',
        location: {
          type: 'Point',
          coordinates: [106.660172, 10.762622],
        },
        peopleCount: 5,
        requestSupplies: [{ name: 'Water', requestedQty: 10 }],
        description: 'Test request for verification',
      },
    });
    const createData = await createResponse.json();
    expect(createResponse.status()).toBe(201);
    expect(createData?.data?._id).toBeTruthy();
    const requestId = createData.data._id;

    // Verify request
    const verifyResponse = await request.patch(`/api/requests/${requestId}/verify`, {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        approved: true,
      },
    });

    expect(verifyResponse.status()).toBe(200);
    const verifyData = await verifyResponse.json();
    expect(verifyData.data.status).toBe('VERIFIED');
  });

  test('Coordinator can reject request with reason', async ({ request }) => {
    // Login as citizen3 for this test
    const citizenToken = await loginAsCitizen(request, 3);
    
    // Create request
    const createResponse = await request.post('/api/requests', {
      headers: {
        Authorization: `Bearer ${citizenToken}`,
      },
      data: {
        type: 'Relief',
        location: {
          type: 'Point',
          coordinates: [106.660172, 10.762622],
        },
        peopleCount: 5,
        requestSupplies: [],
        description: 'Invalid request for rejection test',
      },
    });
    const createData = await createResponse.json();
    expect(createResponse.status()).toBe(201);
    expect(createData?.data?._id).toBeTruthy();
    const requestId = createData.data._id;

    // Reject request
    const rejectResponse = await request.patch(`/api/requests/${requestId}/verify`, {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
      data: {
        approved: false,
        reason: 'Duplicate request',
      },
    });

    expect(rejectResponse.status()).toBe(200);
    const rejectData = await rejectResponse.json();
    expect(rejectData.data.status).toBe('REJECTED');
  });

  test('Citizen cannot create multiple active requests', async ({ request }) => {
    // Login as citizen4 for this test
    const citizenToken = await loginAsCitizen(request, 4);
    
    // Create first request
    await request.post('/api/requests', {
      headers: {
        Authorization: `Bearer ${citizenToken}`,
      },
      data: {
        type: 'Relief',
        location: {
          type: 'Point',
          coordinates: [106.660172, 10.762622],
        },
        peopleCount: 5,
        requestSupplies: [],
        description: 'First request to test duplicate prevention',
      },
    });

    // Try to create second request
    const secondResponse = await request.post('/api/requests', {
      headers: {
        Authorization: `Bearer ${citizenToken}`,
      },
      data: {
        type: 'Relief',
        location: {
          type: 'Point',
          coordinates: [106.660172, 10.762622],
        },
        peopleCount: 5,
        requestSupplies: [],
        description: 'Second request should fail due to duplicate',
      },
    });

    expect(secondResponse.status()).toBe(400);
    const errorData = await secondResponse.json();
    expect(errorData.message).toContain('active request');
  });

  test.skip('Request priority sorting works correctly', async ({ request }) => {
    // Skip this test for now - needs testData which is not loaded
    // TODO: Implement this test properly with API calls instead of direct DB inserts

    // Get sorted requests
    const response = await request.get('/api/requests?status=VERIFIED', {
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    const sortedRequests = data.data;

    // Verify CRITICAL comes first
    expect(sortedRequests[0].priority).toBe('CRITICAL');
    expect(sortedRequests[1].priority).toBe('HIGH');
    expect(sortedRequests[2].priority).toBe('NORMAL');
  });
});
