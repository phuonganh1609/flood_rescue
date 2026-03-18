# Mobile Functional Requirements

## 1. Mục tiêu tài liệu

Tài liệu này tổng hợp các **functional requirements** của hệ thống Flood Rescue & Relief dành cho đội phát triển mobile.

- Nguồn tổng hợp: docs flow nghiệp vụ + tài liệu API + swagger.
- Phạm vi role: **Citizen, Rescue Team, Rescue Coordinator, Manager, Admin**.
- Phạm vi nghiệp vụ: **bao gồm vận hành cứu hộ/cứu trợ, loại trừ Reports**.
- Mức chi tiết: **high-level theo module + user flow** (không liệt kê chi tiết cài đặt kỹ thuật).

---

## 2. Vai trò và mục tiêu sử dụng

- **Citizen**: tạo yêu cầu cứu hộ/cứu trợ, theo dõi tiến độ xử lý, nhận thông báo.
- **Rescue Team**: nhận nhiệm vụ, cập nhật trạng thái thực thi timeline, cập nhật tiến độ theo mission request.
- **Rescue Coordinator**: xác minh yêu cầu, lập mission, gán team, điều phối mission lifecycle.
- **Manager**: quản lý tài nguyên, supplies, kho và tồn kho phục vụ mission.
- **Admin**: quản trị user, role, và một số cấu hình hệ thống.

---

## 3. Luồng nghiệp vụ tổng quan (cho mobile)

1. Citizen gửi request mới (rescue/relief) hoặc Coordinator tạo request thay mặt.
2. Coordinator xác minh request (verify/reject), chuẩn hóa vị trí/priority khi cần.
3. Coordinator tạo mission ở trạng thái DRAFT, thêm request vào mission (tạo MissionRequest), gán team vào mission (tạo Timeline PLANNED).
4. Coordinator start mission: hệ thống pre-create TeamRequest matrix cho mọi cặp (MissionRequest × Team), chuyển timeline PLANNED -> ASSIGNED, gửi notification.
5. Rescue Team nhận timeline, thực thi lifecycle (accept -> arrive -> complete/fail/withdraw).
6. Rescue Team cập nhật progress theo mission request qua `/missionRequests/:id/progress`; hệ thống ghi contribution vào TeamRequest và sync aggregate về MissionRequest.
7. Hệ thống cập nhật trạng thái Request/Mission/Team theo workflow nghiệp vụ khi timeline và MissionRequest thay đổi.
7. Citizen, Team, Coordinator nhận cập nhật real-time qua Notification/WebSocket.

---

## 4. Functional Requirements theo module

## 4.1 Authentication & Session

- FR-AUTH-01: Người dùng có thể đăng ký tài khoản mới (mặc định role Citizen).
- FR-AUTH-02: Người dùng có thể đăng nhập bằng email/password và nhận access token.
- FR-AUTH-03: Ứng dụng có thể làm mới access token qua refresh endpoint.
- FR-AUTH-04: Người dùng có thể lấy thông tin profile hiện tại.
- FR-AUTH-05: Người dùng có thể đăng xuất, session refresh bị thu hồi.

## 4.2 Request Management

- FR-REQ-01: Citizen tạo request cứu hộ/cứu trợ với location, mô tả, số người/supplies liên quan.
- FR-REQ-02: Hệ thống áp dụng quy tắc 1 active request cho mỗi Citizen (trừ terminal states).
- FR-REQ-03: Citizen xem danh sách request của chính mình (có filter/pagination).
- FR-REQ-04: Citizen xem chi tiết từng request.
- FR-REQ-05: Citizen có thể hủy request trong điều kiện hợp lệ theo state.
- FR-REQ-06: Coordinator xem toàn bộ request với filter theo status/type/priority/source/creator.
- FR-REQ-07: Coordinator xác minh request (verify/reject).
- FR-REQ-08: Coordinator cập nhật priority của request trong các trạng thái cho phép.
- FR-REQ-09: Coordinator cập nhật/verify lại location request.
- FR-REQ-10: Coordinator đóng request khi fulfilled/partially fulfilled theo rule.
- FR-REQ-11: Coordinator đánh dấu duplicate request và liên kết với request gốc.
- FR-REQ-12: Coordinator có thể tạo request thay mặt citizen (có tài khoản hoặc chưa có tài khoản).
- FR-REQ-13: Coordinator có thể tìm citizen theo tên/SĐT để tạo request on-behalf.

## 4.3 Mission Planning & Control

