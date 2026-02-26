# Derive Rules for Request, Mission, Mission_Timeline (Unified v2.2)

> **Version 2.2** - Unified Model for both **Rescue** and **Relief**.
> Áp dụng cho cả 2 luồng với cơ chế Multi-timeline và tracking chi tiết (`EN_ROUTE`, `ON_SITE`).

> 🔑 **Timeline là SINGLE SOURCE OF TRUTH**
> Timeline phản ánh **trạng thái thực thi (execution state)** duy nhất của hệ thống.

---

## 1. Timeline Status Definition (Unified)

Định nghĩa các trạng thái hợp lệ của **Timeline**.

| Status      | Ý nghĩa                                                   | Terminal? |
| :---------- | :-------------------------------------------------------- | :-------- |
| `ASSIGNED`  | Team được assign, chờ accept                              | ❌        |
| `EN_ROUTE`  | Team đã accept, đang di chuyển (GPS tracking)             | ❌        |
| `ON_SITE`   | Team đã đến location & đang xử lý                         | ❌        |
| `COMPLETED` | Hoàn thành nhiệm vụ của timeline này                      | ✅        |
| `PARTIAL`   | Hoàn thành một phần (vd: cứu được 1/3 người, phát 1/2 đồ) | ✅        |
| `FAILED`    | Thất bại hoàn toàn                                        | ✅        |
| `WITHDRAWN` | Team từ chối hoặc bị rút bớt                              | ✅        |
| `CANCELLED` | Bị huỷ bởi Coordinator                                    | ✅        |

### Chi tiết trạng thái:

- **ASSIGNED**: Trạng thái khởi tạo khi Coordinator gán team.
- **EN_ROUTE**: Team Accept nhiệm vụ.
- **ON_SITE**: Team đến nơi và bắt đầu thực hiện nhiệm vụ (cứu hộ, phát đồ). Thay thế cho `ARRIVED` và `IN_PROGRESS` cũ.
- **PARTIAL**: Kết thúc timeline nhưng chỉ đáp ứng được 1 phần nhu cầu. Cần tạo timeline mới cho phần còn lại.

---

## 2. Mission Status Definition

> ⚠️ **PAUSED là trạng thái của Mission, KHÔNG phải Timeline**
> Mission quản lý vòng đời chung của việc điều phối.

| Status        | Ý nghĩa                                                       |
| :------------ | :------------------------------------------------------------ |
| `PLANNED`     | Mission được tạo, chưa có timeline chạy                       |
| `IN_PROGRESS` | Có ít nhất 1 timeline đang chạy (`EN_ROUTE`, `ON_SITE`)       |
| `PAUSED`      | Coordinator tạm dừng hoạt động                                |
| `PARTIAL`     | Tất cả timeline xong, nhưng chưa hết việc (cần thêm timeline) |
| `COMPLETED`   | Tất cả requests trong mission đã được xử lý xong              |
| `ABORTED`     | Huỷ mission (Force stop)                                      |

### RULES:

- **M1**: Mission mới tạo → `PLANNED`.
- **M2**: Có timeline `EN_ROUTE` / `ON_SITE` → `IN_PROGRESS`.
- **M3**: Pause mission → `PAUSED`. Resume → `IN_PROGRESS`.
- **M4**: Tất cả timeline kết thúc (`COMPLETED`, `PARTIAL`, `FAILED`), vẫn còn nhu cầu chưa đáp ứng → `PARTIAL` (Mission state, not Request state).
- **M5**: Tất cả nhu cầu đã được đáp ứng (`Request.status = FULFILLED`) → `COMPLETED`.

---

## 3. Request Status Derive Rules (Unified)

Request status được suy diễn từ tổng hợp kết quả của các Timelines.

| Status                | Ý nghĩa                                                     |
| :-------------------- | :---------------------------------------------------------- |
| `SUBMITTED`           | Mới gửi                                                     |
| `VERIFIED`            | Đã xác minh (Verified OK)                                   |
| `REJECTED`            | Xác minh thất bại / Spam                                    |
| `IN_PROGRESS`         | Có timeline đang xử lý                                      |
| `PARTIALLY_FULFILLED` | Các timeline đã xong, nhưng chưa đủ (vd: cần 10, mới cứu 5) |
| `FULFILLED`           | Đã đáp ứng đủ nhu cầu (chưa đóng)                           |
| `CLOSED`              | Coordinator đóng request (Final)                            |
| `CANCELLED`           | Citizen huỷ hoặc Coordinator huỷ                            |

