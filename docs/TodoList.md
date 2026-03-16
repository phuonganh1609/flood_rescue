# 📋 TodoList - Flood Rescue System

> **Last Updated:** 2026-03-15
>
> Theo dõi tiến độ implementation dựa trên [ERD.md](./ERD.md), [Rescue_flow_2.2.md](./flows/Rescue_flow_2.2.md), [Relief_flow_1.1.md](./flows/Relief_flow_1.1.md), và [Supply_management.md](./Supply_management.md).

---

## 🚩 Phase Progress

| Phase       | Description                                                | Progress | Status         |
| :---------- | :--------------------------------------------------------- | :------- | :------------- |
| **Phase 1** | **Core Flow** (Mission + Timeline + Team modules)          | ~92%     | 🚧 In Progress |
| **Phase 2** | **Supply Tracking** (Warehouse + Inventory + Planning)     | ~35%     | 🚧 In Progress |
| **Phase 3** | **GPS Tracking** (Realtime position updates)               | 0%       | 🌑 Pending     |
| **Phase 4** | **Role APIs** (Coordinator, Rescue Team, Manager specific) | 0%       | 🌑 Pending     |
| **Phase 5** | **Admin & Reports** (System config, exports)               | ~20%     | 🚧 In Progress |

---

## 📊 Trạng thái tổng quan

| Module                   | Tiến độ | Ghi chú                                                                          |
| :----------------------- | :------ | :------------------------------------------------------------------------------- |
| **Authentication**       | ~90%    | Login, Register, JWT, Session. Refactored response format.                       |
| **Request Management**   | ~98%    | Unified Flow 2.2, 12 endpoints. Bug fixes applied (peopleCount, rejectionReason).|
| **Team Management**      | ~85%    | Full CRUD, member management, stats aggregation, leader change, delete guards.         |
| **Team Applications**    | ~90%    | Submit/Approve/Reject/Withdraw lifecycle. Auto role promotion.           |
| **Notification**         | ~85%    | WebSocket + REST API. Refactored response format.                                |
| **Mission**              | ~85%    | Core CRUD & Lifecycle. PAUSED-block bug fixed in Timeline.                       |
| **Timeline**             | ~90%    | Full core lifecycle API + status sync implemented (without GPS/Supply).          |
| **Admin**                | ~30%    | List users (scoped) + Update user role. Refactored response format.              |
| **Supply Catalog**       | ~75%    | CRUD + Excel import. Bug fixes applied (method/repository/schema naming). |
| **Warehouse**            | ~65%    | CRUD implemented. Bug fixes applied (import/schema/role naming). |
| **Vehicles**             | ~70%    | Full CRUD, assignment, maintenance, stats, Excel import.                  |
| **Inventory / Timeline Supply** | ~5% | Model cơ bản. TimelineSupply chưa implement.                             |
| **Position Tracking**    | 0%      | GPS tracking chưa implement.                                                     |

## 1. 🔐 Authentication Module

### Implemented ✅

- [x] User model với roles (Citizen, Rescue Team, Coordinator, Admin, Manager)
- [x] Login API (`POST /api/auth/login`)
- [x] Register API (`POST /api/auth/register`) — `phoneNumber` bắt buộc
- [x] Get current user (`GET /api/auth/me`)
- [x] JWT token generation & validation
- [x] Session management với Refresh Token
- [x] Password hashing (bcrypt)
- [x] Citizen search (`searchCitizens` in auth.repository) — tìm theo displayName/phoneNumber

### Not Implemented ❌

- [ ] Logout endpoint (invalidate refresh token)
- [ ] Password reset / forgot password
- [ ] Email verification flow
- [ ] OAuth integration (Google, Facebook)

---

## 2. 🆘 Request Module

### Implemented ✅

