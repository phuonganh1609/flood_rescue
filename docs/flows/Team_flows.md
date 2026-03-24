# Rescue Team Flows

> Tổng hợp tất cả các luồng dành cho actor **Rescue Team**.
>
> Dựa trên [Rescue_flow_2.2.md](./Rescue_flow_2.2.md), [Relief_flow_1.1.md](./Relief_flow_1.1.md) và source code hiện tại.

> **V2 update (TeamRequest-first, Option A):**
>
> - Khi `PATCH /api/missions/:id/start`, hệ thống pre-create `TeamRequest` cho mọi cặp (`MissionRequest` x Team assigned).
> - Sau `start`, mission vẫn ở `PLANNED`; mission chỉ chuyển `IN_PROGRESS` khi có ít nhất một timeline vào `EN_ROUTE`/`ON_SITE` (thường sau `accept`).
> - Team update tiến độ qua `POST /api/mission-requests/:id/progress`, backend ghi audit theo TeamRequest và sync aggregate về MissionRequest.
> - Team chỉ được update progress khi đã `accept` (có timeline đang executing: `EN_ROUTE`/`ON_SITE`).
> - Team có thể xem request trong mission ngay sau khi được assign (không phụ thuộc đã update progress hay chưa).
> - Nếu tổng `suppliesDelivered` vượt `requestedQty`, API trả lỗi `422 (SUPPLY_OVER_DELIVERY)` để FE hiển thị cảnh báo nghiệp vụ.

---

## 1. Tổng quan luồng chính

```mermaid
flowchart TB
    subgraph "Rescue Team - All Flows"
        A[🔔 Nhận thông báo<br/>MISSION_ASSIGNED] --> B{Quyết định}

        B -- Chấp nhận --> C[Flow 1: Accept & Execute]
        B -- Từ chối --> D[Flow 2: Withdraw]

        C --> E[Flow 3: Complete / Partial]
        C --> F[Flow 4: Fail]

        G[Flow 5: View Missions & Timelines]
        H[Flow 6: View Requests]
        I[Flow 7: Notifications]
    end
```

---

## 2. Full End-to-End Flow

Luồng toàn bộ từ khi nhận thông báo đến khi kết thúc nhiệm vụ:

```mermaid
flowchart TD
    START([🔔 Nhận thông báo MISSION_ASSIGNED]) --> VIEW[GET /api/timelines<br/>Xem timeline được giao]
    VIEW --> DETAIL[GET /api/timelines/:id<br/>Xem chi tiết nhiệm vụ]
    DETAIL --> DECIDE{Quyết định nhận<br/>nhiệm vụ?}

    DECIDE -- Từ chối --> WITHDRAW[PATCH /timelines/:id/withdraw<br/>Timeline = WITHDRAWN]
    WITHDRAW --> WITHDRAW_END([🔴 Kết thúc - Team AVAILABLE<br/>Coordinator reassign])

    DECIDE -- Chấp nhận --> ACCEPT[PATCH /timelines/:id/accept<br/>Timeline = EN_ROUTE]
    ACCEPT --> TRAVEL[🚗 Di chuyển đến hiện trường<br/>Team status = BUSY]

    TRAVEL --> ARRIVE[PATCH /timelines/:id/arrive<br/>Timeline = ON_SITE]

    ARRIVE --> EXECUTE[⚡ Thực hiện cứu hộ<br/>tại hiện trường]

    EXECUTE --> OUTCOME{Kết quả?}

    OUTCOME -- Thành công hết --> COMPLETE[PATCH /timelines/:id/complete<br/>outcome=COMPLETED<br/>completions: object]
    OUTCOME -- Cứu được một phần --> PARTIAL_COMP[PATCH /timelines/:id/complete<br/>outcome=PARTIAL<br/>completions: object]
    OUTCOME -- Thất bại --> FAIL_ACT[PATCH /timelines/:id/fail<br/>failureReason=...]

    COMPLETE --> CHECK{Σ completions.rescuedCount >= peopleCount?}
    CHECK -- Yes --> FULFILLED([✅ Request = FULFILLED<br/>Team = AVAILABLE])
    CHECK -- No --> PARTIAL_REQ([⚠️ Request = PARTIALLY_FULFILLED<br/>Team = AVAILABLE<br/>Coordinator tạo Timeline mới])

    PARTIAL_COMP --> PARTIAL_REQ

    FAIL_ACT --> FAIL_END([❌ FAILED - Team = AVAILABLE<br/>Coordinator quyết định retry])

    style ACCEPT fill:#4CAF50,color:white
    style WITHDRAW fill:#f44336,color:white
    style COMPLETE fill:#2196F3,color:white
    style PARTIAL_COMP fill:#FF9800,color:white
    style FAIL_ACT fill:#f44336,color:white
    style FULFILLED fill:#4CAF50,color:white
    style PARTIAL_REQ fill:#FF9800,color:white
    style FAIL_END fill:#f44336,color:white
```

