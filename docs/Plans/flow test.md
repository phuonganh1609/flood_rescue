# Supply Allocation Redesign - Test Flow Document

> Mô tả end-to-end flow test cho supply allocation mới trên Postman

---

## 📋 Prerequisites

- Mission đã được tạo với status `PLANNED`
- Timeline đã được assign cho Rescue Team (status `ASSIGNED`)
- Có Citizen Combo và Team Combo đã tạo sẵn
- Có Warehouse với Inventory items
- Có Vehicles với status `ACTIVE`

---

## 🔄 End-to-End Test Flow

### Phase 1: Team Accepts Timeline (Reservation)

#### 1.1 Get Accept Info
**Endpoint**: `GET /api/missions/:id/accept-info`

**Expected Result**: 
- Trả về đầy đủ: missionRequests, citizenCombos, teamCombos, warehouses (với inventory), vehicles
- Mỗi warehouse có inventory list với `available: quantity - reservedQuantity`

**Sample Response (200)**:
```json
{
  "data": {
    "missionRequests": [...],
    "citizenCombos": [
      {
        "_id": "...",
        "name": "Flood Emergency Kit",
        "type": "Citizen",
        "supplies": [{ "supplyId": { "name": "Water", "unit": "L" }, "quantity": 5 }]
      }
    ],
    "teamCombos": [...],
    "warehouses": [
      {
        "_id": "...",
        "name": "Main Warehouse",
        "inventory": [
          { "supply": { "name": "Water" }, "quantity": 100, "reservedQuantity": 10, "available": 90 }
        ]
      }
    ],
    "vehicles": [{ "_id": "...", "name": "Ambulance 01", "status": "ACTIVE" }]
  }
}
```

---

#### 1.2 Accept Timeline (Team chọn supplies và vehicles)
**Endpoint**: `PATCH /api/timelines/:id/accept`

**Request Body**:
```json
{
  "warehouseId": "WAREHOUSE_ID",
  "citizenCombos": [
    {
      "missionRequestId": "MR_ID",
      "comboSupplyId": "COMBO_ID",
      "quantity": 2
    }
  ],
  "teamCombos": [
    {
      "comboSupplyId": "TEAM_COMBO_ID",
      "quantity": 1
    }
  ],
  "vehicles": [
    { "vehicleId": "VEHICLE_ID" }
  ]
}
```

**Expected Results**:
1. ✅ Timeline status chuyển từ `ASSIGNED` → `PENDING_APPROVAL`
2. ✅ TimelineSupply records được tạo với status `RESERVED`
3. ✅ TimelineVehicle records được tạo với status `RESERVED`
4. ✅ `InventoryItem.reservedQuantity` tăng lên
5. ✅ Vehicle vẫn ở status `ACTIVE` (chưa chuyển `IN_USE`)

