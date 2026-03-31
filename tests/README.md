# Relief Flow Testing Guide

Comprehensive testing documentation for the Relief Flow implementation.

## Test Structure

```
tests/
├── e2e/                          # End-to-end tests
│   ├── 01-request-lifecycle.spec.js
│   ├── 02-mission-planning.spec.js
│   ├── 03-timeline-execution.spec.js
│   ├── 04-progress-tracking.spec.js
│   ├── 05-status-derivation.spec.js
│   ├── 06-supply-management.spec.js
│   └── 07-edge-cases.spec.js
├── factories/                    # Test data factories
│   └── testData.js
├── setup/                        # Test setup utilities
│   ├── jest.setup.js
│   ├── testDb.js
│   └── seedTestData.js
└── unit/                         # Unit tests
    └── modules/
```

## Prerequisites

1. **MongoDB**: Ensure MongoDB is running locally
2. **Node.js**: Version 18+ required
3. **Dependencies**: Install all packages
   ```bash
   npm install
   ```

## Test Database Setup

The tests use a separate test database: `flood_rescue_test`

### Environment Configuration

Test environment variables are configured in `.env.test`:
- `MONGODB_URI=mongodb://localhost:27017/flood_rescue_test`
- `NODE_ENV=test`
- `PORT=5001`

### Seed Test Data

Before running E2E tests, seed the test database:

```bash
npm run test:seed
```

This creates:
- 3 Coordinators (coordinator1, coordinator2, coordinator3)
- 5 Citizens (citizen1-5)
- 4 Teams (Alpha, Bravo, Charlie, Delta) with members
- 2 Warehouses with inventory
- Sample supplies: Water, Rice, Medicine, Blankets

**Test Credentials:**
- Coordinators: `coordinator1` / `Test123!`
- Team Leaders: `team1_leader` / `Test123!`
- Citizens: `citizen1` / `Test123!`

## Running Tests

### Unit Tests (Jest)

Run all unit tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

With coverage:
```bash
npm run test:coverage
```

### E2E Tests (Playwright)

Run all E2E tests:
```bash
npm run test:e2e
```

Run with UI mode (interactive):
```bash
npm run test:e2e:ui
```

Run in headed mode (see browser):
```bash
npm run test:e2e:headed
```

Run specific test file:
```bash
npx playwright test tests/e2e/01-request-lifecycle.spec.js
```

### Run All Tests

```bash
npm run test:all
```

## Test Suites Overview

### 1. Request Lifecycle (`01-request-lifecycle.spec.js`)
Tests the complete request creation and verification flow:
- ✅ Citizen creates request with location and supplies
- ✅ Coordinator verifies request
- ✅ Coordinator rejects request with reason
- ✅ Citizen cannot create multiple active requests
- ✅ Request priority sorting (CRITICAL > HIGH > NORMAL)

### 2. Mission Planning (`02-mission-planning.spec.js`)
Tests mission creation and planning:
- ✅ Coordinator creates mission in DRAFT state
- ✅ Coordinator adds multiple requests to mission
- ✅ Coordinator assigns multiple teams to mission
- ✅ Cannot start mission without requests
- ✅ Cannot start mission without teams
- ✅ Start mission creates TeamRequest matrix

### 3. Timeline Execution (`03-timeline-execution.spec.js`)
Tests timeline state transitions:
- ✅ Team accepts: ASSIGNED → CLAIMING_SUPPLIES
- ✅ Team confirms supply: CLAIMING_SUPPLIES → EN_ROUTE
- ✅ Team arrives: EN_ROUTE → ON_SITE
- ✅ Team completes with auto-calculated outcome
- ✅ Team can withdraw before EN_ROUTE
- ✅ Invalid state transitions are rejected

### 4. Progress Tracking (`04-progress-tracking.spec.js`)
Tests progress update functionality:
- ✅ Team updates progress with people rescued
- ✅ Team updates progress with supplies delivered
- ✅ Progress validation: cannot exceed target
- ✅ Progress validation: must be in EN_ROUTE or ON_SITE
- ✅ TeamRequest contribution is recorded correctly
- ✅ MissionRequest aggregate is synced from TeamRequests

