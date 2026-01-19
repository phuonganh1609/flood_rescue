# API List – Rescue & Relief System

## Auth

### Login

- **Method:** POST
- **Endpoint:** `/api/auth/login`
- **Description:** Đăng nhập hệ thống
- **Request:** `{ email, password }`
- **Response:** `{ accessToken, user }`
- **Auth:** Không

### Register

- **Method:** POST
- **Endpoint:** `/api/auth/register`
- **Description:** Đăng ký tài khoản (Citizen)
- **Request:** `{ name, phone, email, password }`
- **Response:** `{ userId }`
- **Auth:** Không

### Get Current User

- **Method:** GET
- **Endpoint:** `/api/auth/me`
- **Description:** Lấy thông tin user hiện tại
- **Response:** `{ user, role }`
- **Auth:** Citizen, RescueTeam, Coordinator, Manager, Admin

---

## Requests

### Create Rescue / Relief Request

- **Method:** POST
- **Endpoint:** `/api/requests`
- **Description:** Gửi yêu cầu cứu hộ / cứu trợ
- **Request:** `{ type, lat, lng, description, media }`
- **Response:** `{ requestId }`
- **Auth:** Không

### Get My Requests

- **Method:** GET
- **Endpoint:** `/api/requests/my`
- **Description:** Citizen xem yêu cầu của mình
- **Response:** `Request[]`
- **Auth:** Citizen

### Get Request Detail

- **Method:** GET
- **Endpoint:** `/api/requests/{id}`
- **Description:** Xem chi tiết yêu cầu
- **Response:** `Request`
- **Auth:** Citizen, Coordinator, RescueTeam

### List Pending Requests

- **Method:** GET
- **Endpoint:** `/api/requests?status=Pending`
- **Description:** Danh sách SOS chờ xử lý
- **Response:** `Request[]`
- **Auth:** Coordinator

### Verify Request

- **Method:** PATCH
- **Endpoint:** `/api/requests/{id}/verify`
- **Description:** Xác minh / đánh dấu spam
- **Request:** `{ status }`
- **Response:** `{ success }`
- **Auth:** Coordinator

### Set Request Priority

- **Method:** PATCH
- **Endpoint:** `/api/requests/{id}/priority`
- **Description:** Đặt mức độ khẩn cấp
- **Request:** `{ priority }`
- **Response:** `{ success }`
- **Auth:** Coordinator

### Citizen Confirm Safe / Received

- **Method:** PATCH
- **Endpoint:** `/api/requests/{id}/confirm`
- **Description:** Citizen xác nhận an toàn
- **Response:** `{ success }`
- **Auth:** Citizen

---

## Missions

### Create Mission

- **Method:** POST
- **Endpoint:** `/api/missions`
- **Description:** Phân công nhiệm vụ cứu hộ
- **Request:** `{ teamId, requestIds, vehicleId }`
- **Response:** `{ missionId }`
- **Auth:** Coordinator

### Reassign Mission

- **Method:** PATCH
- **Endpoint:** `/api/missions/{id}/reassign`
- **Description:** Điều phối lại mission
- **Request:** `{ teamId }`
- **Response:** `{ success }`
- **Auth:** Coordinator

### Get Assigned Missions

- **Method:** GET
- **Endpoint:** `/api/missions/assigned`
- **Description:** Rescue team xem mission được giao
- **Response:** `Mission[]`
- **Auth:** RescueTeam

### Get Mission Detail

- **Method:** GET
- **Endpoint:** `/api/missions/{id}`
- **Description:** Xem chi tiết mission
- **Response:** `Mission`
- **Auth:** RescueTeam, Coordinator

### Update Mission Status

- **Method:** PATCH
- **Endpoint:** `/api/missions/{id}/status`
- **Description:** Cập nhật trạng thái mission
- **Request:** `{ status }`
- **Response:** `{ success }`
- **Auth:** RescueTeam

### Submit Mission Report

- **Method:** POST
- **Endpoint:** `/api/missions/{id}/report`
- **Description:** Báo cáo kết quả cứu hộ
- **Request:** `{ summary, obstacles }`
- **Response:** `{ reportId }`
- **Auth:** RescueTeam

### Send Team Position

- **Method:** POST
- **Endpoint:** `/api/team-positions`
- **Description:** Gửi vị trí đội cứu hộ realtime
- **Request:** `{ missionId, lat, lng }`
- **Response:** `{ success }`
- **Auth:** RescueTeam

### Get Mission Positions

- **Method:** GET
- **Endpoint:** `/api/missions/{id}/positions`
- **Description:** Xem vị trí đội cứu hộ
- **Response:** `Position[]`
- **Auth:** Coordinator

---

## Resources & Supplies

### List Resources

- **Method:** GET
- **Endpoint:** `/api/resources`
- **Description:** Danh sách phương tiện / thiết bị
- **Response:** `Resource[]`
- **Auth:** Manager, Coordinator

### Create Resource

- **Method:** POST
- **Endpoint:** `/api/resources`
- **Description:** Thêm phương tiện / thiết bị
- **Request:** `{ name, type, capacity }`
- **Response:** `{ resourceId }`
- **Auth:** Manager

### Update Resource

- **Method:** PATCH
- **Endpoint:** `/api/resources/{id}`
- **Description:** Cập nhật trạng thái resource
- **Request:** `{ status }`
- **Response:** `{ success }`
- **Auth:** Manager

### List Relief Supplies

- **Method:** GET
- **Endpoint:** `/api/supplies`
- **Description:** Danh sách vật tư cứu trợ
- **Response:** `Supply[]`
- **Auth:** Manager

### Update Inventory

- **Method:** PATCH
- **Endpoint:** `/api/inventory/{id}`
- **Description:** Cập nhật tồn kho
- **Request:** `{ quantity }`
- **Response:** `{ success }`
- **Auth:** Manager

### Distribute Relief Supplies

- **Method:** POST
- **Endpoint:** `/api/relief-distributions`
- **Description:** Phát vật tư cứu trợ
- **Request:** `{ missionId, supplyId, quantity }`
- **Response:** `{ success }`
- **Auth:** Manager

---

## Notifications

### Get Notifications

- **Method:** GET
- **Endpoint:** `/api/notifications`
- **Description:** Xem thông báo
- **Response:** `Notification[]`
- **Auth:** Citizen, RescueTeam, Coordinator, Manager, Admin

### Mark Notification As Read

- **Method:** PATCH
- **Endpoint:** `/api/notifications/{id}/read`
- **Description:** Đánh dấu đã đọc
- **Response:** `{ success }`
- **Auth:** Citizen, RescueTeam, Coordinator, Manager, Admin

---

## Admin

### List Users

- **Method:** GET
- **Endpoint:** `/api/users`
- **Description:** Danh sách user
- **Response:** `User[]`
- **Auth:** Admin

### Update User Role

- **Method:** PATCH
- **Endpoint:** `/api/users/{id}/role`
- **Description:** Phân quyền user
- **Request:** `{ roleId }`
- **Response:** `{ success }`
- **Auth:** Admin

### Get System Categories

- **Method:** GET
- **Endpoint:** `/api/system/categories`
- **Description:** Lấy cấu hình hệ thống
- **Response:** `Category[]`
- **Auth:** Admin

### Get Summary Report

- **Method:** GET
- **Endpoint:** `/api/reports/summary`
- **Description:** Báo cáo tổng hợp
- **Response:** `Report`
- **Auth:** Admin, Manager

### Export Report

- **Method:** GET
- **Endpoint:** `/api/reports/export`
- **Description:** Xuất báo cáo CSV
- **Response:** `File`
- **Auth:** Admin
