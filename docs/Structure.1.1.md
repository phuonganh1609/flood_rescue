<!-- prettier-ignore-file -->

# CẤU TRÚC THƯ MỤC DỰ ÁN - Phiên bản 1.1

👉 Quy ước
| Thành phần | Chức năng |
|---------------|-----------|
| `controller` | HTTP (req, res) |
| `service` | Business logic |
| `repository` | DB access |
| `routes` | Map endpoint |
| `validation` | Joi / Zod |
| `model` | ORM: mongoose |

```plaintext
flood_rescue/
├── package.json                    # ✓
├── .env                            # ✓
├── .gitignore                      # ✓
│
├── src/                            # ✓ Di chuyển toàn bộ code vào đây
│   ├── app.js                      # ✓ Entry point chính
│   ├── server.js                   # ✓ Server logic
│   │
│   ├── config/                     # ✓ Đã có
│   │   ├── database.js             # ✓
│   │   ├── env.js                  # + Thêm: centralize env vars
│   │   ├── jwt.js                  # + Thêm: JWT config
│   │   └── roles.js                # + Thêm: Role constants
│   │
│   ├── middlewares/                # ✓ Đã có
│   │   ├── auth.middleware.js      # ✓ Đã có
│   │   ├── role.middleware.js      # + Thêm
│   │   ├── error.middleware.js     # + Thêm: Global error handler
│   │   └── validate.middleware.js  # + Thêm: Validation middleware
│   │
│   ├── utils/                      # + Thêm
│   │   ├── logger.js               # + Thêm
│   │   ├── response.js             # + Thêm: Standardized responses
│   │   ├── pagination.js           # + Thêm
│   │   └── constants.js            # + Thêm
│   │
│   ├── sockets/                    # ✓ Đã có
│   │   └── teamPosition.socket.js  # + Thêm
│   │
│   ├── routes/                     # + Thêm
│   │   └── index.js                # + Thêm: Aggregate tất cả routes
│   │
│   ├── modules/                    # ✓ Đã có
│   │   ├── auth/                   # ✓ Đã có
│   │   │   ├── auth.controller.js  # ✓ Di chuyển từ controller/authController.js
│   │   │   ├── auth.service.js     # + Thêm (đang có auth.server.js - cần đổi tên)
│   │   │   ├── auth.repository.js  # ✓ Đã có
│   │   │   ├── auth.routes.js      # ✓ Di chuyển từ route/authRoute.js
│   │   │   ├── auth.validation.js  # ✓ Đã có
│   │   │   └── token.util.js       # + Thêm
│   │   │
│   │   ├── users/                  # ✓ Đã có
│   │   │   ├── user.controller.js  # + Thêm
│   │   │   ├── user.service.js     # + Thêm
│   │   │   ├── user.repository.js  # + Thêm
│   │   │   ├── user.routes.js      # + Thêm
│   │   │   ├── user.validation.js  # + Thêm
│   │   │   └── user.model.js       # ✓ Di chuyển từ model/user.js
│   │   │
│   │   ├── requests/               # ✓ Đã có
│   │   │   ├── request.controller.js   # + Thêm
│   │   │   ├── request.service.js      # + Thêm
│   │   │   ├── request.repository.js   # + Thêm
│   │   │   ├── request.routes.js       # + Thêm
│   │   │   ├── request.validation.js   # + Thêm
│   │   │   └── request.model.js        # ✓ Di chuyển từ model/request.js
│   │   │
│   │   ├── missions/               # ✓ Đã có (folder rỗng)
│   │   │   ├── mission.controller.js   # + Thêm
│   │   │   ├── mission.service.js      # + Thêm
│   │   │   ├── mission.repository.js   # + Thêm
│   │   │   ├── mission.routes.js       # + Thêm
│   │   │   ├── mission.validation.js   # + Thêm
│   │   │   └── mission.state.js        # + Thêm: FSM cho mission states
│   │   │
│   │   ├── teams/                  # ✓ Đã có
│   │   │   ├── team.controller.js      # + Thêm
│   │   │   ├── team.service.js         # + Thêm
│   │   │   ├── team.repository.js      # + Thêm
│   │   │   ├── team.routes.js          # + Thêm
│   │   │   ├── team.validation.js      # + Thêm
│   │   │   ├── teamMember.model.js     # ✓ Di chuyển từ model/TeamMember.js
│   │   │   ├── teamRescue.model.js     # ✓ Di chuyển từ model/TeamRescue.js
│   │   │   └── teamPosition.service.js # + Thêm: Realtime tracking
│   │   │
│   │   ├── resources/              # ✓ Đã có (folder rỗng)
│   │   │   ├── resource.controller.js  # + Thêm
│   │   │   ├── resource.service.js     # + Thêm
│   │   │   ├── resource.repository.js  # + Thêm
│   │   │   ├── resource.routes.js      # + Thêm
│   │   │   └── resource.validation.js  # + Thêm
│   │   │
│   │   ├── inventory/              # ✓ Đã có (folder rỗng)
│   │   │   ├── inventory.controller.js # + Thêm
│   │   │   ├── inventory.service.js    # + Thêm
│   │   │   ├── inventory.repository.js # + Thêm
│   │   │   ├── inventory.routes.js     # + Thêm
│   │   │   └── inventory.validation.js # + Thêm
│   │   │
│   │   ├── notifications/          # ✓ Đã có (folder rỗng)
│   │   │   ├── notification.controller.js  # + Thêm
│   │   │   ├── notification.service.js     # + Thêm
│   │   │   ├── notification.repository.js  # + Thêm
│   │   │   ├── notification.routes.js      # + Thêm
│   │   │   └── notification.validation.js  # + Thêm
│   │   │
│   │   ├── reports/                # ✓ Đã có (folder rỗng)
│   │   │   ├── report.controller.js    # + Thêm
│   │   │   ├── report.service.js       # + Thêm
│   │   │   ├── report.repository.js    # + Thêm
│   │   │   ├── report.routes.js        # + Thêm
│   │   │   └── report.validation.js    # + Thêm
│   │   │
│   │   └── system/                 # ✓ Đã có (folder rỗng)
│   │       ├── system.controller.js    # + Thêm
│   │       ├── system.service.js       # + Thêm
│   │       ├── system.routes.js        # + Thêm
│   │       └── system.validation.js    # + Thêm
│   │
│   └── shared/                     # + Thêm (Optional)
│       └── base.repository.js      # + Thêm: Base class cho repositories
│
├── docs/                           # ✓
│   ├── API_list.md                 # ✓
│   ├── Structure.md                # ✓
│   └── Structure.1.1.md            # ✓ File này
│
└── swagger/                        # ✓
    └── swagger.yaml                # ✓

---

## 📋 TỔNG KẾT CÁC PHASE CÔNG VIỆC

### ✅ Phase 1: Chuẩn bị cơ sở hạ tầng (HOÀN THÀNH)
- [x] Tạo thư mục src/
- [x] Di chuyển app.js vào src/
- [x] Tạo server.js trong src/
- [x] Di chuyển config/ vào src/
- [x] Di chuyển middleware/ vào src/
- [x] Tạo sockets/ trong src/
- [x] Xóa các thư mục cũ ở root (controller/, model/, route/, config/, middleware/, modules/, sockets/, utils/)

### ✅ Phase 2: Restructure Auth Module (HOÀN THÀNH)
- [x] Di chuyển controller/authController.js → src/modules/auth/auth.controller.js
- [x] Di chuyển route/authRoute.js → src/modules/auth/auth.routes.js
- [x] Tạo src/modules/auth/auth.repository.js
- [x] Tạo src/modules/auth/auth.validation.js
- [x] Cập nhật imports trong src/app.js
- [x] Cập nhật imports trong src/middleware/authMiddleware.js

### ✅ Phase 3: Restructure Models → Modules (HOÀN THÀNH)
- [x] model/user.js → src/modules/users/user.model.js
- [x] model/request.js → src/modules/requests/request.model.js
- [x] model/TeamMember.js → src/modules/teams/teamMember.model.js
- [x] model/TeamRescue.js → src/modules/teams/teamRescue.model.js

### ✅ Phase 4: Hoàn thiện Auth Module (HOÀN THÀNH)
- [x] Refactor auth.controller.js - tách business logic
- [x] Tạo auth.service.js - business logic layer
- [x] Tạo auth.repository.js - database access layer
- [x] Tạo token.util.js - JWT utilities
- [x] Tạo auth.validation.js - Joi validation schemas
- [x] Tạo validate.middleware.js - validation middleware
- [x] Cập nhật auth.routes.js - thêm validation middleware

### 📝 Phase 5: Tạo Users Module (CHƯA LÀM)
- [ ] Tạo user.controller.js
- [ ] Tạo user.service.js
- [ ] Tạo user.repository.js
- [ ] Tạo user.routes.js
- [ ] Tạo user.validation.js

### 📝 Phase 6: Tạo Requests Module (CHƯA LÀM)
- [ ] Tạo request.controller.js
- [ ] Tạo request.service.js
- [ ] Tạo request.repository.js
- [ ] Tạo request.routes.js
- [ ] Tạo request.validation.js

### 📝 Phase 7: Tạo Teams Module (CHƯA LÀM)
- [ ] Tạo team.controller.js
- [ ] Tạo team.service.js
- [ ] Tạo team.repository.js
- [ ] Tạo team.routes.js
- [ ] Tạo team.validation.js
- [ ] Tạo teamPosition.service.js

### 📝 Phase 8: Tạo Missions Module (CHƯA LÀM)
- [ ] Tạo mission.controller.js
- [ ] Tạo mission.service.js
- [ ] Tạo mission.repository.js
- [ ] Tạo mission.routes.js
- [ ] Tạo mission.validation.js
- [ ] Tạo mission.state.js (FSM)

### 📝 Phase 9: Infrastructure & Utilities (CHƯA LÀM)
- [ ] Tạo src/utils/logger.js
- [ ] Tạo src/utils/response.js
- [ ] Tạo src/utils/pagination.js
- [ ] Tạo src/utils/constants.js
- [ ] Tạo src/middleware/role.middleware.js
- [ ] Tạo src/middleware/error.middleware.js
- [ ] Tạo src/middleware/validate.middleware.js
- [ ] Tạo src/routes/index.js (Route aggregation)
- [ ] Tạo src/config/env.js
- [ ] Tạo src/config/jwt.js
- [ ] Tạo src/config/roles.js

### 📝 Phase 10: Các Module Còn Lại (CHƯA LÀM)
- [ ] Resources module (5 files)
- [ ] Inventory module (5 files)
- [ ] Notifications module (5 files)
- [ ] Reports module (5 files)
- [ ] System module (4 files)

### 📝 Phase 11: Testing & Documentation (CHƯA LÀM)
- [ ] Viết unit tests cho từng module
- [ ] Cập nhật Swagger documentation
- [ ] Cập nhật API_list.md
- [ ] Code review và refactoring

---

**Tiến độ tổng thể: ~36%** (4/11 phases hoàn thành)
```
