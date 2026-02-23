# Derivation Logic & Status Sync

> Tài liệu mô tả logic tự động cập nhật status (Derivation Logic) của các module `Request`, `Mission`, `Team` dựa trên trạng thái của `Timeline`.
>
> **Source of Truth:** `Timeline` status.

---

## 1. Tổng quan quy trình Sync

Mọi thay đổi trạng thái của `Timeline` (Assign, Accept, Arrive, Complete, Fail, Withdraw, Cancel) đều kích hoạt `syncAllForTimeline(timeline)`.

```mermaid
flowchart TD
    T[Timeline Status Change] --> SYNC{syncAllForTimeline}

    SYNC --> REQ[syncRequestStatus]
    SYNC --> MIS[syncMissionStatus]
    SYNC --> TEAM[syncTeamStatus]

    REQ --> REQ_DB[(Request DB)]
    MIS --> MIS_DB[(Mission DB)]
    TEAM --> TEAM_DB[(Team DB)]
```

---

## 2. Request Status Derivation

**Logic:** Request status được tính toán dựa trên tập hợp tất cả Timelines thuộc Request đó.

```mermaid
flowchart TD
    Start([Start Sync Request]) --> CheckTerminal{Is Request CLOSED<br/>CANCELLED / REJECTED?}
    CheckTerminal -- Yes --> End([Keep Current Status])

    CheckTerminal -- No --> GetTimelines[Get All Timelines of Request]
    GetTimelines --> CheckActive{"Any Active Timeline?<br/>(ASSIGNED, EN_ROUTE, ON_SITE)"}

    CheckActive -- Yes --> SetInProgress[Status = IN_PROGRESS]

    CheckActive -- No --> CheckCompleted{Any Timeline COMPLETED<br/>OR Total Rescued >= PeopleCount?}
    CheckCompleted -- Yes --> SetFulfilled[Status = FULFILLED]

    CheckCompleted -- No --> CheckExecution{"Any Execution?<br/>(Started/Arrived/PARTIAL/FAILED)"}
    CheckExecution -- Yes --> SetPartial[Status = PARTIALLY_FULFILLED]

    CheckExecution -- No --> SetVerified["Status = VERIFIED<br/>(Revert if all withdrawn/cancelled)"]

    SetInProgress --> UpdateDB[(Update DB)]
    SetFulfilled --> UpdateDB
    SetPartial --> UpdateDB
    SetVerified --> UpdateDB
```

**Chi tiết rules:**

1. **IN_PROGRESS**: Nếu có bất kỳ timeline nào đang hoạt động (`ASSIGNED`, `EN_ROUTE`, `ON_SITE`).
2. **FULFILLED**: Nếu không còn timeline hoạt động VÀ (có timeline `COMPLETED` HOẶC tổng số người cứu >= `peopleCount`).
3. **PARTIALLY_FULFILLED**: Nếu không thỏa mãn trên nhưng đã từng có timeline chạy (có `startedAt`, `arrivedAt` hoặc status `PARTIAL`, `FAILED`, `COMPLETED`).
4. **VERIFIED**: Nếu chưa có timeline nào chạy (ví dụ: tất cả đều `WITHDRAWN` hoặc `CANCELLED` ngay từ đầu). Status quay về `VERIFIED` để chờ assign lại.

---

## 3. Mission Status Derivation

**Logic:** Mission status phản ánh trạng thái tổng hợp của các timelines và requests bên trong nó.

```mermaid
flowchart TD
    Start([Start Sync Mission]) --> CheckManual{"Is Mission<br/>PAUSED or ABORTED?"}
    CheckManual -- Yes --> End([Keep Current Status])

    CheckManual -- No --> GetTimelines[Get All Timelines of Mission]
    GetTimelines --> CheckEmpty{No Timelines?}
    CheckEmpty -- Yes --> SetPlanned[Status = PLANNED]

    CheckEmpty -- No --> CheckExecuting{"Any Executing?<br/>(EN_ROUTE, ON_SITE)"}
    CheckExecuting -- Yes --> SetInProgress[Status = IN_PROGRESS]

    CheckExecuting -- No --> CheckAssigned{"Any Assigned?<br/>(ASSIGNED)"}
    CheckAssigned -- Yes --> SetPlanned2[Status = PLANNED]

    CheckAssigned -- No --> CheckRequests{"All Related Requests<br/>FULFILLED / CLOSED?"}
    CheckRequests -- Yes --> SetCompleted[Status = COMPLETED]
    CheckRequests -- No --> SetPartial[Status = PARTIAL]

    SetPlanned --> UpdateDB[(Update DB)]
    SetInProgress --> UpdateDB
    SetPlanned2 --> UpdateDB
    SetCompleted --> UpdateDB
    SetPartial --> UpdateDB
```

**Chi tiết rules:**

1. **PAUSED / ABORTED**: Giữ nguyên (là manual states).
2. **IN_PROGRESS**: Nếu có timeline đang thực thi (`EN_ROUTE`, `ON_SITE`).
3. **PLANNED**:
   - Nếu chưa có timeline nào.
   - HOẶC chỉ có timeline `ASSIGNED` (chưa team nào accept).
4. **COMPLETED**: Nếu không còn timeline active VÀ tất cả Requests liên quan đều `FULFILLED` hoặc `CLOSED`.
5. **PARTIAL**: Nếu không còn timeline active NHƯNG vẫn còn Request chưa xong (cần tạo timeline mới).

---

## 4. Team Status Derivation

**Logic:** Team status đơn giản dựa trên việc có timeline active nào không.

```mermaid
flowchart TD
    Start([Start Sync Team]) --> CountActive["Count Active Timelines<br/>(ASSIGNED, EN_ROUTE, ON_SITE)"]

    CountActive --> CheckCount{Count > 0?}
    CheckCount -- Yes --> SetBusy[Status = BUSY]
    CheckCount -- No --> SetAvailable[Status = AVAILABLE]

    SetBusy --> UpdateDB[(Update DB)]
    SetAvailable --> UpdateDB
```

**Chi tiết rules:**

1. **BUSY**: Đang có ít nhất 1 timeline `ASSIGNED`, `EN_ROUTE`, hoặc `ON_SITE`.
2. **AVAILABLE**: Không có timeline nào ở trạng thái active.
