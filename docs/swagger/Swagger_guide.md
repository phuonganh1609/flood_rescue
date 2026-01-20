# 📖 Hướng Dẫn Cập Nhật Swagger Documentation

> **Quy tắc vàng:** Mỗi khi hoàn thành 1 endpoint, **PHẢI** cập nhật Swagger ngay lập tức!

## 🛠️ Chuẩn Bị

### 1. Cài Đặt Extension (VS Code)

Cài extension **OpenAPI (Swagger) Editor** để preview và validate YAML

### 2. File Cần Biết

```
docs/swagger/
├── swagger.yaml          # ✅ File chính - CẬP NHẬT TẠI ĐÂY
```

---

## 📝 Quy Trình Cập Nhật Swagger (5 Bước)

### Bước 1️⃣: Hoàn Thành Endpoint

Ví dụ: Vừa tạo xong endpoint `GET /api/teams`

**File:** `src/modules/teams/team.routes.js`

```javascript
router.get("/", authenticate, authorize(["Manager"]), teamController.listTeams);
```

### Bước 2️⃣: Mở File `swagger.yaml`

```bash
docs/swagger/swagger.yaml
```

### Bước 3️⃣: Thêm Path Vào Section `paths:`

**Vị trí:** Tìm section `paths:` và thêm endpoint mới theo alphabet

**Template:**

```yaml
paths:
  /api/teams:
    get:
      tags:
        - Teams # Tag phù hợp
      summary: Get list of rescue teams # Mô tả ngắn gọn
      description: Get all rescue teams in the system (Manager only) # Mô tả chi tiết
      operationId: listTeams # Tên unique
      security:
        - bearerAuth: [] # Yêu cầu authentication
      parameters: # Query params (nếu có)
        - name: status
          in: query
          description: Filter by team status
          required: false
          schema:
            type: string
            enum:
              - Active
              - Offline
              - Busy
      responses:
        "200":
          description: Teams retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Team" # Reference đến schema
        "401":
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
        "403":
          description: Forbidden - insufficient permissions
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
```

### Bước 4️⃣: Thêm Schema (Nếu Chưa Có)

**Vị trí:** Section `components.schemas:`

```yaml
components:
  schemas:
    Team:
      type: object
      properties:
        _id:
          type: string
          example: "60d5ec49f1b2c8b1f8e4e1a2"
        name:
          type: string
          example: "Team Alpha"
        status:
          type: string
          enum:
            - Active
            - Offline
            - Busy
        members:
          type: array
          items:
            $ref: "#/components/schemas/TeamMember"
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
```

### Bước 5️⃣: Validate & Test

1. **Preview trong VS Code:**
   - Right click file → `OpenAPI: Preview Documentation`
   - Kiểm tra cú pháp và hiển thị

2. **Chạy Server & Test:**
   ```bash
   npm run dev
   ```
3. **Mở Swagger UI:**

   ```
   http://localhost:8080/api-docs
   ```

4. **Test endpoint trực tiếp từ Swagger UI**

---

## 📋 Checklist Trước Khi Commit

- [ ] Endpoint đã hoạt động đúng
- [ ] Đã thêm vào `paths:` trong swagger.yaml
- [ ] Request body schema đã define (nếu có)
- [ ] Response schema đã define
- [ ] Security (bearerAuth) đã khai báo đúng
- [ ] Validate YAML không có lỗi (Extension)
- [ ] Test trên Swagger UI thành công
- [ ] Description rõ ràng, dễ hiểu

---

## 🎯 Các Case Thường Gặp

### Case 1: Endpoint Có Request Body

**Ví dụ:** `POST /api/teams`

```yaml
/api/teams:
  post:
    tags:
      - Teams
    summary: Create new rescue team
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/CreateTeamRequest" # ← Define schema này
    responses:
      "201":
        description: Team created successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                teamId:
                  type: string
```

**Schema cho Request Body:**

```yaml
components:
  schemas:
    CreateTeamRequest:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          minLength: 3
          maxLength: 100
          example: "Team Alpha"
        status:
          type: string
          enum: [Active, Offline, Busy]
          default: Active
```

### Case 2: Endpoint Có Path Parameters

**Ví dụ:** `GET /api/teams/{id}`

```yaml
/api/teams/{id}:
  get:
    tags:
      - Teams
    summary: Get team by ID
    parameters:
      - name: id
        in: path # ← in: path
        description: Team ID
        required: true
        schema:
          type: string
    responses:
      "200":
        description: Team retrieved successfully
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Team"
      "404":
        description: Team not found
```

### Case 3: Endpoint Có Query Parameters

**Ví dụ:** `GET /api/teams?status=Active&page=1`

