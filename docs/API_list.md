# 🚨 API List – Rescue & Relief System

## 🔐 Auth

### Login
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/auth/login` |
| **Description** | Đăng nhập hệ thống |
| **Request** | `{ email, password }` |
| **Response** | `{ accessToken, user }` |
| **Auth** | ❌ Không |

### Register
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/auth/register` |
| **Description** | Đăng ký tài khoản (Citizen) |
| **Request** | `{ fullname, phone, email, password }` |
| **Response** | `{ userId }` |
| **Auth** | ❌ Không |

### Get Current User
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/auth/me` |
| **Description** | Lấy thông tin user hiện tại |
| **Response** | `{ user, role }` |
| **Auth** | ✅ Citizen, RescueTeam, Coordinator, Manager, Admin |



---

## 🆘 Requests

### Create Rescue / Relief Request
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/requests/addRequest` |
| **Description** | Gửi yêu cầu cứu hộ / cứu trợ với URL ảnh từ Frontend |
| **Request** | `{ type, latitude, longitude, description, imageUrls[], priority, peopleCount, requestSupply[] }` |
| **Response** | `{ requestId, requestMedia[] }` |
| **Auth** | ❌ Không |
| **Note** | Frontend upload files trước, gửi URLs. Backend chỉ lưu URLs. |

### Get All Requests
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/requests/getAll` |
| **Description** | Danh sách tất cả requests (hỗ trợ filter, pagination) |
| **Query Params** | `status, type, incidentType, priority, userName, page, limit` |
| **Response** | `{ data: Request[], total, page, limit, totalPages }` |
| **Auth** | ✅ Coordinator, RescueTeam |

### Get My Requests
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/requests/my` |
| **Description** | Citizen xem yêu cầu của mình |
| **Query Params** | `status, type, incidentType, priority, page, limit` |
| **Response** | `{ data: Request[], total, page, limit, totalPages }` |
| **Auth** | ✅ Citizen |

### Get Request Detail
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/requests/{id}` |
| **Description** | Xem chi tiết yêu cầu |
| **Response** | `Request` |
| **Auth** | ✅ Citizen, Coordinator, RescueTeam |

### Update Request Status
| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Endpoint** | `/api/requests/:requestId/status` |
| **Description** | Cập nhật trạng thái request |
| **Request** | `{ status }` |
| **Response** | `{ message, data }` |
| **Status Values** | `Pending | In Progress | Completed | Cancelled` |
| **Auth** | ✅ Coordinator |

### Citizen Confirm Safe / Received
| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Endpoint** | `/api/requests/{id}/confirm` |
| **Description** | Citizen xác nhận an toàn |
| **Response** | `{ success }` |
| **Auth** | ✅ Citizen |


---

## 🚀 Missions

### Create Mission
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/missions` |
| **Description** | Phân công nhiệm vụ cứu hộ |
| **Request** | `{ teamId, requestIds, vehicleId }` |
| **Response** | `{ missionId }` |
| **Auth** | ✅ Coordinator |

### Reassign Mission
| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Endpoint** | `/api/missions/{id}/reassign` |
| **Description** | Điều phối lại mission |
| **Request** | `{ teamId }` |
| **Response** | `{ success }` |
| **Auth** | ✅ Coordinator |

### Get Assigned Missions
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/missions/assigned` |
| **Description** | Rescue team xem mission được giao |
| **Response** | `Mission[]` |
| **Auth** | ✅ RescueTeam |

### Get Mission Detail
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/missions/{id}` |
| **Description** | Xem chi tiết mission |
| **Response** | `Mission` |
| **Auth** | ✅ RescueTeam, Coordinator |

### Update Mission Status
| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Endpoint** | `/api/missions/{id}/status` |
| **Description** | Cập nhật trạng thái mission |
| **Request** | `{ status }` |
| **Response** | `{ success }` |
| **Auth** | ✅ RescueTeam |

### Submit Mission Report
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/missions/{id}/report` |
| **Description** | Báo cáo kết quả cứu hộ |
| **Request** | `{ summary, obstacles }` |
| **Response** | `{ reportId }` |
| **Auth** | ✅ RescueTeam |

### Send Team Position
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/team-positions` |
| **Description** | Gửi vị trí đội cứu hộ realtime |
| **Request** | `{ missionId, lat, lng }` |
| **Response** | `{ success }` |
| **Auth** | ✅ RescueTeam |

### Get Mission Positions
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/missions/{id}/positions` |
| **Description** | Xem vị trí đội cứu hộ |
| **Response** | `Position[]` |
| **Auth** | ✅ Coordinator |

---

## 📦 Resources & Supplies

### List Resources
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/resources` |
| **Description** | Danh sách phương tiện / thiết bị |
| **Response** | `Resource[]` |
| **Auth** | ✅ Manager, Coordinator |

### Create Resource
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/resources` |
| **Description** | Thêm phương tiện / thiết bị |
| **Request** | `{ name, type, capacity }` |
| **Response** | `{ resourceId }` |
| **Auth** | ✅ Manager |

### Update Resource
| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Endpoint** | `/api/resources/{id}` |
| **Description** | Cập nhật trạng thái resource |
| **Request** | `{ status }` |
| **Response** | `{ success }` |
| **Auth** | ✅ Manager |

### List Relief Supplies
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/supplies` |
| **Description** | Danh sách vật tư cứu trợ |
| **Response** | `Supply[]` |
| **Auth** | ✅ Manager |

### Update Inventory
| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Endpoint** | `/api/inventory/{id}` |
| **Description** | Cập nhật tồn kho |
| **Request** | `{ quantity }` |
| **Response** | `{ success }` |
| **Auth** | ✅ Manager |

