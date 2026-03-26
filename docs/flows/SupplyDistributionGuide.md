# Hướng Dẫn Tích Hợp Hệ Thống Quản Lý Tiêu Hao Vật Tư Cứu Trợ (Supply Audit System)

Tài liệu này mô tả chi tiết luồng hoạt động của hệ thống quản lý vật tư cứu trợ mới (Supply Audit), phục vụ cho việc implement logic trên Frontend.

## 1. Tổng Quan
Hệ thống quản lý vật tư vận hành dựa trên 3 giai đoạn chính trong vòng đời của một nhiệm vụ (Mission):
- **Điều phối (Allocate):** Khi nhiệm vụ bắt đầu, hệ thống cần được chỉ định kho lấy hàng và chốt số lượng thực tế cần lấy.
- **Nhận hàng (Claim):** Đội cứu hộ (Rescue Team) tới kho để nhận (lấy) hàng đi làm nhiệm vụ.
- **Trả hàng thừa (Return):** Sau khi phát hàng hoàn tất, đội cứu hộ mang số hàng còn dư (nếu có) trả lại kho.

## 2. Các Trạng Thái Về Vật Tư

### 2.1 MissionSupply (Dự trù vật tư của Mission)
Hiển thị tổng quan các loại vật tư mà Mission này cần:
- `REQUESTED`: Yêu cầu ban đầu, chưa được chỉ định lấy từ kho nào.
- `ALLOCATED`: Manager đã chốt kho lấy hàng và chỉ định số lượng được phép lấy (`allocatedQty`).
- `FULLY_CLAIMED`: Đội cứu hộ đã nhận đủ số lượng phân bổ, không cho phép nhận thêm.
- `RETURNED`: Tất cả các đội đã hoàn tất việc trả lại hàng thừa về kho (Trạng thái cuối cùng).

### 2.2 TimelineSupply (Vật tư mang theo của Team)
Lịch sử từng đội nhận và trả bao nhiêu hàng:
- `CLAIMED`: Đội đã nhận hàng thành công từ kho mang lên xe.
- `RETURNED`: Đội đã thao tác trả hàng dư lại cho kho.

---

## 3. Luồng Hoạt Động Chi Tiết Dành Cho FE

### Bước 1: Khởi động Mission (Auto-create)
- **Role:** Coordinator
- **Trạng thái Mission:** `DRAFT` ➔ `PLANNED`
- **Action:** Khi gọi API `POST /api/missions/{missionId}/start`. 
- **Under the hood:** Backend tự động gom nhóm (aggregate) toàn bộ đồ dùng cần thiết từ các `MissionRequest` và tự động sinh ra các bản ghi `MissionSupply` với trạng thái `REQUESTED`. 
- **FE cần làm:** Tại màn hình Mission Detail, load danh sách các yêu cầu vật tư đang ở trạng thái `REQUESTED`.

### Bước 2: Manager Điều Phối Vật Tư
- **Role:** Manager
- **Context:** Khi có các `MissionSupply` đang ở trạng thái `REQUESTED`, Manager sẽ chọn nguồn kho để xuất hàng.
- **API Call:**
  ```http
  POST /api/inventory/allocate
  ```
- **Payload:**
  ```json
  {
    "missionId": "...",
    "supplyId": "...",
    "warehouseId": "...", // ID kho mà Manager chọn
    "allocatedQty": 100   // Số lượng cho phép xuất
  }
  ```
- **Hành vi:** Hệ thống trừ đi `reservedQuantity` ở kho tương ứng, nhưng số lượng gốc (quantity) vẫn báo còn nguyên trong kho tại thời điểm hiện tại. Trạng thái `MissionSupply` chuyển sang `ALLOCATED`.
- **UI UX Note:** Cần có UI báo lỗi nếu Manager nhập `allocatedQty` vượt quá số tồn kho hiện tại.

