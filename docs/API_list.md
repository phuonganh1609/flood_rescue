# 🚨 API List – Rescue & Relief System

## 🔐 Auth

### Login

- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Description:** Đăng nhập hệ thống
- **Request:** `{ email, password }`
- **Response:** `{ accessToken, user }`
- **Auth:** ❌ Không

### Register

- **Method:** `POST`
- **Endpoint:** `/api/auth/register`
- **Description:** Đăng ký tài khoản (Citizen)
- **Request:** `{ userName, displayName, email, phoneNumber, password, role? }`
- **Response:** `{ userId }`
- **Auth:** ❌ Không
- **Note:** `phoneNumber` là bắt buộc (10-11 chữ số)

### Get Current User

- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Description:** Lấy thông tin user hiện tại
- **Response:** `{ user, role }`
- **Auth:** ✅ Citizen, RescueTeam, Coordinator, Manager, Admin

---

## 🆘 Requests

### Create Rescue / Relief Request

- **Method:** `POST`
- **Endpoint:** `/api/requests`
- **Description:** Citizen tạo yêu cầu cứu hộ / cứu trợ (1 active request limit)
- **Request:** `{ type, location: {type, coordinates}, description, incidentType?, peopleCount?, requestSupplies?, imageUrls[] }`
- **Response:** `{ message, data: Request }`
- **Auth:** ✅ Citizen
- **Note:** `createdBy` = userId, `source` = `CITIZEN`, `phoneNumber` lấy từ User profile

### Create Request On Behalf

- **Method:** `POST`
- **Endpoint:** `/api/requests/on-behalf`
- **Description:** Coordinator tạo yêu cầu hộ citizen (qua hotline, v.v.)
- **Request (citizen có tài khoản):** `{ citizenId, type, location, description, ... }`
- **Request (citizen chưa có tài khoản):** `{ userName, phoneNumber, type, location, description, ... }`
- **Response:** `{ message, data: Request }`
- **Auth:** ✅ Coordinator
- **Rules:**
  - Nếu có `citizenId`: validate user tồn tại, check 1 active request
  - Nếu không có `citizenId`: require `userName` + `phoneNumber`
  - Status tự động = `VERIFIED`, `source` = `COORDINATOR`
  - `createdBy` = Coordinator ID
  - Coordinator có thể set `priority` ngay khi tạo

### Search Citizens

- **Method:** `GET`
- **Endpoint:** `/api/requests/search-citizens?q=keyword`
- **Description:** Coordinator tìm citizen theo tên hoặc SĐT (cho on-behalf)
- **Query Params:** `q` (min 2 ký tự)
- **Response:** `{ data: [{ _id, displayName, userName, phoneNumber, email }] }`
- **Auth:** ✅ Coordinator
- **Note:** Chỉ tìm user có role = Citizen, isActive = true. Limit 10 kết quả.

### Get All Requests

- **Method:** `GET`
- **Endpoint:** `/api/requests`
- **Description:** Danh sách tất cả requests (priority sorted, hỗ trợ filter, pagination)
- **Query Params:** `status, type, incidentType, priority, userName, source, createdBy, page, limit`
- **Response:** `{ data: Request[], total, page, limit, totalPages }`
- **Auth:** ✅ Coordinator, RescueTeam

### Get My Requests

- **Method:** `GET`
- **Endpoint:** `/api/requests/my`
- **Description:** Citizen xem yêu cầu của mình
- **Query Params:** `status, type, incidentType, priority, page, limit`
- **Response:** `{ data: Request[], total, page, limit, totalPages }`
- **Auth:** ✅ Citizen

### Get Request Detail

- **Method:** `GET`
- **Endpoint:** `/api/requests/{id}`
- **Description:** Xem chi tiết yêu cầu
- **Response:** `Request`
- **Auth:** ✅ Citizen, Coordinator, RescueTeam

### Verify / Reject Request

- **Method:** `PATCH`
- **Endpoint:** `/api/requests/:requestId/verify`
- **Description:** Coordinator verify hoặc reject request
- **Request:** `{ action: "VERIFY" | "REJECT", reason? }`
- **Response:** `{ message, data }`
- **Auth:** ✅ Coordinator