- FR-MIS-01: Coordinator/Admin tạo mission mới (khởi tạo DRAFT).
- FR-MIS-02: Coordinator/Admin cập nhật thông tin mission (name/description/priority).
- FR-MIS-03: Coordinator/Admin xem danh sách mission có filter và xem chi tiết mission.
- FR-MIS-04: Coordinator/Admin thêm nhiều request vào mission (tạo MissionRequest tracking với status PENDING).
- FR-MIS-05: Coordinator/Admin gán nhiều team vào mission (tạo Timeline PLANNED).
- FR-MIS-06: Coordinator/Admin có thể remove request/team khỏi mission khi còn ở trạng thái cho phép.
- FR-MIS-07: Coordinator/Admin start mission: pre-create TeamRequest matrix (mọi MissionRequest × Team assigned), chuyển timeline PLANNED -> ASSIGNED, gửi notification.
- FR-MIS-08: Coordinator/Admin có thể pause/resume mission.
- FR-MIS-09: Coordinator/Admin có thể abort mission; timeline active bị hủy theo rule.
- FR-MIS-10: Coordinator/Admin có thể đóng hoặc drop MissionRequest trong các tình huống điều phối.

## 4.4 Team Execution (Timeline Lifecycle)

- FR-TL-01: Rescue Team xem danh sách timeline của team mình (lọc theo status/mission).
- FR-TL-02: Rescue Team xem chi tiết timeline (request info, mission info).
- FR-TL-03: Rescue Team accept timeline (ASSIGNED -> EN_ROUTE).
- FR-TL-04: Rescue Team xác nhận đến nơi (EN_ROUTE -> ON_SITE).
- FR-TL-05: Rescue Team hoàn thành timeline với outcome COMPLETED hoặc PARTIAL.
- FR-TL-06: Rescue Team báo fail timeline với failure reason.
- FR-TL-07: Rescue Team withdraw timeline với withdrawal reason khi cần.
- FR-TL-08: Coordinator/Admin có thể cancel timeline.
- FR-TL-09: Hệ thống cập nhật trạng thái MissionRequest/Mission/Team theo lifecycle timeline (ASSIGNED/EN_ROUTE/ON_SITE/COMPLETED/PARTIAL/FAILED/WITHDRAWN/CANCELLED).

## 4.5 MissionRequest, TeamRequest & Progress Tracking

- FR-MR-01: Coordinator/Team xem danh sách MissionRequest thuộc mission (xem fulfillment status và team contribution).
- FR-MR-02: Team cập nhật progress cho mission request qua `POST /api/missionRequests/:id/progress` (people rescued increment, supplies delivered).
- FR-MR-03: Hệ thống ghi contribution vào TeamRequest theo team và tính toán aggregate (peopleRescued, suppliesDelivered) cho MissionRequest.
- FR-MR-04: Team/Coordinator/Admin xem danh sách TeamRequest phục vụ audit per-team contribution (chỉ team xem được TeamRequest của team mình).
- FR-MR-05: Team xem chi tiết TeamRequest theo mission request (audit trail).
- FR-MR-06: Hệ thống chặn over-delivery supplies (tổng deliveredQty vượt requestedQty) và trả lỗi 422 SUPPLY_OVER_DELIVERY.

## 4.6 Team & Team Application

- FR-TEAM-01: Coordinator/Admin xem danh sách team, xem chi tiết team.
- FR-TEAM-02: Coordinator/Admin tạo team mới, cập nhật team, xóa team theo guard rules.
- FR-TEAM-03: Coordinator/Admin đổi team leader.
- FR-TEAM-04: Coordinator/Admin thêm/xóa thành viên team theo rule quyền hạn.
- FR-TEAM-05: Citizen có thể nộp đơn tham gia Rescue Team.
- FR-TEAM-06: Citizen xem danh sách đơn của chính mình.
- FR-TEAM-07: Citizen có thể rút đơn khi còn pending.
- FR-TEAM-08: Coordinator/Admin xem danh sách đơn, xem chi tiết đơn.
- FR-TEAM-09: Coordinator/Admin duyệt hoặc từ chối đơn; khi duyệt có thể cập nhật role user theo rule.

## 4.7 Notifications & Realtime

- FR-NOTI-01: Người dùng đã đăng nhập xem danh sách notification của mình (filter/pagination/sort).
- FR-NOTI-02: Người dùng xem chi tiết notification.
- FR-NOTI-03: Người dùng đánh dấu đã đọc từng notification.
- FR-NOTI-04: Người dùng xóa một notification.
- FR-NOTI-05: Người dùng xóa toàn bộ notification của chính mình.
- FR-NOTI-06: Ứng dụng mobile nhận sự kiện real-time qua socket (ví dụ: mission assigned, request verified, mission completed, unread count update).
- FR-NOTI-07: Ứng dụng mobile phải đồng bộ badge unread theo event và theo API.

## 4.8 Resources, Supplies, Warehouse, Inventory

- FR-RSC-01: Manager/Coordinator xem danh sách resources (phương tiện, thiết bị).
- FR-RSC-02: Manager tạo resource mới.
- FR-RSC-03: Manager cập nhật trạng thái resource.
- FR-SUP-01: Manager quản lý danh mục supplies (list/create/update/delete, import).
- FR-WH-01: Manager quản lý warehouse (list/create/update/delete).
- FR-INV-01: Manager xem và cập nhật tồn kho.
- FR-INV-02: Hệ thống hỗ trợ phân phối supplies cho mission.
- FR-INV-03: Hệ thống hỗ trợ quy tắc reserve/deduct/return supplies theo lifecycle mission/timeline.

