# Giải Thích 8 Entity Cốt Lõi Trong Hệ Thống Cứu Hộ Lũ Lụt

Hệ thống xoay quanh một quy trình trung tâm: **Coordinator** nhận các **Request** từ người dân, gom chúng vào **Mission**, rồi phân công các **Team** đi thực hiện. Đồng thời, vật tư cũng được xuất từ **Warehouse** để hỗ trợ. Năm entity trung gian (**MissionRequest**, **Timeline**, **TeamRequest**, **MissionSupply**, **TimelineSupply**) là "keo dán" kết nối 3 entity chính và quản lý logistics.

---

## I. Ba Entity Chính

### 1. Request — "Cái gì cần làm?"

**Vai trò:** Đại diện cho **một yêu cầu cứu hộ / cứu trợ** từ phía người dân (Citizen) hoặc do Coordinator tạo thay.

- Chứa thông tin: ai cần cứu, ở đâu (`location` GeoJSON), bao nhiêu người (`peopleCount`), cần vật tư gì (`requestSupplies`), mức độ khẩn cấp (`priority`).
- Có 2 loại: `Rescue` (cứu người) và `Relief` (cứu trợ vật tư).
- Trạng thái đi từ `SUBMITTED` → `VERIFIED` → `IN_PROGRESS` → `FULFILLED` / `CLOSED`.

> **Tóm lại:** Request = đầu vào của hệ thống, mô tả "vấn đề cần giải quyết".

---

### 2. Mission — "Kế hoạch giải quyết"

**Vai trò:** Là **nhiệm vụ cứu hộ** do Coordinator tạo ra để gom nhóm và phối hợp xử lý nhiều Request.

- Coordinator tạo Mission ở trạng thái `DRAFT`, kéo các Request vào (tạo ra MissionRequest), ghép các Team vào (tạo ra Timeline).
- Khi sẵn sàng, Coordinator bấm "Start Mission" → Mission chuyển `PLANNED` → `IN_PROGRESS`.
- Mission kết thúc khi tất cả request được fulfill (`COMPLETED`) hoặc bị huỷ (`ABORTED`).

> **Tóm lại:** Mission = bản kế hoạch tổng thể, là nơi gom Request + Team lại với nhau.

---

### 3. Team — "Ai đi làm?"

**Vai trò:** Đại diện cho **một đội cứu hộ** gồm nhiều thành viên (Users có role `Rescue Team`), có 1 Team Leader.

- Có trạng thái `AVAILABLE` (sẵn sàng nhận việc) hoặc `BUSY`.
- Một Team có thể tham gia **nhiều Mission song song** (thông qua nhiều Timeline khác nhau).
- Team nhận thông báo khi Mission start, sau đó accept/reject nhiệm vụ.

> **Tóm lại:** Team = lực lượng thực thi, đi ra hiện trường xử lý Request.

---

## II. Ba Entity Trung Gian (Kết Nối)

### 4. MissionRequest — Cầu nối `Mission ↔ Request`

**Quan hệ:** Mỗi bản ghi = **1 Mission × 1 Request**.

**Vai trò:** Theo dõi **mức độ hoàn thành (fulfillment)** của từng Request bên trong một Mission.

- Khi Coordinator kéo 1 Request vào Mission → hệ thống tạo 1 `MissionRequest` (status `PENDING`).
- Snapshot dữ liệu gốc: `peopleNeeded`, `requestSuppliesSnapshot`, `locationSnapshot`.
- Theo dõi tiến độ cộng dồn: `peopleRescued`, `suppliesDelivered`, `fulfillmentPercent` (0–100%).
- Ghi nhận tất cả team đã đóng góp qua `handledByTeamIds`.
- Trạng thái: `PENDING` → `IN_PROGRESS` → `FULFILLED` / `PARTIAL` / `CLOSED` / `DROPPED`.

> **Tóm lại:** MissionRequest trả lời câu hỏi "Request này được xử lý đến đâu trong Mission?"

---

### 5. Timeline — Cầu nối `Mission ↔ Team`

**Quan hệ:** Mỗi bản ghi = **1 Mission × 1 Team**.

**Vai trò:** Đại diện cho **một lần Team tham gia thực thi Mission**, ghi nhận toàn bộ hành trình từ lúc được phân công đến lúc hoàn thành.

- Khi Coordinator ghép Team vào Mission → hệ thống tạo 1 `Timeline` (status `PLANNED`).
- Ghi nhận các mốc thời gian: `assignedAt` → `startedAt` → `arrivedAt` → `completedAt`.
- Trạng thái phản ánh hành trình: `PLANNED` → `ASSIGNED` → `EN_ROUTE` → `ON_SITE` → `COMPLETED` / `PARTIAL` / `FAILED` / `WITHDRAWN`.
- Có các entity con: `Position` (tracking vị trí real-time) và `TimelineSupply` (tracking vật tư mang theo).