### 5. Status Derivation (`05-status-derivation.spec.js`)
Tests automatic status derivation:
- ✅ Request IN_PROGRESS when first team accepts
- ✅ Request PARTIALLY_FULFILLED when partial delivery
- ✅ Request CLOSED when fully met
- ✅ Mission IN_PROGRESS when any timeline EN_ROUTE/ON_SITE
- ✅ Mission COMPLETED when all MissionRequests closed
- ✅ MissionRequest CLOSED when fulfillment 100%

### 6. Supply Management (`06-supply-management.spec.js`)
Tests supply tracking and inventory:
- ✅ Supplies reserved on team assignment
- ✅ Inventory deducted on supply claim confirmation
- ✅ Cannot claim more supplies than available
- ✅ Supply tracking across multiple teams

### 7. Edge Cases (`07-edge-cases.spec.js`)
Tests edge cases and error handling:
- ✅ Mission with zero supplies (rescue only)
- ✅ Mission with zero people (supplies only)
- ✅ All teams withdraw - mission status
- ✅ Coordinator aborts mission mid-execution
- ✅ Timeline complete when already completed (idempotent)
- ✅ Progress update when mission already completed

## Test Data Factories

Use factories to create test data consistently:

```javascript
import {
  createTestCitizen,
  createTestCoordinator,
  createTestRequest,
  createTestMission,
  createTestTeam,
  createProgressPayload,
} from '../factories/testData.js';

// Create test citizen
const citizenData = await createTestCitizen({
  username: 'custom_citizen',
  email: 'custom@test.com',
});

// Create test request
const requestData = createTestRequest(citizenId, {
  peopleCount: 20,
  supplies: [{ name: 'Water', requestedQty: 50, unit: 'L' }],
});
```

## Database Utilities

```javascript
import { connectTestDb, clearTestDb, disconnectTestDb } from '../setup/testDb.js';

// Connect to test database
await connectTestDb();

// Clear all collections
await clearTestDb();

// Disconnect
await disconnectTestDb();
```

## Debugging Tests

### View Test Results

After running tests, view the HTML report:
```bash
npx playwright show-report
```

### Debug Specific Test

```bash
npx playwright test --debug tests/e2e/01-request-lifecycle.spec.js
```

### View Test Logs

Playwright automatically captures:
- Screenshots on failure
- Video recordings (if configured)
- Network logs
- Console logs

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    npm run test:seed
    npm run test:all
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env.test`

### Port Already in Use
- Change `PORT` in `.env.test` to an available port
- Update `playwright.config.js` baseURL accordingly

### Test Timeout
- Increase timeout in `playwright.config.js`:
  ```javascript
  testTimeout: 30000, // 30 seconds
  ```

### Database Not Cleared
- Manually clear test database:
  ```bash
  mongo flood_rescue_test --eval "db.dropDatabase()"
  ```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `beforeEach` and `afterEach` for setup/teardown
3. **Factories**: Use test data factories for consistency
4. **Assertions**: Use descriptive assertions with clear error messages
5. **Naming**: Use descriptive test names that explain what is being tested

## Coverage Goals

Target coverage for Relief Flow modules:
- ✅ Missions: >80%
- ✅ MissionRequests: >80%
- ✅ Timelines: >80%
- ✅ TeamRequests: >80%
- ✅ Requests: >80%

## Manual Testing Checklist

For manual testing scenarios, refer to:
`docs/flows/Relief_flow_1.1.md` - Complete flow documentation

Key scenarios to test manually:
1. ✅ Happy path: Complete mission from request to completion
2. ✅ Partial fulfillment with multiple teams
3. ✅ Team withdrawal and reassignment
4. ✅ Mission abort and cleanup
5. ✅ Supply inventory tracking
6. ✅ Request priority and duplicate detection

## Support

For issues or questions:
1. Check test logs and error messages
2. Review `Relief_flow_1.1.md` for expected behavior
3. Verify test database is properly seeded
4. Check backend logs for API errors
