# Swagger (OpenAPI) Folder Structure for Express.js

Tài liệu này mô tả **cấu trúc thư mục Swagger chuẩn** cho dự án **Node.js + Express.js**, phù hợp cho:

- Project nhóm
- API production
- Dễ bảo trì, mở rộng, và onboard thành viên mới

---

## 1. Mục tiêu của cấu trúc này

- Swagger **độc lập với code Express**
- Chia theo **domain nghiệp vụ**
- Tái sử dụng schema, response, parameter
- Dễ đọc như một **API Contract**

---

## 2. Cấu trúc thư mục tổng thể

```txt
swagger/
├── openapi.yaml
├── tags.yaml
├── paths/
│   ├── auth.yaml
│   ├── users.yaml
│   ├── products.yaml
└── components/
    ├── schemas/
    │   ├── user.schema.yaml
    │   ├── auth.schema.yaml
    │   └── product.schema.yaml
    ├── responses.yaml
    ├── parameters.yaml
    └── security.yaml
```

### Giải thích:

- `openapi.yaml`: Tập tin chính định nghĩa OpenAPI, tham chiếu các phần khác.
- `tags.yaml`: Định nghĩa các tag dùng để nhóm API theo domain.
- `paths/`: Chứa các định nghĩa endpoint, chia theo domain (auth, users, products).
- `components/`: Chứa các thành phần tái sử dụng như schema, responses, parameters, security.
- `schemas/`: Chứa các định nghĩa schema dữ liệu.
- `responses.yaml`: Định nghĩa các response tái sử dụng.
- `parameters.yaml`: Định nghĩa các parameter tái sử dụng.
- `security.yaml`: Định nghĩa các cơ chế bảo mật (ví dụ: JWT, OAuth2).

---
