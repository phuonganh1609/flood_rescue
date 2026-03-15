# Team Module — Luồng hoạt động & Validation

## 1. Data Model

### Team (`team.model.js`)
| Field | Type | Ghi chú |
|---|---|---|
| `_id` | ObjectId | Auto-generated |
| `name` | String | Unique, required, trim |
| `leaderId` | ObjectId (ref: User) | Nullable — team có thể không có leader |
| `status` | String enum | `AVAILABLE` \| `BUSY`, default `AVAILABLE` |
| `createdAt` / `updatedAt` | Date | Auto timestamps |

### Quan hệ với User
- **Thành viên không được lưu trong Team** — thay vào đó `User.teamId` trỏ về `Team._id` (back-reference).
- Khi xóa khỏi team: `User.teamId = null`.
- Khi thêm vào team: `User.teamId = team._id` và `User.role` được tự động đổi thành `"Rescue Team"`.

---

## 2. Endpoint & Phân quyền

| Method | Endpoint | Middleware auth | Ghi chú |
|---|---|---|---|
| `GET` | `/api/teams` | `authenticate` + `authorize(Coordinator, Admin)` | |
| `POST` | `/api/teams` | `authenticate` + `authorize(Coordinator, Admin)` | |
| `GET` | `/api/teams/:teamId` | `authenticate` + `authorize(Coordinator, Admin, Rescue Team)` + `authorizeTeamMember` | Rescue Team chỉ xem được team của mình |
| `PATCH` | `/api/teams/:teamId` | `authenticate` + `authorize(Coordinator, Admin)` | |
| `DELETE` | `/api/teams/:teamId` | `authenticate` + `authorize(Coordinator, Admin)` | |
| `PATCH` | `/api/teams/:teamId/leader` | `authenticate` + `authorize(Coordinator, Admin)` | |
| `POST` | `/api/teams/:teamId/members` | `authenticate` + `authorize(Coordinator, Admin, Rescue Team)` + `authorizeTeamLeader` | Rescue Team chỉ khi là leader |
| `DELETE` | `/api/teams/:teamId/members/:userId` | `authenticate` + `authorize(Coordinator, Admin, Rescue Team)` + `authorizeTeamLeader` | Rescue Team chỉ khi là leader |

### Middleware chi tiết

#### `authenticate`
- Đọc `Authorization: Bearer <token>`.
- Verify JWT bằng `JWT_SECRET`.
- Gán `req.user = decoded.user` (gồm `id`, `role`).
- Lỗi: `401` nếu không có token hoặc token không hợp lệ.

#### `authorize(allowedRoles[])`
- Kiểm tra `req.user.role` có nằm trong `allowedRoles` không.
- Lỗi: `403 Access denied` nếu role không phù hợp.

#### `authorizeTeamMember`
- Bypass cho `Rescue Coordinator` / `Admin`.
- Với `Rescue Team`: truy vấn `User.teamId` và so sánh với `req.params.teamId`.
- Lỗi: `403 You are not a member of this team`.

#### `authorizeTeamLeader`
- Bypass cho `Rescue Coordinator` / `Admin`.
- Với `Rescue Team`: truy vấn `Team.leaderId` và so sánh với `req.user.id`.
- Lỗi: `404` nếu team không tồn tại, `403 Only the team leader can perform this action` nếu không phải leader.

---

## 3. Luồng từng API

### GET /api/teams — Lấy danh sách team

**Query params:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `page` | integer | Trang, default `1` |
| `limit` | integer | Số item/trang, default `10` |
| `status` | string | Filter: `AVAILABLE` \| `BUSY` |
| `name` | string | Tìm theo tên (regex, case-insensitive) |
| `active` | integer ≥ 0 | Filter theo số thành viên active **chính xác** |
| `leader` | string | Filter theo tên leader (contains, case-insensitive). Team không có leader bị loại ra khi dùng filter này |
| `sortBy` | string | `name` \| `status` \| `createdAt` \| `active` \| `leader` |
| `order` | string | `asc` \| `desc`, default `desc` |

