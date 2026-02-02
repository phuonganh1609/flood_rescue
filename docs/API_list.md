# 🚨 API List – Rescue & Relief System

## 🔐 Auth

### Register
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/auth/register` |
| **Description** | Đăng ký tài khoản |
| **Request** | `{ userName, displayName, email, phoneNumber?, password, role? }` |
| **Response** | `{ message, userId }` |
| **Auth** | ❌ Không |
| **Note** | `role` mặc định là "Citizen". Các giá trị hợp lệ: Citizen, Rescue Team, Rescue Coordinator, Admin, Manager |

### Login
- **Method:**  `POST` 
- **Endpoint:**  `/api/auth/login` 
- **Description:**  Đăng nhập hệ thống 
- **Request:**  `{ email, password }` 
- **Response:**  `{ accessToken, user }` 
- **Auth:**  ❌ Không

### Register
- **Method:**  `POST` 
- **Endpoint:**  `/api/auth/register` 
- **Description:**  Đăng ký tài khoản (Citizen) 
- **Request:**  `{ fullname, phone, email, password }` 
- **Response:**  `{ userId }` 
- **Auth:**  ❌ Không

### Get Current User
- **Method:**  `GET` 
- **Endpoint:**  `/api/auth/me` 
- **Description:**  Lấy thông tin user hiện tại 
- **Response:**  `{ user, role }` 
- **Auth:**  ✅ Citizen, RescueTeam, Coordinator, Manager, Admin

### Logout
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/auth/logout` |
| **Description** | Đăng xuất khỏi hệ thống |
| **Request** | Refresh token từ cookie |
| **Response** | `204 No Content` |
| **Auth** | ✅ Citizen, RescueTeam, Coordinator, Manager, Admin |
| **Note** | Xóa refresh token khỏi database và cookie |



---

## 🆘 Requests

### Create Rescue / Relief Request
- **Method:**  `POST` 
- **Endpoint:**  `/api/requests/addRequest` 
- **Description:**  Gửi yêu cầu cứu hộ / cứu trợ với URL ảnh từ Frontend 
- **Request:**  `{ type, latitude, longitude, description, imageUrls[], priority, peopleCount, requestSupply[] }` 
- **Response:**  `{ requestId, requestMedia[] }` 
- **Auth:**  ❌ Không 
- **Note:**  Frontend upload files trước, gửi URLs. Backend chỉ lưu URLs.

### Get All Requests
- **Method:**  `GET` 
- **Endpoint:**  `/api/requests/getAll` 
- **Description:**  Danh sách tất cả requests (hỗ trợ filter, pagination) 
- **Query Params:**  `status, type, incidentType, priority, userName, page, limit` 
- **Response:**  `{ data: Request[], total, page, limit, totalPages }` 
- **Auth:**  ✅ Coordinator, RescueTeam

### Get My Requests
- **Method:**  `GET` 
- **Endpoint:**  `/api/requests/my` 
- **Description:**  Citizen xem yêu cầu của mình 
- **Query Params:**  `status, type, incidentType, priority, page, limit` 
- **Response:**  `{ data: Request[], total, page, limit, totalPages }` 
- **Auth:**  ✅ Citizen

### Get Request Detail
- **Method:**  `GET` 
- **Endpoint:**  `/api/requests/{id}` 
- **Description:**  Xem chi tiết yêu cầu 
- **Response:**  `Request` 
- **Auth:**  ✅ Citizen, Coordinator, RescueTeam

### Update Request Status
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/requests/:requestId/status` 
- **Description:**  Cập nhật trạng thái request 
- **Request:**  `{ status }` 
- **Response:**  `{ message, data }` 
- **Status Values:**  `Pending | In Progress | Completed | Cancelled` 
- **Auth:**  ✅ Coordinator

### Citizen Confirm Safe / Received
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/requests/{id}/confirm` 
- **Description:**  Citizen xác nhận an toàn 
- **Response:**  `{ success }` 
- **Auth:**  ✅ Citizen


---

## 🚀 Missions