---

## 3. Timeline State Machine (Rescue Team perspective)

```mermaid
stateDiagram-v2
    [*] --> PLANNED : Coordinator gán team vào mission

    PLANNED --> ASSIGNED : Coordinator start mission

    ASSIGNED --> EN_ROUTE : 🟢 Team accept (accept)
    ASSIGNED --> WITHDRAWN : 🔴 Team từ chối (withdraw)

    EN_ROUTE --> ON_SITE : 📍 Team arrives (arrive)

    ON_SITE --> COMPLETED : ✅ Cứu hộ thành công (complete full)
    ON_SITE --> PARTIAL : ⚠️ Cứu được một phần (complete partial)
    ON_SITE --> FAILED : ❌ Thất bại (fail)

    note right of ASSIGNED : Coordinator có thể cancel → CANCELLED

    COMPLETED --> [*]
    PARTIAL --> [*]
    FAILED --> [*]
    WITHDRAWN --> [*]
```

---

## 4. Flow chi tiết

### 4.1 Accept & Execute (Nhận và thực thi nhiệm vụ)

```mermaid
sequenceDiagram
    autonumber
    participant Noti as 🔔 Notification
    participant Team as 👨‍🚒 Rescue Team App
    participant API as ⚙️ API Server

    Note over Noti,Team: WebSocket: MISSION_ASSIGNED
    Noti-->>Team: Thông báo có nhiệm vụ mới

    Team->>API: GET /api/timelines?status=ASSIGNED
    API-->>Team: Danh sách timeline được giao

    Team->>API: GET /api/timelines/:id
    API-->>Team: Chi tiết timeline (request info, mission info)

    rect rgb(200, 255, 200)
        Note over Team,API: ASSIGNED → EN_ROUTE
        Team->>API: PATCH /api/timelines/:id/accept
        API->>API: Validate: user thuộc team được gán
        API->>API: Validate: Mission không ABORTED/COMPLETED/PAUSED
        API->>API: Timeline = EN_ROUTE, startedAt = now()
        API->>API: Sync Mission = IN_PROGRESS
        API->>API: Sync Team = BUSY
        API-->>Team: 200 OK
        Note right of API: Emit MISSION_ACCEPTED → Coordinator
        Note right of API: Emit MISSION_APPROACHING → Citizen
    end

    rect rgb(200, 220, 255)
        Note over Team,API: EN_ROUTE → ON_SITE
        Note over Team: Di chuyển đến hiện trường
        Team->>API: PATCH /api/timelines/:id/arrive
        API->>API: Validate: user thuộc team được gán
        API->>API: Timeline = ON_SITE, arrivedAt = now()
        API-->>Team: 200 OK
        Note right of API: Citizen nhận "Team has arrived"
    end

    Note over Team: Đang thực hiện cứu hộ tại hiện trường...
```

### 4.2 Withdraw (Từ chối nhiệm vụ)