### Close Request

- **Method:** `PATCH`
- **Endpoint:** `/api/requests/:requestId/close`
- **Description:** Coordinator đóng request
- **Response:** `{ message, data }`
- **Auth:** ✅ Coordinator

### Cancel Request

- **Method:** `PATCH`
- **Endpoint:** `/api/requests/:requestId/cancel`
- **Description:** Citizen hoặc Coordinator huỷ request (chỉ khi SUBMITTED)
- **Request:** `{ reason? }`
- **Response:** `{ message, data }`
- **Auth:** ✅ Citizen (own), Coordinator (any)

### Mark as Duplicate

- **Method:** `PATCH`
- **Endpoint:** `/api/requests/:requestId/duplicate`
- **Description:** Coordinator đánh dấu request trùng lặp
- **Request:** `{ originalRequestId }`
- **Response:** `{ message, data }`
- **Auth:** ✅ Coordinator
- **Rules:** Chỉ trước IN_PROGRESS, không chain, sync status/priority từ gốc

### Update Location

- **Method:** `PATCH`
- **Endpoint:** `/api/requests/:requestId/location`
- **Description:** Coordinator cập nhật vị trí và verify
- **Request:** `{ location: {type, coordinates} }`
- **Response:** `{ message, data }`
- **Auth:** ✅ Coordinator

### Update Priority

- **Method:** `PATCH`
- **Endpoint:** `/api/requests/:requestId/priority`
- **Description:** Coordinator đổi priority (chỉ VERIFIED, không cho duplicate)
- **Request:** `{ priority }`
- **Response:** `{ message, data }`
- **Auth:** ✅ Coordinator

---

## 🚀 Missions

### Create Mission

- **Method:** `POST`
- **Endpoint:** `/api/missions`
- **Description:** Phân công nhiệm vụ cứu hộ
- **Request:** `{ teamId, requestIds, vehicleId }`
- **Response:** `{ missionId }`
- **Auth:** ✅ Coordinator

### Reassign Mission

- **Method:** `PATCH`
- **Endpoint:** `/api/missions/{id}/reassign`
- **Description:** Điều phối lại mission
- **Request:** `{ teamId }`
- **Response:** `{ success }`
- **Auth:** ✅ Coordinator

### Get Assigned Missions

- **Method:** `GET`
- **Endpoint:** `/api/missions/assigned`
- **Description:** Rescue team xem mission được giao
- **Response:** `Mission[]`
- **Auth:** ✅ RescueTeam

### Get Mission Detail

- **Method:** `GET`
- **Endpoint:** `/api/missions/{id}`
- **Description:** Xem chi tiết mission
- **Response:** `Mission`
- **Auth:** ✅ RescueTeam, Coordinator

### Update Mission Status

- **Method:** `PATCH`
- **Endpoint:** `/api/missions/{id}/status`
- **Description:** Cập nhật trạng thái mission
- **Request:** `{ status }`
- **Response:** `{ success }`
- **Auth:** ✅ RescueTeam

### Submit Mission Report

- **Method:** `POST`
- **Endpoint:** `/api/missions/{id}/report`
- **Description:** Báo cáo kết quả cứu hộ
- **Request:** `{ summary, obstacles }`
- **Response:** `{ reportId }`
- **Auth:** ✅ RescueTeam

### Send Team Position

- **Method:** `POST`
- **Endpoint:** `/api/team-positions`
- **Description:** Gửi vị trí đội cứu hộ realtime
- **Request:** `{ missionId, lat, lng }`
- **Response:** `{ success }`
- **Auth:** ✅ RescueTeam

### Get Mission Positions

- **Method:** `GET`
- **Endpoint:** `/api/missions/{id}/positions`
- **Description:** Xem vị trí đội cứu hộ
- **Response:** `Position[]`
- **Auth:** ✅ Coordinator

---

## 📦 Resources & Supplies

### List Resources

