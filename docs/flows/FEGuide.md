# Frontend Integration Guide - Backend Changes

## Recent Updates (March 21, 2026)

### 🆕 Auto-Complete Timeline & Auto-Close Request Features

Hai tính năng mới đã được thêm vào backend ảnh hưởng đến workflow của Request và Timeline.

---

## 1. Auto-Complete Timeline khi hoàn tất TeamRequest

### Thay đổi Logic

**Trước đây:**
- Team complete từng TeamRequest riêng lẻ
- Phải gọi API `PATCH /timelines/:id/complete` thủ công để hoàn tất timeline

**Bây giờ:**
- Khi team complete **TeamRequest cuối cùng** → Timeline **tự động complete**
- Outcome của timeline được tính dựa trên **TẤT CẢ** TeamRequest:
  - Nếu **tất cả** TeamRequest có `outcome: "COMPLETED"` → Timeline `status: "COMPLETED"`
  - Nếu **có bất kỳ** TeamRequest nào có `outcome: "PARTIAL"` → Timeline `status: "PARTIAL"`

### Files Changed
- `src/modules/teamRequests/teamRequest.service.js` - Logic tính outcome
- `src/modules/teamRequests/teamRequest.repository.js` - Query methods
- `src/modules/timelines/timeline.service.js` - Auto-complete logic

### Impact cho FE

#### 1. UI/UX Changes Needed

**Khi team member đang ở màn hình ON_SITE:**
- Sau khi complete TeamRequest cuối cùng, timeline sẽ **tự động chuyển sang COMPLETED/PARTIAL**
- FE cần **refresh/poll** timeline status sau khi complete TeamRequest
- Hiển thị notification: "Đã hoàn tất tất cả nhiệm vụ. Timeline tự động hoàn thành."

**Suggested Implementation:**
```javascript
// Sau khi call API complete TeamRequest
const response = await completeTeamRequest(teamRequestId, payload);

// Poll timeline status để check xem có auto-complete không
setTimeout(async () => {
  const timeline = await getTimelineById(timelineId);
  if (timeline.status === 'COMPLETED' || timeline.status === 'PARTIAL') {
    showNotification('Timeline đã được tự động hoàn tất!');
    navigateToCompletedScreen();
  }
}, 1000);
```

#### 2. Button State Management

**Nút "Hoàn tất nhiệm vụ" (Complete Timeline):**
- Có thể **ẩn** nút này nếu còn TeamRequest chưa complete
- Hoặc **disable** với tooltip: "Vui lòng hoàn tất tất cả TeamRequest trước"

**Check logic:**
```javascript
const incompleteCount = teamRequests.filter(tr => !tr.completedAt).length;
const canManualComplete = incompleteCount === 0 && timeline.status === 'ON_SITE';
```

---

## 2. API Thống Nhất: Complete Timeline với Auto-Calculate Outcome

### ⚠️ BREAKING CHANGE: API đã được thay đổi

**API cũ (DEPRECATED):**
- ❌ `PATCH /api/timelines/:id/complete` - Đã bị xóa
- ❌ `POST /api/timelines/:id/complete-from-team-requests` - Đã bị xóa

**API mới (UNIFIED):**
- ✅ `POST /api/timelines/:id/complete` - API duy nhất để complete timeline

### Endpoint Details

```
POST /api/timelines/:id/complete
Authorization: Bearer <token> (Rescue Team only)
Content-Type: application/json

Body:
{
  "note": "Optional completion note"
  // ❌ KHÔNG CÓ field "outcome" - hệ thống tự động tính
}

Response 200 - Timeline completed successfully:
{
  "success": true,
  "data": {
    "_id": "...",
    "status": "COMPLETED" | "PARTIAL" | "WITHDRAWN",
    "completedAt": "2026-03-21T12:00:00.000Z",
    ...
  },
  "message": "Timeline completed successfully"
}

Response 200 - Timeline đã complete trước đó (idempotent):
{
  "success": true,
  "data": {
    "_id": "...",
    "status": "COMPLETED" | "PARTIAL" | "WITHDRAWN" | "FAILED" | "CANCELLED",
    "completedAt": "2026-03-21T12:00:00.000Z",
    ...
  },
  "message": "Timeline đã được hoàn tất trước đó"
}

Error 400 - Mission chưa start (không có TeamRequest):
{
  "success": false,
  "message": "Không thể complete timeline khi mission chưa start (chưa có TeamRequest)",
  "errorCode": "NO_TEAM_REQUESTS_FOUND"
}

Error 400 - Timeline không phải ON_SITE:
{
  "success": false,
  "message": "Timeline phải ở trạng thái ON_SITE mới có thể complete. Trạng thái hiện tại: ASSIGNED",
  "errorCode": "TIMELINE_NOT_ON_SITE"
}

Error 403 - User không thuộc team:
{
  "success": false,
  "message": "Unauthorized",
  "errorCode": "UNAUTHORIZED"
}
```