> **Tóm lại:** Timeline trả lời câu hỏi "Team này đang ở đâu và làm gì trong Mission?"

---

### 6. TeamRequest — Cầu nối `Team ↔ MissionRequest`

**Quan hệ:** Mỗi bản ghi = **1 Team × 1 MissionRequest** (unique constraint).

**Vai trò:** Theo dõi **tiến độ cụ thể của từng Team cho từng Request** trong Mission.

- Khi Team bắt đầu xử lý một Request trong Mission → tạo `TeamRequest`.
- Ghi nhận chi tiết: `rescuedCountTotal` (số người team này đã cứu), `suppliesDeliveredTotal` (vật tư team đã phát).
- Dữ liệu từ TeamRequest được **cộng dồn (aggregate)** lên MissionRequest để tính tổng fulfillment.
- `outcome`: `COMPLETED` (đã cứu đủ) hoặc `PARTIAL` (chưa đủ).

> **Tóm lại:** TeamRequest trả lời câu hỏi "Team X đã đóng góp bao nhiêu vào việc xử lý Request Y?"

---

## III. Các Entity Quản Lý Logistics (Supply Audit)

### 7. MissionSupply — Cầu nối `Warehouse ↔ Mission`

**Quan hệ:** Mỗi bản ghi = **1 Mission × 1 Supply × 1 Warehouse**.

**Vai trò:** Quản lý **tổng lượng supply** được cấp phát cho toàn bộ một Mission từ một kho cụ thể.

- Xác định cần bao nhiêu (`plannedQty`), Manager đã xuất kho bao nhiêu (`allocatedQty`).
- Tracking lượng supply đã được các đội lấy đi (`claimedQty`).
- Đảm bảo tính minh bạch: Ai xuất hàng, xuất lúc nào.

> **Tóm lại:** MissionSupply trả lời câu hỏi "Mission này được cấp bao nhiêu đồ từ kho nào?"

---

### 8. TimelineSupply — Cầu nối `MissionSupply ↔ Team`

**Quan hệ:** Mỗi bản ghi = **1 Timeline × 1 MissionSupply**.

**Vai trò:** Theo dõi **lượng supply thực tế mà một Team lấy (pickup) và trả lại (return)** từ kho tổng của Mission.

- Khi Team lấy hàng, ghi nhận `carriedQty`.
- Khi Mission kết thúc, hàng dư (sau khi trừ đi lượng phân phát trong `TeamRequest`) được ghi nhận vào `returnedQty`.
- Team nào đến trước lấy trước (first-come-first-served) dựa trên tổng `allocatedQty`.

> **Tóm lại:** TimelineSupply trả lời câu hỏi "Team này mang theo bao nhiêu đồ và trả lại bao nhiêu?"

---

## IV. Tổng Quan Mối Quan Hệ

```
                                  Warehouse ──┐
                                              ▼
Request ──┐                    ┌── Team    MissionSupply
          │  MissionRequest    │  Timeline    │    ▲
          ├────────────────────┤      ├───────┘    │
          │      Mission       │   TimelineSupply  │
          └────────────────────┘                   │
                   │                               │
              TeamRequest  ────────────────────────┘
           (Team × MissionRequest)
```

| Mối quan hệ | Ý nghĩa |
|---|---|
| **Mission → MissionRequest → Request** | Một Mission gom nhiều Request; mỗi cặp được track bởi MissionRequest |
| **Mission → Timeline → Team** | Một Mission phân công nhiều Team; mỗi cặp được track bởi Timeline |
| **MissionRequest → TeamRequest → Team** | Một MissionRequest được nhiều Team cùng xử lý; mỗi cặp track bởi TeamRequest |
| **Warehouse → MissionSupply → Mission** | Một Mission được cấp phát supply từ Warehouse qua MissionSupply |
| **MissionSupply → TimelineSupply → Team** | Supply của Mission được chia cho từng Team qua TimelineSupply |
| **TimelineSupply ↔ TeamRequest** | `TeamRequest` phụ trách tracking lượng phân phát (distribution); `TimelineSupply` phụ trách logistics lấy/trả hàng. |

### Luồng dữ liệu fulfillment và logistics:

1. **Manager cấp hàng** → lưu tại `MissionSupply`.
2. **Team tới kho nhận hàng** → ghi nhận `carriedQty` tại `TimelineSupply`.
3. **Team đi làm nhiệm vụ** → cập nhật `TeamRequest` (số người cứu, vật tư phát `suppliesDeliveredTotal`).
4. **MissionRequest aggregate ↑** → cập nhật tổng tiến độ của Mission.
5. **Team kết thúc nhiệm vụ** → hệ thống tính toán `returnedQty` = mang đi - đã phát, trả về kho tại `TimelineSupply`.
