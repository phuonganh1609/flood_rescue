// Jest setup file for common mocks and utilities

// Mock eventBus globally to avoid side effects during tests
jest.mock('../../src/utils/events.js', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

// Mock response helper to avoid side effects
jest.mock('../../src/utils/response.js', () => ({
  sendSuccess: jest.fn((res, data) => res),
  sendError: jest.fn((res, data) => res),
}));

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
