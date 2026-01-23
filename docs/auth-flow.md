# Luồng xác thực (JWT)

## 1) Thành phần chính
- **Access token**: JWT (HS256) chứa `user.id`, `user.role`, hết hạn 30m.
- **Refresh token**: Chuỗi ngẫu nhiên 128 hex, lưu trong collection `sessions` (MongoDB) kèm `userId`, `expiresAt` (7 ngày), unique.
- **Cookie**: `refreshToken` được set HTTP-only, SameSite=Strict, Secure (prod), Max-Age 7 ngày.
- **Middleware**: `authenticate` đọc `Authorization: Bearer <accessToken>` và verify JWT.

## 2) Luồng endpoint
- **POST /api/auth/register**: Tạo user mới, hash password, mặc định role `Citizen`.
- **POST /api/auth/login**:
  1) Verify email/password, kiểm tra user active.
  2) Tạo `accessToken` (30m) + `refreshToken` (7d), lưu refresh vào DB (sessions).
  3) Trả `accessToken` + `user` trong body, set cookie `refreshToken` HTTP-only.
- **POST /api/auth/refresh**:
  1) Lấy `refreshToken` từ cookie.
  2) Tra cứu session theo refreshToken, kiểm tra hết hạn và user còn active.
  3) Trả `accessToken` mới + `user` trong body. (Không rotate refresh token theo yêu cầu hiện tại.)
- **GET /api/auth/me**: Yêu cầu header `Authorization: Bearer <accessToken>`, trả thông tin user hiện tại.
- **POST /api/auth/logout**:
  1) Yêu cầu access token (middleware authenticate) và cookie refreshToken.
  2) Xóa session theo refreshToken, clear cookie.

## 3) Lưu ý bảo mật
- Refresh token chỉ ở cookie HTTP-only, tránh lưu trong localStorage.
- SameSite=Strict để giảm CSRF; trong production bật `secure`.
- Không gửi refresh token trong body hay header cho các route khác.
- Access token ngắn (30m) để giảm rủi ro lộ token.

## 4) Mô hình dữ liệu
- **sessions**: `{ userId: ObjectId, refreshToken: string, expiresAt: Date, createdAt, updatedAt }` + index TTL trên `expiresAt`.

## 5) Trình tự thông điệp (tóm tắt)
1. Client login → nhận `accessToken` (body) + `refreshToken` (cookie).
2. Client gọi API protected kèm `Authorization: Bearer <accessToken>`.
3. Khi access token hết hạn → gọi **POST /api/auth/refresh** (cookie tự gửi) → nhận access token mới.
4. Logout → access token trong header + refresh token cookie → server xóa session, clear cookie.