**Sample Response (200)**:
```json
{
  "data": {
    "_id": "TIMELINE_ID",
    "status": "PENDING_APPROVAL",
    "startedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Edge Case 1 - Không đủ inventory**:
```json
{
  "citizenCombos": [{ "comboSupplyId": "...", "quantity": 999 }]
}
```
**Expected**: `400 Bad Request` với message `"Không đủ supply ... Cần 999, còn 50"`
**Verify**: Transaction rollback, `reservedQuantity` không tăng.

**Edge Case 2 - Vehicle đã bị team khác reserve**:
**Expected**: `400 Bad Request` `"Vehicle ... đã được team khác đặt trước"`

**Edge Case 3 - Payload rỗng**:
```json
{ "warehouseId": "...", "citizenCombos": [], "teamCombos": [], "vehicles": [] }
```
**Expected**: `400 Bad Request` validation error `"Phải chọn ít nhất 1 citizen combo, team combo, hoặc vehicle"`

---

### Phase 2: Manager Approval

#### 2.1 Approve Supply
**Endpoint**: `PATCH /api/timeline-supplies/:id/approve`

**Request Body (optional)**:
```json
{
  "approvedQty": 8  // Optional, default = requestedQty
}
```

**Expected Results**:
1. ✅ TimelineSupply status chuyển `RESERVED` → `APPROVED`
2. ✅ Nếu `approvedQty < requestedQty`: `reservedQuantity` giảm đi phần chênh lệch
3. ✅ Nếu TẤT CẢ supplies và vehicles đã reviewed: Timeline auto-transition `PENDING_APPROVAL` → `CLAIMING_SUPPLIES`

**Sample Response (200)**:
```json
{
  "data": {
    "_id": "TS_ID",
    "status": "APPROVED",
    "requestedQty": 10,
    "approvedQty": 8
  }
}
```

**Edge Case - Approve với qty = 0 hoặc qty > requested**:
```json
{ "approvedQty": 0 }
```
**Expected**: `400 Bad Request` `"Approved quantity must be greater than 0"`

---

#### 2.2 Reject Supply
**Endpoint**: `PATCH /api/timeline-supplies/:id/reject`

**Request Body (optional)**:
```json
{
  "note": "Không đủ nước sạch trong kho"
}
```

**Expected Results**:
1. ✅ TimelineSupply status chuyển `RESERVED` → `REJECTED`
2. ✅ `InventoryItem.reservedQuantity` giảm về 0 cho item này
3. ✅ Note được append `" [Auto-rejected...]"` hoặc lưu custom note

---

#### 2.3 Approve Vehicle
**Endpoint**: `PATCH /api/timeline-vehicles/:id/approve`

**Expected Results**:
1. ✅ TimelineVehicle status `RESERVED` → `APPROVED`
2. ✅ Vehicle status `ACTIVE` → `IN_USE`
3. ✅ Nếu TẤT CẢ items reviewed: Timeline auto-transition sang `CLAIMING_SUPPLIES`

---

#### 2.4 Reject Vehicle
**Endpoint**: `PATCH /api/timeline-vehicles/:id/reject`

**Expected Results**:
- TimelineVehicle status `RESERVED` → `REJECTED`
- Vehicle status vẫn là `ACTIVE` (không thay đổi)

---

### Phase 3: Team Claims & Returns

#### 3.1 Claim Supply (Pickup)
**Endpoint**: `PATCH /api/timeline-supplies/:id/claim`

**Expected Results**:
1. ✅ TimelineSupply status `APPROVED` → `CLAIMED`
2. ✅ `carriedQty` = `approvedQty`
3. ✅ `claimedAt` được set
4. ✅ `InventoryItem.quantity` giảm
5. ✅ `InventoryItem.reservedQuantity` giảm
6. ✅ Nếu `quantity === 0`: status chuyển thành `OUT_OF_STOCK`

**Edge Case - Claim khi APPROVED qty = 0**:
**Expected**: Claim thành công nhưng carriedQty = 0, inventory không thay đổi.

---

#### 3.2 Claim Vehicle
**Endpoint**: `PATCH /api/timeline-vehicles/:id/claim`

**Expected Results**:
- TimelineVehicle status `APPROVED` → `CLAIMED`
- `claimedAt` được set
- (Vehicle đã là `IN_USE` từ khi manager approve)

---

#### 3.3 Return Supply
**Endpoint**: `PATCH /api/timeline-supplies/:id/return`

**Prerequisite**: Team đã complete ít nhất 1 TeamRequest với `suppliesDeliveredTotal`

**Expected Results**:
1. ✅ Tính `totalDistributed` từ tất cả TeamRequests của team
2. ✅ `returnedQty` = `carriedQty - totalDistributed`
3. ✅ TimelineSupply status `CLAIMED` → `RETURNED`
4. ✅ `returnedAt` được set
5. ✅ `InventoryItem.quantity` tăng lên theo `returnedQty`
6. ✅ Nếu status là `OUT_OF_STOCK`: chuyển về `ACTIVE`

**Sample Response (200)**:
```json
{
  "data": {
    "timelineSupply": { "status": "RETURNED", "returnedQty": 3 },
    "totalDistributed": 7,
    "returnedQty": 3
  }
}
```

**Edge Case - Distributed > Carried**:
**Expected**: `returnedQty = 0`, warning log `"Team distributed (15) more than carried (10)"`

---

#### 3.4 Return Vehicle
**Endpoint**: `PATCH /api/timeline-vehicles/:id/return`

**Expected Results**:
- TimelineVehicle status `CLAIMED` → `RETURNED`
- Vehicle status `IN_USE` → `ACTIVE`

---

### Phase 4: Edge Cases - Withdraw & Cancel

#### 4.1 Withdraw Timeline (Team action)
**Endpoint**: `PATCH /api/timelines/:id/withdraw`

**Request Body**:
```json
{
  "withdrawalReason": "Team bị ốm, không thể tham gia"
}
```

**Case A - Withdraw từ PENDING_APPROVAL**:
**Expected**:
1. ✅ Tất cả TimelineSupply `RESERVED` → `REJECTED` với auto-note
2. ✅ Tất cả TimelineVehicle `RESERVED` → `REJECTED`
3. ✅ `InventoryItem.reservedQuantity` giảm về 0
4. ✅ Timeline status `PENDING_APPROVAL` → `WITHDRAWN`

**Case B - Withdraw từ ASSIGNED (chưa accept)**:
**Expected**: Timeline `ASSIGNED` → `WITHDRAWN`, không có gì để release.

---

#### 4.2 Cancel Timeline (Coordinator action)
**Endpoint**: `PATCH /api/timelines/:id/cancel`

**Case A - Cancel từ PENDING_APPROVAL**:
**Expected**: Giống như Withdraw Case A, nhưng status → `CANCELLED`

**Case B - Cancel từ ASSIGNED**:
**Expected**: Timeline `ASSIGNED` → `CANCELLED`

---

## 📊 Verification Checklist

Sau mỗi step, verify bằng cách query trực tiếp database:

```javascript
// Check TimelineSupply status
db.timelinesupplies.find({ timelineId: ObjectId("...") })