### Logic Tính Outcome Tự Động

API này **tự động tính outcome** dựa trên TeamRequest:

#### Case 1: Có ít nhất 1 TeamRequest đã complete
```javascript
// Lấy tất cả TeamRequest đã complete
const completed = teamRequests.filter(tr => tr.completedAt !== null);

if (completed.some(tr => tr.outcome === 'PARTIAL')) {
  // Có bất kỳ PARTIAL nào → Timeline PARTIAL
  timeline.status = 'PARTIAL';
} else {
  // Tất cả COMPLETED → Timeline COMPLETED
  timeline.status = 'COMPLETED';
}
```

#### Case 2: Có TeamRequest nhưng chưa complete cái nào
```javascript
// Team rút lui trước khi hoàn thành bất kỳ nhiệm vụ nào
timeline.status = 'WITHDRAWN';
timeline.withdrawalReason = 'Team rút lui trước khi hoàn thành bất kỳ nhiệm vụ nào';
```

#### Case 3: Không có TeamRequest (mission chưa start)
```javascript
// Error 400 - Không cho phép complete
throw Error('Không thể complete timeline khi mission chưa start');
```

#### Case 4: Timeline đã complete trước đó
```javascript
// Idempotent - trả về 200 OK với timeline hiện tại
// Không throw error, giúp handle race condition
return { ...timeline, message: 'Timeline đã được hoàn tất trước đó' };
```

### Files Changed
- `src/modules/timelines/timeline.service.js` - New method `completeTimelineAuto()`
- `src/modules/timelines/timeline.controller.js` - New controller method `completeAuto()`
- `src/modules/timelines/timeline.routes.js` - Updated routes (POST /complete)
- `src/modules/timelines/timeline.validation.js` - New schema `completeTimelineAutoSchema`

### Impact cho FE

#### 1. Migration Required ⚠️

**Old API Call (DEPRECATED):**
```javascript
// ❌ KHÔNG DÙNG NỮA
await fetch(`/api/timelines/${id}/complete`, {
  method: 'PATCH',  // ❌ Method cũ
  body: JSON.stringify({
    outcome: 'COMPLETED',  // ❌ Field này không còn
    note: 'Done'
  })
});
```

**New API Call:**
```javascript
// ✅ DÙNG CÁI NÀY
await fetch(`/api/timelines/${id}/complete`, {
  method: 'POST',  // ✅ Changed to POST
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    note: 'Done'  // ✅ Chỉ có note, không có outcome
  })
});
```

#### 2. UI Implementation

**Nút "Hoàn tất nhiệm vụ":**
```javascript
async function handleCompleteTimeline() {
  try {
    const response = await fetch(`/api/timelines/${timelineId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        note: completionNote || null
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Check message để biết timeline mới complete hay đã complete trước đó
      if (result.message === 'Timeline đã được hoàn tất trước đó') {
        showInfo('Timeline đã được hoàn tất trước đó');
      } else {
        showSuccess(`Timeline đã hoàn tất với kết quả: ${result.data.status}`);
      }
      
      // Navigate hoặc refresh UI
      navigateToCompletedScreen();
    }
  } catch (error) {
    if (error.errorCode === 'NO_TEAM_REQUESTS_FOUND') {
      showError('Mission chưa được start, không thể hoàn tất timeline');
    } else if (error.errorCode === 'TIMELINE_NOT_ON_SITE') {
      showError('Timeline phải ở trạng thái ON_SITE mới có thể hoàn tất');
    } else {
      showError(error.message);
    }
  }
}
```

#### 3. Button State Logic

**Không cần check incomplete count nữa:**
```javascript
// ❌ OLD - Phải check incomplete count
const incompleteCount = teamRequests.filter(tr => !tr.completedAt).length;
const canComplete = incompleteCount === 0 && timeline.status === 'ON_SITE';

// ✅ NEW - Chỉ cần check timeline status
const canComplete = timeline.status === 'ON_SITE';
```

**Hiển thị nút:**
```javascript
{timeline.status === 'ON_SITE' && (
  <button onClick={handleCompleteTimeline}>
    Hoàn tất nhiệm vụ
  </button>
)}
```

#### 4. Outcome Display

**Hiển thị kết quả sau khi complete:**
```javascript
const outcomeMessages = {
  'COMPLETED': '✅ Hoàn thành tất cả nhiệm vụ',
  'PARTIAL': '⚠️ Hoàn thành một phần',
  'WITHDRAWN': '🔙 Đội đã rút lui'
};

