# Requests API - Updated Documentation

## Overview
API cho quản lý yêu cầu cứu hộ/cơ lương trong hệ thống Flood Rescue.

**Thay đổi:** Backend không upload files, chỉ lưu URL từ Frontend.

---

## 📮 **1. CREATE REQUEST**

```http
POST /requests/addRequest
```

### Headers
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Body (JSON)

| Field | Type | Required | Valid Values | Notes |
|-------|------|----------|--------------|-------|
| `type` | string | ✅ | "Rescue", "Relief" | Loại yêu cầu |
| `incidentType` | string | ❌ | "Flood", "Trapped", "Injured", "Landslide", "Other" | Default: "Other" |
| `latitude` | number | ✅ | -90 to 90 | Toạ độ địa lý |
| `longitude` | number | ✅ | -180 to 180 | Toạ độ địa lý |
| `description` | string | ✅ | 10-500 ký tự | Mô tả chi tiết |
| `peopleCount` | number | ❌ | 1-100 | Default: 1 |
| `priority` | string | ❌ | "Critical", "High", "Normal" | Default: "Normal" |
| `requestSupply` | array | ❌ | string array | Danh sách vật phẩm cần |
| `imageUrls` | array | ❌ | URI array (max 5) | URL ảnh từ Frontend upload |

### Example Request

```bash
curl -X POST http://localhost:3000/requests/addRequest \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Rescue",
    "incidentType": "Injured",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "description": "Injured person at Tan Binh District, needs emergency care",
    "peopleCount": 1,
    "priority": "Critical",
    "requestSupply": ["Ambulance", "First Aid Kit", "Blood Bank"],
    "imageUrls": [
      "https://example.com/storage/image1.jpg",
      "https://example.com/storage/image2.png"
    ]
  }'
```

### Example JavaScript

```javascript
const createRequest = async () => {
  const formData = {
    type: 'Rescue',
    incidentType: 'Injured',
    latitude: 10.7769,
    longitude: 106.7009,
    description: 'Injured person at Tan Binh District, needs emergency care',
    peopleCount: 1,
    priority: 'Critical',
    requestSupply: ['Ambulance', 'First Aid Kit', 'Blood Bank'],
    imageUrls: [
      'https://example.com/storage/image1.jpg',
      'https://example.com/storage/image2.png'
    ]
  };

  const response = await fetch('http://localhost:3000/requests/addRequest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });

  const result = await response.json();
  console.log(result);
};
```

### Response (201 Created)

```json
{
  "message": "Request created successfully",
  "data": {
    "_id": "65b8f9c1d2e3f4g5h6i7j8k9",
    "userId": "60d5ec49c2b1a3e5f7g9h1j",
    "userName": "Nguyen Van A",
    "type": "Rescue",
    "incidentType": "Injured",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "description": "Injured person at Tan Binh District, needs emergency care",
    "peopleCount": 1,
    "priority": "Critical",
    "status": "Pending",
    "requestSupply": ["Ambulance", "First Aid Kit", "Blood Bank"],
    "requestMedia": [
      {
        "imageUrl": "https://example.com/storage/image1.jpg",
        "uploadedAt": "2026-01-24T10:30:00.000Z"
      },
      {
        "imageUrl": "https://example.com/storage/image2.png",
        "uploadedAt": "2026-01-24T10:30:01.000Z"
      }
    ],
    "createdAt": "2026-01-24T10:30:00.000Z",
    "updatedAt": "2026-01-24T10:30:00.000Z"
  }
}
```

### Error Responses

