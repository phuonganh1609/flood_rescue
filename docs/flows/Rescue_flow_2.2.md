# Rescue Flow 2.2 (Unified)

> Phiên bản Unified từ [Rescue_flow_2.1.md](./Rescue_flow_2.1.md)
>
> **Changes v2.2**:
>
> - Áp dụng Unified States từ [rules.md](./rules.md).
> - Request Status: `ACCEPTED` → `VERIFIED`.
> - Timeline Status: `ASSIGNED` (initial).
> - Hỗ trợ **Multi-timeline**: 1 Request có thể được cứu bởi nhiều Team cùng lúc.

---

## Flowchart for Rescue Flow (Unified)

```mermaid
flowchart TD
    A[Citizen submits rescue request] --> B[Create Request]
    B --> C[Request status = SUBMITTED]

    C --> CANCEL_CHECK{Citizen cancel?}
    CANCEL_CHECK -- Yes --> CITIZEN_CANCELLED[Request status = CANCELLED<br/>reason: USER_CANCELLED]
    CITIZEN_CANCELLED --> END_CANCEL[End]

    CANCEL_CHECK -- No --> D{Coordinator verifies?}

    D -- No --> E[Request status = REJECTED]
    E --> F[Notify Citizen]
    F --> END1[End]

    D -- Yes --> G[Request status = VERIFIED]

    G --> H[Create Mission<br/>status = PLANNED]

    H --> I[Coordinator assigns Team A]
    I --> J[Create Timeline #1<br/>status = ASSIGNED]
    J --> K[Request status = IN_PROGRESS]
    J --> L[Notify Team A & Citizen]

    L --> M{Team accepts?}

    M -- No --> WITHDRAWN[Timeline #1 status = WITHDRAWN]
    WITHDRAWN --> I2[Coordinator assigns Team B / Reassign]

    M -- Yes --> N[Timeline #1 status = EN_ROUTE<br/>Mission status = IN_PROGRESS]
    N --> O[Team arrives]
    O --> P[Timeline #1 status = ON_SITE]

    P --> PAUSE_CHECK{Coordinator pause?}
    PAUSE_CHECK -- Yes --> PAUSED[Mission status = PAUSED]
    PAUSED --> RESUME{Coordinator resume?}
    RESUME -- Yes --> P
    RESUME -- No --> ABORT[Mission status = ABORTED]
    ABORT --> END_ABORT[End]

    PAUSE_CHECK -- No --> Q{Mission outcome?}

    Q -- Success (All Rescued) --> R[Timeline #1 status = COMPLETED]
    R --> S[Submit rescue report]
    S --> T[Request Check: Total >= Need?]

    T -- Yes --> U[Request status = FULFILLED]
    U --> V[Coordinator Closes Request<br/>status = CLOSED]
    V --> END2[End]

    T -- No --> W[Request status = PARTIALLY_FULFILLED]
    W --> I3["Create Timeline #2 (More teams)"]

    Q -- Failed --> X[Timeline #1 status = FAILED]
    X --> Y[Submit failure report]
    Y --> Z{Retry?}
    Z -- Yes --> I3
    Z -- No --> CANCEL_REQ[Request status = CANCELLED]
```

---

## Sequence Diagram for Rescue Flow (Unified)