### DERIVATION RULES:

**R1 (Initial):**

- Chưa verify → `SUBMITTED`.
- Verify fail → `REJECTED`.
- Verify OK → `VERIFIED`.

**R2 (Execution):**

- Có ít nhất 1 timeline `ASSIGNED` / `EN_ROUTE` / `ON_SITE` → `IN_PROGRESS`.

**R3 (Partial Result):**

- Tất cả timeline đã kết thúc (Terminal).
- Tổng kết quả (số người cứu / lượng hàng phát) < Nhu cầu gốc.
- → `PARTIALLY_FULFILLED`.

**R4 (Full Result):**

- Tổng kết quả >= Nhu cầu gốc.
- → `FULFILLED`.

**R5 (Closing):**

- Coordinator confirm `FULFILLED` request → `CLOSED`.
  - _Note: Hệ thống có thể auto-close nếu config cho phép._

**R6 (Cancellation):**

- Citizen cancel (khi còn ở `SUBMITTED`).
- Coordinator cancel (khi `IN_PROGRESS` nhưng muốn dừng hẳn).
- → `CANCELLED`.

---

## 4. Mapping cũ & mới (Migration Guide)

| Concept              | Rescue 2.1 (Old)    | Unified 2.2 (New)       |
| :------------------- | :------------------ | :---------------------- |
| **Verified Request** | `ACCEPTED`          | `VERIFIED`              |
| **Done**             | `COMPLETED`         | `FULFILLED` -> `CLOSED` |
| **Moving**           | `EN_ROUTE`          | `EN_ROUTE` (Giữ nguyên) |
| **Action**           | `ARRIVED`           | `ON_SITE`               |
| **Result**           | `COMPLETED`         | `COMPLETED` / `PARTIAL` |
| **New Team**         | Reassign on Mission | Create new Timeline     |

---

## 5. Team Access Rules

### Roles & Permissions

| Endpoint                             | Coordinator / Admin | Team Leader (of that team) | Team Member |
| :----------------------------------- | :------------------ | :------------------------- | :---------- |
| `GET /teams`                         | ✅                   | ❌                          | ❌           |
| `POST /teams`                        | ✅                   | ❌                          | ❌           |
| `GET /teams/:teamId`                 | ✅ (any team)        | ✅                          | ✅           |
| `PATCH /teams/:teamId`               | ✅                   | ❌                          | ❌           |
| `DELETE /teams/:teamId`              | ✅                   | ❌                          | ❌           |
| `PATCH /teams/:teamId/leader`        | ✅                   | ❌                          | ❌           |
| `POST /teams/:teamId/members`        | ✅ (any team)        | ✅                          | ❌           |
| `DELETE /teams/:teamId/members/:uid` | ✅ (any team)        | ✅                          | ❌           |

### Business Rules (Team)

- **T1**: Team Leader = user có `leaderId` trùng với `team.leaderId`.
- **T2**: `addMember` — chỉ thêm user có role `Citizen` và chưa thuộc team nào. Sau khi thêm, role tự động upgrade lên `Rescue Team`.
- **T3**: `removeMember` — không thể remove bản thân (self-remove). Không thể remove leader (phải `changeLeader` trước).
- **T4**: Coordinator / Admin bypass mọi kiểm tra thuộc team, có thể thao tác trên bất kỳ team nào.
- **T5**: `deleteTeam` — chỉ được xoá khi thoả **cả 3 điều kiện**:
  1. Team status = `AVAILABLE` (không phải `BUSY`)
  2. Không có timeline active nào (`ASSIGNED` / `EN_ROUTE` / `ON_SITE`) reference tới team
  3. Team không còn thành viên nào (phải remove hết members trước)

---

## 6. Quan hệ 1-N (One Mission - Many Timelines)

Để hỗ trợ quy mô lớn (Scale):

- **1 Request** có thể được xử lý bởi **N Team** (qua N Timelines).
- **Mission** là container quản lý việc phân phối này.
- **Ví dụ:**
  - Request: Cần 500 gói mì.
  - Timeline 1: Team A nhận chở 200 gói (Status: `COMPLETED`).
  - -> Request Status: `PARTIALLY_FULFILLED` (200/500).
  - Timeline 2: Team B nhận chở 300 gói (Status: `EN_ROUTE`).
  - -> Request Status: `IN_PROGRESS`.
  - Timeline 2: Team B `COMPLETED`.
  - -> Request Status: `FULFILLED` (500/500).
  - Coordinator: Close request.