### Create Mission
- **Method:**  `POST` 
- **Endpoint:**  `/api/missions` 
- **Description:**  Phân công nhiệm vụ cứu hộ 
- **Request:**  `{ teamId, requestIds, vehicleId }` 
- **Response:**  `{ missionId }` 
- **Auth:**  ✅ Coordinator

### Reassign Mission
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/missions/{id}/reassign` 
- **Description:**  Điều phối lại mission 
- **Request:**  `{ teamId }` 
- **Response:**  `{ success }` 
- **Auth:**  ✅ Coordinator

### Get Assigned Missions
- **Method:**  `GET` 
- **Endpoint:**  `/api/missions/assigned` 
- **Description:**  Rescue team xem mission được giao 
- **Response:**  `Mission[]` 
- **Auth:**  ✅ RescueTeam

### Get Mission Detail
- **Method:**  `GET` 
- **Endpoint:**  `/api/missions/{id}` 
- **Description:**  Xem chi tiết mission 
- **Response:**  `Mission` 
- **Auth:**  ✅ RescueTeam, Coordinator

### Update Mission Status
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/missions/{id}/status` 
- **Description:**  Cập nhật trạng thái mission 
- **Request:**  `{ status }` 
- **Response:**  `{ success }` 
- **Auth:**  ✅ RescueTeam

### Submit Mission Report
- **Method:**  `POST` 
- **Endpoint:**  `/api/missions/{id}/report` 
- **Description:**  Báo cáo kết quả cứu hộ 
- **Request:**  `{ summary, obstacles }` 
- **Response:**  `{ reportId }` 
- **Auth:**  ✅ RescueTeam

### Send Team Position
- **Method:**  `POST` 
- **Endpoint:**  `/api/team-positions` 
- **Description:**  Gửi vị trí đội cứu hộ realtime 
- **Request:**  `{ missionId, lat, lng }` 
- **Response:**  `{ success }` 
- **Auth:**  ✅ RescueTeam

### Get Mission Positions
- **Method:**  `GET` 
- **Endpoint:**  `/api/missions/{id}/positions` 
- **Description:**  Xem vị trí đội cứu hộ 
- **Response:**  `Position[]` 
- **Auth:**  ✅ Coordinator

---

## 📦 Resources & Supplies

### List Resources
- **Method:**  `GET` 
- **Endpoint:**  `/api/resources` 
- **Description:**  Danh sách phương tiện / thiết bị 
- **Response:**  `Resource[]` 
- **Auth:**  ✅ Manager, Coordinator

### Create Resource
- **Method:**  `POST` 
- **Endpoint:**  `/api/resources` 
- **Description:**  Thêm phương tiện / thiết bị 
- **Request:**  `{ name, type, capacity }` 
- **Response:**  `{ resourceId }` 
- **Auth:**  ✅ Manager

### Update Resource
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/resources/{id}` 
- **Description:**  Cập nhật trạng thái resource 
- **Request:**  `{ status }` 
- **Response:**  `{ success }` 
- **Auth:**  ✅ Manager

### List Relief Supplies
- **Method:**  `GET` 
- **Endpoint:**  `/api/supplies` 
- **Description:**  Danh sách vật tư cứu trợ 
- **Response:**  `Supply[]` 
- **Auth:**  ✅ Manager

### Update Inventory
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/inventory/{id}` 
- **Description:**  Cập nhật tồn kho 
- **Request:**  `{ quantity }` 
- **Response:**  `{ success }` 
- **Auth:**  ✅ Manager

### Distribute Relief Supplies
- **Method:**  `POST` 
- **Endpoint:**  `/api/relief-distributions` 
- **Description:**  Phát vật tư cứu trợ 
- **Request:**  `{ missionId, supplyId, quantity }` 
- **Response:**  `{ success }` 
- **Auth:**  ✅ Manager

---

## 🔔 Notifications

### Get Notifications
- **Method:**  `GET` 
- **Endpoint:**  `/api/notifications` 
- **Description:**  Xem thông báo 
- **Response:**  `Notification[]` 
- **Auth:**  ✅ Citizen, RescueTeam, Coordinator, Manager, Admin