```mermaid
sequenceDiagram
    autonumber
    participant Team as 👨‍🚒 Rescue Team App
    participant API as ⚙️ API Server

    Note over Team: Nhận timeline (status = ASSIGNED)
    Note over Team: Quyết định từ chối

    Team->>API: PATCH /api/timelines/:id/withdraw
    Note right of Team: { withdrawalReason: "...", note?: "..." }

    API->>API: Validate: status phải là ASSIGNED
    API->>API: Validate: user thuộc team được gán
    API->>API: Validate: Mission không ABORTED/COMPLETED/PAUSED
    API->>API: Timeline = WITHDRAWN, completedAt = now()
    API->>API: Sync Team status (→ AVAILABLE nếu hết timeline active)
    API->>API: Sync Request status (→ VERIFIED nếu không còn timeline nào)
    API->>API: Sync Mission status

    API-->>Team: 200 OK

    Note right of API: Emit MISSION_WITHDRAWN → Coordinator
    Note over API: Coordinator sẽ reassign team khác
```

### 4.3 Complete / Partial (Hoàn thành nhiệm vụ)

> **Lưu ý:** Team phải cập nhật tiến độ (rescued/supply) qua `POST /api/mission-requests/:id/progress` **trước** khi gọi complete. API complete chỉ chuyển trạng thái timeline, không ghi rescuedCount.

```mermaid
sequenceDiagram
    autonumber
    participant Team as 👨‍🚒 Rescue Team App
    participant API as ⚙️ API Server

    Note over Team: Đang ở hiện trường (ON_SITE)
    Note over Team: Đã cập nhật progress qua<br/>POST /api/mission-requests/:id/progress

    alt Cứu hộ thành công hoàn toàn
        Team->>API: PATCH /api/timelines/:id/complete
        Note right of Team: { outcome: "COMPLETED", note?: "..." }

        API->>API: Validate: status phải là ON_SITE
        API->>API: Timeline = COMPLETED, completedAt = now()
        API->>API: Sync Request status (derive từ MissionRequest aggregate)
        API->>API: Sync Mission status
        API->>API: Sync Team → AVAILABLE
        API->>API: Emit MISSION_COMPLETED
        API-->>Team: 200 OK

    else Cứu hộ được một phần
        Team->>API: PATCH /api/timelines/:id/complete
        Note right of Team: { outcome: "PARTIAL", note?: "..." }

        API->>API: Timeline = PARTIAL, completedAt = now()
        API->>API: Sync Request status
        API->>API: Sync Mission status
        API->>API: Sync Team → AVAILABLE
        API-->>Team: 200 OK
        Note right of API: Coordinator tạo Timeline #2 cho team mới
    end
```

### 4.4 Fail (Thất bại)

```mermaid
sequenceDiagram
    autonumber
    participant Team as 👨‍🚒 Rescue Team App
    participant API as ⚙️ API Server

    Note over Team: Đang ở hiện trường (ON_SITE)<br/>Không thể thực hiện cứu hộ

    Team->>API: PATCH /api/timelines/:id/fail
    Note right of Team: { failureReason: "Nước quá sâu",<br/>note?: "..." }

    API->>API: Validate: status phải là ON_SITE
    API->>API: Validate: user thuộc team được gán
    API->>API: Timeline = FAILED, completedAt = now()
    API->>API: Sync Request → PARTIALLY_FULFILLED
    API->>API: Sync Mission status
    API->>API: Sync Team → AVAILABLE

    API-->>Team: 200 OK

    Note right of API: Emit MISSION_FAILED → Citizen + Coordinator
    Note over API: Coordinator quyết định retry hoặc cancel
```

### 4.5 Update Progress theo MissionRequest (TeamRequest-first)

