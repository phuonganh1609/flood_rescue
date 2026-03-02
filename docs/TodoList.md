# 📋 TodoList - Flood Rescue System

> **Last Updated:** 2026-03-01
>
> Theo dõi tiến độ implementation dựa trên [ERD.md](./ERD.md), [Rescue_flow_2.2.md](./flows/Rescue_flow_2.2.md), [Relief_flow_1.1.md](./flows/Relief_flow_1.1.md), và [Supply_management.md](./Supply_management.md).

---

## � Phase Progress

| Phase       | Description                                                | Progress | Status         |
| :---------- | :--------------------------------------------------------- | :------- | :------------- |
| **Phase 1** | **Core Flow** (Mission + Timeline + Team modules)          | ~80%     | 🚧 In Progress |
| **Phase 2** | **Supply Tracking** (Warehouse + Inventory + Planning)     | ~5%      | 🌑 Pending     |
| **Phase 3** | **GPS Tracking** (Realtime position updates)               | 0%       | 🌑 Pending     |
| **Phase 4** | **Role APIs** (Coordinator, Rescue Team, Manager specific) | 0%       | 🌑 Pending     |
| **Phase 5** | **Admin & Reports** (System config, exports)               | ~20%     | 🚧 In Progress |

---

## 📊 Trạng thái tổng quan

| Module                 | Tiến độ | Ghi chú                                                                 |
| :--------------------- | :------ | :---------------------------------------------------------------------- |
| **Authentication**     | ~90%    | Login, Register, JWT, Session. Refactored response format.              |
| **Request Management** | ~98%    | Unified Flow 2.2, 12 endpoints. Refactored response format.             |
| **Team Management**    | ~70%    | CRUD skeleton, Member management. Refactored response format.           |
| **Notification**       | ~85%    | WebSocket + REST API. Refactored response format.                       |
| **Mission**            | ~80%    | Core CRUD & Lifecycle implemented. Verified.                            |
| **Timeline**           | ~90%    | Full core lifecycle API + status sync implemented (without GPS/Supply). |
| **Admin**              | ~30%    | List users (scoped) + Update user role. Refactored response format.     |
| **Supply Management**  | ~5%     | Chỉ có model cơ bản                                                     |
| **Position Tracking**  | 0%      | GPS tracking chưa implement                                             |

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

- [x] Request model (`Request`) với GeoJSON location, 2dsphere index
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

- [x] Mission model theo ERD (`PLANNED`, `IN_PROGRESS`, `PAUSED`, `PARTIAL`, `COMPLETED`, `ABORTED`)
- [x] `POST /missions` - Create mission (Auto-code `MS-DDMMYY-SEQ`)
- [x] `GET /missions` - List all missions (Filter by status, type, code)
- [x] `GET /missions/{id}` - Get mission detail
- [x] `PATCH /missions/{id}` - Update mission details (name, description, priority)
- [x] `DELETE /missions/{id}` - Delete mission (Guard: No active timelines)
- [x] `PATCH /missions/{id}/assign` - Assign team (create Timeline)
- [x] `PATCH /missions/{id}/pause` - Pause mission
- [x] `PATCH /missions/{id}/resume` - Resume mission
- [x] `PATCH /missions/{id}/abort` - Abort mission
- [x] Security: `authorize(["Rescue Coordinator", "Admin"])`
- [x] Validation: Joi schemas (ObjectId, limits, source params)

### Not Implemented ❌

- [ ] `GET /missions/{id}/supplies` - Get aggregated supplies
- [ ] Mission report: tổng hợp các timeline và request thuộc mission.

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
- [x] Mission assign flow tích hợp Timeline sync + notification events

### Not Implemented ❌

- [ ] `route` field (GeoJSON LineString từ Position)
- [ ] GPS Position tracking integration
- [ ] TimelineSupply (Planning/Carrying/Distribution) integration

---

## 5. 👥 Team Module

### Implemented ✅

- [x] Team model theo ERD (`name`, `leaderId`, `status: AVAILABLE/BUSY`)
- [x] Team CRUD skeleton (controller, service, repository, validation, routes)
- [x] `User.teamId` FK cho team membership (thay thế TeamMember model)
- [x] Routes registered at `/api/teams`
- [x] Joi validation schemas
- [x] `PATCH /api/teams/:teamId/leader` — Change team leader

### Endpoints (Skeleton) ✅

- [x] `GET /api/teams` — List all teams (Coordinator/Admin)
- [x] `POST /api/teams` — Create team (Coordinator/Admin)
- [x] `GET /api/teams/:teamId` — Get team detail with members
- [x] `PATCH /api/teams/:teamId` — Update team (Coordinator/Admin)
- [x] `DELETE /api/teams/:teamId` — Delete team (Coordinator/Admin)
- [x] `POST /api/teams/:teamId/members` — Add member (Coordinator/Admin)
- [x] `DELETE /api/teams/:teamId/members/:userId` — Remove member (Coordinator/Admin)
- [x] `PATCH /api/teams/:teamId/leader` — Change leader (Coordinator/Admin)