### Distribute Relief Supplies
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/relief-distributions` |
| **Description** | Phát vật tư cứu trợ |
| **Request** | `{ missionId, supplyId, quantity }` |
| **Response** | `{ success }` |
| **Auth** | ✅ Manager |

---

## 🔔 Notifications

### Get Notifications
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/notifications` |
| **Description** | Xem thông báo |
| **Response** | `Notification[]` |
| **Auth** | ✅ Citizen, RescueTeam, Coordinator, Manager, Admin |

### Mark Notification As Read
| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Endpoint** | `/api/notifications/{id}/read` |
| **Description** | Đánh dấu đã đọc |
| **Response** | `{ success }` |
| **Auth** | ✅ Citizen, RescueTeam, Coordinator, Manager, Admin |

---

## 👨‍💼 Admin

### List Users
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/users` |
| **Description** | Danh sách user |
| **Response** | `User[]` |
| **Auth** | ✅ Admin |

### Update User Role
| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Endpoint** | `/api/users/{id}/role` |
| **Description** | Phân quyền user |
| **Request** | `{ roleId }` |
| **Response** | `{ success }` |
| **Auth** | ✅ Admin |

### Get System Categories
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/system/categories` |
| **Description** | Lấy cấu hình hệ thống |
| **Response** | `Category[]` |
| **Auth** | ✅ Admin |

### Get Summary Report
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/reports/summary` |
| **Description** | Báo cáo tổng hợp |
| **Response** | `Report` |
| **Auth** | ✅ Admin, Manager |

### Export Report
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/reports/export` |
| **Description** | Xuất báo cáo CSV |
| **Response** | `File` |
| **Auth** | ✅ Admin |

---

## 📊 Manager

### View Supplies Stock
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/manager/stocks/supplies` |
| **Description** | Xem tồn kho vật tư cứu trợ |
| **Query Params** | `keyword, category, minQuantity, maxQuantity, page, limit` |
| **Response** | `{supplyId, name, category, quantity, unit}` |
| **Auth** | ✅ Manager |

### View Equipment Stock
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/manager/stocks/equipments` |
| **Description** | Xem tồn kho trang thiết bị cứu hộ |
| **Query Params** | `status, type, page, limit` |
| **Response** | `{ equipments[] }` |
| **Auth** | ✅ Manager |

### View Vehicle Stock
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/manager/stocks/vehicles` |
| **Description** | Xem tồn kho phương tiện |
| **Query Params** | `type, status, page, limit` |
| **Response** | `{ vehicles[] }` |
| **Auth** | ✅ Manager |

### Allocate Supplies to Rescue Team
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/manager/allocate/supplies` |
| **Description** | Cấp phát vật tư cho đội cứu hộ |
| **Query Params** | `teamId (required), requestId (optional)` |
| **Request** | `{ supplies: [{ supplyId, quantity }] }` |
| **Response** | `{ allocationId, status: ALLOCATED }` |
| **Auth** | ✅ Manager |

### Allocate Equipment to Rescue Team
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/manager/allocate/equipments` |
| **Description** | Cấp phát thiết bị cứu hộ |
| **Query Params** | `teamId (required)` |
| **Request** | `{ equipmentIds: [uuid] }` |
| **Response** | `{ success: true }` |
| **Auth** | ✅ Manager |

### Allocate Vehicle to Rescue Team
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/manager/allocate/vehicles` |
| **Description** | Cấp phát phương tiện cho đội cứu hộ |
| **Query Params** | `teamId (required)` |
| **Request** | `{ vehicleId: uuid }` |
| **Response** | `{ success: true }` |
| **Auth** | ✅ Manager |

### View Supply Allocation History
| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/manager/allocations/supplies` |
| **Description** | Xem lịch sử cấp phát vật tư |
| **Query Params** | `teamId, requestId, fromDate, toDate, page, limit` |
| **Response** | `{ allocations[] }` |
| **Auth** | ✅ Manager |

### Add Supply Stock (Import)
| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/manager/stocks/supplies/import` |
| **Description** | Nhập thêm vật tư vào kho |
| **Request** | `{ supplyId, quantity, note }` |
| **Response** | `{ success: true }` |
| **Auth** | ✅ Manager |

### Export Supply Stock
- **Method**  `POST` 
- **Endpoint**  `/api/manager/stocks/supplies/export` 
- **Description**  Xuất vật tư khỏi kho (ngoài cấp phát) 
- **Query Params** | `reason: DAMAGED \| EXPIRED \| TRANSFER` 
- **Request**  `{ supplyId, quantity }` 
= **Response**  `{ success: true }` 
- **Auth**  Manager 

### Update Stock Quantity
 **Method**  `PATCH` 
 **Endpoint**  `/api/manager/stocks/supplies/updateQuantity` 
 **Description**  Điều chỉnh tồn kho 
 **Query Params** | `supplyId (required)` 
 **Request**  `{ quantity, reason }` 
 **Response** `{ success: true }` 
 **Auth**  Manager 

---

## 👨‍🚒 Rescue Team

### View Assigned Supplies
 **Method**  `GET` 
 **Endpoint**  `/api/rescueTeam/resources/supplies` 
 **Description**  Đội cứu hộ xem vật tư được cấp 
 **Query Params**  `requestId (optional)` 
 **Response**  `{ supplies[] }` 
 **Auth** Rescue Team 

### View Assigned Equipment & Vehicle

 **Method** GET
 **Endpoint**  `/api/rescueTeam/resources/assets` 
 **Description**  Xem thiết bị & phương tiện được cấp 
 **Response**  `{ equipments: [], vehicles: [] }` 
 **Auth** Rescue Team 