# Cloudinary Module

## Overview
This module handles Cloudinary integration for secure, direct image uploads using signed upload signatures.

## Architecture
Follows Domain-Driven Design (DDD) pattern with clear separation of concerns:

```
cloudinary/
├── cloudinary.config.js       # Cloudinary SDK configuration
├── cloudinary.constants.js    # Folders, transformations, presets
├── cloudinary.service.js      # Business logic (signature generation, URL optimization)
├── cloudinary.controller.js   # HTTP request handlers
├── cloudinary.routes.js       # API route definitions
├── cloudinary.validation.js   # Joi validation schemas
└── README.md                  # This file
```

## Features

### 1. Signed Upload Signature Generation
- Generates secure signatures for direct frontend uploads
- Includes timestamp expiration for security
- Supports custom context metadata
- Optional eager transformations (thumbnails)

### 2. Image Optimization
- Pre-defined transformation presets (thumbnail, medium, avatar)
- Auto-format (WebP for supported browsers)
- Auto-quality optimization
- CDN-optimized URLs

### 3. Asset Management
- Delete images from Cloudinary
- Validate upload results
- Generate optimized URLs

## API Endpoints

### POST /api/cloudinary/signature
Generate upload signature for direct Cloudinary uploads.

**Request:**
```json
{
  "folder": "rescue_requests",
  "context": {
    "requestId": "req_123"
  },
  "eager": false
}
```

**Response:**
```json
{
  "signature": "...",
  "timestamp": 1704067200,
  "apiKey": "...",
  "cloudName": "...",
  "folder": "rescue_requests"
}
```

### GET /api/cloudinary/url/:publicId
Get optimized URL for an image.

**Query params:** `transformation=thumbnail|medium|avatar`

### DELETE /api/cloudinary/:publicId
Delete an image from Cloudinary.

## Usage Examples

### Backend - Generate Signature
```javascript
import { cloudinaryService } from './cloudinary.service.js';

const signature = cloudinaryService.generateUploadSignature({
  folder: 'rescue_requests',
  context: { requestId: 'req_123', userId: 'user_456' },
  eager: true, // Generate thumbnails
});
```

### Backend - Get Optimized URL
```javascript
import { cloudinaryService } from './cloudinary.service.js';

const thumbnailUrl = cloudinaryService.getOptimizedUrl(
  'rescue_requests/req_123/image_123',
  'thumbnail'
);
```

### Backend - Delete Asset
```javascript
import { cloudinaryService } from './cloudinary.service.js';

const result = await cloudinaryService.deleteAsset(
  'rescue_requests/req_123/image_123'
);
```

## Constants

### Folders
```javascript
FOLDERS = {
  RESCUE_REQUESTS: 'rescue_requests',
  MISSIONS: 'missions',
  USERS: 'users',
  TEAMS: 'teams',
  WAREHOUSE: 'warehouse',
}
```

### Transformations
```javascript
TRANSFORMATIONS = {
  THUMBNAIL: { width: 300, height: 300, crop: 'fill', quality: 'auto:low' },
  MEDIUM: { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
  AVATAR: { width: 200, height: 200, crop: 'fill', gravity: 'face' },
}
```

### Upload Presets
```javascript
UPLOAD_PRESETS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif'],
  RESOURCE_TYPE: 'image',
}
```

## Environment Variables

Required in `.env`:
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Security

1. **API Secret Protection**: Never expose to frontend
2. **Signed Uploads**: All uploads require backend-generated signatures
3. **Timestamp Expiration**: Signatures expire automatically
4. **Authentication**: JWT required for signature generation
5. **Folder Validation**: Only predefined folders allowed
6. **Context Enrichment**: Backend adds userId and uploadedBy automatically

## Integration with Frontend

Frontend should use the refactored `uploadClient.ts`:

```typescript
import { uploadClient } from '@/services/uploadClient';

// Upload with signature
const result = await uploadClient.uploadImage(
  file,
  'rescue_requests',
  { requestId: 'req_123' },
  true // eager transformations
);
```

## Testing

Test the signature endpoint:
```bash
curl -X POST http://localhost:8080/api/cloudinary/signature \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "folder": "rescue_requests",
    "context": {"requestId": "test_123"},
    "eager": false
  }'
```

## Best Practices

1. **Always use signed uploads** - Never expose API credentials to frontend
2. **Use eager transformations** - Pre-generate thumbnails for better UX
3. **Add context metadata** - Helps with tracking and debugging
4. **Use folder organization** - Keep assets organized by type
5. **Validate upload results** - Always check response before saving to DB
6. **Handle errors gracefully** - Provide clear error messages to users

## Migration from Old System

See `MIGRATION_CLOUDINARY.md` in project root for detailed migration guide.

Key changes:
- Old: Files uploaded through backend proxy (slow, high load)
- New: Direct uploads to Cloudinary (fast, scalable)
- Old: API secret in frontend (security risk)
- New: Signed uploads with backend signatures (secure)

## Troubleshooting

### Signature generation fails
- Check environment variables are set correctly
- Verify Cloudinary credentials are valid
- Check folder name is in allowed list

### Upload fails with "Invalid signature"
- Signature may have expired (regenerate)
- Check timestamp is current
- Verify all required params are included

### Images not appearing
- Check Cloudinary dashboard for upload logs
- Verify folder path is correct
- Check CORS settings if uploading from browser

## References

- [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference)
- [Signed Uploads](https://cloudinary.com/documentation/upload_images#signed_upload)
- [Image Transformations](https://cloudinary.com/documentation/image_transformations)
