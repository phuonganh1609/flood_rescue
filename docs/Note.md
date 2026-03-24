# Ghi chú hệ thống

| Câu hỏi (Ask)                                                  | Trả lời (Answer)                                                                                                                                                                      |
| :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Một Citizen được tạo tối đa bao nhiêu yêu cầu đồng thời?**   | **01 yêu cầu**, chỉ được tạo yêu cầu mới khi yêu cầu trước đã hoàn tất hoặc bị hủy.                                                                                                   |
| **Trạng thái chuẩn của yêu cầu gồm những trạng thái nào?**     | 1. **Pending** (Mới tạo)<br>2. **Verified** (Đã xác minh)<br>3. **In Progress** (Đang xử lý)<br>4. **Completed** (Hoàn tất)<br>5. **Cancelled** (Hủy)<br>6. **Duplicate** (Trùng lặp) |
| **Mức độ khẩn cấp được phân loại theo bao nhiêu cấp?**         | - **High:** Nguy hiểm tính mạng ngay<br>- **Medium:** Nguy cơ cao, chưa khẩn cấp tức thì<br>- **Low:** Hỗ trợ khi có điều kiện                                                        |
| **Quy tắc ưu tiên xử lý khi nhiều yêu cầu cùng lúc?**          | Ưu tiên theo thứ tự:<br>1. Mức độ khẩn cấp<br>2. Số người bị ảnh hưởng<br>3. Thời gian tạo yêu cầu                                                                                    |
| **Một Rescue Team xử lý tối đa bao nhiêu nhiệm vụ song song?** | Tùy theo điều phối của Rescue Coordinator                                                                                                                                             |
| **Phân biệt cứu hộ và cứu trợ (hàng hóa) ra sao?**             | - **Cứu hộ:** Giải cứu con người khỏi nguy hiểm trực tiếp<br>- **Cứu trợ:** Phân phối hàng cứu trợ                                                                                    |
| **Ai chịu trách nhiệm xác nhận phân phối hàng?**               | Manager                                                                                                                                                                               |
| **Quy tắc xử lý yêu cầu trùng lặp?**                           | - Hệ thống phát hiện theo vị trí + thời gian + Citizen<br>- Rescue Coordinator xác nhận<br>- Yêu cầu trùng được gắn trạng thái Duplicate và liên kết với yêu cầu chính                |
| **Có cho phép tạo yêu cầu thay mặt Citizen?**                  | Có, do Rescue Coordinator tạo                                                                                                                                                         |
| **Khi dữ liệu vị trí không chính xác, xử lý ra sao?**          | Rescue Coordinator sẽ thực hiện chỉnh sửa, đánh dấu yêu cầu là **Location Unverified** cho đến khi xác nhận                                                                           |

---

## Race Conditions cần fix

### ⚠️ Race Condition #1: Complete TeamRequest khi MissionRequest đã CLOSED
**Vấn đề**: Team complete TeamRequest sau khi Coordinator đã close MissionRequest  
**Fix**: Thêm validation check `missionRequest.status !== 'CLOSED'` trong `teamRequest.service.js::completeTeamRequest`

```javascript
// Trong teamRequest.service.js::completeTeamRequest (sau line ~120)
const missionRequest = await missionRequestRepository.findById(teamRequest.missionRequestId);
if (missionRequest.status === 'CLOSED') {
  const err = new Error('Cannot complete TeamRequest: MissionRequest already closed');
  err.statusCode = 400;
  err.errorCode = 'MISSION_REQUEST_ALREADY_CLOSED';
  throw err;
}
```

### ⚠️ Race Condition #2: Complete TeamRequest khi Timeline đã WITHDRAWN/FAILED
**Vấn đề**: Team complete TeamRequest sau khi Timeline đã chuyển sang WITHDRAWN/FAILED  
**Fix**: Re-check timeline status trước khi commit trong `teamRequest.service.js::completeTeamRequest`

```javascript
// Trong teamRequest.service.js::completeTeamRequest (trước markComplete)
const timelineBeforeCommit = await timelineRepository.findById(timeline._id);
if (!['ON_SITE'].includes(timelineBeforeCommit.status)) {
  const err = new Error(`Cannot complete: Timeline status changed to ${timelineBeforeCommit.status}`);
  err.statusCode = 400;
  err.errorCode = 'TIMELINE_STATUS_CHANGED';
  throw err;
}
```

### ✅ Race Conditions đã được xử lý
- Multiple team members complete cùng lúc → **Optimistic locking** trong Timeline
- Update progress + Complete cùng lúc → **Atomic operations** + eventual consistency
- Auto-complete vs Manual complete Timeline → **Idempotent** behavior
- Multiple progress updates → **Atomic increment** operations
