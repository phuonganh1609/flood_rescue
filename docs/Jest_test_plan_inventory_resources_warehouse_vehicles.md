# Jest Test Plan: Inventory, Resources, Warehouse, Vehicles

## 1) Current Project Facts
- Runtime uses ESM (`"type": "module"` in `package.json`).
- `jest` already exists in `devDependencies`.
- Current `test` script still fails by design (`echo ... exit 1`).
- Module status:
- Inventory: implemented (`controller/service/repository/validation/route`).
- Warehouse: implemented (`controller/service/repository/validation/route`).
- Vehicles: implemented (`controller/service/repository/validation/route`).
- Resources: folder exists but currently empty.

## 2) Target Testing Layers
- Layer A: Service unit tests (highest ROI first).
- Layer B: Controller unit tests with mocked service and response helper.
- Layer C: Route/integration tests for auth and route wiring (optional in phase 1).

## 3) Setup Tasks (Phase 0)
1. Update `package.json` scripts:
- `"test": "NODE_OPTIONS=--experimental-vm-modules jest --runInBand"`
- `"test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch"`
- `"test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --coverage"`
2. Add `jest.config.js`:
- `testEnvironment: "node"`
- `collectCoverageFrom` include `src/modules/{inventory,warehouse,vehicles}/**/*.js`
- Exclude model-only files and routes in early phase if needed.
3. Add `tests/setup/jest.setup.js` for common mocks and reset helpers.
4. Add `supertest` only if route/integration tests are enabled in phase 1.

## 4) Module-by-Module Test Matrix

## 4.1 Inventory
Primary files:
- `src/modules/inventory/inventoryItem.service.js`
- `src/modules/inventory/inventoryItem.controller.js`

Service test cases:
- `create` success:
- warehouse exists + supply exists -> repository create called, populate called, event emitted.
- `create` fail when warehouse not found.
- `create` fail when supply not found.
- `getById` forwards to repository.
- `list` forwards filter + pagination.
- `update` success emits `INVENTORY_ITEM_UPDATED`.
- `update` fail when repository returns null -> throws `Inventory item not found`.
- `remove` success emits `INVENTORY_ITEM_DELETED`.
- `remove` returns null without throw when item not found (document expected behavior).

Controller test cases:
- `create` returns 201 on valid body.
- `create` returns 400 on Joi validation error.
- `getByID` returns 400 for invalid ObjectId.
- `getByID` returns 404 if service returns null.
- `getAll` maps query params to filter and pagination.
- `update` and `remove` return 404 when service has no doc.

## 4.2 Warehouse
Primary files:
- `src/modules/warehouse/warehouse.service.js`
- `src/modules/warehouse/warehouse.controller.js`

Service test cases:
- `_validateLocation` accepts valid coordinates and normalizes to GeoJSON Point.
- `_validateLocation` rejects:
- missing coordinates
- non-numeric coordinates
- longitude out of range
- latitude out of range
- `create` defaults status to `EMPTY` and emits `WAREHOUSE_CREATED`.
- `update` with location validates + emits `WAREHOUSE_UPDATED`.
- `update` when not found throws `Warehouse not found`.
- `remove` emits `WAREHOUSE_DELETED` when found.

Controller test cases:
- `add` validates body and returns 201.
- `getByName` returns 400 when query `name` missing.
- `getByName` returns 404 when service returns null.
- `getAll` correctly creates regex filter for `name`.
- `update/remove` map service errors to response helper.

## 4.3 Vehicles
Primary files:
- `src/modules/vehicles/vehicle.service.js`
- `src/modules/vehicles/vehicle.controller.js`

Service test cases:
- `createVehicle` fail when duplicate license plate (statusCode 400).
- `createVehicle` success emits `VEHICLE_CREATED`.
- `updateVehicle` fail when vehicle not found (404).
- `updateVehicle` fail when new license plate duplicates another (400).
- `updateVehicle` success emits `VEHICLE_UPDATED` and sets `updatedAt`.
- `deleteVehicle` fail not found (404).
- `deleteVehicle` success emits `VEHICLE_DELETED`.
- `assignVehicleToTeam` fail not found; success emits `VEHICLE_ASSIGNED`.
- `updateMaintenanceStatus` sets `lastMaintenanceDate`, status `ACTIVE`, emits event.
- `getVehicleStats` sums status counts correctly.

Controller test cases:
- invalid ObjectId handling for `vehicleId` and `teamId`.
- pagination defaults (`page=1`, `limit=10`) in list endpoints.
- `getVehiclesByType` and `getVehiclesByStatus` return 400 when param missing.
- `updateVehicle` rejects invalid body with 400.

## 4.4 Resources
Current state:
- `src/modules/resources/` is empty.

Plan (confirmed):
- Scaffold module now with minimal files:
- `resource.model.js`, `resource.repository.js`, `resource.service.js`, `resource.controller.js`, `resource.routes.js`, `resource.validation.js`
- Define minimal contract first (create/get/list/update/remove).
- Write unit tests for service and controller in the same phase as other modules.
- Keep route/integration tests out of phase 1.

## 5) Suggested Test File Layout
- `tests/unit/modules/inventory/inventoryItem.service.test.js`
- `tests/unit/modules/inventory/inventoryItem.controller.test.js`
- `tests/unit/modules/warehouse/warehouse.service.test.js`
- `tests/unit/modules/warehouse/warehouse.controller.test.js`
- `tests/unit/modules/vehicles/vehicle.service.test.js`
- `tests/unit/modules/vehicles/vehicle.controller.test.js`
- `tests/unit/modules/resources/resource.service.test.js`
- `tests/unit/modules/resources/resource.controller.test.js`

Optional integration:
- `tests/integration/modules/inventory.routes.test.js`
- `tests/integration/modules/warehouse.routes.test.js`
- `tests/integration/modules/vehicles.routes.test.js`

## 6) Execution Order
1. Service tests for Warehouse (quick to stabilize validation rules).
2. Service tests for Vehicles (most branching logic).
3. Service tests for Inventory.
4. Controller tests for all three modules.
5. Scaffold Resources module and complete its unit tests.
6. Optional route/integration tests in a later phase.

## 7) Definition of Done
- All planned unit tests pass locally with `npm test`.
- Coverage goal for targeted modules:
- Service layer >= 85% line coverage.
- Controller layer >= 75% line coverage.
- Critical branches (not found, validation, duplicate) covered.
- No flaky tests across 3 consecutive runs.

## 8) Risks and Notes
- ESM + Jest setup can fail if `NODE_OPTIONS=--experimental-vm-modules` is missing.
- Some controllers/services contain naming mismatches (`:id` route vs `name` usage in update/remove in inventory); tests may reveal functional bugs.
- Keep event bus as mocked dependency to avoid side effects.