**Validation controller:**
- `active` phải là số nguyên không âm → `400` nếu sai.

**Luồng:**
```
controller.getAllTeams
  → service.getAllTeams(filter, pagination, sort, options)
  → repository.findAllWithStats(...)
      ├─ $match filter (status, name)
      ├─ $lookup users → leaderInfo (unwind, preserveNull)
      ├─ $lookup users by teamId → members[]
      ├─ $addFields: teamLeader, leaderId (cùng shape, null nếu chưa có leader), memberStats
      ├─ $match active (nếu có)
      ├─ $match leader displayName regex (nếu có, loại team không có leader)
      ├─ $project (ẩn members[], leaderInfo)
      └─ $facet { data: [sort, skip, limit], total: [count] }
```

**Response mẫu:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Alpha",
      "status": "AVAILABLE",
      "leaderId": { "_id": "...", "displayName": "Nguyen A", "role": "Rescue Team", ... },
      "teamLeader": { "_id": "...", "displayName": "Nguyen A", "role": "Rescue Team", ... },
      "memberStats": { "total": 6, "rescue": 5, "active": 4 },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

> `leaderId` được giữ nguyên (tương thích ngược). `teamLeader` là field mới rõ nghĩa hơn.  
> Khi team chưa có leader: cả `leaderId` và `teamLeader` đều là `null`.

---

### GET /api/teams/:teamId — Lấy chi tiết team

**Validation controller:**
- `teamId` phải là MongoDB ObjectId hợp lệ → `400 Invalid team ID`.

**Luồng:**
```
controller.getTeam
  → service.getTeamById(teamId)
  → repository.findByIdWithStats(teamId)
      ├─ $match _id = teamId
      ├─ $lookup leaderInfo
      ├─ $lookup members[]
      ├─ $addFields: teamLeader, memberStats
      ├─ $project (ẩn leaderInfo, members.hashedPassword, members.avatarId)
      └─ $limit 1
```

**Response:** Giống item trong list, thêm `members[]` đầy đủ thông tin (trừ `hashedPassword`, `avatarId`).

---

### POST /api/teams — Tạo team

**Request body (Joi validation):**
| Field | Bắt buộc | Rule |
|---|---|---|
| `name` | ✅ | string, trim, 2–100 ký tự |
| `leaderId` | ❌ | ObjectId 24 hex, optional |

**Business rules (service):**
1. `name` phải unique → `400 Team name already exists`.
2. Nếu có `leaderId`: user phải tồn tại → `400 Leader not found`.
3. Nếu có `leaderId`: user đó chưa thuộc team nào (`teamId = null`) → `400 Leader already belongs to a team`.
4. Sau khi pass validate, tạo team xong sẽ gọi `addMember(leaderId, team._id)` để gán leader là thành viên đầu tiên và đổi role thành `Rescue Team`.

---

### PATCH /api/teams/:teamId — Cập nhật team

**Request body (Joi validation):**
| Field | Rule |
|---|---|
| `name` | string, trim, 2–100 ký tự |
| `leaderId` | ObjectId 24 hex |

Ít nhất 1 field phải có → `400 At least one field must be provided`.

**Business rules (service):**
1. Team phải tồn tại → `404`.
2. Nếu đổi `name`: kiểm tra unique → `400 Team name already exists`.
3. Nếu đổi `leaderId`: leader mới phải là thành viên hiện tại của team → `400 New leader must be a member of this team`.

---

### DELETE /api/teams/:teamId — Xóa team

**Business rules (service), theo thứ tự:**
1. Team phải tồn tại → `404`.
2. `status` phải là `AVAILABLE` → `400 Cannot delete a BUSY team`.
3. Không có timeline active (`ASSIGNED`, `EN_ROUTE`, `ON_SITE`) → `400 Cannot delete team with active timelines`.
4. Không còn thành viên nào → `400 Cannot delete team with members. Remove all members first`.

