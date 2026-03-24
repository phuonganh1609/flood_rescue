# Supply Audit System — Design v3 (Refined)

## Key Insight: TeamRequest đã cover distribution

`TeamRequest.suppliesDeliveredTotal` = `[{name, deliveredQty}]` — đã tracking **mỗi team phát bao nhiêu supply cho mỗi request**. Không cần duplicate.

### Mapping 4 giai đoạn → entities

| Giai đoạn | Entity phụ trách | Ai cập nhật |
|---|---|---|
| **plannedQty** — Tổng supply cần cho mission | `MissionSupply` | System (aggregate từ MissionRequests) |
| **allocatedQty** — Manager reserve từ warehouse | `MissionSupply` | Manager |
| **carriedQty** — Team lấy từ kho (first-come-first-served) | `TimelineSupply` | Team (claim) |
| **distributedQty** — Team phát cho người dân | `TeamRequest.suppliesDeliveredTotal` | Team (đã có sẵn ✅) |
| **returnedQty** — Team trả lại | `TimelineSupply` | System (auto-calculate) |

> [!IMPORTANT]
> Không cần `distributedQty` trong TimelineSupply. TeamRequest đã handle. TimelineSupply chỉ cần `carriedQty` + `returnedQty`.

---

## Entity Design

### `MissionSupply` — Warehouse → Mission

```js
{
  missionId:       ObjectId,     // FK → Mission
  supplyId:        ObjectId,     // FK → Supply
  warehouseId:     ObjectId,     // FK → Warehouse
  inventoryItemId: ObjectId,     // FK → InventoryItem

  plannedQty:      Number,       // Tổng cần (aggregate từ MissionRequests)
  allocatedQty:    Number,       // Manager xác nhận reserve (default: 0)
  claimedQty:      Number,       // Tổng đã được team claim (SUM TimelineSupply.carriedQty)

  status:          String,       // REQUESTED → ALLOCATED → FULLY_CLAIMED → RETURNED
  allocatedBy:     ObjectId,     // Manager
  allocatedAt:     DateTime,

  createdAt, updatedAt
}
```

**Unique:** `{ missionId, supplyId }`

### `TimelineSupply` — Mission → Team (pickup & return)

```js
{
  timelineId:      ObjectId,     // FK → Timeline
  missionSupplyId: ObjectId,     // FK → MissionSupply (source)
  supplyId:        ObjectId,     // FK → Supply (denormalized for easy query)

  carriedQty:      Number,       // Số lượng team này claim/lấy từ kho
  returnedQty:     Number,       // Số trả lại = carriedQty - totalDistributed (auto-calc)

  claimedAt:       DateTime,     // Thời điểm claim
  returnedAt:      DateTime,     // Thời điểm trả

  createdAt, updatedAt
}
```

**Unique:** `{ timelineId, missionSupplyId }`

---

## Data Flow

```
Mission Start
    │
    ▼
╔═══════════════════════════════════════════╗
║  System: tạo MissionSupply               ║
║  plannedQty = aggregate MissionRequests   ║
║  status = REQUESTED                       ║
║  → Notification gửi Manager              ║
╚════════════════════┬══════════════════════╝
                     ▼
╔═══════════════════════════════════════════╗
║  Manager: POST /inventory/allocate       ║
║  Chọn warehouse → allocatedQty, status = ALLOCATED        ║
║  InventoryItem.reservedQuantity += allocatedQty            ║
╚════════════════════┬══════════════════════╝
                     ▼
╔═══════════════════════════════════════════════════════════╗
║  Team A: POST /timeline-supply/claim                     ║
║  → Tạo TimelineSupply { carriedQty: 60 }                 ║
║  → MissionSupply.claimedQty += 60                        ║
║  → InventoryItem: quantity -= 60, reservedQuantity -= 60  ║
║  → Phần còn lại (allocatedQty - claimedQty) available     ║
║    cho team khác                                          ║
╠═══════════════════════════════════════════════════════════╣
║  Team B: POST /timeline-supply/claim                     ║
║  → Tạo TimelineSupply { carriedQty: 40 }                 ║
║  → MissionSupply.claimedQty += 40                        ║
║  → Validate: claimedQty ≤ allocatedQty ✅                 ║
╚════════════════════┬══════════════════════════════════════╝
                     ▼
╔═══════════════════════════════════════════╗
║  Team phát supply → cập nhật             ║
║  TeamRequest.suppliesDeliveredTotal      ║
║  (entity ĐÃ CÓ SẴN, không thay đổi gì)  ║
╚════════════════════┬══════════════════════╝
                     ▼
╔══════════════════════════════════════════════════════════════╗
║  Team A bấm "Trả supply" (khi mission kết thúc)            ║
║  totalDistributed = SUM(TeamRequest.suppliesDeliveredTotal)  ║
║                     cho team A, supply này                   ║
║  returnedQty = carriedQty - totalDistributed                 ║
║  InventoryItem.quantity += returnedQty                        ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Validation Rules

| Rule | Kiểm tra |
|---|---|
| Team không lấy quá allocation | `MissionSupply.claimedQty ≤ allocatedQty` |
| Team không phát quá mang | `SUM(TeamRequest.suppliesDelivered for team) ≤ TimelineSupply.carriedQty` |
| Return tự động đúng | `returnedQty = carriedQty - totalDistributed` |
| Inventory balanced | `InventoryItem.quantity` luôn ≥ 0 |

---

## Quan hệ tổng thể

```
Warehouse ──▶ InventoryItem ──▶ MissionSupply ──▶ TimelineSupply
                                  (Mission)         (per Team)
                                                        │
                                                        ▼
                                              TeamRequest.suppliesDeliveredTotal
                                                   (per Team × per Request)
                                                     (ĐÃ CÓ SẴN)
```

> [!TIP]
> **Ưu điểm lớn nhất:** Không duplicate data. Mỗi entity lo 1 việc:
> - `MissionSupply`: warehouse audit (xuất từ đâu, bao nhiêu)
> - `TimelineSupply`: team logistics (ai mang, trả bao nhiêu)
> - `TeamRequest`: distribution (phát cho ai, bao nhiêu) — **đã có sẵn**
