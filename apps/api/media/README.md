# Media App - R2 + Cloudflare Image Transformations

Production-ready Django REST Framework app for managing media uploads using Cloudflare R2 storage and Cloudflare Image Transformations.

## Features

- **Direct-to-R2 uploads** using presigned POST URLs
- **Cloudflare Image Transformations** for automatic image optimization
- **Secure authentication** - all endpoints require authentication
- **Automatic cleanup** - R2 objects deleted when MediaFile is deleted
- **Image dimension detection** via Pillow (optional)
- **Rate limiting** to prevent abuse
- **Comprehensive test coverage** (31 tests)

## Architecture

### Upload Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ Client  │                    │  Django │                    │   R2    │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │  1. POST /r2/create-upload/  │                              │
     │ {filename, content_type}     │                              │
     ├─────────────────────────────>│                              │
     │                              │                              │
     │  2. Generate presigned POST  │                              │
     │ {upload_url, fields, key}    │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │  3. POST to R2 with file     │                              │
     ├──────────────────────────────┼─────────────────────────────>│
     │                              │                              │
     │  4. Upload complete          │                              │
     │<─────────────────────────────┼──────────────────────────────┤
     │                              │                              │
     │  5. POST /files/confirm/     │                              │
     │ {key, mime_type}             │                              │
     ├─────────────────────────────>│                              │
     │                              │  6. Verify file exists       │
     │                              │  (head_object)               │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │  7. File metadata            │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │                              │  8. Create MediaFile record  │
     │  9. MediaFile response       │     in database              │
     │<─────────────────────────────┤                              │
     │                              │                              │
```

### Deletion Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ Client  │                    │  Django │                    │   R2    │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │  1. DELETE /files/{id}/      │                              │
     ├─────────────────────────────>│                              │
     │                              │                              │
     │                              │  2. pre_delete signal        │
     │                              │  triggers R2 deletion        │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │  3. Delete confirmed         │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │  4. 204 No Content           │  5. Delete DB record         │
     │<─────────────────────────────┤                              │
     │                              │                              │
```

## API Endpoints

All endpoints are prefixed with `/api/media/`

### 1. Create Presigned Upload URL

**POST** `/api/media/r2/create-upload/`

Generate a presigned POST URL for uploading files directly to R2.

**Authentication:** Required
**Throttle:** 10 requests/hour per user

**Request Body:**
```json
{
  "filename": "vacation.jpg",
  "content_type": "image/jpeg"
}
```

**Response (200 OK):**
```json
{
  "key": "users/123/20241017_143022_vacation.jpg",
  "upload_url": "https://qiima-bucket.r2.cloudflarestorage.com",
  "upload_fields": {
    "key": "users/123/20241017_143022_vacation.jpg",
    "Content-Type": "image/jpeg",
    "Policy": "eyJ...",
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": "...",
    "X-Amz-Date": "...",
    "X-Amz-Signature": "..."
  },
  "origin_url": "https://pub-abc123.r2.dev/users/123/20241017_143022_vacation.jpg",
  "cf_image_url": "https://example.com/cdn-cgi/image/width=800,fit=cover,format=auto/https://pub-abc123.r2.dev/users/123/20241017_143022_vacation.jpg"
}
```

**Errors:**
- `400 Bad Request` - Invalid MIME type
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - R2 error

**Allowed MIME Types:**
- `image/jpeg`
- `image/png`
- `image/webp`
- `image/avif`

**Max File Size:** 10 MB

---

### 2. Confirm Upload

**POST** `/api/media/files/confirm/`

Confirm successful upload and create MediaFile database record.

**Authentication:** Required
**Throttle:** 10 requests/hour per user

**Request Body:**
```json
{
  "key": "users/123/20241017_143022_vacation.jpg",
  "mime_type": "image/jpeg"
}
```

**Response (201 Created):**
```json
{
  "id": "a1b2c3d4-e5f6-4789-a012-3456789abcde",
  "key": "users/123/20241017_143022_vacation.jpg",
  "origin_url": "https://pub-abc123.r2.dev/users/123/20241017_143022_vacation.jpg",
  "cf_image_url": "https://example.com/cdn-cgi/image/width=800,fit=cover,format=auto/https://pub-abc123.r2.dev/users/123/20241017_143022_vacation.jpg",
  "mime_type": "image/jpeg",
  "size_bytes": 245760,
  "width": 1920,
  "height": 1080,
  "kind": "image",
  "visibility": "public",
  "alt_text": "",
  "created_at": "2024-10-17T14:30:22.123456Z",
  "uploaded_at": "2024-10-17T14:30:45.789012Z",
  "owner": 123
}
```