- [x] Request model (`Request`) với GeoJSON location, 2d sphere index
- [x] Status enum Unified Flow 2.2: `SUBMITTED`, `VERIFIED`, `REJECTED`, `IN_PROGRESS`, `PARTIALLY_FULFILLED`, `FULFILLED`, `CLOSED`, `CANCELLED`
- [x] State machine validation cho tất cả status transitions
- [x] `requestSupplies` structured format `[{supplyId, requestedQty}]`
- [x] Fields: `isDuplicated`, `duplicatedOfRequestId`, `isLocationVerified`
- [x] Fields: `createdBy`, `source` (`CITIZEN`/`COORDINATOR`), `phoneNumber`
- [x] `userId` optional (null cho citizen chưa có tài khoản)
- [x] Validate 1 active request per Citizen (terminal: CLOSED/CANCELLED/REJECTED)
- [x] Auto-prioritization sorting (priority → peopleCount → createdAt)
- [x] Event emission cho tất cả status changes

**Endpoints:**

- [x] `POST /api/requests` — Citizen tạo request (1 active limit, source=CITIZEN)
- [x] `POST /api/requests/on-behalf` — Coordinator tạo hộ citizen (auto-VERIFIED, source=COORDINATOR)
- [x] `GET /api/requests/search-citizens?q=` — Coordinator tìm citizen theo tên/SĐT
- [x] `GET /api/requests` — Coordinator/Team xem tất cả (priority sorted, filter: source, createdBy)
- [x] `GET /api/requests/my` — Citizen xem request của mình
- [x] `GET /api/requests/:id` — Xem chi tiết request
- [x] `PATCH /api/requests/:id/verify` — Coordinator verify/reject → `VERIFIED`/`REJECTED`
- [x] `PATCH /api/requests/:id/close` — Coordinator close → `CLOSED`
- [x] `PATCH /api/requests/:id/cancel` — Citizen/Coordinator cancel → `CANCELLED` (chỉ khi SUBMITTED)
- [x] `PATCH /api/requests/:id/duplicate` — Coordinator mark duplicate (sync status/priority từ gốc, chỉ trước IN_PROGRESS, không chain)
- [x] `PATCH /api/requests/:id/location` — Coordinator update location & verify
- [x] `PATCH /api/requests/:id/priority` — Coordinator đổi priority (chỉ VERIFIED, không cho duplicate)
- [x] Derivation logic: Auto-update Request status dựa trên Timeline results (`syncRequestStatus` in `timeline.service.js`)

### Not Implemented ❌

- [ ] Duplicate detection algorithm (location + time + citizen) - Future enhancement
- [ ] Thêm supply vào request: requestSupplies
- [ ] Citizen chỉnh sửa request: các field có thể chỉnh sửa như location, peopleCount, description, requestSupplies, media.
- [ ] Citizen chỉnh sửa request: chỉ khi SUBMITTED và chưa được verify.

---

## 3. 🚀 Mission Module

### Implemented ✅

- [x] Mission model theo ERD (`DRAFT`, `PLANNED`, `IN_PROGRESS`, `PAUSED`, `PARTIAL`, `COMPLETED`, `ABORTED`)
- [x] `POST /missions` - Create mission (Auto-code `MS-DDMMYY-SEQ`)
- [x] `GET /missions` - List all missions (Filter by status, type, code)
- [x] `GET /missions/{id}` - Get mission detail
- [x] `PATCH /missions/{id}` - Update mission details (name, description, priority)
- [x] `DELETE /missions/{id}` - Delete mission (Guard: No active timelines)
- [x] `POST /missions/{id}/requests` - Add requests vào mission (create MissionRequest)
- [x] `POST /missions/{id}/teams` - Assign teams (create Timeline `PLANNED`)
- [x] `PATCH /missions/{id}/start` - Start mission (`PLANNED -> ASSIGNED`, emit notifications)
- [x] `PATCH /missions/{id}/pause` - Pause mission
- [x] `PATCH /missions/{id}/resume` - Resume mission
- [x] `PATCH /missions/{id}/abort` - Abort mission
- [x] Security: `authorize(["Rescue Coordinator", "Admin"])`
- [x] Validation: Joi schemas (ObjectId, limits, source params)

### Not Implemented ❌

- [ ] `GET /missions/{id}/supplies` - Get aggregated supplies
- [ ] Mission report: tổng hợp các timeline và request thuộc mission.