### Mark Notification As Read
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/notifications/{id}/read` 
- **Description:**  Đánh dấu đã đọc 
- **Response:**  `{ success }` 
- **Auth:**  ✅ Citizen, RescueTeam, Coordinator, Manager, Admin

---

## 👨‍💼 Admin

### List Users
- **Method:**  `GET` 
- **Endpoint:**  `/api/users` 
- **Description:**  Danh sách user 
- **Response:**  `User[]` 
- **Auth:**  ✅ Admin

### Update User Role
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/users/{id}/role` 
- **Description:**  Phân quyền user 
- **Request:**  `{ roleId }` 
- **Response:**  `{ success }` 
- **Auth:**  ✅ Admin

### Get System Categories
- **Method:**  `GET` 
- **Endpoint:**  `/api/system/categories` 
- **Description:**  Lấy cấu hình hệ thống 
- **Response:**  `Category[]` 
- **Auth:**  ✅ Admin

### Get Summary Report
- **Method:**  `GET` 
- **Endpoint:**  `/api/reports/summary` 
- **Description:**  Báo cáo tổng hợp 
- **Response:**  `Report` 
- **Auth:**  ✅ Admin, Manager

### Export Report
- **Method:**  `GET` 
- **Endpoint:**  `/api/reports/export` 
- **Description:**  Xuất báo cáo CSV 
- **Response:**  `File` 
- **Auth:**  ✅ Admin

---

## 📊 Manager

### View Supplies Stock
- **Method:**  `GET` 
- **Endpoint:**  `/api/manager/stocks/supplies` 
- **Description:**  Xem tồn kho vật tư cứu trợ 
- **Query Params:**  `keyword, category, minQuantity, maxQuantity, page, limit` 
- **Response:**  `{supplyId, name, category, quantity, unit}` 
- **Auth:**  Manager 

### View Equipment Stock
- **Method:**  `GET` 
- **Endpoint:**  `/api/manager/stocks/equipments` 
- **Description:**  Xem tồn kho trang thiết bị cứu hộ 
- **Query Params:**  `status, type, page, limit` 
- **Response:**  `{ equipments[] }` 
- **Auth:**  Manager 

### View Vehicle Stock
- **Method:**  `GET` 
- **Endpoint:**  `/api/manager/stocks/vehicles` 
- **Description:**  Xem tồn kho phương tiện 
- **Query Params:**  `type, status, page, limit` 
- **Response:**  `{ vehicles[] }` 
- **Auth:**  Manager 

### Allocate Supplies to Rescue Team
- **Method:**  `POST` 
- **Endpoint:**  `/api/manager/allocate/supplies` 
- **Description:**  Cấp phát vật tư cho đội cứu hộ 
- **Query Params:**  `teamId (required), requestId (optional)` 
- **Request:**  `{ supplies: [{ supplyId, quantity }] }` 
- **Response:**  `{ allocationId, status: ALLOCATED }` 
- **Auth:**  Manager 

### Allocate Equipment to Rescue Team
- **Method:**  `POST` 
- **Endpoint:**  `/api/manager/allocate/equipments` 
- **Description:**  Cấp phát thiết bị cứu hộ 
- **Query Params:**  `teamId (required)` 
- **Request:**  `{ equipmentIds: [uuid] }` 
- **Response:**  `{ success: true }` 
- **Auth:**  Manager 

### Allocate Vehicle to Rescue Team
- **Method:**  `POST` 
- **Endpoint:**  `/api/manager/allocate/vehicles` 
- **Description:**  Cấp phát phương tiện cho đội cứu hộ 
- **Query Params:**  `teamId (required)` 
- **Request:**  `{ vehicleId: uuid }` 
- **Response:**  `{ success: true }` 
- **Auth:**  Manager 

### View Supply Allocation History
- **Method:**  `GET` 
- **Endpoint:**  `/api/manager/allocations/supplies` 
- **Description:**  Xem lịch sử cấp phát vật tư 
- **Query Params:**  `teamId, requestId, fromDate, toDate, page, limit` 
- **Response:**  `{ allocations[] }` 
- **Auth:**  Manager