**Errors:**
- `400 Bad Request` - Invalid MIME type
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - File not found in R2
- `500 Internal Server Error` - R2 error

---

### 3. List Media Files

**GET** `/api/media/files/`

List authenticated user's media files (paginated).

**Authentication:** Required

**Query Parameters:**
- `page` (integer) - Page number (default: 1)

**Response (200 OK):**
```json
{
  "count": 42,
  "next": "/api/media/files/?page=2",
  "previous": null,
  "results": [
    {
      "id": "a1b2c3d4-e5f6-4789-a012-3456789abcde",
      "key": "users/123/20241017_143022_vacation.jpg",
      "origin_url": "https://pub-abc123.r2.dev/users/123/20241017_143022_vacation.jpg",
      "cf_image_url": "https://example.com/cdn-cgi/image/width=800,fit=cover,format=auto/...",
      "mime_type": "image/jpeg",
      "size_bytes": 245760,
      "width": 1920,
      "height": 1080,
      "kind": "image",
      "visibility": "public",
      "alt_text": "",
      "created_at": "2024-10-17T14:30:22.123456Z",
      "uploaded_at": "2024-10-17T14:30:45.789012Z",
      "owner": 123
    }
  ]
}
```

---

### 4. Retrieve Media File

**GET** `/api/media/files/{id}/`

Get details of a specific media file.

**Authentication:** Required

**Response (200 OK):** Same as single item in list response

**Errors:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - File not found or not owned by user

---

### 5. Delete Media File

**DELETE** `/api/media/files/{id}/`

Delete a media file (removes from database AND R2).

**Authentication:** Required

**Response (204 No Content):** Empty body

**Errors:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - File not found or not owned by user

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `R2_BUCKET` | Yes | R2 bucket name | `qiima-media` |
| `R2_ENDPOINT_URL` | Yes | R2 API endpoint | `https://abc123.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | Yes | R2 access key | `a1b2c3d4e5f6...` |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 secret key | `xyz789abc...` |
| `MEDIA_PUBLIC_BASE` | Yes | Public R2 URL base | `https://pub-abc123.r2.dev` |
| `TRANSFORM_BASE` | No | CF Image Transform URL | `https://example.com/cdn-cgi/image` |

### Getting R2 Credentials

1. Log into Cloudflare Dashboard
2. Go to R2 → Your Bucket → Settings
3. Create API Token with read/write permissions
4. Copy Account ID, Access Key, and Secret Key
5. Public URL: `https://pub-<hash>.r2.dev` (enable in bucket settings)

### Setting up Cloudflare Image Transformations

1. Enable "Transform via URL" in R2 bucket settings
2. Or use a Worker/Pages function route
3. Set `TRANSFORM_BASE` to your transform endpoint
4. Format: `https://yourdomain.com/cdn-cgi/image`

**Note:** If `TRANSFORM_BASE` is empty, `cf_image_url` will return `None` and clients should use `origin_url`.

---

## Frontend Integration Examples

### Web / Next.js

```typescript
// Upload flow
async function uploadImage(file: File) {
  // 1. Get presigned upload URL
  const createRes = await fetch('/api/media/r2/create-upload/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type,
    }),
  });

  const { upload_url, upload_fields, key, cf_image_url, origin_url } = await createRes.json();

  // 2. Upload file to R2 using presigned POST
  const formData = new FormData();
  Object.entries(upload_fields).forEach(([k, v]) => {
    formData.append(k, v as string);
  });
  formData.append('file', file);

  await fetch(upload_url, {
    method: 'POST',
    body: formData,
  });

  // 3. Confirm upload
  const confirmRes = await fetch('/api/media/files/confirm/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      mime_type: file.type,
    }),
  });

  const mediaFile = await confirmRes.json();

  return {
    id: mediaFile.id,
    url: mediaFile.cf_image_url || mediaFile.origin_url,
    width: mediaFile.width,
    height: mediaFile.height,
  };
}

// Display image with lazy loading and dimensions (avoid CLS)
<img
  src={imageUrl}
  width={width}
  height={height}
  loading="lazy"
  alt="User uploaded image"
/>
```

### Expo / React Native

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