```mermaid
sequenceDiagram
    autonumber
    participant Team as 👨‍🚒 Rescue Team App
    participant API as ⚙️ API Server

    Team->>API: POST /api/mission-requests/:id/progress
    Note right of Team: { peopleRescuedIncrement?, suppliesDelivered? }

    API->>API: Validate MissionRequest chưa terminal
    API->>API: Validate Mission không ABORTED/COMPLETED/PAUSED
    API->>API: Validate user thuộc Rescue Team và có teamId
    API->>API: Validate team có timeline trong mission
    API->>API: Validate team đã accept (có EN_ROUTE/ON_SITE)
    API->>API: Chặn nếu timeline context của team đã terminal
    API->>API: Validate payload hợp lệ và không over-delivery
    API->>API: Upsert TeamRequest contribution
    API->>API: Recompute aggregate -> MissionRequest
    API->>API: Sync Request status + Mission status

    API-->>Team: 200 OK
```

### 4.6 View Missions & Timelines (Xem nhiệm vụ)

```mermaid
sequenceDiagram
    autonumber
    participant Team as 👨‍🚒 Rescue Team App
    participant API as ⚙️ API Server

    Note over Team: Xem danh sách timeline của team mình

    Team->>API: GET /api/timelines
    Note right of Team: Query: ?status=ASSIGNED&page=1&limit=10
    API->>API: Auto-filter theo teamId của user hiện tại
    API-->>Team: { data: Timeline[], total, page, limit, totalPages }

    Team->>API: GET /api/timelines/:id
    API-->>Team: Timeline detail (populated mission, request, team)

    Team->>API: GET /api/requests/:id
    API-->>Team: Request detail (location, peopleCount, description...)
```

### 4.7 Notifications (Thông báo)

```mermaid
sequenceDiagram
    autonumber
    participant WS as 🔌 WebSocket
    participant Team as 👨‍🚒 Rescue Team App
    participant API as ⚙️ API Server

    Note over WS,Team: Kết nối WebSocket khi mở app
    WS-->>Team: CONNECTED (user info + unread count)

    WS-->>Team: MISSION_ASSIGNED - Có nhiệm vụ mới
    WS-->>Team: MISSION_COMPLETED - Nhiệm vụ hoàn thành
    WS-->>Team: MISSION_FAILED - Nhiệm vụ thất bại
    WS-->>Team: UNREAD_COUNT_UPDATE - Số thông báo chưa đọc

    Team->>API: GET /api/notifications
    API-->>Team: Danh sách thông báo

    Team->>API: GET /api/notifications/unread-count
    API-->>Team: { count: N }

    Team->>API: PATCH /api/notifications/:id/read
    API-->>Team: Đánh dấu đã đọc
```

---

## 5. Validation & Guards

Mỗi action của Rescue Team đều phải qua các validation sau:

| Check | Mô tả | HTTP Error |
|:------|:-------|:-----------|
| **Authentication** | User phải đăng nhập (JWT) | `401` |
| **Authorization** | User phải có role `Rescue Team` | `403` |
| **Team membership** | User phải thuộc team được gán trong timeline | `403` |
| **Mission status (timeline actions)** | `accept`, `arrive`, `complete`, `fail`, `withdraw` đều chặn khi mission ở `ABORTED`, `COMPLETED`, `PAUSED` | `400` |
| **Progress precondition** | Team phải `accept` trước khi update progress (cần timeline `EN_ROUTE`/`ON_SITE`) | `400` |
| **Progress terminal guard** | Không cho update progress khi timeline context của team đã terminal | `400` |
| **Timeline transition** | Status hiện tại phải hợp lệ cho action | `400` |
| **Supply over-delivery** | Tổng deliveredQty của supply vượt requestedQty trong MissionRequest snapshot | `422` |
| **Concurrent guard (timeline only)** | `transitionStatus` tránh race condition cho timeline actions | `409` |

---

## 6. Side Effects (Auto-sync)

Khi Rescue Team thực hiện action trên Timeline, hệ thống tự động sync:

| Action | Timeline | Request | Mission | Team | Events |
|:-------|:---------|:--------|:--------|:-----|:-------|
| `accept` | → EN_ROUTE | MissionRequest `PENDING` → `IN_PROGRESS`; Request → `IN_PROGRESS` | → IN_PROGRESS | → BUSY | MISSION_ACCEPTED, MISSION_APPROACHING |
| `arrive` | → ON_SITE | — | — | — | — |
| `complete` (full) | → COMPLETED | Sync Request từ MissionRequest aggregate (FULFILLED / PARTIALLY_FULFILLED) | → COMPLETED / PARTIAL | → AVAILABLE | MISSION_COMPLETED |
| `complete` (partial) | → PARTIAL | Sync Request từ MissionRequest aggregate | → PARTIAL | → AVAILABLE | — |
| `fail` | → FAILED | → PARTIALLY_FULFILLED | sync | → AVAILABLE | MISSION_FAILED |
| `withdraw` | → WITHDRAWN | → VERIFIED (nếu hết timeline) | sync | → AVAILABLE | MISSION_WITHDRAWN |
| `missionRequest progress update` | — | MissionRequest aggregate cập nhật từ TeamRequest; Request có thể thành PARTIALLY_FULFILLED khi all terminal nhưng còn thiếu target | sync PARTIAL/COMPLETED | — | — |

---

## 7. API Endpoints Summary

| # | Method | Endpoint | Action | Body |
|:--|:-------|:---------|:-------|:-----|
| 1 | `GET` | `/api/timelines` | Danh sách timeline (auto-filter theo team) | Query: `status`, `missionId`, `page`, `limit` |
| 2 | `GET` | `/api/timelines/:id` | Chi tiết timeline | — |
| 3 | `PATCH` | `/api/timelines/:id/accept` | Nhận nhiệm vụ (ASSIGNED → EN_ROUTE) | — |
| 4 | `PATCH` | `/api/timelines/:id/arrive` | Đã đến nơi (EN_ROUTE → ON_SITE) | — |
| 5 | `POST` | `/api/team-requests/:id/complete` | **[NEW]** Hoàn thành TeamRequest (recommended). Outcome tự động xác định dựa trên rescued count vs target. Auto-complete Timeline nếu là TeamRequest cuối cùng. | `{ note? }` |
| 6 | `PATCH` | `/api/timelines/:id/complete` | **[DEPRECATED]** Hoàn thành Timeline (cách cũ, vẫn hoạt động). Team phải cập nhật progress trước khi complete. | `{ outcome, note? }` |
| 7 | `PATCH` | `/api/timelines/:id/fail` | Thất bại (ON_SITE → FAILED) | `{ failureReason, note? }` |
| 8 | `PATCH` | `/api/timelines/:id/withdraw` | Từ chối (ASSIGNED → WITHDRAWN) | `{ withdrawalReason, note? }` |
| 9 | `GET` | `/api/requests` | Xem danh sách requests | Query: `status`, `type`, `page`, `limit` |
| 10 | `GET` | `/api/requests/:id` | Xem chi tiết request | — |
| 11 | `GET` | `/api/missions/:id/requests` | Xem requests trong mission (team view + supervisor filter) | Query: `teamId`, `page`, `limit` |
| 12 | `POST` | `/api/mission-requests/:id/progress` | Team cập nhật rescued/supply cho request | `{ peopleRescuedIncrement?, suppliesDelivered? }` |
| 13 | `GET` | `/api/team-requests` | Xem audit TeamRequest (team chỉ thấy team của mình) | Query: `missionId`, `missionRequestId`, `teamId`, `page`, `limit` |
| 14 | `GET` | `/api/team-requests/:id` | Xem chi tiết một TeamRequest | — |
| 15 | `GET` | `/api/notifications` | Danh sách thông báo | — |
| 16 | `PATCH` | `/api/notifications/:id/read` | Đánh dấu đã đọc | — |
| 17 | `GET` | `/api/notifications/unread-count` | Số thông báo chưa đọc | — |

---

## 8. TeamRequest Audit Model (Option A)

`TeamRequest` là join entity giữa Team và MissionRequest để xử lý quan hệ nhiều-nhiều có audit rõ ràng.

### 8.1 Option A pre-create matrix