```mermaid
sequenceDiagram
    autonumber

    participant Citizen as Citizen App
    participant Coordinator as Coordinator Dashboard
    participant Team as Rescue Team App
    participant API as API Server
    participant Inv as Inventory
    participant Noti as Notification Service

    %% -----------------------------
    %% Submit rescue request
    %% -----------------------------
    Citizen ->> API: POST /requests
    API ->> API: create Request (status=SUBMITTED)
    API ->> Noti: emit RequestSubmitted
    Noti ->> Citizen: Confirmation notification

    %% -----------------------------
    %% Verify request
    %% -----------------------------
    Coordinator ->> API: GET /requests?status=SUBMITTED
    Coordinator ->> API: PATCH /requests/{id}/verify

    alt Request rejected
        API ->> API: Request = REJECTED
        API ->> Noti: emit RequestRejected
    else Request verified
        API ->> API: Request = VERIFIED
        Note right of API: Ready for planning
    end

    %% -----------------------------
    %% Create Mission & Assign + Plan Supplies
    %% -----------------------------
    Coordinator ->> API: POST /missions (requestId)
    API ->> API: create Mission (status=PLANNED)

    Coordinator ->> API: PATCH /missions/{id}/assign (teamId)
    Note over API: Create Timeline #1:<br/>status=ASSIGNED<br/>assignedAt=now()
    API ->> API: Request = IN_PROGRESS
    API ->> Noti: emit MissionAssigned
    Noti ->> Team: New mission assigned

    %% Supply Planning Phase
    Note over Coordinator,Inv: Supply Planning Phase
    Coordinator ->> API: POST /timelines/{id}/supplies/plan
    Note right of Coordinator: [{supplyId, warehouseId, plannedQty}]
    API ->> Inv: Reserve quantity
    Inv -->> API: reservedQuantity += plannedQty

    %% -----------------------------
    %% Team Execution (GPS Tracking + Supply Carry)
    %% -----------------------------
    %% Supply Carrying Phase
    Note over Team,Inv: Supply Carrying Phase
    Team ->> API: PATCH /timelines/{id}/accept
    Note right of Team: {supplies: [{supplyId, carriedQty}]}
    API ->> Inv: Deduct inventory
    Inv -->> API: quantity -= carriedQty, reservedQuantity -= plannedQty
    API ->> API: Timeline = EN_ROUTE, Mission = IN_PROGRESS
    API ->> Citizen: Push "Team is on the way"

    loop GPS Updates
        Team ->> API: POST /tracking/update
        API ->> Citizen: Realtime location
    end

    Team ->> API: PATCH /timelines/{id}/arrive
    API ->> API: Timeline = ON_SITE
    API ->> Citizen: Push "Team has arrived"

    %% -----------------------------
    %% Completion & Supply Report
    %% -----------------------------
    %% Supply Distribution & Return Phase
    Note over Team,Inv: Supply Distribution & Return Phase
    alt Rescue Full Success
        Team ->> API: PATCH /timelines/{id}/complete
        Note right of Team: {rescued: 5, supplies: [{distributedQty, returnedQty}]}
        API ->> API: Timeline = COMPLETED
        API ->> Inv: Return unused: quantity += returnedQty
        API ->> API: Request = FULFILLED
        API ->> Noti: emit RescueCompleted
        Noti ->> Citizen: All rescued!

        Coordinator ->> API: PATCH /requests/{id}/close
        API ->> API: Request = CLOSED
    else Rescue Partial / Failed
        Team ->> API: PATCH /timelines/{id}/complete (or fail)
        Note over Team: Report: Rescued 2/5, supplies used + returned
        API ->> API: Timeline = PARTIAL
        API ->> Inv: Return unused supplies
        API ->> API: Request = PARTIALLY_FULFILLED

        Note over Coordinator: Need more teams for remaining 3 people
        Coordinator ->> API: PATCH /missions/{id}/assign (newTeamId)
        Note over API: Create Timeline #2
    end
```

---

## State Diagrams (Unified)

### 1. Request State Diagram

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED

    SUBMITTED --> VERIFIED : coordinator verifies OK
    SUBMITTED --> REJECTED : coordinator rejects
    SUBMITTED --> CANCELLED : citizen cancels

    VERIFIED --> IN_PROGRESS : first timeline created

    IN_PROGRESS --> PARTIALLY_FULFILLED : timeline completed (partial)
    IN_PROGRESS --> FULFILLED : timeline completed (full)

    PARTIALLY_FULFILLED --> IN_PROGRESS : new timeline created
    PARTIALLY_FULFILLED --> CLOSED : coordinator closes

    FULFILLED --> CLOSED

    REJECTED --> [*]
    CANCELLED --> [*]
    CLOSED --> [*]
```

### 2. Timeline State Diagram

```mermaid
stateDiagram-v2
    [*] --> ASSIGNED

    ASSIGNED --> EN_ROUTE : team accepts
    ASSIGNED --> WITHDRAWN : team rejects

    EN_ROUTE --> ON_SITE : team arrives (GPS match)

    ON_SITE --> COMPLETED : rescue success (full)
    ON_SITE --> PARTIAL : rescue success (partial)
    ON_SITE --> FAILED : rescue failed

    ASSIGNED --> CANCELLED : coordinator cancels

    COMPLETED --> [*]
    PARTIAL --> [*]
    FAILED --> [*]
    WITHDRAWN --> [*]
    CANCELLED --> [*]
```

### 3. Mission State Diagram

```mermaid
stateDiagram-v2
    [*] --> PLANNED

    PLANNED --> IN_PROGRESS : first timeline starts

    IN_PROGRESS --> PAUSED : coordinator pauses
    PAUSED --> IN_PROGRESS : coordinator resumes

    IN_PROGRESS --> PARTIAL : timeline completed (partial)
    PARTIAL --> IN_PROGRESS : new timeline created

    IN_PROGRESS --> COMPLETED : all requests fulfilled
    PARTIAL --> COMPLETED : remaining requests closed

    IN_PROGRESS --> ABORTED : coordinator aborts
    PAUSED --> ABORTED : coordinator aborts

    COMPLETED --> [*]
    ABORTED --> [*]