// Sau khi complete
showNotification(outcomeMessages[timeline.status]);
```

#### 5. Race Condition Handling

**API này là idempotent** - gọi nhiều lần không gây lỗi:
```javascript
// Scenario: User click "Complete" đúng lúc auto-complete xảy ra
// → Cả 2 đều trả về 200 OK
// → Không cần handle error case phức tạp

async function handleCompleteWithRetry() {
  try {
    const result = await completeTimeline(timelineId);
    
    // Cả auto-complete và manual complete đều OK
    showSuccess('Timeline đã hoàn tất!');
    
  } catch (error) {
    // Chỉ handle các error thực sự (403, 400, etc.)
    handleError(error);
  }
}
```

---

## 3. Auto-Close Request khi FULFILLED

### Thay đổi Logic

**Trước đây:**
- Request đạt `FULFILLED` (tất cả MissionRequest đều CLOSED)
- Admin/Coordinator phải gọi API `POST /requests/:id/close` thủ công

**Bây giờ:**
- Request đạt `FULFILLED` → **Tự động chuyển sang `CLOSED`**
- Emit event `REQUEST_CLOSED` để notify citizen

### Files Changed
- `src/modules/missionRequests/missionRequest.service.js` - Updated `syncRequestStatus()`

### Impact cho FE

#### 1. Request Status Flow Update

**Old Flow:**
```
VERIFIED → IN_PROGRESS → PARTIALLY_FULFILLED → FULFILLED → (manual) CLOSED
```

**New Flow:**
```
VERIFIED → IN_PROGRESS → PARTIALLY_FULFILLED → FULFILLED → (auto) CLOSED
```

**Important:** FE sẽ **KHÔNG BAO GIỜ** thấy status `FULFILLED` nữa vì nó tự động chuyển sang `CLOSED` ngay lập tức.

#### 2. UI Changes Needed

**Citizen Dashboard:**
- Request status badge: Bỏ badge "FULFILLED", chỉ hiển thị "CLOSED"
- Status filter: Có thể bỏ option "FULFILLED" khỏi dropdown filter

**Request Detail Page:**
- Không cần nút "Close Request" nữa (vì tự động)
- Hiển thị message: "Yêu cầu đã được hoàn tất và tự động đóng"

#### 3. WebSocket/Polling Updates

Nếu FE đang listen event `REQUEST_CLOSED`:
```javascript
socket.on('REQUEST_CLOSED', (data) => {
  const { requestId } = data;
  
  // Update UI
  updateRequestStatus(requestId, 'CLOSED');
  showNotification('Yêu cầu của bạn đã được hoàn tất!');
  
  // Có thể trigger confetti animation 🎉
  celebrateCompletion();
});
```

#### 4. API Response Changes

**GET /api/requests/:id** - Response sẽ không bao giờ có `status: "FULFILLED"` nữa:
```javascript
// Trước đây có thể nhận:
{ status: "FULFILLED", ... }

// Bây giờ sẽ nhận:
{ status: "CLOSED", ... }
```

**GET /api/requests** - Filter by status:
```javascript
// Nếu filter by "FULFILLED" sẽ không trả về kết quả nào
// Nên dùng "CLOSED" thay thế
const closedRequests = await getRequests({ status: 'CLOSED' });
```

---

## 4. Workflow Tổng Thể (End-to-End)

### Scenario: Team hoàn thành mission

```
1. Citizen tạo Request → status: VERIFIED
2. Coordinator tạo Mission, add Request vào → MissionRequest: PENDING
3. Coordinator assign Team → Timeline: PLANNED
4. Coordinator start Mission → Timeline: ASSIGNED, MissionRequest: IN_PROGRESS
5. Team accept → Timeline: EN_ROUTE
6. Team arrive → Timeline: ON_SITE
7. Team update progress → TeamRequest được tạo/update
8. Team complete TeamRequest #1 → TeamRequest.outcome: COMPLETED/PARTIAL
9. Team complete TeamRequest #2 → TeamRequest.outcome: COMPLETED/PARTIAL
10. Team complete TeamRequest #3 (cuối cùng) →
    ✨ Timeline AUTO COMPLETE (COMPLETED/PARTIAL)
    → MissionRequest: FULFILLED
    → MissionRequest: CLOSED (do coordinator)
    ✨ Request AUTO CLOSE (CLOSED)
