# Entity Relationship Diagram

> Mô hình dữ liệu cho hệ thống Flood Rescue

---

## ERD Diagram

```mermaid
erDiagram
    User ||--o| Team : "belongs to"
    Team ||--|| User : "has leader"
    User ||--o{ Request : "creates"
    User ||--o{ Session : "has"
    User ||--o{ Notification : "receives"

    Request ||--o{ Timeline : "has"
    Mission ||--o{ Timeline : "has"
    Team ||--o{ Timeline : "assigned to"
    Timeline ||--o{ Position : "tracks"

    User {
        ObjectId _id PK
        String userName
        String hashedPassword
        String email UK
        String phoneNumber
        String displayName
        String avatarUrl
        String avatarId
        String role
        ObjectId teamId FK
        Boolean isActive
        DateTime createdAt
        DateTime updatedAt
    }

    Team {
        ObjectId _id PK
        String name UK
        ObjectId leaderId FK
        String status
        DateTime createdAt
        DateTime updatedAt
    }

    Request {
        ObjectId _id PK
        ObjectId userId FK
        String userName
        String requestType
        String incidentType
        GeoJSON location
        String description
        Number peopleCount
        String priority
        String status
        Array requestSupplies
        Array media
        DateTime createdAt
        DateTime updatedAt
    }

    Mission {
        ObjectId _id PK
        String status
        DateTime createdAt
        DateTime updatedAt
    }

    Timeline {
        ObjectId _id PK
        ObjectId missionId FK
        ObjectId requestId FK
        ObjectId teamId FK
        String status
        GeoJSON route
        DateTime assignedAt
        DateTime startedAt
        DateTime arrivedAt
        DateTime completedAt
        String failureReason
        String withdrawalReason
        String note
        DateTime createdAt
        DateTime updatedAt
    }

    Position {
        ObjectId _id PK
        ObjectId timelineId FK
        ObjectId teamId FK
        GeoJSON location
        DateTime timestamp
        DateTime createdAt
    }

    Session {
        ObjectId _id PK
        ObjectId userId FK
        String refreshToken UK
        DateTime expiresAt
        DateTime createdAt
        DateTime updatedAt
    }

    Notification {
        ObjectId _id PK
        ObjectId userId FK
        String type
        String role
        String message
        Boolean isRead
        DateTime createdAt
        DateTime updatedAt
    }
```

---

## Entity Definitions

### Core Entities

#### User

Người dùng hệ thống với các roles: Citizen, Rescue Team, Coordinator, Admin, Manager.

| Field            | Type      | Description                                       |
| ---------------- | --------- | ------------------------------------------------- |
| `_id`            | ObjectId  | Primary key                                       |
| `userName`       | String    | Username đăng nhập                                |
| `email`          | String    | Email (unique)                                    |
| `hashedPassword` | String    | Mật khẩu đã hash                                  |
| `phoneNumber`    | String    | Số điện thoại (sparse unique)                     |
| `displayName`    | String    | Tên hiển thị                                      |
| `avatarUrl`      | String    | Link CDN avatar                                   |
| `role`           | Enum      | Citizen, Rescue Team, Coordinator, Admin, Manager |
| `teamId`         | ObjectId? | FK → Team (nullable, chỉ cho Rescue Team)         |
| `isActive`       | Boolean   | Trạng thái tài khoản                              |

---

#### Team

Đội cứu hộ. Mỗi User chỉ thuộc 1 Team tại 1 thời điểm.

| Field      | Type     | Description             |
| ---------- | -------- | ----------------------- |
| `_id`      | ObjectId | Primary key             |
| `name`     | String   | Tên team (unique)       |
| `leaderId` | ObjectId | FK → User (team leader) |
| `status`   | Enum     | AVAILABLE, BUSY         |

---

#### Request

Yêu cầu cứu hộ từ Citizen.

| Field             | Type          | Description                                                      |
| ----------------- | ------------- | ---------------------------------------------------------------- |
| `_id`             | ObjectId      | Primary key                                                      |
| `userId`          | ObjectId      | FK → User (citizen)                                              |
| `userName`        | String        | Tên người gửi                                                    |
| `requestType`     | Enum          | Rescue, Relief                                                   |
| `incidentType`    | Enum          | Flood, Trapped, Injured, Landslide, Other                        |
| `location`        | GeoJSON Point | `{ type: "Point", coordinates: [lng, lat] }`                     |
| `description`     | String        | Mô tả tình huống                                                 |
| `peopleCount`     | Number        | Số người cần cứu (1-100)                                         |
| `priority`        | Enum          | Critical, High, Normal                                           |
| `status`          | Enum          | Submitted, Accepted, Rejected, In Progress, Completed, Cancelled |
| `requestSupplies` | String[]      | Danh sách supplies cần thiết                                     |
| `media`           | String[]      | Danh sách URL hình ảnh                                           |

