# Hướng dẫn chạy E2E Tests

## Bước 1: Khởi động Backend Server

Mở terminal thứ nhất và chạy:

```bash
cd e:\E\Learning\Sem5\SWP391\Flood\flood_rescue
npm start
```

Đợi cho đến khi thấy:
```
🚀 Server running on http://localhost:8080
📍 Environment: development
🔌 WebSocket server ready
```

## Bước 2: Chạy E2E Tests

Mở terminal thứ hai và chạy:

```bash
cd e:\E\Learning\Sem5\SWP391\Flood\flood_rescue

# Chạy tất cả E2E tests
npm run test:e2e

# Hoặc chạy từng test suite
npx playwright test tests/e2e/01-request-lifecycle.spec.js
npx playwright test tests/e2e/02-mission-planning.spec.js
npx playwright test tests/e2e/03-timeline-execution.spec.js
npx playwright test tests/e2e/04-progress-tracking.spec.js
npx playwright test tests/e2e/05-status-derivation.spec.js
npx playwright test tests/e2e/06-supply-management.spec.js
npx playwright test tests/e2e/07-edge-cases.spec.js
```

## Bước 3: Xem Test Results

Sau khi tests chạy xong:

```bash
npx playwright show-report
```

## Lưu ý

- **Backend server phải chạy trước** khi chạy tests
- Tests sẽ kết nối tới `http://localhost:8080`
- Test database: `flood_rescue_test` (đã được seed)
- Mỗi test suite chạy độc lập và tự cleanup

## Troubleshooting

### Server không khởi động
- Kiểm tra MongoDB đang chạy
- Kiểm tra port 8080 không bị chiếm

### Tests fail
- Xem chi tiết lỗi trong HTML report
- Kiểm tra test database đã được seed chưa: `npm run test:seed`
- Xem logs của backend server

### Database issues
- Clear và seed lại: 
  ```bash
  mongo flood_rescue_test --eval "db.dropDatabase()"
  npm run test:seed
  ```