### MissionRequest Tracking

#### Implemented ✅

- [x] Entity `MissionRequest` làm bảng nối Mission-Request (tracking fulfillment theo mission)
- [x] Lifecycle status: `PENDING`, `IN_PROGRESS`, `PARTIAL`, `FULFILLED`, `CLOSED`, `DROPPED`
- [x] Snapshot fields: `requestPeopleSnapshot`, `requestSuppliesSnapshot`
- [x] Aggregation fields: `rescuedCount`, `suppliesDelivered`

#### Not Implemented ❌

- [ ] `GET /missions/{id}/requests` - List MissionRequest theo mission
- [ ] `GET /mission-requests/{id}` - Chi tiết fulfillment theo request
- [ ] Manual close/drop APIs cho MissionRequest edge-cases

---

## 4. ⏱️ Timeline Module

### Implemented ✅

- [x] Timeline model theo Unified v2.2 status canon
- [x] Full Timeline lifecycle APIs:
  - [x] `GET /api/timelines`
  - [x] `GET /api/timelines/{id}`
  - [x] `PATCH /api/timelines/{id}/accept`
  - [x] `PATCH /api/timelines/{id}/arrive`
  - [x] `PATCH /api/timelines/{id}/complete`
  - [x] `PATCH /api/timelines/{id}/fail`
  - [x] `PATCH /api/timelines/{id}/withdraw`
  - [x] `PATCH /api/timelines/{id}/cancel`
- [x] Timeline state machine validation
- [x] Timeline → Request status sync logic
- [x] Timeline → Mission status sync logic
- [x] Team status auto-sync (`AVAILABLE`/`BUSY`) theo active timelines
- [x] Mission start flow tích hợp Timeline sync + notification events

### Not Implemented ❌

- [ ] `route` field (GeoJSON LineString từ Position)
- [ ] GPS Position tracking integration
- [ ] TimelineSupply (Planning/Carrying/Distribution) integration

---

## 5. 👥 Team Module

### Implemented ✅

- [x] Team model theo ERD (`name`, `leaderId`, `status: AVAILABLE/BUSY`)
- [x] Team CRUD (controller, service, repository, validation, routes)
- [x] `User.teamId` FK cho team membership (thay thế TeamMember model)
- [x] Routes registered at `/api/teams`
- [x] Joi validation schemas
- [x] `authorizeTeamMember` middleware — bypass cho Coordinator/Admin, check `teamId` cho Rescue Team
- [x] `authorizeTeamLeader` middleware — bypass cho Coordinator/Admin, check `leaderId` cho Rescue Team
- [x] Aggregation stats: `memberStats.total`, `memberStats.rescue`, `memberStats.active`
- [x] Delete guards: không xóa khi BUSY / có active timelines / còn member
- [x] Cannot remove leader (must change leader first)
- [x] Cannot change leader khi team BUSY
- [x] User role auto-updated → `Rescue Team` khi add member
- [x] Filter theo `name`, `status`, `active` (member count), `leader` (displayName)
- [x] Sort theo `name`, `status`, `createdAt`, `active`, `leader`

### Endpoints ✅

- [x] `GET /api/teams` — List all teams với stats (Coordinator/Admin)
- [x] `POST /api/teams` — Create team (Coordinator/Admin)
- [x] `GET /api/teams/:teamId` — Get team detail với member stats
- [x] `PATCH /api/teams/:teamId` — Update team name/leader (Coordinator/Admin)
- [x] `DELETE /api/teams/:teamId` — Delete team (Coordinator/Admin)
- [x] `POST /api/teams/:teamId/members` — Add member (Coordinator/Admin/Rescue Team)
- [x] `DELETE /api/teams/:teamId/members/:userId` — Remove member (Coordinator/Admin)
- [x] `PATCH /api/teams/:teamId/leader` — Change leader (Coordinator/Admin)

### Not Implemented ❌

- [ ] Manual override API cho team status (`AVAILABLE` ↔ `BUSY`) nếu cần