---

### PATCH /api/teams/:teamId/leader — Đổi leader

**Request body (Joi validation):**
| Field | Bắt buộc | Rule |
|---|---|---|
| `newLeaderId` | ✅ | ObjectId 24 hex |

**Business rules (service):**
1. Team phải tồn tại → `404`.
2. `status` phải là `AVAILABLE` → `400 Cannot change leader while the team is BUSY`.
3. `newLeaderId` không được là leader hiện tại → `400 User is already the leader of this team`.
4. `newLeaderId` phải là thành viên của team → `400 New leader must be a member of this team`.

---

### POST /api/teams/:teamId/members — Thêm thành viên

**Request body (Joi validation):**
| Field | Bắt buộc | Rule |
|---|---|---|
| `userId` | ✅ | ObjectId 24 hex |

**Business rules (service):**
1. Team phải tồn tại → `404`.
2. User phải tồn tại → `400 User not found`.
3. `role` của user phải là `Citizen` hoặc `Rescue Team` → `400 Only users with role 'Citizen' or 'Rescue Team' can be added`.
4. `User.teamId` phải là `null` (chưa thuộc team nào) → `400 User already belongs to a team`.
5. Sau khi thêm: `User.teamId = team._id`, `User.role = "Rescue Team"` (tự động).

---

### DELETE /api/teams/:teamId/members/:userId — Xóa thành viên

**Business rules (service):**
1. Team phải tồn tại → `404`.
2. Không được xóa chính mình (`requesterId === userId`) → `400 Cannot remove yourself from the team`.
3. Không được xóa leader (`team.leaderId === userId`) → `400 Cannot remove the team leader. Change leader first`.
4. Sau khi xóa: `User.teamId = null` (role không tự động đổi lại).

---

## 4. memberStats — Định nghĩa

Được tính bằng aggregation trên collection `users` với `User.teamId = team._id`:

| Field | Ý nghĩa |
|---|---|
| `total` | Tổng số user thuộc team |
| `rescue` | Số user có `role = "Rescue Team"` |
| `active` | Số user có `isActive = true` |

---

## 5. Tổng hợp lỗi phổ biến

| Tình huống | HTTP | Message |
|---|---|---|
| Không có token | 401 | Không có token, truy cập bị từ chối |
| Token không hợp lệ | 401 | Token không hợp lệ |
| Không đủ role | 403 | Access denied |
| Không phải member của team | 403 | You are not a member of this team |
| Không phải leader của team | 403 | Only the team leader can perform this action |
| teamId/userId không phải ObjectId | 400 | Invalid team ID / Invalid team or user ID |
| active query không phải số nguyên ≥ 0 | 400 | active must be a non-negative integer |
| Tên team đã tồn tại | 400 | Team name already exists |
| leaderId không tồn tại khi tạo team | 400 | Leader not found |
| leaderId đã thuộc team khác khi tạo team | 400 | Leader already belongs to a team |
| User không phải Citizen/Rescue Team | 400 | Only users with role 'Citizen' or 'Rescue Team' can be added to a team |
| User đã có team | 400 | User already belongs to a team |
| Leader mới không phải member | 400 | New leader must be a member of this team |
| Xóa chính mình | 400 | Cannot remove yourself from the team |
| Xóa leader | 400 | Cannot remove the team leader. Change leader first |
| Xóa team đang BUSY | 400 | Cannot delete a BUSY team |
| Xóa team còn active timeline | 400 | Cannot delete team with active timelines |
| Xóa team còn member | 400 | Cannot delete team with members. Remove all members first |
| Đổi leader khi team BUSY | 400 | Cannot change leader while the team is BUSY |
| Leader mới = Leader cũ | 400 | User is already the leader of this team |
| Team không tồn tại | 404 | Team not found |
