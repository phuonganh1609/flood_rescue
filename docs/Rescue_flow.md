## Sequence Diagram của luồng rescue

```mermaid
sequenceDiagram
    autonumber

    participant CitizenApp as Citizen App
    participant CoordinatorUI as Coordinator Dashboard
    participant TeamApp as Rescue Team App
    participant API as API Server
    participant Noti as Notification Service

    %% --- Submit Rescue Request ---
    CitizenApp ->> API: POST /api/requests
    API ->> API: Validate & create request
    API ->> API: status = SUBMITTED
    API ->> Noti: emit RequestSubmitted
    Noti ->> CitizenApp: Push/SMS confirmation

    %% --- Coordinator verifies request ---
    CoordinatorUI ->> API: GET /api/requests?status=SUBMITTED
    CoordinatorUI ->> API: PATCH /api/requests/{id}/verify

    alt Invalid request
        API ->> API: status = REJECTED
        API ->> Noti: emit RequestRejected
        Noti ->> CitizenApp: Rejection notification
    else Valid request
        CoordinatorUI ->> API: PATCH /api/requests/{id}/priority
        CoordinatorUI ->> API: POST /api/missions
        API ->> API: status = ASSIGNED
        API ->> Noti: emit MissionAssigned
        Noti ->> CitizenApp: Team assigned
        Noti ->> TeamApp: New mission
    end

    %% --- Rescue team execution ---
    TeamApp ->> API: GET /api/missions?assigned=true
    TeamApp ->> API: PATCH /api/missions/{id}/accept
    API ->> API: status = ACCEPTED

    TeamApp ->> API: PATCH /api/missions/{id}/status (APPROACHING)
    API ->> CoordinatorUI: Push real-time update

    %% --- Mission outcome ---
    alt Rescue success
        TeamApp ->> API: PATCH /api/missions/{id}/status (RESCUED)
        TeamApp ->> API: POST /api/missions/{id}/report
        CitizenApp ->> API: POST /api/requests/{id}/confirm-safe
        API ->> API: status = COMPLETED
        API ->> Noti: emit MissionCompleted
    else Rescue failed
        TeamApp ->> API: PATCH /api/missions/{id}/status (FAILED)
        TeamApp ->> API: POST /api/missions/{id}/report
        API ->> Noti: emit MissionFailed

        CoordinatorUI ->> API: POST /api/missions/{id}/reassign
        API ->> Noti: emit MissionReassigned
        Noti ->> TeamApp: New assignment
    end
```

## State Diagram của request

```mermaid
stateDiagram-v2
    [*] --> Submitted

    Submitted --> Accepted : verify ok
    Submitted --> Rejected : verify fail

    Accepted --> In_Progress : mission assigned

    In_Progress --> Completed : mission success
    In_Progress --> Cancelled : mission failed\n(no reassignment)

    Completed --> [*]
    Rejected --> [*]
    Cancelled --> [*]
```

🟦 Submitted
Ai set: Citizen / System
Ý nghĩa:
Yêu cầu đã được gửi, chưa qua xác minh
Cho phép:
Coordinator xem
Verify / Reject
Không cho phép:
Assign team
Tạo mission

🟨 Accepted
Ai set: Coordinator
Ý nghĩa:
Request hợp lệ, được chấp nhận về mặt nghiệp vụ
⚠️ Chưa có team
Cho phép:
Set priority
Assign rescue team
Không cho phép:
Rescue team thao tác
👉 Accepted = business approval, không phải execution

🟥 Rejected
Ai set: Coordinator
Ý nghĩa:
Request không hợp lệ / spam / sai thông tin
Đặc điểm:
Trạng thái kết thúc (terminal)
Không thể reopen

🟦 In Progress
Ai set: System (khi mission được assign)
Ý nghĩa:
Đã có ít nhất 1 mission active xử lý request
Trigger vào trạng thái này:
Mission được tạo + assign cho team
Cho phép:
Theo dõi real-time
Reassign mission
Update mission status

🟩 Completed
Ai set: System
Ý nghĩa:
Request đã được xử lý thành công
(Citizen xác nhận an toàn hoặc mission rescued)
Điều kiện bắt buộc:
Mission = RESCUED
Citizen confirm safe (nếu có)
Terminal state

⚫ Cancelled
Ai set: System / Coordinator
Ý nghĩa:
Request không thể hoàn thành dù đã bắt đầu xử lý
Ví dụ lý do:
Điều kiện quá nguy hiểm
Không thể tiếp cận
Mission FAILED và không reassign

⚠️ Khác Rejected ở chỗ:
Rejected → chưa từng xử lý
Cancelled → đã xử lý nhưng thất bại

### Validation rules:

- Submitted chỉ có thể chuyển sang Accepted hoặc Rejected
- Accepted bắt buộc phải chuyển sang In Progress thông qua assign mission
- In Progress chỉ kết thúc bằng Completed hoặc Cancelled
- Không được phép update ngược trạng thái
