# 📋 TodoList - Flood Rescue System

> **Last Updated:** 2026-02-12
>
> Theo dõi tiến độ implementation dựa trên [ERD.md](./ERD.md), [Rescue_flow_2.2.md](./flows/Rescue_flow_2.2.md), [Relief_flow_1.1.md](./flows/Relief_flow_1.1.md), và [Supply_management.md](./Supply_management.md).

---

## 📊 Trạng thái tổng quan

| Module             | Tiến độ | Ghi chú                                             |
| ------------------ | ------- | --------------------------------------------------- |
| Authentication     | ~85%    | Login, Register, JWT, Session, phoneNumber required |
| Request Management | ~95%    | Unified Flow 2.2, 12 endpoints, on-behalf creation  |
| Mission & Timeline | 0%      | Core feature chưa implement                         |
| Team Management    | ~25%    | Có model, thiếu full CRUD                           |
| Supply Management  | ~5%     | Chỉ có model cơ bản                                 |
| Notification       | ~80%    | WebSocket + REST API, thiếu một số events           |
| Position Tracking  | 0%      | GPS tracking chưa implement                         |

---

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

### Not Implemented ❌

- [ ] Derivation logic: Auto-update status dựa trên Timeline results
- [ ] Duplicate detection algorithm (location + time + citizen) - Future enhancement

---

## 3. 🚀 Mission Module

> [!CAUTION]
> **CORE FEATURE - Chưa implement**

### Not Implemented ❌

- [ ] Mission model theo ERD (`PLANNED`, `IN_PROGRESS`, `PAUSED`, `PARTIAL`, `COMPLETED`, `ABORTED`)
- [ ] `POST /missions` - Create mission
- [ ] `GET /missions` - List all missions
- [ ] `GET /missions/{id}` - Get mission detail
- [ ] `PATCH /missions/{id}/assign` - Assign team (create Timeline)
- [ ] `PATCH /missions/{id}/pause` - Pause mission
- [ ] `PATCH /missions/{id}/resume` - Resume mission
- [ ] `PATCH /missions/{id}/abort` - Abort mission
- [ ] `GET /missions/{id}/supplies` - Get aggregated supplies
- [ ] Mission status derivation từ Timelines

---

## 4. ⏱️ Timeline Module

> [!CAUTION]
> **CORE FEATURE - Chưa implement**

### Not Implemented ❌

- [ ] Timeline model theo ERD
- [ ] Timeline statuses: `ASSIGNED`, `EN_ROUTE`, `ON_SITE`, `COMPLETED`, `PARTIAL`, `FAILED`, `WITHDRAWN`, `CANCELLED`
- [ ] `PATCH /timelines/{id}/accept` - Team accept -> `EN_ROUTE`
- [ ] `PATCH /timelines/{id}/arrive` - Team arrive -> `ON_SITE`
- [ ] `PATCH /timelines/{id}/complete` - Complete timeline -> `COMPLETED` / `PARTIAL`
- [ ] `PATCH /timelines/{id}/fail` - Fail timeline
- [ ] `PATCH /timelines/{id}/withdraw` - Team withdraw
- [ ] Timeline → Request status sync logic
- [ ] Timeline → Mission status sync logic
- [ ] `route` field (GeoJSON LineString từ Position)

---

## 5. 👥 Team Module

### Implemented ✅

- [x] Team model với leader reference
- [x] TeamMember model
- [x] Mission model (basic)
- [x] Basic controller & service structure

### Not Implemented ❌

- [ ] `GET /teams` - List all teams
- [ ] `POST /teams` - Create team
- [ ] `PATCH /teams/{id}` - Update team
- [ ] `DELETE /teams/{id}` - Delete team
- [ ] `POST /teams/{id}/members` - Add member
- [ ] `DELETE /teams/{id}/members/{userId}` - Remove member
- [ ] Team status management (`AVAILABLE`, `BUSY`)
- [ ] Auto-update team status khi có Timeline active

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

- [ ] `MISSION_ASSIGNED` event
- [ ] `MISSION_APPROACHING` event (Team `EN_ROUTE`)
- [ ] `MISSION_ACCEPTED` event
- [ ] Push notification integration (Firebase)

---

## 9. 👨‍💼 Admin Module

### Not Implemented ❌

- [ ] `GET /users` - List users
- [ ] `PATCH /users/{id}/role` - Update user role
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

## 🎯 Priority Order (Đề xuất)

1. **Phase 1 - Core Flow**: Mission + Timeline + Team modules
2. **Phase 2 - Supply Tracking**: Supply + Warehouse + Inventory + TimelineSupply
3. **Phase 3 - GPS Tracking**: Position module + realtime updates
4. **Phase 4 - Role APIs**: Coordinator, Manager, Rescue Team specific endpoints
5. **Phase 5 - Admin & Reports**: Admin module + reporting

---

## 📝 Notes

- **Request status naming**: Đã thống nhất dùng UPPER_CASE (`SUBMITTED`, `VERIFIED`, v.v.)
- **Unified Flow**: Rescue và Relief dùng chung model, khác nhau ở `type` field.
- **Multi-timeline**: 1 Request có thể có nhiều Timelines (reassignment, scale-out).
- **Cancel rule**: Chỉ SUBMITTED mới được cancel (cả Citizen và Coordinator).
- **Duplicate rule**: Sau khi mark duplicate → sync status/priority từ gốc. Không chain duplicate.
- **On-behalf creation**: Coordinator có thể tạo hộ citizen (có/không tài khoản). Auto-VERIFIED, source=COORDINATOR.
- **phoneNumber**: Bắt buộc khi đăng ký. Lưu trên cả User và Request.

---

## References

- [ERD.md](./ERD.md) - Entity definitions
- [Rescue_flow_2.2.md](./flows/Rescue_flow_2.2.md) - Rescue flow với unified states
- [Relief_flow_1.1.md](./flows/Relief_flow_1.1.md) - Relief flow
- [rules.md](./flows/rules.md) - Derivation rules
- [Supply_management.md](./Supply_management.md) - 3-phase supply tracking
- [API_list.md](./API_list.md) - Full API specification