- Khi mission start thành công, hệ thống tạo trước TeamRequest cho mọi cặp:
    - mỗi `MissionRequest` trong mission
    - mỗi team có `Timeline` thuộc mission ở trạng thái `ASSIGNED`
- Dùng unique key `(missionRequestId, teamId)` để chống duplicate khi retry.

### 8.2 TeamRequest fields chính

- `missionId`
- `missionRequestId`
- `teamId`
- `rescuedCountTotal`
- `suppliesDeliveredTotal[]`
- `lastUpdatedAt`
- `lastUpdatedBy` (optional)
- **[NEW]** `completedAt` — Thời điểm team complete TeamRequest này
- **[NEW]** `completedBy` — User ID của người complete
- **[NEW]** `outcome` — `COMPLETED` hoặc `PARTIAL` (auto-determined)
- **[NEW]** `note` — Ghi chú khi complete

### 8.3 TeamRequest Complete Flow (NEW - Recommended)

**Endpoint:** `POST /api/team-requests/:id/complete`

**Luồng:**
1. Team gọi progress endpoint để cập nhật `rescuedCountTotal` và `suppliesDeliveredTotal`
2. Team gọi complete endpoint cho từng TeamRequest riêng biệt
3. Hệ thống tự động xác định outcome:
   - `rescuedCountTotal >= peopleNeeded` → `COMPLETED`
   - `rescuedCountTotal < peopleNeeded` → `PARTIAL`
4. Đánh dấu TeamRequest với `completedAt`, `completedBy`, `outcome`, `note`
5. Kiểm tra xem còn TeamRequest nào chưa complete của team trong mission không
6. Nếu đây là TeamRequest cuối cùng → tự động complete Timeline với outcome tương ứng
7. Sync MissionRequest/Request/Mission statuses

**Validations:**
- TeamRequest chưa được complete trước đó
- User phải thuộc team của TeamRequest
- Timeline phải ở trạng thái `ON_SITE`
- Team phải có Timeline trong mission

**Ưu điểm so với Timeline complete:**
- Outcome tự động xác định dựa trên data thực tế
- Team complete từng request riêng biệt (granular control)
- Timeline tự động complete khi tất cả TeamRequest xong
- Audit rõ ràng hơn (biết team complete request nào, khi nào)
- Multi-team scenario: team khác vẫn có thể tiếp tục với TeamRequest riêng của họ

### 8.4 Derivation rule

- Team ghi contribution vào TeamRequest.
- MissionRequest aggregate (`peopleRescued`, `suppliesDelivered`, `fulfillmentPercent`) = tổng contribution của tất cả TeamRequest cùng `missionRequestId`.
- TeamRequest không có state machine riêng; trạng thái vận hành dùng `Timeline.status` làm source of truth.
- Progress endpoint dùng path chuẩn: `POST /api/mission-requests/:id/progress`.
- Progress không cho phép trước `accept`; team cần đang có timeline `EN_ROUTE`/`ON_SITE` trong mission.
- Nếu over-delivery supply, API trả `422 SUPPLY_OVER_DELIVERY`.
- **Auto-close behavior**:
    - Khi MissionRequest đạt 100% fulfillment → tự động chuyển sang `CLOSED` (không qua `FULFILLED`).
    - Emit event `REQUEST_AUTO_CLOSED` để notify Coordinator và Citizen.
    - Team khác cố update progress trên request đã `CLOSED` → nhận `200 OK` với message `"Mission already completed"`, không ghi data.
- Request final status:
    - `FULFILLED` nếu tất cả MissionRequest đều `CLOSED` và đủ target.
    - `PARTIALLY_FULFILLED` nếu kết thúc mà chưa đủ target.

---

## References

- [Rescue_flow_2.2.md](./Rescue_flow_2.2.md) — Rescue Flow chính thức
- [Relief_flow_1.1.md](./Relief_flow_1.1.md) — Relief Flow (cùng Timeline lifecycle)
- [rules.md](./rules.md) — Unified Derivation Rules