```

---

## Status Definitions

_(Tham chiếu đầy đủ xem tại [rules.md](./rules.md))_

### Request Status (Unified)

| Status                | Meaning                               |
| :-------------------- | :------------------------------------ |
| `VERIFIED`            | Đã xác minh, chờ lên Mission          |
| `IN_PROGRESS`         | Đang có team xử lý                    |
| `PARTIALLY_FULFILLED` | Đã cứu được một số, vẫn còn người kẹt |
| `FULFILLED`           | Đã cứu hết, chờ đóng hồ sơ            |
| `CLOSED`              | Hồ sơ đóng hoàn tất                   |

### Timeline Status (Unified)

| Status      | Meaning                       |
| :---------- | :---------------------------- |
| `ASSIGNED`  | Đã gán team                   |
| `EN_ROUTE`  | Team đang đi (GPS)            |
| `ON_SITE`   | Team đã đến & đang cứu hộ     |
| `COMPLETED` | Xong nhiệm vụ timeline này    |
| `PARTIAL`   | Xong nhưng không cứu hết được |

---

## Request Priority Rules

Khi Coordinator có nhiều Requests cần xử lý cùng lúc, ưu tiên theo thứ tự:

1. **Mức độ khẩn cấp (priority)** - _Coordinator gắn flag thủ công khi verify_
   - `CRITICAL` (High): Nguy hiểm tính mạng ngay lập tức
   - `HIGH` (Medium): Nguy cơ cao, chưa khẩn cấp tức thì
   - `NORMAL` (Low): Hỗ trợ khi có điều kiện

2. **Số người bị ảnh hưởng (peopleCount)**
   - Ưu tiên request có nhiều người hơn

3. **Thời gian tạo yêu cầu (createdAt)**
   - First-come-first-served nếu priority và peopleCount bằng nhau

---

## Validation & Duplicate Detection

### Request Creation Validation

**Rule:** Một Citizen chỉ được tạo Request mới khi request hiện tại đã ở terminal states (`CLOSED` hoặc `CANCELLED`).

```mermaid
sequenceDiagram
    participant Citizen
    participant API

    Citizen->>API: POST /requests
    API->>API: Check active requests

    alt Has active request (not CLOSED/CANCELLED)
        API-->>Citizen: 400 Bad Request - Already has active request
    else No active request
        API->>API: Create Request (status=SUBMITTED)
        API-->>Citizen: 201 Created
    end
```

### Duplicate Detection

Coordinator đánh dấu duplicate thủ công. _Future: Hệ thống đề xuất duplicate dựa trên location + time + citizen._

```mermaid
sequenceDiagram
    participant Coordinator
    participant API
    participant Noti

    Coordinator->>API: PATCH /requests/{id}/duplicate
    Note right of Coordinator: {duplicatedOfRequestId}

    API->>API: isDuplicated = true
    API->>API: duplicatedOfRequestId = originalId
    Note right of API: Request giữ status hiện tại
    API->>Noti: emit RequestMarkedDuplicate
    API-->>Coordinator: 200 OK
```

> **Note:** Request được đánh dấu duplicate vẫn được xử lý bình thường và có thể chuyển qua các status như request thông thường, nhưng sẽ được link với request gốc để tracking.

### Location Verification

Coordinator có thể cập nhật location và đánh dấu verified.

```mermaid
sequenceDiagram
    participant Coordinator
    participant API

    Coordinator->>API: PATCH /requests/{id}/location
    Note right of Coordinator: {location, isLocationVerified}

    API->>API: Update location
    API->>API: isLocationVerified = true
    API-->>Coordinator: 200 OK
```

---

## API Endpoints Summary

| Method  | Endpoint                   | Actor               | Description                                       |
| :------ | :------------------------- | :------------------ | :------------------------------------------------ |
| `POST`  | `/requests`                | Citizen/Coordinator | Create request (validates 1 active request limit) |
| `PATCH` | `/requests/{id}/verify`    | Coordinator         | Verify request → `VERIFIED` / `REJECTED`          |
| `PATCH` | `/requests/{id}/close`     | Coordinator         | Close valid request → `CLOSED`                    |
| `PATCH` | `/requests/{id}/duplicate` | Coordinator         | Mark as duplicate                                 |
| `PATCH` | `/requests/{id}/location`  | Coordinator         | Update location & verify                          |
| `PATCH` | `/missions/{id}/assign`    | Coordinator         | Assign team → Create new Timeline (`ASSIGNED`)    |
| `PATCH` | `/timelines/{id}/accept`   | Team                | Accept → `EN_ROUTE`                               |
| `PATCH` | `/timelines/{id}/arrive`   | Team                | Arrive → `ON_SITE`                                |
| `PATCH` | `/timelines/{id}/complete` | Team                | Finish → `COMPLETED` / `PARTIAL`                  |

---

## References

- [rules.md](./rules.md) - Unified Derivation Rules (Single Source of Truth)
- [Rescue_flow_2.1.md](./Rescue_flow_2.1.md) - Previous version (Legacy)

---

## Phase 1 Implementation Notes (2026-02-15)

- Timeline runtime status canon in backend: `ASSIGNED`, `EN_ROUTE`, `ON_SITE`, `COMPLETED`, `PARTIAL`, `FAILED`, `WITHDRAWN`, `CANCELLED`.
- Timeline APIs implemented: `GET /api/timelines`, `GET /api/timelines/{id}`, and actions `accept/arrive/complete/fail/withdraw/cancel`.
- Notification trigger points:
  - `MISSION_ASSIGNED` on `PATCH /api/missions/{id}/assign`
  - `MISSION_ACCEPTED` + `MISSION_APPROACHING` on timeline `accept` (`EN_ROUTE`)
  - `MISSION_COMPLETED` on timeline `complete` (or when request becomes fulfilled)
  - `MISSION_FAILED` on timeline `fail`
- Phase 1 scope excludes GPS `Position` and TimelineSupply workflow.