---

## 6. 📦 Supply Management Module

> [!IMPORTANT]
> Theo [Supply_management.md](./Supply_management.md) - 3 Phase tracking system

### Supply Catalog (Manager) ✅ Implemented

- [x] Supply model: `name`, `category` (FOOD/WATER/MEDICAL/CLOTHING/EQUIPMENT/OTHER), `unit`, `unitWeight`, `description`, `isActive`
- [x] `POST /api/supplies` — Create supply
- [x] `GET /api/supplies/list` — List all (filter: category, name, isActive)
- [x] `GET /api/supplies/:supplyName` — Get by name
- [x] `PUT /api/supplies/:supplyId` — Update supply
- [x] `DELETE /api/supplies/:supplyId` — Delete supply
- [x] `POST /api/supplies/import` — Import từ Excel (multer)
- [x] `GET /api/supplies/status/:status` — Get supplies grouped by request status

> ✅ **Bug Fixes Applied (2026-03-15):**
> - Đã bổ sung method `findSupplyById` trong repository
> - Đã sửa gọi đúng method `findAllSuppliesByCategory`
> - Đã xoá import thừa `authRepository`
> - Đã bỏ `status` enum không phù hợp khỏi Supply Catalog schema

### Warehouse (Manager) ✅ Implemented

- [x] Warehouse model: `name`, `location` (GeoJSON), `status` (FULL/EMPTY/MAINTENANCE)
- [x] `POST /api/warehouses` — Create warehouse
- [x] `GET /api/warehouses` — List (filter: name, status)
- [x] `GET /api/warehouses/name?name=` — Get by name
- [x] `PUT /api/warehouses/:name` — Update
- [x] `DELETE /api/warehouses/:name` — Delete

> ✅ **Bug Fixes Applied (2026-03-15):**
> - Đã sửa `warehouse.model.js` dùng default import `mongoose`
> - Đã thêm import `InventoryItem` trong repository
> - Đã thêm `createdBy` vào Warehouse schema để đồng bộ với service
> - Đã sửa role route thành `'Rescue Coordinator'`

### Inventory & TimelineSupply ❌ Not Implemented

- [ ] InventoryItem model theo ERD (`warehouseId`, `supplyId`, `quantity`, `reservedQuantity`)
- [ ] `GET /api/warehouses/:id/inventory` — Get inventory của warehouse
- [ ] `PATCH /api/inventory/:id` — Restock inventory
- [ ] TimelineSupply model (Planning/Carrying/Distribution)
- [ ] `POST /timelines/{id}/supplies/plan` — **Phase 1: Planning** (Reserve)
- [ ] `PUT /timelines/{id}/supplies/plan` — Update plan
- [ ] Supply carrying trong `PATCH /timelines/{id}/accept` — **Phase 2: Carrying** (Deduct)
- [ ] Supply distribution trong `PATCH /timelines/{id}/complete` — **Phase 3: Distribution** (Report + Return)

#### Inventory Rules Logic ❌

- [ ] Reserve: `reservedQuantity += plannedQty`
- [ ] Deduct: `quantity -= carriedQty`, `reservedQuantity -= plannedQty`
- [ ] Cancel release: `reservedQuantity -= plannedQty`
- [ ] Return: `quantity += returnedQty`

---

## 7. 🚗 Vehicles Module

> Quản lý phương tiện cứu hộ. Role: **Manager** only.

### Implemented ✅