### Bước 3: Đội Cứu Hộ Đi Nhận Hàng (Claim Supply)
- **Role:** Rescue Team
- **Context:** Trước khi đội xuất phát, họ mở chi tiết Timeline và check các vật tư đã được Manager chỉ định (`ALLOCATED`). Đội thực hiện thao tác nhận số lượng thực tế mang đi.
- **API Call:**
  ```http
  POST /api/timeline-supplies/claim
  ```
- **Payload:**
  ```json
  {
    "timelineId": "...",
    "missionSupplyId": "...",
    "carriedQty": 50 // Số lượng họ thực sự vác lên xe
  }
  ```
- **Hành vi:**
  - Tạo `TimelineSupply` (trạng thái `CLAIMED`).
  - Cộng dồn phần lượng đã lấy vào `MissionSupply.claimedQty`.
  - Trừ đi tổng số lượng thực tế (quantity) và lượng giữ chỗ (reservedQuantity) trong bảng Inventory của Kho.
- **UI UX Note:** 
  - Đội có thể lấy ít hơn tổng lượng được điều phối. 
  - Nút "Claim" chỉ hiện vật tư nào có `MissionSupply` có trạng thái `ALLOCATED`.

### Bước 4: Đội Cứu Hộ Phát Hàng (Distribution)
- **Role:** Rescue Team
- *(Logic này đã tồn tại ở nghiệp vụ cũ)*: Khi đội phân phát hàng cho các Request, update `TeamRequest.suppliesDeliveredTotal`. FE không cần dùng API mới cho việc này.

### Bước 5: Đội Cứu Hộ Trả Hàng Thừa (Return Leftovers)
- **Role:** Rescue Team
- **Context:** Sau khi nhiệm vụ kết thúc (`COMPLETED`), đội không dùng hết vật tư. Họ sẽ nhấn nút để chốt trả vật tư dư.
- **API Call:**
  ```http
  POST /api/timeline-supplies/return
  ```
- **Payload:**
  ```json
  {
    "timelineId": "...",
    "missionSupplyId": "..."
  }
  ```
- **Hành vi:**
  - Backend tự động tính toán: `returnedQty = carriedQty - total_distributed`.
  - Số `returnedQty` này sẽ được tự động cộng ngược lại vào Inventory của `Warehouse` xuất phát.
  - Chuyển trạng thái `TimelineSupply` = `RETURNED`.
  - Nếu tất cả các đội đều đã trả đồ cho món vật tư này, `MissionSupply.status` tự động về `RETURNED`.
- **UI UX Note:** Không cần form nhập số lượng vì Backend sẽ tự động lấy tổng nhận trừ đi tổng đã phát để đảm bảo tính minh bạch kiểm toán. Nút "Return" chỉ hiện khi Timeline đã hoàn tất và `TimelineSupply` đang ở trạng thái `CLAIMED`.

---

## 4. Gợi Ý Hiển Thị Cho Frontend Giao Diện Tóm Tắt (Mission Detail)
Trong Tab "Vật Tư" của một Mission, hãy xây dựng một bảng có các cột cơ bản sau:

| Tên Vật Tư | Trạng Thái | Kho Xuất (Manager) | Tổng Phân Bổ | Các Đội Đã Lấy | Cần Trả Lại | Trạng Thái Trả |
|------------|------------|---------------------|--------------|----------------|-------------|----------------|
| Mì Tôm     | ALLOCATED  | Kho A               | 50 thùng     | 30             | Chưa rõ     | Pending        |
| Nước Lọc   | RETURNED   | Kho B               | 100 chai     | 100            | Đã trả dư 5 | Hoàn Thành     |

*(Màu sắc gợi ý)*
- `REQUESTED`: Cam (Chờ xử lý từ Manager)
- `ALLOCATED`: Xanh dương (Sẵn sàng cho đội nhận)
- `FULLY_CLAIMED`: Tím (Đã xuất kho hết mức phân bổ)
- `RETURNED`: Xanh lá cây (Đã hoàn tất quy trình kiểm toán)