// Check Inventory reservation
db.inventoryitems.find({ _id: ObjectId("...") }, { quantity: 1, reservedQuantity: 1 })

// Check Timeline status
db.timelines.find({ _id: ObjectId("...") }, { status: 1 })

// Check Vehicle status
db.vehicles.find({ _id: ObjectId("...") }, { status: 1 })
```

---

## 🎯 Critical Test Scenarios

| # | Scenario | Input | Expected Result |
|---|----------|-------|-----------------|
| 1 | 2 teams cùng accept cùng lúc | Team A và B cùng gửi accept với cùng vehicle | Một team thành công, một team fail với `"Vehicle đã được đặt trước"` |
| 2 | Manager approve giảm qty | `approvedQty: 5` khi `requestedQty: 10` | `reservedQuantity` giảm 5, status APPROVED |
| 3 | Approve tất cả supplies nhưng reject vehicles | 3 supplies APPROVED, 1 vehicle REJECTED | Timeline vẫn ở `PENDING_APPROVAL` (không auto-transition) |
| 4 | Claim sau đó return partial | carried=10, distributed=6 | returnedQty=4, inventory +4 |
| 5 | Withdraw sau khi đã claim | Timeline ở `CLAIMING_SUPPLIES` hoặc sau | **Không cho withdraw** - transition không hợp lệ |

---

## ⚡ Performance Notes

- `GET /api/missions/:id/accept-info`: Chỉ 3 DB queries (batch optimized)
- `PATCH /api/timelines/:id/accept`: Wrapped trong transaction, atomic
- Race condition handled: Vehicle reservation check có unique constraint protection

---

*Last Updated: Supply Allocation Redesign v2.0*
