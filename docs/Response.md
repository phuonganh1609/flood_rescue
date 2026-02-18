# API Response Guideline (for FE)

Tài liệu này mô tả **response thực tế** đang được backend trả về trong dự án.

## 1. Mẫu chuẩn (đa số API)

Nguồn chuẩn: `src/utils/response.js`.

### 1.1 Success

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}
```

- `success`: luôn là `true`.
- `message`: chuỗi mô tả (có thể tiếng Việt hoặc tiếng Anh).
- `data`: dữ liệu chính. Có thể là object, array, hoặc `null`.
- `meta` (optional): metadata, thường dùng cho pagination.

### 1.2 Error

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": []
  }
}
```

- `success`: luôn là `false`.
- `message`: mô tả lỗi.
- `data`: luôn `null`.
- `error.code`: mã lỗi logic (`INTERNAL_ERROR`, `VALIDATION_ERROR`, ...).
- `error.details` (optional): chi tiết lỗi validate/debug.

## 2. Pagination

Các API list thường trả `meta`:

```json
{
  "success": true,
  "message": "Success",
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

Hiện tại tên field pagination có thể khác nhau giữa module, nhưng phổ biến là: `total`, `page`, `limit`, `totalPages`.

## 3. Status code thường gặp

- `200`: thành công.
- `201`: tạo mới thành công.
- `204`: thành công nhưng **không có body** (logout).
- `400`: bad request / validation.
- `401`: chưa đăng nhập, token sai/hết hạn.
- `403`: không đủ quyền.
- `404`: không tìm thấy dữ liệu/route.
- `500`: lỗi hệ thống.

## 4. Ngoại lệ FE cần xử lý riêng

### 4.1 `GET /ping`

Trả plain text:

```text
pong
```

Không theo JSON wrapper.

### 4.2 `POST /api/auth/logout`

Trả `204 No Content`, body rỗng.

### 4.3 Một số lỗi auth middleware

`src/middlewares/authMiddleware.js` đang trả:

```json
{ "message": "..." }
```

không có `success/data/error`.

### 4.4 `error.details` có 2 dạng

Tùy endpoint, `error.details` có thể là:

1. `string[]` (từ `validate.middleware.js`).
2. `[{ field, message }]` (một số controller tự validate).

FE nên normalize trước khi hiển thị.

## 5. Ví dụ thực tế

### 5.1 Login thành công

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "...",
    "user": {
      "_id": "...",
      "role": "Citizen"
    }
  }
}
```

> `refreshToken` được set bằng cookie `httpOnly`, không nằm trong body.

### 5.2 Lấy danh sách requests

```json
{
  "success": true,
  "message": "Success",
  "data": [
    { "_id": "r1" },
    { "_id": "r2" }
  ],
  "meta": {
    "total": 24,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### 5.3 Validation error

```json
{
  "success": false,
  "message": "Validation error",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      "\"email\" must be a valid email"
    ]
  }
}
```

## 6. Gợi ý parse response ở FE

- Bước 1: kiểm tra HTTP status.
- Bước 2: nếu `204`, coi như success và return `null`.
- Bước 3: nếu có JSON:
  - Ưu tiên đọc `success`.
  - Fallback cho case legacy/auth middleware: nếu không có `success` nhưng status >= 400, dùng `message` trực tiếp.
- Bước 4: normalize `error.details` về cùng 1 dạng hiển thị.

## 7. Kết luận cho FE

Trong dự án này, đa số endpoint đã theo wrapper thống nhất:

- Success: `{ success, message, data, meta? }`
- Error: `{ success, message, data: null, error: { code, details? } }`

Nhưng FE vẫn cần support một vài ngoại lệ (`/ping`, `204`, auth middleware trả `{message}`) để tránh lỗi runtime.
