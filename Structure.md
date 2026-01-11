src/
├── app.js
├── server.js
├── config/
│ ├── env.js
│ ├── database.js
│ ├── jwt.js
│ └── roles.js
├── middlewares/
│ ├── auth.middleware.js
│ ├── role.middleware.js
│ ├── error.middleware.js
│ └── validate.middleware.js
├── utils/
│ ├── logger.js
│ ├── response.js
│ ├── pagination.js
│ └── constants.js
├── sockets/
│ └── teamPosition.socket.js
├── routes/
│ └── index.js # Entry point duy nhất để đăng ký tất cả module routes
│
├── modules/
│ ├── missions/
│ ├── auth/
│ ├── users/
│ ├── requests/
│ ├── missions/
│ ├── teams/
│ ├── resources/
│ ├── inventory/
│ ├── notifications/
│ ├── reports/
│ └── system/
│
└── shared/ # (Tùy chọn) Chứa các Base class hoặc logic dùng chung cho các module
└── base.repository.js

## 📦 Cấu trúc 1 Module Chuẩn

Ví dụ: requests module

modules/requests/
├── request.controller.js
├── request.service.js
├── request.repository.js
├── request.routes.js
├── request.validation.js
└── request.model.js (optional – nếu dùng ORM)

👉 Quy ước
`controller`: HTTP (req, res)
`service`: business logic
`repository`: DB access
`routes`: map endpoint
`validation`: Joi / Zod
`model`: Sequelize / Prisma / TypeORM

# CHI TIẾT CÁC MODULE

## 🔐 Auth Module

modules/auth/
├── auth.controller.js
├── auth.service.js
├── auth.routes.js
├── auth.validation.js
└── token.util.js

- Login
- Register
- JWT refresh

## 👤 Users & Roles

modules/users/
├── user.controller.js
├── user.service.js
├── user.repository.js
├── user.routes.js
└── user.validation.js

## 🚨 Requests (SOS)

modules/requests/
├── request.controller.js
├── request.service.js
├── request.repository.js
├── request.routes.js
└── request.validation.js

Business logic:

- Create request
- Verify / Priority
- Confirm safe

## 🚑 Missions

modules/missions/
├── mission.controller.js
├── mission.service.js
├── mission.repository.js
├── mission.routes.js
├── mission.validation.js
└── mission.state.js <-- FSM cho mission

📌 mission.state.js

- Accepted
- Approaching
- Rescued
- Failed

## 🧭 Teams & Tracking

modules/teams/
├── team.controller.js
├── team.service.js
├── team.repository.js
├── team.routes.js
└── teamPosition.service.js

## 📡 Realtime:

sockets/
└── teamPosition.socket.js

## 🚚 Resources & Inventory

modules/resources/
├── resource.controller.js
├── resource.service.js
├── resource.repository.js
└── resource.routes.js

modules/inventory/
├── inventory.controller.js
├── inventory.service.js
├── inventory.repository.js
└── inventory.routes.js

## 📦 Notifications

modules/notifications/
├── notification.controller.js
├── notification.service.js
├── notification.repository.js
└── notification.routes.js

## 📊 Reports

modules/reports/
├── report.controller.js
├── report.service.js
├── report.repository.js
└── report.routes.js

## ⚙️ System Config (Admin)

modules/system/
├── system.controller.js
├── system.service.js
├── system.routes.js
└── system.validation.js

## 🧱 Middlewares

middlewares/
├── auth.middleware.js // verify JWT
├── role.middleware.js // RBAC
├── validate.middleware.js // Joi / Zod
└── error.middleware.js // global error

## 🌐 Route Aggregation

// routes/index.js
router.use('/auth', authRoutes);
router.use('/requests', requestRoutes);
router.use('/missions', missionRoutes);
router.use('/resources', resourceRoutes);