```yaml
/api/teams:
  get:
    parameters:
      - name: status
        in: query # ← in: query
        required: false
        schema:
          type: string
          enum: [Active, Offline, Busy]
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: limit
        in: query
        schema:
          type: integer
          default: 20
```

### Case 4: Endpoint PATCH/PUT

**Ví dụ:** `PATCH /api/teams/{id}/status`

```yaml
/api/teams/{id}/status:
  patch:
    tags:
      - Teams
    summary: Update team status
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - status
            properties:
              status:
                type: string
                enum: [Active, Offline, Busy]
    responses:
      "200":
        description: Status updated successfully
```

### Case 5: Endpoint DELETE

**Ví dụ:** `DELETE /api/teams/{id}`

```yaml
/api/teams/{id}:
  delete:
    tags:
      - Teams
    summary: Delete rescue team
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      "200":
        description: Team deleted successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
      "404":
        description: Team not found
      "403":
        description: Forbidden - insufficient permissions
```

---

## 🔐 Authentication & Authorization

### Endpoint Không Cần Auth

```yaml
/api/auth/login:
  post:
    # Không có security field
```

### Endpoint Cần Auth (Bearer Token)

```yaml
/api/teams:
  get:
    security:
      - bearerAuth: [] # ← Thêm dòng này
```

**Lưu ý:** `bearerAuth` đã được define sẵn trong `components.securitySchemes`

---

## 📚 Tham Khảo Schema Có Sẵn

Các schema đã có trong swagger.yaml:

- `User` - User information
- `Request` - Rescue/Relief request
- `Mission` - Rescue mission
- `Resource` - Vehicle/Equipment
- `Supply` - Relief supplies
- `Notification` - System notification
- `Position` - GPS position
- `Error` - Error response
- `Pagination` - Pagination info

**Sử dụng:**

```yaml
schema:
  $ref: "#/components/schemas/User"
```

---

## ⚠️ Lỗi Thường Gặp

### 1. Indentation (Thụt Lề) Sai

```yaml
❌ SAI:
paths:
 /api/teams:        # Thiếu space
  get:

✅ ĐÚNG:
paths:
  /api/teams:       # 2 spaces
    get:            # 4 spaces
```

### 2. Quên Dấu `:` Sau Key

```yaml
❌ SAI:
type string

✅ ĐÚNG:
type: string
```

### 3. Schema Reference Sai

```yaml
❌ SAI:
schema:
  $ref: "User"

✅ ĐÚNG:
schema:
  $ref: "#/components/schemas/User"
```

### 4. Enum Không Đúng Format

```yaml
❌ SAI:
enum: Active, Offline, Busy

✅ ĐÚNG:
enum:
  - Active
  - Offline
  - Busy
```

---

## 🚀 Tips & Best Practices

### ✅ DO

1. **Luôn validate trước khi commit** (dùng Extension)
2. **Viết description rõ ràng** cho từng endpoint
3. **Thêm example values** cho schema properties
4. **Group endpoints** theo tags logic
5. **Dùng $ref** để tránh duplicate schemas
6. **Test trên Swagger UI** trước khi commit

### ❌ DON'T

1. Không copy/paste mà không đổi nội dung
2. Không bỏ qua validation errors
3. Không quên cập nhật khi thay đổi endpoint
4. Không để description chung chung
5. Không commit khi swagger.yaml có lỗi syntax

---

## 📞 Cần Giúp Đỡ?

1. Check OpenAPI Specification: https://swagger.io/specification/
2. Swagger Editor Online: https://editor.swagger.io/
3. Hỏi tui @LeDuy

---

## 📌 Quick Reference

**Structure:**

```
swagger.yaml
├── openapi: 3.0.4
├── info: (title, description, version)
├── servers: (URLs)
├── tags: (Categories)
├── paths:                          ← THÊM ENDPOINTS TẠI ĐÂY
│   ├── /api/endpoint1
│   ├── /api/endpoint2
│   └── ...
└── components:
    ├── schemas:                    ← THÊM SCHEMAS TẠI ĐÂY
    │   ├── User
    │   ├── Request
    │   └── ...
    └── securitySchemes:
        └── bearerAuth
```

**HTTP Methods:**

- `get` - Retrieve data
- `post` - Create new resource
- `put` - Update entire resource
- `patch` - Update partial resource
- `delete` - Delete resource

**Response Codes:**

- `200` - OK (GET, PATCH, PUT, DELETE)
- `201` - Created (POST)
- `400` - Bad Request
- `401` - Unauthorized (No token)
- `403` - Forbidden (No permission)
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

**Happy Documenting! 🎉**