- **Method:** `GET`
- **Endpoint:** `/api/resources`
- **Description:** Danh sách phương tiện / thiết bị
- **Response:** `Resource[]`
- **Auth:** ✅ Manager, Coordinator

### Create Resource

- **Method:** `POST`
- **Endpoint:** `/api/resources`
- **Description:** Thêm phương tiện / thiết bị
- **Request:** `{ name, type, capacity }`
- **Response:** `{ resourceId }`
- **Auth:** ✅ Manager

### Update Resource

- **Method:** `PATCH`
- **Endpoint:** `/api/resources/{id}`
- **Description:** Cập nhật trạng thái resource
- **Request:** `{ status }`
- **Response:** `{ success }`
- **Auth:** ✅ Manager

### List Relief Supplies

- **Method:** `GET`
- **Endpoint:** `/api/supplies`
- **Description:** Danh sách vật tư cứu trợ
- **Response:** `Supply[]`
- **Auth:** ✅ Manager

### Update Inventory

- **Method:** `PATCH`
- **Endpoint:** `/api/inventory/{id}`
- **Description:** Cập nhật tồn kho
- **Request:** `{ quantity }`
- **Response:** `{ success }`
- **Auth:** ✅ Manager

### Distribute Relief Supplies

- **Method:** `POST`
- **Endpoint:** `/api/relief-distributions`
- **Description:** Phát vật tư cứu trợ
- **Request:** `{ missionId, supplyId, quantity }`
- **Response:** `{ success }`
- **Auth:** ✅ Manager

---

## 🔔 Notifications

### Get Notifications

- **Method:** `GET`
- **Endpoint:** `/api/notifications`
- **Description:** Xem thông báo
- **Response:** `Notification[]`
- **Auth:** ✅ Citizen, RescueTeam, Coordinator, Manager, Admin

### 5. Team Management

| Method   | Endpoint                         | Description                       | Auth             |
| :------- | :------------------------------- | :-------------------------------- | :--------------- |
| `GET`    | `/api/teams`                     | List all teams (filter by status) | Coord/Admin      |
| `POST`   | `/api/teams`                     | Create new team                   | Coord/Admin      |
| `GET`    | `/api/teams/:id`                 | Get team details & members        | Coord/Admin/Team |
| `PATCH`  | `/api/teams/:id`                 | Update team info                  | Coord/Admin      |
| `DELETE` | `/api/teams/:id`                 | Delete team                       | Coord/Admin      |
| `PATCH`  | `/api/teams/:id/leader`          | Change team leader                | Coord/Admin      |
| `POST`   | `/api/teams/:id/members`         | Add member to team                | Coord/Admin      |
| `DELETE` | `/api/teams/:id/members/:userId` | Remove member                     | Coord/Admin      |

### 6. Notification Managementad

- **Method:** `PATCH`
- **Endpoint:** `/api/notifications/{id}/read`
- **Description:** Đánh dấu đã đọc
- **Response:** `{ success }`
- **Auth:** ✅ Citizen, RescueTeam, Coordinator, Manager, Admin

### Get Unread Count

- **Method:** `GET`
- **Endpoint:** `/api/notifications/unread-count`
- **Description:** Lấy số lượng thông báo chưa đọc
- **Response:** `{ count }`
- **Auth:** ✅ Citizen, RescueTeam, Coordinator, Manager, Admin

---

## 🔌 WebSocket (Real-time Notifications)

### Connection

- **URL:** `ws://localhost:8080` hoặc `wss://flood-rescue.onrender.com`
- **Auth:** JWT token trong `auth.token` hoặc query `?token=...`

### Events (Server → Client)