### Add Supply Stock (Import)
- **Method:**  `POST` 
- **Endpoint:**  `/api/manager/stocks/supplies/import` 
- **Description:**  Nhập thêm vật tư vào kho 
- **Request:**  `{ supplyId, quantity, note }` 
- **Response:**  `{ success: true }` 
- **Auth:**  Manager 

### Export Supply Stock
- **Method:**  `POST` 
- **Endpoint:**  `/api/manager/stocks/supplies/export` 
- **Description:**  Xuất vật tư khỏi kho (ngoài cấp phát) 
- **Query Params:**  `reason: DAMAGED | EXPIRED | TRANSFER` 
- **Request:**  `{ supplyId, quantity }` 
- **Response:**  `{ success: true }` 
- **Auth:**  Manager 

### Update Stock Quantity
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/manager/stocks/supplies/updateQuantity` 
- **Description:**  Điều chỉnh tồn kho 
- **Query Params:**  `supplyId (required)` 
- **Request:**  `{ quantity, reason }` 
- **Response:**  `{ success: true }` 
- **Auth:**  Manager 

---

## 👨‍🚒 Rescue Team

### View Assigned Supplies
- **Method:**  `GET` 
- **Endpoint:**  `/api/rescueTeam/resources/supplies` 
- **Description:**  Đội cứu hộ xem vật tư được cấp 
- **Query Params:**  `requestId (optional)` 
- **Response:**  `{ supplies[] }` 
- **Auth:** Rescue Team 

### View Assigned Equipment & Vehicle
- **Method:**  `GET` 
- **Endpoint:**  `/api/rescueTeam/resources/assets` 
- **Description:**  Xem thiết bị & phương tiện được cấp 
- **Response:**  `{ equipments: [], vehicles: [] }` 
- **Auth:**  Rescue Team

### Get Assigned Missions
- **Method:**  `GET` 
- **Endpoint:**  `/api/rescueTeam/missions` 
- **Description:**  Xem danh sách nhiệm vụ được giao 
- **Query Params:**  `status, page, limit` 
- **Response:**  `{ missions[], total, page, limit, totalPages }` 
- **Auth:**  Rescue Team

### Get Mission Detail
- **Method:**  `GET` 
- **Endpoint:**  `/api/rescueTeam/missions/{id}` 
- **Description:**  Xem chi tiết nhiệm vụ 
- **Response:**  `Mission` 
- **Auth:**  Rescue Team

### Update Mission Status
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/rescueTeam/missions/{id}/status` 
- **Description:**  Cập nhật trạng thái nhiệm vụ 
- **Request:**  `{ status }` 
- **Response:**  `{ success }` 
- **Auth:**  Rescue Team

### Send Team Position
- **Method:**  `POST` 
- **Endpoint:**  `/api/rescueTeam/positions` 
- **Description:**  Gửi vị trí đội cứu hộ realtime 
- **Request:**  `{ missionId, latitude, longitude }` 
- **Response:**  `{ success }` 
- **Auth:**  Rescue Team

### Submit Mission Report
- **Method:**  `POST` 
- **Endpoint:**  `/api/rescueTeam/missions/{id}/report` 
- **Description:**  Báo cáo kết quả cứu hộ 
- **Request:**  `{ summary, obstacles, mediaUrls[] }` 
- **Response:**  `{ reportId }` 
- **Auth:**  Rescue Team

---

## 👨‍💼 Rescue Coordinator

### View All Requests
- **Method:**  `GET` 
- **Endpoint:**  `/api/coordinator/requests` 
- **Description:**  Xem tất cả các yêu cầu cứu hộ/cứu trợ 
- **Query Params:**  `status, type, priority, page, limit` 
- **Response:**  `{ requests[], total, page, limit, totalPages }` 
- **Auth:**  Rescue Coordinator

### Get Request Detail
- **Method:**  `GET` 
- **Endpoint:**  `/api/coordinator/requests/{id}` 
- **Description:**  Xem chi tiết yêu cầu 
- **Response:**  `Request` 
- **Auth:**  Rescue Coordinator

