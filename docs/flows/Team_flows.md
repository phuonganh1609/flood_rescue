# Rescue Team Flows

> Tổng hợp tất cả các luồng dành cho actor **Rescue Team**.
>
> Dựa trên [Rescue_flow_2.2.md](./Rescue_flow_2.2.md), [Relief_flow_1.1.md](./Relief_flow_1.1.md) và source code hiện tại.

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

    OUTCOME -- Thành công hết --> COMPLETE[PATCH /timelines/:id/complete<br/>outcome=COMPLETED<br/>rescuedCount=N]
    OUTCOME -- Cứu được một phần --> PARTIAL_COMP[PATCH /timelines/:id/complete<br/>outcome=PARTIAL<br/>rescuedCount=M]
    OUTCOME -- Thất bại --> FAIL_ACT[PATCH /timelines/:id/fail<br/>failureReason=...]

    COMPLETE --> CHECK{rescuedCount >= peopleCount?}
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

    ASSIGNED --> EN_ROUTE : 🟢 Team accept<br/>PATCH /timelines/:id/accept
    ASSIGNED --> WITHDRAWN : 🔴 Team từ chối<br/>PATCH /timelines/:id/withdraw

    EN_ROUTE --> ON_SITE : 📍 Team arrives<br/>PATCH /timelines/:id/arrive

    ON_SITE --> COMPLETED : ✅ Cứu hộ thành công<br/>PATCH /timelines/:id/complete<br/>{outcome: COMPLETED}
    ON_SITE --> PARTIAL : ⚠️ Cứu được một phần<br/>PATCH /timelines/:id/complete<br/>{outcome: PARTIAL}
    ON_SITE --> FAILED : ❌ Thất bại<br/>PATCH /timelines/:id/fail

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

```mermaid
sequenceDiagram
    autonumber
    participant Team as 👨‍🚒 Rescue Team App
    participant API as ⚙️ API Server

    Note over Team: Đang ở hiện trường (ON_SITE)

    alt Cứu hộ thành công hoàn toàn
        Team->>API: PATCH /api/timelines/:id/complete
        Note right of Team: { outcome: "COMPLETED",<br/>rescuedCount: 5, note?: "..." }

        API->>API: Validate: status phải là ON_SITE
        API->>API: Timeline = COMPLETED, completedAt = now()
        API->>API: Tính tổng rescuedCount tất cả timeline

        alt Tổng rescued >= peopleCount
            API->>API: Request = FULFILLED
            Note right of API: Emit MISSION_COMPLETED → Citizen
        else Tổng rescued < peopleCount
            API->>API: Request = PARTIALLY_FULFILLED
            Note right of API: Coordinator sẽ tạo Timeline mới
        end

        API->>API: Sync Mission status
        API->>API: Sync Team → AVAILABLE
        API-->>Team: 200 OK

    else Cứu hộ được một phần
        Team->>API: PATCH /api/timelines/:id/complete
        Note right of Team: { outcome: "PARTIAL",<br/>rescuedCount: 2, note?: "..." }

        API->>API: Timeline = PARTIAL, completedAt = now()
        API->>API: Request = PARTIALLY_FULFILLED
        API->>API: Sync Mission → PARTIAL
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

### 4.5 View Missions & Timelines (Xem nhiệm vụ)

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

### 4.6 Notifications (Thông báo)

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
| **Mission status** | Mission không được ở `ABORTED`, `COMPLETED`, `PAUSED` | `400` |
| **Timeline transition** | Status hiện tại phải hợp lệ cho action | `400` |
| **Concurrent guard** | Sử dụng `transitionStatus` để tránh race condition | `409` |

---

## 6. Side Effects (Auto-sync)

Khi Rescue Team thực hiện action trên Timeline, hệ thống tự động sync:

| Action | Timeline | Request | Mission | Team | Events |
|:-------|:---------|:--------|:--------|:-----|:-------|
| `accept` | → EN_ROUTE | → IN_PROGRESS | → IN_PROGRESS | → BUSY | MISSION_ACCEPTED, MISSION_APPROACHING |
| `arrive` | → ON_SITE | — | — | — | — |
| `complete` (full) | → COMPLETED | → FULFILLED (nếu đủ) | → COMPLETED / PARTIAL | → AVAILABLE | MISSION_COMPLETED |
| `complete` (partial) | → PARTIAL | → PARTIALLY_FULFILLED | → PARTIAL | → AVAILABLE | — |
| `fail` | → FAILED | → PARTIALLY_FULFILLED | sync | → AVAILABLE | MISSION_FAILED |
| `withdraw` | → WITHDRAWN | → VERIFIED (nếu hết timeline) | sync | → AVAILABLE | MISSION_WITHDRAWN |

---

## 7. API Endpoints Summary

| # | Method | Endpoint | Action | Body |
|:--|:-------|:---------|:-------|:-----|
| 1 | `GET` | `/api/timelines` | Danh sách timeline (auto-filter theo team) | Query: `status`, `missionId`, `page`, `limit` |
| 2 | `GET` | `/api/timelines/:id` | Chi tiết timeline | — |
| 3 | `PATCH` | `/api/timelines/:id/accept` | Nhận nhiệm vụ (ASSIGNED → EN_ROUTE) | — |
| 4 | `PATCH` | `/api/timelines/:id/arrive` | Đã đến nơi (EN_ROUTE → ON_SITE) | — |
| 5 | `PATCH` | `/api/timelines/:id/complete` | Hoàn thành (ON_SITE → COMPLETED/PARTIAL) | `{ outcome, rescuedCount, note? }` |
| 6 | `PATCH` | `/api/timelines/:id/fail` | Thất bại (ON_SITE → FAILED) | `{ failureReason, note? }` |
| 7 | `PATCH` | `/api/timelines/:id/withdraw` | Từ chối (ASSIGNED → WITHDRAWN) | `{ withdrawalReason, note? }` |
| 8 | `GET` | `/api/requests` | Xem danh sách requests | Query: `status`, `type`, `page`, `limit` |
| 9 | `GET` | `/api/requests/:id` | Xem chi tiết request | — |
| 10 | `GET` | `/api/notifications` | Danh sách thông báo | — |
| 11 | `PATCH` | `/api/notifications/:id/read` | Đánh dấu đã đọc | — |
| 12 | `GET` | `/api/notifications/unread-count` | Số thông báo chưa đọc | — |

---

## References

- [Rescue_flow_2.2.md](./Rescue_flow_2.2.md) — Rescue Flow chính thức
- [Relief_flow_1.1.md](./Relief_flow_1.1.md) — Relief Flow (cùng Timeline lifecycle)
- [rules.md](./rules.md) — Unified Derivation Rules