| Event                 | Mô tả                                               |
| --------------------- | --------------------------------------------------- |
| `CONNECTED`           | Kết nối thành công, trả về user info + unread count |
| `NEW_NOTIFICATION`    | Có thông báo mới                                    |
| `UNREAD_COUNT_UPDATE` | Cập nhật số thông báo chưa đọc                      |
| `REQUEST_SUBMITTED`   | Có yêu cầu cứu hộ mới (→ Coordinator)               |
| `REQUEST_VERIFIED`    | Yêu cầu đã được xác nhận (→ Citizen)                |
| `REQUEST_REJECTED`    | Yêu cầu bị từ chối (→ Citizen)                      |
| `MISSION_ASSIGNED`    | Đội được phân công (→ Citizen + Team)               |
| `MISSION_ACCEPTED`    | Đội đã nhận nhiệm vụ (→ Coordinator)                |
| `MISSION_APPROACHING` | Đội đang đến (→ Citizen)                            |
| `MISSION_COMPLETED`   | Cứu hộ thành công (→ All)                           |
| `MISSION_FAILED`      | Cứu hộ thất bại (→ All)                             |

## 👨‍💼 Admin

### List Users

- **Method:** `GET`
- **Endpoint:** `/api/users`
- **Description:** Danh sách user
- **Response:** `User[]`
- **Auth:** ✅ Admin

### Update User Role

- **Method:** `PATCH`
- **Endpoint:** `/api/users/{id}/role`
- **Description:** Phân quyền user
- **Request:** `{ roleId }`
- **Response:** `{ success }`
- **Auth:** ✅ Admin

### Get System Categories

- **Method:** `GET`
- **Endpoint:** `/api/system/categories`
- **Description:** Lấy cấu hình hệ thống
- **Response:** `Category[]`
- **Auth:** ✅ Admin

### Get Summary Report

- **Method:** `GET`
- **Endpoint:** `/api/reports/summary`
- **Description:** Báo cáo tổng hợp
- **Response:** `Report`
- **Auth:** ✅ Admin, Manager

### Export Report

- **Method:** `GET`
- **Endpoint:** `/api/reports/export`
- **Description:** Xuất báo cáo CSV
- **Response:** `File`
- **Auth:** ✅ Admin

---

## 📊 Manager

### View Supplies Stock

- **Method:** `GET`
- **Endpoint:** `/api/manager/stocks/supplies`
- **Description:** Xem tồn kho vật tư cứu trợ
- **Query Params:** `keyword, category, minQuantity, maxQuantity, page, limit`
- **Response:** `{supplyId, name, category, quantity, unit}`
- **Auth:** Manager

### View Equipment Stock

- **Method:** `GET`
- **Endpoint:** `/api/manager/stocks/equipments`
- **Description:** Xem tồn kho trang thiết bị cứu hộ
- **Query Params:** `status, type, page, limit`
- **Response:** `{ equipments[] }`
- **Auth:** Manager

### View Vehicle Stock

- **Method:** `GET`
- **Endpoint:** `/api/manager/stocks/vehicles`
- **Description:** Xem tồn kho phương tiện
- **Query Params:** `type, status, page, limit`
- **Response:** `{ vehicles[] }`
- **Auth:** Manager

### Allocate Supplies to Rescue Team

- **Method:** `POST`
- **Endpoint:** `/api/manager/allocate/supplies`
- **Description:** Cấp phát vật tư cho đội cứu hộ
- **Query Params:** `teamId (required), requestId (optional)`
- **Request:** `{ supplies: [{ supplyId, quantity }] }`
- **Response:** `{ allocationId, status: ALLOCATED }`
- **Auth:** Manager

### Allocate Equipment to Rescue Team

- **Method:** `POST`
- **Endpoint:** `/api/manager/allocate/equipments`
- **Description:** Cấp phát thiết bị cứu hộ
- **Query Params:** `teamId (required)`
- **Request:** `{ equipmentIds: [uuid] }`
- **Response:** `{ success: true }`
- **Auth:** Manager

### Allocate Vehicle to Rescue Team

- **Method:** `POST`
- **Endpoint:** `/api/manager/allocate/vehicles`
- **Description:** Cấp phát phương tiện cho đội cứu hộ
- **Query Params:** `teamId (required)`
- **Request:** `{ vehicleId: uuid }`
- **Response:** `{ success: true }`
- **Auth:** Manager

### View Supply Allocation History