- [x] Vehicle model: `licensePlate` (unique/uppercase), `type`, `brand`, `model`, `year`, `color`, `capacity`, `capacityUnit`, `status`, `assignedTo` (Team ref), `location` (GeoJSON), `currentMission` (Mission ref), `lastMaintenanceDate`, `maintenanceInterval`, `isActive`
- [x] Types: `AMBULANCE`, `RESCUE BOAT`, `FIRE TRUCK`, `TRUCK`, `VAN`, `MOTORCYCLE`, `OTHERS`
- [x] Statuses: `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `OUT OF SERVICE`
- [x] Full CRUD endpoints (xem Section 10 — Manager Module)
- [x] Assign vehicle to team
- [x] Mark maintenance done (reset `lastMaintenanceDate`, set status ACTIVE)
- [x] Stats endpoint (count by status)
- [x] Get vehicles needing maintenance (30-day threshold)
- [x] Import từ Excel (multer + xlsx)
- [x] Event emission: `VEHICLE_CREATED`, `VEHICLE_UPDATED`, `VEHICLE_DELETED`, `VEHICLE_ASSIGNED`, `VEHICLE_MAINTENANCE_UPDATED`

### Not Implemented ❌

- [ ] Unassign vehicle from team
- [ ] Link vehicle → Timeline (tracking which vehicle is used on which rescue)
- [ ] Maintenance history log
- [ ] Fuel tracking

---

## 8. 📄 Team Applications Module _(NEW)_

> Citizen đăng ký gia nhập Rescue Team. Role: **Citizen** (submit/withdraw), **Rescue Coordinator/Admin** (review).

### Implemented ✅

- [x] TeamApplication model: `userId`, `motivation`, `submittedPhoneNumber`, `status` (PENDING/APPROVED/REJECTED/WITHDRAWN), `rejectionReason`, `reviewedBy`, `reviewedAt`
- [x] Unique partial index: chỉ 1 PENDING application per user
- [x] Rules:
  - Chỉ Citizen mới submit
  - User phải `isActive`
  - Approve: tự động đổi `user.role` → `Rescue Team`
  - Chỉ PENDING mới có thể withdraw/approve/reject
- [x] Event emission: `TEAM_APPLICATION_SUBMITTED`, `TEAM_APPLICATION_WITHDRAWN`, `TEAM_APPLICATION_APPROVED`, `TEAM_APPLICATION_REJECTED`

### Endpoints ✅

- [x] `POST /api/team-applications` — Citizen submit application
- [x] `GET /api/team-applications/my` — Citizen xem application của mình
- [x] `GET /api/team-applications` — Coordinator/Admin list tất cả (filter: status)
- [x] `GET /api/team-applications/:applicationId` — Get detail (owner or reviewer)
- [x] `PATCH /api/team-applications/:applicationId/withdraw` — Citizen rút đơn
- [x] `PATCH /api/team-applications/:applicationId/approve` — Coordinator/Admin approve
- [x] `PATCH /api/team-applications/:applicationId/reject` — Coordinator/Admin reject

### Not Implemented ❌

- [ ] Notification đến Citizen khi application được approve/reject (event emit có sẵn, nhưng notify.listener chưa xử lý)

---

## 9. 📍 Position Tracking Module

### Not Implemented ❌

- [ ] Position model theo ERD
- [ ] `POST /tracking/update` - Team gửi GPS location
- [ ] Position aggregation vào Timeline.route (LineString)
- [ ] WebSocket emit realtime position
- [ ] TTL index cho position cleanup (60 ngày)
- [ ] Tracking interval: 30 giây khi `EN_ROUTE` / `ON_SITE`

---

## 10. 🔔 Notification Module

### Implemented ✅

- [x] Notification model
- [x] `GET /api/notifications` - Get notifications
- [x] `PATCH /api/notifications/{id}/read` - Mark as read
- [x] `GET /api/notifications/unread-count` - Get unread count
- [x] WebSocket connection (Socket.IO)
- [x] Event listeners (`notify.listener.js`)
- [x] Events: `REQUEST_SUBMITTED`, `REQUEST_VERIFIED`, `REQUEST_REJECTED`, `MISSION_COMPLETED`, `MISSION_FAILED`

### Not Implemented ❌

- [x] `MISSION_ASSIGNED` event (emit in `mission.service.js`, listener in `notify.listener.js`)
- [x] `MISSION_APPROACHING` event — Team `EN_ROUTE` (emit in `timeline.service.js`)
- [x] `MISSION_ACCEPTED` event (emit in `timeline.service.js`)
- [ ] Push notification integration (Firebase)

---

## 11. 👨‍💼 Admin Module

### Implemented ✅

- [x] User module (controller, service, repository, validation, routes)
- [x] `GET /api/users` — List users (Admin: all, Coordinator: Citizen + Rescue Team only)
- [x] Query params: `role`, `isActive`, `search` (displayName/phoneNumber/email), `page`, `limit`, `sort`
- [x] Role-based data scope (service-level): `DATA_SCOPE` config intersect with query filters
- [x] `PATCH /api/users/:id/role` — Update user role (Admin only)
- [x] Guards: Cannot change own role, user must exist, role must differ
- [x] Joi validation: query params, ObjectId params, role enum body
- [x] Routes registered at `/api/users`

### Not Implemented ❌

- [ ] `GET /system/categories` - System config
- [ ] `GET /reports/summary` - Summary report
- [ ] `GET /reports/export` - Export CSV

---

## 12. 📊 Manager Module

### Implemented ✅

- [x] `GET /api/vehicles/list` — List vehicles (filter: type, status, licensePlate, brand)
- [x] `GET /api/vehicles/:licensePlate` — Get vehicle by license plate
- [x] `GET /api/vehicles/type/:type` — Get by type
- [x] `GET /api/vehicles/status/:status` — Get by status
- [x] `GET /api/vehicles/team/:teamId` — Get vehicles assigned to team
- [x] `GET /api/vehicles/stats` — Vehicle statistics (active/maintenance/inactive/out-of-service counts)
- [x] `GET /api/vehicles/maintenance/needed` — Vehicles due for maintenance (30-day threshold)
- [x] `POST /api/vehicles` — Create vehicle
- [x] `PUT /api/vehicles/:vehicleId` — Update vehicle
- [x] `PATCH /api/vehicles/:vehicleId/assign` — Assign vehicle to team
- [x] `PATCH /api/vehicles/:vehicleId/maintenance` — Mark maintenance done (reset lastMaintenanceDate)
- [x] `DELETE /api/vehicles/:vehicleId` — Delete vehicle
- [x] `POST /api/vehicles/import` — Import từ Excel
- [x] Supply Catalog CRUD (xem Section 6)
- [x] Warehouse CRUD (xem Section 6)

> ✅ **Bug Fixes Applied (2026-03-15):**
> - Đã bỏ check ObjectId sai cho `licensePlate` ở `getVehicle`
> - Đã đổi sang `new mongoose.Types.ObjectId(teamId)` trong repository

### Not Implemented ❌

- [ ] `POST /manager/allocate/supplies` — Allocate supplies
- [ ] `GET /manager/stocks/supplies` — View supply stock (InventoryItem)
- [ ] `GET /manager/stocks/equipments` — View equipment stock
- [ ] `POST /manager/stocks/supplies/export` — Export supplies report

---

## 13. 🎭 Role Coverage Matrix (Compact)

> Mục này chỉ theo dõi gap theo **vai trò**. Endpoint chi tiết nằm ở các module owner để tránh trùng lặp.

| Role | Capability | Owner Module | Status | Ghi chú |
| :--- | :--------- | :----------- | :----- | :------ |
| Citizen | Submit/view/cancel request | Section 2 - Request | ✅ Done | Đã có create + my + cancel |
| Rescue Team | Execute timeline lifecycle | Section 4 - Timeline | ✅ Done | accept/arrive/complete/fail/withdraw |
| Rescue Team | View assigned missions/resources | Section 4 + 6 | 🚧 Partial | Chưa có dedicated rescueTeam view APIs |
| Rescue Team | Send GPS position | Section 9 - Position Tracking | ❌ Pending | Chưa có Position model + endpoint |
| Rescue Coordinator | Verify/close/duplicate/location request | Section 2 - Request | ✅ Done | Unified states đã áp dụng |
| Rescue Coordinator | Create/assign/reassign mission | Section 3 - Mission | 🚧 Partial | Reassign endpoint riêng còn thiếu |
| Rescue Coordinator | Allocate mission resources | Section 6 - Supply/Inventory | ❌ Pending | Chưa có workflow allocate đầy đủ |
| Manager | Manage vehicles | Section 7 + 12 | ✅ Done | CRUD + assign + maintenance + stats |
| Manager | Manage supply/warehouse catalog | Section 6 | ✅ Done | CRUD + import |
| Manager | Stock allocation/reporting | Section 6 + 12 | ❌ Pending | allocate/export/report chưa hoàn tất |

---

## 14. 📚 Documentation & UI

### Implemented ✅

- [x] Customize Swagger UI Schema Layout (Grid View)
- [x] Update API Documentation (Swagger YAML)

## 📝 Notes

- **Request status naming**: Đã thống nhất dùng UPPER_CASE (`SUBMITTED`, `VERIFIED`, v.v.)
- **Unified Flow**: Rescue và Relief dùng chung model, khác nhau ở `type` field.
- **Multi-timeline**: 1 Request có thể có nhiều Timelines (reassignment, scale-out).
- **Cancel rule**: Chỉ SUBMITTED mới được cancel (cả Citizen và Coordinator).
- **Duplicate rule**: Sau khi mark duplicate → sync status/priority từ gốc. Không chain duplicate.
- **On-behalf creation**: Coordinator có thể tạo hộ citizen (có/không tài khoản). Auto-VERIFIED, source=COORDINATOR.
- **phoneNumber**: Bắt buộc khi đăng ký. Lưu trên cả User và Request.
- **Phase 1 Timeline Scope**: Chỉ implement core lifecycle + status sync. GPS/Position và Supply workflow để Phase sau.
- **PAUSED mission**: Timeline accept bị block khi mission PAUSED, nhưng arrive/complete/fail/withdraw không bị block (team đã đang thực thi).

### 🔴 Known Bugs Cần Fix

| Module | Bug | Mức độ |
| :----- | :-- | :------ |
| ~~request.model.js~~ | ~~`peopleCount` định nghĩa 2 lần, mất `min/max` validation~~ | ✅ Đã fix |
| ~~request.model.js~~ | ~~`rejectionReason` field thiếu trong schema~~ | ✅ Đã fix |
| ~~timeline.service.js~~ | ~~PAUSED mission block cả arrive/complete/fail/withdraw~~ | ✅ Đã fix |
| ~~supply.service.js~~ | ~~Gọi `findSupplyById` (không tồn tại), `findAllSuppliesCategory` (sai tên)~~ | ✅ Đã fix |
| ~~supply.service.js~~ | ~~Import `authRepository` nhưng không dùng~~ | ✅ Đã fix |
| ~~supply.model.js~~ | ~~`status` enum (SUBMITTED/CLOSED/CANCELLED) không hợp lý cho catalog~~ | ✅ Đã fix |
| ~~warehouse.model.js~~ | ~~`import {mongoose} from 'mongoose'` → sai cú pháp~~ | ✅ Đã fix |
| ~~warehouse.repository.js~~ | ~~`getInventoryById` ref `InventoryItem` không import~~ | ✅ Đã fix |
| ~~warehouse.service.js~~ | ~~Truyền `createdBy` nhưng schema không có field này~~ | ✅ Đã fix |
| ~~warehouse.route.js~~ | ~~`authorize(['Coordinator'])` sai → phải là `'Rescue Coordinator'`~~ | ✅ Đã fix |
| ~~vehicle.controller.js~~ | ~~`validateObjectId(req.params.licensePlate)` — licensePlate không phải ObjectId~~ | ✅ Đã fix |
| ~~vehicle.repository.js~~ | ~~`mongoose.Types.ObjectId(teamId)` deprecated~~ | ✅ Đã fix |

---

## References

- [ERD.md](./ERD.md) - Entity definitions
- [Rescue_flow_2.2.md](./flows/Rescue_flow_2.2.md) - Rescue flow với unified states
- [Relief_flow_1.1.md](./flows/Relief_flow_1.1.md) - Relief flow
- [rules.md](./flows/rules.md) - Derivation rules
- [Supply_management.md](./Supply_management.md) - 3-phase supply tracking
- [API_list.md](./API_list.md) - Full API specification