## 4.9 User & System (Admin scope)

- FR-ADM-01: Admin xem danh sách user có filter/search/pagination.
- FR-ADM-02: Admin cập nhật role user.
- FR-SYS-01: Admin xem categories/cấu hình hệ thống.

---

## 5. Quy tắc nghiệp vụ trọng yếu cần phản ánh trong mobile

## 5.1 State machine cốt lõi

- **Request** có các trạng thái chính: SUBMITTED, VERIFIED, REJECTED, IN_PROGRESS, PARTIALLY_FULFILLED, FULFILLED, CLOSED, CANCELLED.
- **MissionRequest** có các trạng thái chính: PENDING, IN_PROGRESS, PARTIAL, FULFILLED, CLOSED, DROPPED (tracking fulfillment theo mission + request).
- **Mission** có các trạng thái chính: DRAFT, PLANNED, IN_PROGRESS, PAUSED, PARTIAL, COMPLETED, ABORTED.
- **Timeline** có các trạng thái chính: PLANNED, ASSIGNED, EN_ROUTE, ON_SITE, COMPLETED, PARTIAL, FAILED, WITHDRAWN, CANCELLED.
- **TeamRequest** không có status riêng; dùng để audit per-team contribution (people rescued, supplies delivered) cho MissionRequest.

## 5.2 TeamRequest-first Approach & Status Sync

- **Start Mission** pre-create TeamRequest cho mọi cặp (MissionRequest × Team assigned) để tracking per-team contribution.
- Team cập nhật progress qua `/missionRequests/:id/progress`; hệ thống ghi contribution vào TeamRequest.
- MissionRequest aggregate (peopleRescued, suppliesDelivered) được tính từ tổng contribution của các TeamRequest cùng missionRequestId.
- MissionRequest chuyển IN_PROGRESS/PARTIAL/FULFILLED/CLOSED theo timeline status và aggregate fulfillment.
- Request chuyển IN_PROGRESS/FULFILLED/PARTIALLY_FULFILLED theo MissionRequest status tập hợp.
- Team status đổi AVAILABLE/BUSY theo tình trạng timeline active.
- Mission chuyển COMPLETED/PARTIAL theo mức đáp ứng của MissionRequests.

## 5.3 Ràng buộc quyền hạn theo role

- Citizen thao tác request của mình và team application của mình.
- Rescue Team chỉ thao tác timeline/team request thuộc team của mình.
- Coordinator/Admin điều phối mission, team, request theo phạm vi nghiệp vụ.
- Manager tập trung resources/supplies/warehouse/inventory.

## 5.4 Quy tắc ưu tiên request

- Ưu tiên xử lý theo: priority -> số người ảnh hưởng -> thời điểm tạo.

## 5.5 Realtime bắt buộc

- Mobile cần xử lý nhận event real-time và cập nhật UI ngay cho các use case điều phối/thông báo quan trọng.

---

## 6. Danh sách user flows nên có trên mobile

## 6.1 Citizen

1. Đăng ký/đăng nhập/refresh token.
2. Tạo request mới.
3. Xem danh sách và chi tiết request của tôi.
4. Hủy request khi hợp lệ.
5. Theo dõi trạng thái xử lý request theo timeline/mission.
6. Xem và quản lý notifications.
7. Nộp/rút đơn tham gia Rescue Team và theo dõi kết quả duyệt.

## 6.2 Rescue Team

1. Đăng nhập và nhận thông báo nhiệm vụ mới (MISSION_ASSIGNED).
2. Xem danh sách timeline được giao (status ASSIGNED), xem chi tiết timeline và mission.
3. Thực hiện timeline lifecycle: accept -> arrive -> complete/fail/withdraw.
4. Xem danh sách mission request thuộc mission.
5. Cập nhật progress cho từng mission request (people rescued, supplies delivered).
6. Xem TeamRequest audit trail của team mình.
7. Xem notification và thông báo liên quan nhiệm vụ.

## 6.3 Rescue Coordinator

1. Xem incoming requests, verify/reject.
2. Tạo mission DRAFT.
3. Thêm requests vào mission.
4. Gán teams vào mission.
5. Start/pause/resume/abort mission.
6. Theo dõi timeline execution và MissionRequest fulfillment.
7. Xử lý duplicate/location/priority/close cho request.
8. Quản lý team applications.

## 6.4 Manager

1. Quản lý resources.
2. Quản lý supplies catalog.
3. Quản lý warehouse và inventory.
4. Thực hiện các thao tác phân phối supplies liên quan mission.

## 6.5 Admin

1. Quản lý users và role.
2. Truy cập chức năng cấu hình hệ thống.

---

## 7. Ngoài phạm vi tài liệu này

- Hướng dẫn cài đặt môi trường, setup project, CI/CD.
- Functional requirements thuộc module Reports.