- **Method:** `GET`
- **Endpoint:** `/api/manager/allocations/supplies`
- **Description:** Xem lịch sử cấp phát vật tư
- **Query Params:** `teamId, requestId, fromDate, toDate, page, limit`
- **Response:** `{ allocations[] }`
- **Auth:** Manager

### Add Supply Stock (Import)

- **Method:** `POST`
- **Endpoint:** `/api/manager/stocks/supplies/import`
- **Description:** Nhập thêm vật tư vào kho
- **Request:** `{ supplyId, quantity, note }`
- **Response:** `{ success: true }`
- **Auth:** Manager

### Export Supply Stock

- **Method:** `POST`
- **Endpoint:** `/api/manager/stocks/supplies/export`
- **Description:** Xuất vật tư khỏi kho (ngoài cấp phát)
- **Query Params:** `reason: DAMAGED | EXPIRED | TRANSFER`
- **Request:** `{ supplyId, quantity }`
- **Response:** `{ success: true }`
- **Auth:** Manager

### Update Stock Quantity

- **Method:** `PATCH`
- **Endpoint:** `/api/manager/stocks/supplies/updateQuantity`
- **Description:** Điều chỉnh tồn kho
- **Query Params:** `supplyId (required)`
- **Request:** `{ quantity, reason }`
- **Response:** `{ success: true }`
- **Auth:** Manager

---

## 👨‍🚒 Rescue Team

### View Assigned Supplies

- **Method:** `GET`
- **Endpoint:** `/api/rescueTeam/resources/supplies`
- **Description:** Đội cứu hộ xem vật tư được cấp
- **Query Params:** `requestId (optional)`
- **Response:** `{ supplies[] }`
- **Auth:** Rescue Team

### View Assigned Equipment & Vehicle

- **Method:** `GET`
- **Endpoint:** `/api/rescueTeam/resources/assets`
- **Description:** Xem thiết bị & phương tiện được cấp
- **Response:** `{ equipments: [], vehicles: [] }`
- **Auth:** Rescue Team

### Get Assigned Missions

- **Method:** `GET`
- **Endpoint:** `/api/rescueTeam/missions`
- **Description:** Xem danh sách nhiệm vụ được giao
- **Query Params:** `status, page, limit`
- **Response:** `{ missions[], total, page, limit, totalPages }`
- **Auth:** Rescue Team

### Get Mission Detail

- **Method:** `GET`
- **Endpoint:** `/api/rescueTeam/missions/{id}`
- **Description:** Xem chi tiết nhiệm vụ
- **Response:** `Mission`
- **Auth:** Rescue Team

### Update Mission Status

- **Method:** `PATCH`
- **Endpoint:** `/api/rescueTeam/missions/{id}/status`
- **Description:** Cập nhật trạng thái nhiệm vụ
- **Request:** `{ status }`
- **Response:** `{ success }`
- **Auth:** Rescue Team

### Send Team Position

- **Method:** `POST`
- **Endpoint:** `/api/rescueTeam/positions`
- **Description:** Gửi vị trí đội cứu hộ realtime
- **Request:** `{ missionId, latitude, longitude }`
- **Response:** `{ success }`
- **Auth:** Rescue Team

### Submit Mission Report

- **Method:** `POST`
- **Endpoint:** `/api/rescueTeam/missions/{id}/report`
- **Description:** Báo cáo kết quả cứu hộ
- **Request:** `{ summary, obstacles, mediaUrls[] }`
- **Response:** `{ reportId }`
- **Auth:** Rescue Team

---

## 👨‍💼 Rescue Coordinator

### View All Requests

- **Method:** `GET`
- **Endpoint:** `/api/coordinator/requests`
- **Description:** Xem tất cả các yêu cầu cứu hộ/cứu trợ
- **Query Params:** `status, type, priority, page, limit`
- **Response:** `{ requests[], total, page, limit, totalPages }`
- **Auth:** Rescue Coordinator

### Get Request Detail

