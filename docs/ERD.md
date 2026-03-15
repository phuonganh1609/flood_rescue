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
    User ||--o{ Mission : "coordinates"

    Mission ||--o{ MissionRequest : "contains"
    Request ||--o{ MissionRequest : "tracked by"
    Mission ||--o{ Timeline : "has"
    Team ||--o{ Timeline : "assigned to"
    Timeline ||--o{ Position : "tracks"
    Timeline ||--o{ TimelineSupply : "tracks supplies"

    Supply ||--o{ InventoryItem : "stored as"
    Supply ||--o{ TimelineSupply : "referenced by"
    Warehouse ||--o{ InventoryItem : "contains"

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
        Boolean isDuplicated
        ObjectId duplicatedOfRequestId FK
        Boolean isLocationVerified
        DateTime createdAt
        DateTime updatedAt
    }

    Mission {
        ObjectId _id PK
        String name
        String code UK
        String description
        String status
        String priority
        String type
        ObjectId coordinatorId FK
        DateTime createdAt
        DateTime updatedAt
    }

    MissionRequest {
        ObjectId _id PK
        ObjectId missionId FK
        ObjectId requestId FK
        String status
        Number peopleNeeded
        Number peopleRescued
        Number peopleRemaining
        Array requestSuppliesSnapshot
        Array suppliesDelivered
        Number fulfillmentPercent
        Array handledByTeamIds
        ObjectId lastUpdatedByTimelineId FK
        DateTime closedAt
        String note
        DateTime createdAt
        DateTime updatedAt
    }

    Timeline {
        ObjectId _id PK
        ObjectId missionId FK
        ObjectId teamId FK
        String status
        GeoJSON route
        Number rescuedCount
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

    Supply {
        ObjectId _id PK
        String name UK
        String category
        String unit
        Number unitWeight
        String description
        Boolean isActive
        DateTime createdAt
        DateTime updatedAt
    }

    Warehouse {
        ObjectId _id PK
        String name UK
        GeoJSON location
        String status
        DateTime createdAt
        DateTime updatedAt
    }

    InventoryItem {
        ObjectId _id PK
        ObjectId warehouseId FK
        ObjectId supplyId FK
        Number quantity
        Number reservedQuantity
        DateTime lastUpdated
    }

    TimelineSupply {
        ObjectId _id PK
        ObjectId timelineId FK
        ObjectId supplyId FK
        ObjectId warehouseId FK
        Number plannedQty
        Number carriedQty
        Number distributedQty
        Number returnedQty
        String note
        DateTime createdAt
        DateTime updatedAt
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

> [!NOTE]
> **Team Capacity:** Một Rescue Team có thể xử lý nhiều nhiệm vụ song song tùy theo điều phối của Rescue Coordinator. Hệ thống không giới hạn số lượng Timeline active per Team.

---

#### Request

Yêu cầu cứu hộ từ Citizen.

| Field                   | Type          | Description                                                                                   |
| ----------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `_id`                   | ObjectId      | Primary key                                                                                   |
| `userId`                | ObjectId      | FK → User (Citizen hoặc Coordinator nếu tạo thay mặt)                                         |
| `userName`              | String        | Tên người gửi                                                                                 |
| `requestType`           | Enum          | Rescue, Relief                                                                                |
| `incidentType`          | Enum          | Flood, Trapped, Injured, Landslide, Other                                                     |
| `location`              | GeoJSON Point | `{ type: "Point", coordinates: [lng, lat] }`                                                  |
| `description`           | String        | Mô tả tình huống                                                                              |
| `peopleCount`           | Number        | Số người cần cứu (1-100)                                                                      |
| `priority`              | Enum          | Critical, High, Normal                                                                        |
| `status`                | Enum          | SUBMITTED, VERIFIED, REJECTED, IN_PROGRESS, PARTIALLY_FULFILLED, FULFILLED, CLOSED, CANCELLED |
| `requestSupplies`       | Array         | `[{ supplyId: ObjectId, requestedQty: Number }]` - Supplies cần                               |
| `media`                 | String[]      | Danh sách URL hình ảnh                                                                        |
| `isDuplicated`          | Boolean       | Coordinator đánh dấu nếu request trùng (default: false)                                       |
| `duplicatedOfRequestId` | ObjectId?     | FK → Request (request gốc nếu là duplicate)                                                   |
| `isLocationVerified`    | Boolean       | Coordinator verify location chính xác (default: false)                                        |

**Business Rules:**

> [!IMPORTANT]
> **Request Limit:** Một Citizen chỉ được tạo Request mới khi request hiện tại đã ở terminal states (`CLOSED` hoặc `CANCELLED`). Hệ thống validate và reject request mới nếu vi phạm.

> [!NOTE]
> **Priority Assignment:** Priority flag được Coordinator gắn thủ công khi verify request. Thứ tự ưu tiên xử lý:
>
> 1. Mức độ khẩn cấp (priority)
> 2. Số người bị ảnh hưởng (peopleCount)
> 3. Thời gian tạo (createdAt)

> [!NOTE]
> **Duplicate Detection:** Coordinator đánh dấu duplicate thủ công (`isDuplicated = true`). Request duplicate vẫn được verify và có status giống request chính. _Future enhancement: Hệ thống đề xuất duplicate dựa trên location + time + citizen._

> [!NOTE]
> **On Behalf Creation:** Coordinator có thể tạo Request thay mặt Citizen. Request này có `userId` của Coordinator và flow verify giống Request thường.

---

#### Mission

Nhiệm vụ cứu hộ được tạo bởi Coordinator.

| Field           | Type        | Description                                                           |
| --------------- | ----------- | --------------------------------------------------------------------- |
| `_id`           | ObjectId    | Primary key                                                           |
| `name`          | String      | Tên mission (required)                                                |
| `code`          | String      | Mã mission auto-generated (unique, `MS-DDMMYY-SEQ`)                   |
| `description`   | String      | Mô tả mission                                                         |
| `status`        | Enum        | **DRAFT**, PLANNED, IN_PROGRESS, PAUSED, PARTIAL, COMPLETED, ABORTED  |
| `priority`      | Enum        | Critical, High, Normal                                                |
| `type`          | Enum        | RESCUE, RELIEF                                                        |
| `coordinatorId` | ObjectId    | FK → User (coordinator tạo mission)                                   |

**Mission Status Lifecycle (UI-driven flow):**

| Status        | Ý nghĩa                                                                      |
| :------------ | :--------------------------------------------------------------------------- |
| `DRAFT`       | Coordinator đang lên kế hoạch: kéo request vào, ghép team; chưa thông báo   |
| `PLANNED`     | Tất cả cặp (request, team) đã sẵn sàng; chờ Coordinator bấm Start           |
| `IN_PROGRESS` | Mission đã start; ít nhất 1 timeline đang EN_ROUTE / ON_SITE                 |
| `PAUSED`      | Tạm dừng                                                                     |
| `PARTIAL`     | Hoàn thành một phần (cần thêm timeline)                                      |
| `COMPLETED`   | Hoàn tất toàn bộ requests                                                    |
| `ABORTED`     | Huỷ mission                                                                  |

**Business Rules:**

> [!NOTE]
> **Multi-Request Mission:** Một Mission có thể phục vụ nhiều Requests. Khi coordinator kéo một Request vào mission, một `MissionRequest` (status=`PENDING`) được tạo để theo dõi fulfillment của request đó. Khi coordinator ghép một Team vào mission, một Timeline (status=`PLANNED`) được tạo để đại diện cho lần tham gia của team đó.

> [!NOTE]
> **Start Mission:** Khi coordinator bấm "Start", toàn bộ Timeline `PLANNED` của mission đó chuyển sang `ASSIGNED`, notification được gửi tới từng team, mission chuyển sang `PLANNED` (chờ team accept) → `IN_PROGRESS` (khi team đầu tiên accept).

---

#### MissionRequest

Lớp trung gian theo dõi **fulfillment từng Request trong Mission**. Mỗi MissionRequest = 1 Mission × 1 Request, theo dõi cả people rescue lẫn supply delivery.

| Field                     | Type       | Description                                                                   |
| ------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `_id`                     | ObjectId   | Primary key                                                                   |
| `missionId`               | ObjectId   | FK → Mission                                                                  |
| `requestId`               | ObjectId   | FK → Request                                                                  |
| `status`                  | Enum       | PENDING, IN_PROGRESS, PARTIAL, FULFILLED, CLOSED, DROPPED                     |
| `priorityInMission`       | Number?    | Thứ tự ưu tiên trong mission (optional)                                       |
| `locationSnapshot`        | GeoJSON?   | Snapshot vị trí request lúc thêm vào mission                                  |
| `peopleNeeded`            | Number     | Số người cần cứu (copy từ Request.peopleCount lúc tạo)                        |
| `peopleRescued`           | Number     | Số người đã cứu được (cộng dồn từ các Timeline trong cùng mission)            |
| `peopleRemaining`         | Number     | `peopleNeeded − peopleRescued`                                                |
| `requestSuppliesSnapshot` | Array      | `[{supplyId, requestedQty}]` – Snapshot supplies cần lúc tạo                  |
| `suppliesDelivered`       | Array      | `[{supplyId, deliveredQty}]` – Tổng supplies đã giao (cộng dồn)              |
| `suppliesRemaining`       | Array      | `[{supplyId, remainingQty}]` – Chênh lệch còn thiếu                          |
| `fulfillmentPercent`      | Number     | 0–100 – Phần trăm hoàn thành tổng hợp                                        |
| `handledByTeamIds`        | ObjectId[] | Các team đã đóng góp vào xử lý request này trong mission                     |
| `lastUpdatedByTimelineId` | ObjectId?  | FK → Timeline – Timeline cập nhật gần nhất                                   |
| `closedAt`                | DateTime?  | Thời điểm đóng (FULFILLED hoặc CLOSED)                                        |
| `note`                    | String?    | Ghi chú                                                                       |
| `createdAt`               | DateTime   |                                                                               |
| `updatedAt`               | DateTime   |                                                                               |

**MissionRequest Status Lifecycle:**

| Status        | Ý nghĩa                                                                                   |
| :------------ | :---------------------------------------------------------------------------------------- |
| `PENDING`     | Request đã thêm vào mission, chưa có team nào accept                                       |
| `IN_PROGRESS` | Có ít nhất 1 Timeline đang active (EN_ROUTE / ON_SITE) xử lý request này trong mission    |
| `PARTIAL`     | Timeline completed với kết quả partial (còn người hoặc supplies chưa đủ)                  |
| `FULFILLED`   | Toàn bộ people rescued và supplies delivered đầy đủ theo request                           |
| `CLOSED`      | Coordinator đóng thủ công (kể cả khi chưa fulfilled 100%)                                 |
| `DROPPED`     | Coordinator loại request khỏi mission (không xử lý nữa)                                   |

**Business Rules:**

> [!NOTE]
> **Fulfillment Tracking:** `peopleRescued` và `suppliesDelivered` được cộng dồn mỗi khi một Timeline COMPLETED hoặc PARTIAL trong cùng mission. `fulfillmentPercent` được tính lại tự động sau mỗi cập nhật.

> [!NOTE]
> **Multi-Team per Request:** Nhiều Timeline (nhiều team) trong cùng mission có thể cùng đóng góp vào một MissionRequest. `handledByTeamIds` ghi nhận tất cả teams đã tham gia.

---

#### Timeline

Đại diện cho **một lần team tham gia thực thi mission**. Mỗi Timeline = 1 Team × 1 Mission (không còn gắn trực tiếp với Request).

| Field              | Type               | Description                                                                            |
| ------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| `_id`              | ObjectId           | Primary key                                                                            |
| `missionId`        | ObjectId           | FK → Mission                                                                           |
| `teamId`           | ObjectId           | FK → Team                                                                              |
| `status`           | Enum               | **PLANNED**, ASSIGNED, EN_ROUTE, ON_SITE, COMPLETED, PARTIAL, FAILED, WITHDRAWN, CANCELLED |
| `route`            | GeoJSON LineString | Đường đi tổng hợp của team                                                             |
| `rescuedCount`     | Number             | Số người đã cứu được (default: 0)                                                      |
| `assignedAt`       | DateTime           | Thời điểm mission start (PLANNED → ASSIGNED); null khi còn ở PLANNED                  |
| `startedAt`        | DateTime           | Thời điểm team accept (ASSIGNED → EN_ROUTE)                                            |
| `arrivedAt`        | DateTime           | Thời điểm team đến nơi (EN_ROUTE → ON_SITE)                                            |
| `completedAt`      | DateTime           | Thời điểm hoàn thành/thất bại                                                          |
| `failureReason`    | String?            | Lý do thất bại                                                                         |
| `withdrawalReason` | String?            | Lý do rút/từ chối                                                                      |
| `note`             | String?            | Ghi chú                                                                                |

**Timeline Status Lifecycle:**

| Status      | Ý nghĩa                                                                              |
| :---------- | :----------------------------------------------------------------------------------- |
| `PLANNED`   | Coordinator đã ghép team vào mission, mission chưa start; team **chưa được thông báo**  |
| `ASSIGNED`  | Mission đã start; team được thông báo, chờ team accept                               |
| `EN_ROUTE`  | Team accepted; đang di chuyển đến hiện trường                                        |
| `ON_SITE`   | Team đã đến và đang xử lý                                                            |
| `COMPLETED` | Hoàn thành toàn bộ                                                                   |
| `PARTIAL`   | Hoàn thành một phần                                                                  |
| `FAILED`    | Thất bại                                                                             |
| `WITHDRAWN` | Team từ chối sau khi được thông báo                                                  |
| `CANCELLED` | Coordinator huỷ trước khi team hành động                                             |

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

- Ghi nhận mỗi **30 giây** khi Timeline ở trạng thái `EN_ROUTE` hoặc `ON_SITE`
- **Retention**: 60 ngày (sử dụng MongoDB TTL index)

---

### Supply Management Entities

#### Supply

Danh mục supplies chuẩn của hệ thống.

| Field         | Type     | Description                                      |
| ------------- | -------- | ------------------------------------------------ |
| `_id`         | ObjectId | Primary key                                      |
| `name`        | String   | Tên supply (unique)                              |
| `category`    | Enum     | FOOD, WATER, MEDICAL, CLOTHING, EQUIPMENT, OTHER |
| `unit`        | String   | Đơn vị tính (chai, thùng, kg, cái...)            |
| `unitWeight`  | Number?  | Trọng lượng/đơn vị (kg)                          |
| `description` | String   | Mô tả                                            |
| `isActive`    | Boolean  | Còn sử dụng không                                |

---

#### Warehouse

Kho hàng cứu trợ.

| Field      | Type          | Description      |
| ---------- | ------------- | ---------------- |
| `_id`      | ObjectId      | Primary key      |
| `name`     | String        | Tên kho (unique) |
| `location` | GeoJSON Point | Vị trí kho       |
| `status`   | Enum          | ACTIVE, INACTIVE |

---

#### InventoryItem

Tồn kho của từng supply tại warehouse.

| Field              | Type     | Description                |
| ------------------ | -------- | -------------------------- |
| `_id`              | ObjectId | Primary key                |
| `warehouseId`      | ObjectId | FK → Warehouse             |
| `supplyId`         | ObjectId | FK → Supply                |
| `quantity`         | Number   | Số lượng hiện có           |
| `reservedQuantity` | Number   | Số lượng đã đặt (chờ xuất) |
| `lastUpdated`      | DateTime | Lần cập nhật cuối          |

> **Available = quantity - reservedQuantity**

---

#### TimelineSupply

Tracking supplies cho mỗi Timeline qua 3 giai đoạn.

| Field            | Type     | Description                               |
| ---------------- | -------- | ----------------------------------------- |
| `_id`            | ObjectId | Primary key                               |
| `timelineId`     | ObjectId | FK → Timeline                             |
| `supplyId`       | ObjectId | FK → Supply                               |
| `warehouseId`    | ObjectId | FK → Warehouse (nguồn xuất)               |
| `plannedQty`     | Number   | Số lượng dự định (Coordinator plan)       |
| `carriedQty`     | Number   | Số lượng thực tế mang theo (Team confirm) |
| `distributedQty` | Number   | Số lượng đã phát/sử dụng (Team report)    |
| `returnedQty`    | Number   | Số lượng trả về kho                       |
| `note`           | String?  | Ghi chú                                   |

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

| Relationship              | Cardinality | Description                                                              |
| ------------------------- | ----------- | ------------------------------------------------------------------------ |
| User → Team               | N:1         | User thuộc 0-1 team                                                      |
| Team → User (leader)      | 1:1         | Team có 1 leader                                                         |
| User → Request            | 1:N         | Citizen tạo nhiều requests                                               |
| Mission → MissionRequest  | 1:N         | 1 Mission gom nhiều Requests thông qua MissionRequest                    |
| Request → MissionRequest  | 1:N         | 1 Request được theo dõi trong nhiều Missions qua MissionRequest          |
| Mission → Timeline        | 1:N         | Mission có nhiều timelines (1 per team participation)                    |
| Team → Timeline           | 1:N         | Team được assign nhiều timelines                                         |
| Timeline → Position       | 1:N         | Timeline có nhiều positions                                              |
| Timeline → TimelineSupply | 1:N         | Timeline có nhiều supplies được track                                    |
| Supply → TimelineSupply   | 1:N         | Supply được track trong nhiều timelines                                  |
| Supply → InventoryItem    | 1:N         | Supply có inventory tại nhiều warehouses                                 |
| Warehouse → InventoryItem | 1:N         | Warehouse chứa nhiều inventory items                                     |
| User → Session            | 1:N         | User có nhiều sessions                                                   |
| User → Notification       | 1:N         | User nhận nhiều notifications                                            |

---

## References

- [Rescue_flow_2.2.md](./flows/Rescue_flow_2.2.md) - Flow diagrams (cứu hộ)
- [Relief_flow_1.1.md](./flows/Relief_flow_1.1.md) - Flow diagrams (cứu trợ)
- [rules.md](./flows/rules.md) - Derive rules for statuses
