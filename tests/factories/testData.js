import bcrypt from 'bcryptjs';

// User Factories
export const createTestUser = async (overrides = {}) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  
  return {
    userName: `user_${timestamp}_${random}`,
    email: `user_${timestamp}_${random}@test.com`,
    hashedPassword: await bcrypt.hash('Test123!', 10),
    displayName: `Test User ${random}`,
    phoneNumber: `09${timestamp.toString().slice(-8)}`,
    role: 'Citizen',
    isActive: true,
    ...overrides,
  };
};

export const createTestCitizen = async (overrides = {}) => {
  return createTestUser({ role: 'Citizen', ...overrides });
};

export const createTestCoordinator = async (overrides = {}) => {
  return createTestUser({ role: 'Rescue Coordinator', ...overrides });
};

export const createTestTeamMember = async (teamId, overrides = {}) => {
  return createTestUser({ 
    role: 'Rescue Team',
    teamId,
    ...overrides 
  });
};

// Request Factory
export const createTestRequest = (citizenId, overrides = {}) => {
  const timestamp = Date.now();
  
  return {
    citizenId,
    location: {
      type: 'Point',
      coordinates: [106.660172, 10.762622], // [lng, lat]
      address: 'Test Address, District 1, HCMC',
    },
    peopleCount: 10,
    supplies: [
      { name: 'Water', requestedQty: 20, unit: 'L' },
      { name: 'Rice', requestedQty: 10, unit: 'kg' },
    ],
    description: `Test request ${timestamp}`,
    priority: 'NORMAL',
    status: 'SUBMITTED',
    isLocationVerified: false,
    isDuplicated: false,
    ...overrides,
  };
};

// Team Factory
export const createTestTeam = (leaderId, overrides = {}) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  
  return {
    name: `Team ${random}`,
    leaderId,
    memberIds: [],
    status: 'AVAILABLE',
    specialization: 'RELIEF',
    capacity: 10,
    currentMissionId: null,
    ...overrides,
  };
};

// Mission Factory
export const createTestMission = (coordinatorId, overrides = {}) => {
  const timestamp = Date.now();
  
  return {
    name: `Mission ${timestamp}`,
    code: `MSN${timestamp}`,
    type: 'RELIEF',
    description: 'Test relief mission',
    priority: 'HIGH',
    status: 'DRAFT',
    createdBy: coordinatorId,
    ...overrides,
  };
};

// Warehouse Factory
export const createTestWarehouse = (managerId, overrides = {}) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  
  return {
    name: `Warehouse ${random}`,
    location: {
      type: 'Point',
      coordinates: [106.660172, 10.762622],
    },
    createdBy: managerId,
    status: 'EMPTY',
    ...overrides,
  };
};

// Inventory Item Factory
export const createTestInventoryItem = (warehouseId, supplyId, overrides = {}) => {
  return {
    itemType: 'SUPPLY',
    supplyID: supplyId,
    warehouse: warehouseId,
    description: 'Test inventory item',
    quantity: 500,
    reservedQuantity: 0,
    unit: 'L',
    status: 'ACTIVE',
    ...overrides,
  };
};

// Supply Factory (for requests)
export const createTestSupply = (overrides = {}) => {
  return {
    name: 'Water',
    requestedQty: 20,
    unit: 'L',
    ...overrides,
  };
};

// MissionRequest Factory
export const createTestMissionRequest = (missionId, requestId, overrides = {}) => {
  return {
    missionId,
    requestId,
    status: 'PENDING',
    peopleNeeded: 10,
    peopleRescued: 0,
    peopleRemaining: 10,
    requestSuppliesSnapshot: [
      { name: 'Water', requestedQty: 20, unit: 'L' },
      { name: 'Rice', requestedQty: 10, unit: 'kg' },
    ],
    suppliesDelivered: [],
    fulfillmentPercent: 0,
    handledByTeamIds: [],
    ...overrides,
  };
};

// Timeline Factory
export const createTestTimeline = (missionId, teamId, overrides = {}) => {
  return {
    missionId,
    teamId,
    status: 'PLANNED',
    ...overrides,
  };
};

// TeamRequest Factory
export const createTestTeamRequest = (missionId, missionRequestId, teamId, overrides = {}) => {
  return {
    missionId,
    missionRequestId,
    teamId,
    rescuedCountTotal: 0,
    suppliesDeliveredTotal: [],
    ...overrides,
  };
};

// Progress Update Payload Factory
export const createProgressPayload = (overrides = {}) => {
  return {
    peopleRescuedIncrement: 5,
    suppliesDelivered: [
      { name: 'Water', deliveredQty: 10 },
      { name: 'Rice', deliveredQty: 5 },
    ],
    ...overrides,
  };
};