- **Method:** `GET`
- **Endpoint:** `/api/coordinator/requests/{id}`
- **Description:** Xem chi tiết yêu cầu
- **Response:** `Request`
- **Auth:** Rescue Coordinator

### Update Request Status

- **Method:** `PATCH`
- **Endpoint:** `/api/coordinator/requests/{id}/status`
- **Description:** Cập nhật trạng thái yêu cầu (state machine validation)
- **Request:** `{ status, reason? }`
- **Response:** `{ success }`
- **Status Values:** `Submitted | Accepted | Rejected | In Progress | Completed | Cancelled`
- **Auth:** Rescue Coordinator

### Assign Request to Team

- **Method:** `POST`
- **Endpoint:** `/api/coordinator/requests/{id}/assign`
- **Description:** Giao yêu cầu cho đội cứu hộ
- **Request:** `{ teamId }`
- **Response:** `{ missionId }`
- **Auth:** Rescue Coordinator

### Create Mission

- **Method:** `POST`
- **Endpoint:** `/api/coordinator/missions`
- **Description:** Tạo nhiệm vụ cứu hộ
- **Request:** `{ teamId, requestIds[], vehicleId }`
- **Response:** `{ missionId }`
- **Auth:** Rescue Coordinator

### View All Missions

- **Method:** `GET`
- **Endpoint:** `/api/coordinator/missions`
- **Description:** Xem danh sách tất cả nhiệm vụ
- **Query Params:** `status, teamId, page, limit`
- **Response:** `{ missions[], total, page, limit, totalPages }`
- **Auth:** Rescue Coordinator

### Get Mission Detail

- **Method:** `GET`
- **Endpoint:** `/api/coordinator/missions/{id}`
- **Description:** Xem chi tiết nhiệm vụ
- **Response:** `Mission`
- **Auth:** Rescue Coordinator

### Update Mission Status

- **Method:** `PATCH`
- **Endpoint:** `/api/coordinator/missions/{id}/status`
- **Description:** Cập nhật trạng thái nhiệm vụ
- **Request:** `{ status }`
- **Response:** `{ success }`
- **Auth:** Rescue Coordinator

### Reassign Mission

- **Method:** `PATCH`
- **Endpoint:** `/api/coordinator/missions/{id}/reassign`
- **Description:** Điều phối lại nhiệm vụ cho đội khác
- **Request:** `{ teamId }`
- **Response:** `{ success }`
- **Auth:** Rescue Coordinator

### Monitor Team Position

- **Method:** `GET`
- **Endpoint:** `/api/coordinator/missions/{id}/positions`
- **Description:** Theo dõi vị trí đội cứu hộ realtime
- **Query Params:** `missionId`
- **Response:** `{ positions[] }`
- **Auth:** Rescue Coordinator

### View Mission Report

- **Method:** `GET`
- **Endpoint:** `/api/coordinator/missions/{id}/report`
- **Description:** Xem báo cáo kết quả cứu hộ
- **Response:** `{ reportId, summary, obstacles, mediaUrls[] }`
- **Auth:** Rescue Coordinator

### Allocate Resources to Mission

- **Method:** `POST`
- **Endpoint:** `/api/coordinator/missions/{id}/resources`
- **Description:** Cấp phát vật tư/thiết bị cho nhiệm vụ
- **Request:** `{ supplies: [{ supplyId, quantity }], equipmentIds: [uuid] }`
- **Response:** `{ allocationId }`
- **Auth:** Rescue Coordinator

### Get Team Performance

- **Method:** `GET`
- **Endpoint:** `/api/coordinator/teams/{id}/performance`
- **Description:** Xem hiệu suất/thống kê đội cứu hộ
- **Query Params:** `fromDate, toDate`
- **Response:** `{ completedMissions, totalTime, successRate }`
- **Auth:** Rescue Coordinator

### Send Notification to Team

- **Method:** `POST`
- **Endpoint:** `/api/coordinator/teams/{id}/notify`
- **Description:** Gửi thông báo tới đội cứu hộ
- **Request:** `{ message, priority }`
- **Response:** `{ notificationId }`
- **Auth:** Rescue Coordinator