11. Citizen nhận notification "Yêu cầu đã hoàn tất" 🎉
```

---

## 5. Testing Checklist cho FE

### Timeline Auto-Complete
- [ ] Complete TeamRequest cuối cùng → Timeline tự động complete
- [ ] Timeline outcome = COMPLETED khi tất cả TeamRequest COMPLETED
- [ ] Timeline outcome = PARTIAL khi có ít nhất 1 TeamRequest PARTIAL
- [ ] UI refresh/update sau khi auto-complete
- [ ] Notification hiển thị đúng

### Manual Complete API
- [ ] Gọi API khi còn incomplete TeamRequest → Error 400
- [ ] Gọi API khi timeline không phải ON_SITE → Error 400
- [ ] Gọi API thành công khi đủ điều kiện → Timeline complete
- [ ] User không thuộc team → Error 403

### Request Auto-Close
- [ ] Request không bao giờ ở trạng thái FULFILLED
- [ ] Request tự động CLOSED khi tất cả MissionRequest CLOSED
- [ ] Event REQUEST_CLOSED được emit
- [ ] UI update status badge đúng
- [ ] Filter/Search không có option FULFILLED

---

## 6. Breaking Changes ⚠️

### ❌ Removed/Deprecated APIs
- **Request status `FULFILLED`** không còn tồn tại trong thực tế (auto-convert to CLOSED)
- **`PATCH /api/timelines/:id/complete`** - API cũ đã bị xóa (deprecated)
- **`POST /api/timelines/:id/complete-from-team-requests`** - API tạm thời đã bị xóa

### ⚠️ Behavior Changes
- **Timeline auto-complete**: Timeline tự động complete khi team hoàn tất TeamRequest cuối cùng
- **Request auto-close**: Request tự động close khi đạt FULFILLED
- **Timeline manual complete**: 
  - Method changed: `PATCH` → `POST`
  - Body changed: Bỏ field `outcome` (tự động tính)
  - Outcome tự động: COMPLETED, PARTIAL, hoặc WITHDRAWN
  - Idempotent: Gọi nhiều lần không lỗi

### ✅ New Features
- **Unified Complete API**: `POST /api/timelines/:id/complete` - API duy nhất với auto-calculate outcome
- **Idempotent behavior**: API trả về 200 OK ngay cả khi timeline đã complete trước đó
- **Smart outcome**: Hệ thống tự động tính outcome dựa trên TeamRequest

---

## 7. Recommended FE Updates

### High Priority 🔴
1. **Migrate complete timeline API**
   - Change method: `PATCH` → `POST`
   - Remove `outcome` field from request body
   - Update error handling cho idempotent behavior
   
2. **Remove FULFILLED status** từ UI components (badges, filters, dropdowns)

3. **Update button logic**
   - Bỏ validation check incomplete count
   - Chỉ cần check `timeline.status === 'ON_SITE'`
   
4. **Add message handling**
   - Distinguish "Timeline completed successfully" vs "Timeline đã được hoàn tất trước đó"

### Medium Priority 🟡
5. **Add polling/refresh** sau khi complete TeamRequest để detect auto-complete

6. **Improve notifications** 
   - Show outcome (COMPLETED/PARTIAL/WITHDRAWN) sau khi complete
   - Handle idempotent case gracefully

7. **Update test cases** để reflect new behavior
   - Test auto-calculate outcome
   - Test idempotent behavior
   - Test WITHDRAWN case

### Low Priority 🟢
8. **Add celebration animation** khi request auto-close

9. **Update user guide/help docs** về workflow mới

10. **Add outcome badges**
    - COMPLETED: ✅ green
    - PARTIAL: ⚠️ yellow
    - WITHDRAWN: 🔙 gray

---

## 8. API Reference Summary

### Deprecated/Removed Endpoints ❌
- `PATCH /api/timelines/:id/complete` - Removed (use POST instead)
- `POST /api/timelines/:id/complete-from-team-requests` - Removed (merged into unified API)

### New/Modified Endpoints ✅

#### Timeline Complete (UNIFIED)
```
POST /api/timelines/:id/complete
- Auto-calculates outcome from TeamRequests
- Idempotent (safe to call multiple times)
- Returns 200 even if already completed
- No "outcome" field in request body
```

#### Team Request Complete (MODIFIED)
```
POST /api/team-requests/:id/complete
- Now triggers auto-complete timeline when last TeamRequest
- Auto-calculates timeline outcome from all TeamRequests
```

#### Request Status (MODIFIED)
```
GET /api/requests/:id
- Will never return status "FULFILLED" (auto-converts to CLOSED)
```

### Unchanged Endpoints
- `PATCH /api/timelines/:id/fail` - Fail timeline
- `PATCH /api/timelines/:id/withdraw` - Withdraw timeline
- `PATCH /api/timelines/:id/cancel` - Cancel timeline (admin only)
- All other endpoints work as before

---

## Questions? Contact Backend Team

Nếu có thắc mắc về:
- Logic nghiệp vụ mới
- API behavior
- Edge cases

Hãy liên hệ backend team (hỏi lại cho tôi) hoặc check source code tại:
- `src/modules/teamRequests/teamRequest.service.js`
- `src/modules/timelines/timeline.service.js`
- `src/modules/missionRequests/missionRequest.service.js`