async function uploadImage() {
  // 1. Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.canceled) return;

  const asset = result.assets[0];
  const filename = asset.uri.split('/').pop() || 'image.jpg';
  const contentType = asset.type === 'image' ? `image/${asset.uri.split('.').pop()}` : 'image/jpeg';

  // 2. Get presigned upload URL
  const createRes = await fetch(`${API_BASE}/media/r2/create-upload/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename,
      content_type: contentType,
    }),
  });

  const { upload_url, upload_fields, key, cf_image_url, origin_url } = await createRes.json();

  // 3. Upload to R2
  const formData = new FormData();
  Object.entries(upload_fields).forEach(([k, v]) => {
    formData.append(k, v as string);
  });

  formData.append('file', {
    uri: asset.uri,
    type: contentType,
    name: filename,
  } as any);

  await fetch(upload_url, {
    method: 'POST',
    body: formData,
  });

  // 4. Confirm upload
  const confirmRes = await fetch(`${API_BASE}/media/files/confirm/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      mime_type: contentType,
    }),
  });

  const mediaFile = await confirmRes.json();

  return {
    id: mediaFile.id,
    url: mediaFile.cf_image_url || mediaFile.origin_url,
    width: mediaFile.width,
    height: mediaFile.height,
  };
}

// Display with expo-image
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  style={{ width, height }}
  contentFit="cover"
  transition={200}
/>
```

---

## Security Considerations

### 1. File Type Validation

Only whitelisted MIME types are allowed:
- `image/jpeg`
- `image/png`
- `image/webp`
- `image/avif`

To add more types, update `ALLOWED_MIME_TYPES` in `views.py`.

### 2. File Size Limits

Maximum file size is enforced via presigned POST conditions:
- Current limit: **10 MB** (`MAX_FILE_SIZE_BYTES = 10_000_000`)
- Enforced at R2 level, not Django
- Adjust in `views.py` if needed

### 3. Rate Limiting

Upload endpoints are throttled:
- `MediaUploadThrottle`: **10 requests/hour** per user
- Prevents abuse and resource exhaustion
- Customize rate in `views.py`

### 4. User Isolation

- Users can only access their own files
- `MediaFileViewSet` filters by `owner=request.user`
- Key format: `users/{user_id}/{timestamp}_{filename}`

### 5. Presigned URL Expiry

- Upload URLs expire in **10 minutes**
- Set via `ExpiresIn=600` in `generate_presigned_post`
- Short expiry limits abuse window

---

## Key Rotation

When rotating R2 credentials:

1. Create new R2 API token in Cloudflare dashboard
2. Update environment variables:
   ```bash
   R2_ACCESS_KEY_ID=new_key
   R2_SECRET_ACCESS_KEY=new_secret
   ```
3. Restart Django application
4. Old credentials can be deleted after restart

**Important:** No code changes required; all credentials loaded from environment.

---

## Future Enhancements (Private Files)

Currently all files are public. For private files:

### Option 1: Signed R2 URLs

```python
def get_private_url(self, expiry=3600):
    """Generate signed GET URL for private files."""
    s3_client = get_s3_client()
    return s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': self.key},
        ExpiresIn=expiry,
    )
```

### Option 2: Cloudflare Worker Gateway

Deploy a Worker that:
1. Checks JWT token
2. Verifies user owns file
3. Proxies request to R2
4. Returns file with appropriate headers

---

## Troubleshooting

### "File not found in storage" after upload

**Cause:** Upload to R2 failed or key mismatch

**Solution:**
- Check R2 credentials are correct
- Verify `upload_url` and `upload_fields` used exactly as returned
- Check R2 dashboard for upload errors

### No thumbnail in admin

**Cause:** `TRANSFORM_BASE` not set or Pillow not installed

**Solution:**
- Set `TRANSFORM_BASE` environment variable
- Or install Pillow: `pip install Pillow`

### Dimension detection fails

**Cause:** Pillow not installed or image corrupt

**Solution:**
- Install Pillow: `pip install Pillow`
- Dimensions will be `null` but upload succeeds
- Check image file is valid

### Rate limit errors

**Cause:** User exceeded upload quota

**Solution:**
- Wait for throttle window to reset
- Or increase `MediaUploadThrottle.rate` in `views.py`

---

## Testing

Run tests with:

```bash
python -m pytest media/tests/ -v
```

**Test Coverage:**
- Models: URL generation, properties, constraints
- Views: Upload flow, authentication, authorization, error handling
- Utils: URL builders with various configs
- Signals: R2 cleanup on deletion

**Mocking:**
- All boto3 calls are mocked
- No actual R2 requests in tests
- Fast and repeatable

---

## License

Part of the Qiima project.