**400 - Validation Error**
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "imageUrls",
      "message": "Each image URL must be a valid HTTP/HTTPS URL"
    },
    {
      "field": "imageUrls",
      "message": "Maximum 5 images allowed"
    }
  ]
}
```

**401 - Unauthorized**
```json
{
  "message": "Token required or invalid"
}
```

---

## 📊 **2. GET ALL REQUESTS**

```http
GET /requests
```

### Query Parameters

```
page=1          # optional, default: 1
limit=10        # optional, default: 10
status=Pending  # optional filter
type=Rescue     # optional filter
incidentType=Flood # optional filter
priority=Critical  # optional filter
userName=John      # optional search (case-insensitive)
```

### Examples

```
GET /requests
GET /requests?page=2&limit=20
GET /requests?status=Pending&type=Rescue
GET /requests?incidentType=Flood&priority=Critical
GET /requests?userName=john
```

### Response (200)

```json
{
  "data": [
    {
      "_id": "65b8f9c1d2e3f4g5h6i7j8k9",
      "userId": {
        "_id": "60d5ec49c2b1a3e5f7g9h1j",
        "displayName": "Nguyen Van A",
        "userName": "nguyenvana",
        "email": "nguyenvana@example.com",
        "phoneNumber": "0123456789"
      },
      "type": "Rescue",
      "incidentType": "Injured",
      "latitude": 10.7769,
      "longitude": 106.7009,
      "description": "Injured person needs help",
      "peopleCount": 1,
      "priority": "Critical",
      "status": "Pending",
      "requestSupply": ["Ambulance"],
      "requestMedia": [
        {
          "imageUrl": "https://example.com/storage/image1.jpg",
          "uploadedAt": "2026-01-24T10:30:00.000Z"
        }
      ],
      "createdAt": "2026-01-24T10:30:00.000Z",
      "updatedAt": "2026-01-24T10:30:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

## 🔍 **3. GET REQUEST BY ID**

```http
GET /requests/:requestId
```

### Example

```
GET /requests/65b8f9c1d2e3f4g5h6i7j8k9
```

### Response (200)

```json
{
  "_id": "65b8f9c1d2e3f4g5h6i7j8k9",
  "userId": {
    "_id": "60d5ec49c2b1a3e5f7g9h1j",
    "displayName": "Nguyen Van A",
    "userName": "nguyenvana",
    "email": "nguyenvana@example.com",
    "phoneNumber": "0123456789"
  },
  "type": "Rescue",
  "incidentType": "Injured",
  "latitude": 10.7769,
  "longitude": 106.7009,
  "description": "Injured person at Tan Binh District, needs emergency care",
  "peopleCount": 1,
  "priority": "Critical",
  "status": "Pending",
  "requestSupply": ["Ambulance", "First Aid Kit"],
  "requestMedia": [
    {
      "imageUrl": "https://example.com/storage/image1.jpg",
      "uploadedAt": "2026-01-24T10:30:00.000Z"
    },
    {
      "imageUrl": "https://example.com/storage/image2.png",
      "uploadedAt": "2026-01-24T10:30:01.000Z"
    }
  ],
  "createdAt": "2026-01-24T10:30:00.000Z",
  "updatedAt": "2026-01-24T10:30:00.000Z"
}
```

---

## ✏️ **4. UPDATE REQUEST STATUS**

```http
PATCH /requests/:requestId/status
```

### Body (JSON)

```json
{
  "status": "Pending | In Progress | Completed | Cancelled"
}
```

### Example

```bash
curl -X PATCH http://localhost:3000/requests/65b8f9c1d2e3f4g5h6i7j8k9/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "In Progress"
  }'
```

### Response (200)

```json
{
  "message": "Request status updated successfully",
  "data": {
    "_id": "65b8f9c1d2e3f4g5h6i7j8k9",
    "status": "In Progress",
    // ... other fields
  }
}
```

---

## 📋 **Frontend Upload Flow**

### Step 1: Upload ảnh lên Storage (Cloudinary, AWS S3, etc.)

```javascript
// Frontend
const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'YOUR_PRESET');

  const response = await fetch(
    'https://api.cloudinary.com/v1_1/YOUR_CLOUD/image/upload',
    {
      method: 'POST',
      body: formData
    }
  );

  const data = await response.json();
  return data.secure_url;  // ← Nhận URL
};
```

### Step 2: Gửi URL tới Backend

```javascript
// Frontend
const createRequest = async () => {
  // Upload files và lấy URLs
  const imageUrls = [];
  for (let file of files) {
    const url = await uploadToCloudinary(file);
    imageUrls.push(url);
  }

  // Gửi request với URLs
  const response = await fetch('http://localhost:3000/requests/addRequest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'Rescue',
      incidentType: 'Injured',
      latitude: 10.7769,
      longitude: 106.7009,
      description: '...',
      imageUrls: imageUrls  // ← Array of URLs
    })
  });

  const result = await response.json();
  console.log('Request created:', result.data._id);
};
```

---

## ⚠️ **Important Notes**

1. ✅ **imageUrls validation:** Phải là valid HTTP/HTTPS URLs
2. ✅ **Max 5 images:** Không thể gửi > 5 URLs
3. ✅ **Body là JSON:** Content-Type phải `application/json` (không form-data)
4. ✅ **Frontend responsibility:** Frontend upload files, Backend chỉ lưu URLs
5. ✅ **URL persistence:** Đảm bảo URLs tồn tại lâu dài (không hết hạn)

---

## 📊 **Status Values**

| Status | Ý nghĩa |
|--------|---------|
| `Pending` | Chưa bắt đầu xử lý |
| `In Progress` | Đang xử lý |
| `Completed` | Hoàn thành |
| `Cancelled` | Bị hủy |

---

## 🎯 **Priority Levels**

| Priority | Ý nghĩa | Response Time |
|----------|---------|----------------|
| `Critical` | Khẩn cấp | < 5 phút |
| `High` | Cao | < 30 phút |
| `Normal` | Bình thường | < 2 giờ |

---

## 🔐 **Authentication**

Tất cả endpoints yêu cầu JWT token hợp lệ:

```
Header: Authorization: Bearer {accessToken}
```

Nếu token không hợp lệ hoặc hết hạn, sẽ nhận lỗi 401.