---

#### Mission

Nhiệm vụ cứu hộ được tạo bởi Coordinator.

| Field    | Type     | Description                                      |
| -------- | -------- | ------------------------------------------------ |
| `_id`    | ObjectId | Primary key                                      |
| `status` | Enum     | PLANNED, IN_PROGRESS, PAUSED, COMPLETED, ABORTED |

---

#### Timeline

Associative entity giữa Mission, Request và Team. Đại diện cho **một lần thực thi cứu hộ**.

| Field              | Type               | Description                                               |
| ------------------ | ------------------ | --------------------------------------------------------- |
| `_id`              | ObjectId           | Primary key                                               |
| `missionId`        | ObjectId           | FK → Mission                                              |
| `requestId`        | ObjectId           | FK → Request                                              |
| `teamId`           | ObjectId           | FK → Team                                                 |
| `status`           | Enum               | ASSIGNED, EN_ROUTE, ARRIVED, COMPLETED, FAILED, WITHDRAWN |
| `route`            | GeoJSON LineString | Đường đi tổng hợp của team                                |
| `assignedAt`       | DateTime           | Thời điểm assign                                          |
| `startedAt`        | DateTime           | Thời điểm team accept (EN_ROUTE)                          |
| `arrivedAt`        | DateTime           | Thời điểm team đến nơi (ARRIVED)                          |
| `completedAt`      | DateTime           | Thời điểm hoàn thành/thất bại                             |
| `failureReason`    | String?            | Lý do thất bại                                            |
| `withdrawalReason` | String?            | Lý do rút/từ chối                                         |
| `note`             | String?            | Ghi chú                                                   |

---

#### Position

Vị trí theo thời gian thực của Team trong quá trình thực hiện Timeline.

| Field        | Type          | Description                                  |
| ------------ | ------------- | -------------------------------------------- |
| `_id`        | ObjectId      | Primary key                                  |
| `timelineId` | ObjectId      | FK → Timeline                                |
| `teamId`     | ObjectId      | FK → Team                                    |
| `location`   | GeoJSON Point | `{ type: "Point", coordinates: [lng, lat] }` |
| `timestamp`  | DateTime      | Thời điểm ghi nhận                           |

**Tracking rules:**

- Ghi nhận mỗi **30 giây** khi Timeline ở trạng thái `EN_ROUTE` hoặc `ARRIVED`
- **Retention**: 60 ngày (sử dụng MongoDB TTL index)

---

### Supporting Entities

#### Session

Phiên đăng nhập của User.

| Field          | Type     | Description                   |
| -------------- | -------- | ----------------------------- |
| `_id`          | ObjectId | Primary key                   |
| `userId`       | ObjectId | FK → User                     |
| `refreshToken` | String   | Refresh token (unique)        |
| `expiresAt`    | DateTime | Thời điểm hết hạn (TTL index) |

---

#### Notification

Thông báo hệ thống.

| Field     | Type     | Description                                                      |
| --------- | -------- | ---------------------------------------------------------------- |
| `_id`     | ObjectId | Primary key                                                      |
| `userId`  | ObjectId | FK → User                                                        |
| `type`    | Enum     | SUBMITTED, ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED |
| `role`    | Enum     | CITIZEN, COORDINATOR, TEAM_LEADER, ADMIN, MANAGER                |
| `message` | String   | Nội dung thông báo                                               |
| `isRead`  | Boolean  | Đã đọc chưa                                                      |

---

## Relationships Summary

| Relationship         | Cardinality | Description                               |
| -------------------- | ----------- | ----------------------------------------- |
| User → Team          | N:1         | User thuộc 0-1 team                       |
| Team → User (leader) | 1:1         | Team có 1 leader                          |
| User → Request       | 1:N         | Citizen tạo nhiều requests                |
| Request → Timeline   | 1:N         | Request có nhiều timelines (reassignment) |
| Mission → Timeline   | 1:N         | Mission có nhiều timelines                |
| Team → Timeline      | 1:N         | Team được assign nhiều timelines          |
| Timeline → Position  | 1:N         | Timeline có nhiều positions               |
| User → Session       | 1:N         | User có nhiều sessions                    |
| User → Notification  | 1:N         | User nhận nhiều notifications             |

---

## References

- [Rescue_flow_2.1.md](./Rescue_flow_2.1.md) - Flow diagrams
- [rules.md](./rules.md) - Derive rules for statuses