### Not Implemented ❌

- [ ] Team status management (`AVAILABLE` ↔ `BUSY`) API cho manual override (nếu cần)

---

## 6. 📦 Supply Management Module

> [!IMPORTANT]
> Theo [Supply_management.md](./Supply_management.md) - 3 Phase tracking system

### Implemented ✅

- [x] Supply model (basic in `inventory/supply.js`)
- [x] Vehicle model (basic)

### Not Implemented ❌

#### Supply Catalog (Manager)

- [ ] `GET /supplies` - List supplies
- [ ] `POST /supplies` - Create supply
- [ ] `PATCH /supplies/{id}` - Update supply

#### Warehouse & Inventory (Manager)

- [ ] Warehouse model theo ERD
- [ ] InventoryItem model theo ERD
- [ ] `GET /warehouses` - List warehouses
- [ ] `GET /warehouses/{id}/inventory` - Get inventory
- [ ] `PATCH /inventory/{id}` - Restock

#### TimelineSupply Tracking

- [ ] TimelineSupply model theo ERD
- [ ] `POST /timelines/{id}/supplies/plan` - **Phase 1: Planning** (Reserve)
- [ ] `PUT /timelines/{id}/supplies/plan` - Update plan
- [ ] Supply carrying trong `PATCH /timelines/{id}/accept` - **Phase 2: Carrying** (Deduct)
- [ ] Supply distribution trong `PATCH /timelines/{id}/complete` - **Phase 3: Distribution** (Report + Return)

#### Inventory Rules Logic

- [ ] Reserve: `reservedQuantity += plannedQty`
- [ ] Deduct: `quantity -= carriedQty`, `reservedQuantity -= plannedQty`
- [ ] Cancel release: `reservedQuantity -= plannedQty`
- [ ] Return: `quantity += returnedQty`

---

## 7. 📍 Position Tracking Module

### Not Implemented ❌

- [ ] Position model theo ERD
- [ ] `POST /tracking/update` - Team gửi GPS location
- [ ] Position aggregation vào Timeline.route (LineString)
- [ ] WebSocket emit realtime position
- [ ] TTL index cho position cleanup (60 ngày)
- [ ] Tracking interval: 30 giây khi `EN_ROUTE` / `ON_SITE`

---

## 8. 🔔 Notification Module

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

## 9. 👨‍💼 Admin Module

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

## 10. 📊 Manager Module

### Not Implemented ❌

- [ ] `GET /manager/stocks/supplies` - View supply stock
- [ ] `GET /manager/stocks/equipments` - View equipment stock
- [ ] `GET /manager/stocks/vehicles` - View vehicle stock
- [ ] `POST /manager/allocate/supplies` - Allocate supplies
- [ ] `POST /manager/stocks/supplies/import` - Import supplies
- [ ] `POST /manager/stocks/supplies/export` - Export supplies

---

## 11. 👨‍🚒 Rescue Team APIs

### Not Implemented ❌

- [ ] `GET /rescueTeam/resources/supplies` - View assigned supplies
- [ ] `GET /rescueTeam/resources/assets` - View equipment & vehicles
- [ ] `GET /rescueTeam/missions` - Get assigned missions
- [ ] `GET /rescueTeam/missions/{id}` - Mission detail
- [ ] `PATCH /rescueTeam/missions/{id}/status` - Update mission status
- [ ] `POST /rescueTeam/positions` - Send GPS position
- [ ] `POST /rescueTeam/missions/{id}/report` - Submit report

---

## 12. 👨‍💼 Coordinator APIs

### Not Implemented ❌

- [ ] `GET /coordinator/requests` - View all requests
- [ ] `PATCH /coordinator/requests/{id}/status` - Update status với unified states
- [ ] `POST /coordinator/requests/{id}/assign` - Assign to team
- [ ] `POST /coordinator/missions` - Create mission
- [ ] `GET /coordinator/missions` - List missions
- [ ] `PATCH /coordinator/missions/{id}/reassign` - Reassign
- [ ] `GET /coordinator/missions/{id}/positions` - Monitor positions
- [ ] `POST /coordinator/missions/{id}/resources` - Allocate resources

---

## 13. 📚 Documentation & UI

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

---

## References

- [ERD.md](./ERD.md) - Entity definitions
- [Rescue_flow_2.2.md](./flows/Rescue_flow_2.2.md) - Rescue flow với unified states
- [Relief_flow_1.1.md](./flows/Relief_flow_1.1.md) - Relief flow
- [rules.md](./flows/rules.md) - Derivation rules
- [Supply_management.md](./Supply_management.md) - 3-phase supply tracking
- [API_list.md](./API_list.md) - Full API specification