### Update Request Status
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/coordinator/requests/{id}/status` 
- **Description:**  Cập nhật trạng thái yêu cầu 
- **Request:**  `{ status }` 
- **Response:**  `{ success }` 
- **Status Values:**  `Pending | In Progress | Completed | Cancelled` 
- **Auth:**  Rescue Coordinator

### Assign Request to Team
- **Method:**  `POST` 
- **Endpoint:**  `/api/coordinator/requests/{id}/assign` 
- **Description:**  Giao yêu cầu cho đội cứu hộ 
- **Request:**  `{ teamId }` 
- **Response:**  `{ missionId }` 
- **Auth:**  Rescue Coordinator

### Create Mission
- **Method:**  `POST` 
- **Endpoint:**  `/api/coordinator/missions` 
- **Description:**  Tạo nhiệm vụ cứu hộ 
- **Request:**  `{ teamId, requestIds[], vehicleId }` 
- **Response:**  `{ missionId }` 
- **Auth:**  Rescue Coordinator

### View All Missions
- **Method:**  `GET` 
- **Endpoint:**  `/api/coordinator/missions` 
- **Description:**  Xem danh sách tất cả nhiệm vụ 
- **Query Params:**  `status, teamId, page, limit` 
- **Response:**  `{ missions[], total, page, limit, totalPages }` 
- **Auth:**  Rescue Coordinator

### Get Mission Detail
- **Method:**  `GET` 
- **Endpoint:**  `/api/coordinator/missions/{id}` 
- **Description:**  Xem chi tiết nhiệm vụ 
- **Response:**  `Mission` 
- **Auth:**  Rescue Coordinator

### Update Mission Status
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/coordinator/missions/{id}/status` 
- **Description:**  Cập nhật trạng thái nhiệm vụ 
- **Request:**  `{ status }` 
- **Response:**  `{ success }` 
- **Auth:**  Rescue Coordinator

### Reassign Mission
- **Method:**  `PATCH` 
- **Endpoint:**  `/api/coordinator/missions/{id}/reassign` 
- **Description:**  Điều phối lại nhiệm vụ cho đội khác 
- **Request:**  `{ teamId }` 
- **Response:**  `{ success }` 
- **Auth:**  Rescue Coordinator

### Monitor Team Position
- **Method:**  `GET` 
- **Endpoint:**  `/api/coordinator/missions/{id}/positions` 
- **Description:**  Theo dõi vị trí đội cứu hộ realtime 
- **Query Params:**  `missionId` 
- **Response:**  `{ positions[] }` 
- **Auth:**  Rescue Coordinator

### View Mission Report
- **Method:**  `GET` 
- **Endpoint:**  `/api/coordinator/missions/{id}/report` 
- **Description:**  Xem báo cáo kết quả cứu hộ 
- **Response:**  `{ reportId, summary, obstacles, mediaUrls[] }` 
- **Auth:**  Rescue Coordinator

### Allocate Resources to Mission
- **Method:**  `POST` 
- **Endpoint:**  `/api/coordinator/missions/{id}/resources` 
- **Description:**  Cấp phát vật tư/thiết bị cho nhiệm vụ 
- **Request:**  `{ supplies: [{ supplyId, quantity }], equipmentIds: [uuid] }` 
- **Response:**  `{ allocationId }` 
- **Auth:**  Rescue Coordinator

### Get Team Performance
- **Method:**  `GET` 
- **Endpoint:**  `/api/coordinator/teams/{id}/performance` 
- **Description:**  Xem hiệu suất/thống kê đội cứu hộ 
- **Query Params:**  `fromDate, toDate` 
- **Response:**  `{ completedMissions, totalTime, successRate }` 
- **Auth:**  Rescue Coordinator

### Send Notification to Team
- **Method:**  `POST` 
- **Endpoint:**  `/api/coordinator/teams/{id}/notify` 
- **Description:**  Gửi thông báo tới đội cứu hộ 
- **Request:**  `{ message, priority }` 
- **Response:**  `{ notificationId }` 
- **Auth:**  Rescue Coordinator