/**
 * Helper function to create test requests with correct schema
 * Use this in tests instead of Request.create() directly
 */
export function createTestRequestData(citizenData, overrides = {}) {
  return {
    userName: citizenData.displayName || 'Test User',
    userId: citizenData._id,
    createdBy: citizenData._id,
    phoneNumber: citizenData.phoneNumber || '0900000000',
    type: 'Relief',
    location: {
      type: 'Point',
      coordinates: [106.66, 10.76],
    },
    peopleCount: 10,
    requestSupplies: [],
    description: 'Test request for E2E testing',
    status: 'VERIFIED',
    ...overrides,
  };
}
