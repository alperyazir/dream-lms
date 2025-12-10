# 4. Dream Central Storage Integration

## 4.1 Overview

Dream Central Storage is an **existing MinIO-based S3-compatible object storage** that hosts all book assets (images, audio) and teacher-uploaded materials. Dream LMS integrates as a client, fetching assets and transforming relative paths to pre-signed URLs.

**Key Integration Points:**
1. Book catalog sync (admin-triggered)
2. Activity asset loading (pre-signed URL transformation)
3. Teacher material uploads (PDFs, videos)
4. Direct browser → MinIO access (no backend bottleneck)

## 4.2 MinIO Client Architecture

**Python SDK:** `minio` package

```python
from minio import Minio
from minio.error import S3Error
from datetime import timedelta

class DreamCentralStorageClient:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=True  # HTTPS
        )
        self.bucket = settings.MINIO_BUCKET_NAME

    async def get_presigned_url(
        self,
        object_path: str,
        expiry: timedelta = timedelta(hours=1)
    ) -> str:
        """Generate pre-signed URL for direct browser access"""
        try:
            url = self.client.presigned_get_object(
                self.bucket,
                object_path,
                expires=expiry
            )
            return url
        except S3Error as e:
            logger.error(f"Failed to generate pre-signed URL: {e}")
            raise

    async def upload_file(
        self,
        file_data: bytes,
        object_path: str,
        content_type: str
    ) -> str:
        """Upload teacher material to MinIO"""
        try:
            self.client.put_object(
                self.bucket,
                object_path,
                data=BytesIO(file_data),
                length=len(file_data),
                content_type=content_type
            )
            return await self.get_presigned_url(object_path)
        except S3Error as e:
            logger.error(f"Failed to upload file: {e}")
            raise

    async def delete_file(self, object_path: str):
        """Delete material from MinIO"""
        try:
            self.client.remove_object(self.bucket, object_path)
        except S3Error as e:
            logger.error(f"Failed to delete file: {e}")
            raise
```

## 4.3 Activity Config Transformation

**Problem:** Book `config.json` contains **relative paths** like:
```
"./books/SwitchtoCLIL/images/HB/modules/M1/pages/p8s1.png"
```

**Solution:** Backend transforms all paths to **pre-signed URLs** before sending to frontend.

```python
async def transform_activity_config(activity: Activity) -> dict:
    """Transform relative paths in config to pre-signed URLs"""
    config = activity.config_json.copy()

    # Transform based on activity type
    if activity.activity_type == "dragdroppicture":
        if "section_path" in config:
            config["section_path"] = await storage_client.get_presigned_url(
                normalize_path(config["section_path"])
            )

    elif activity.activity_type == "matchTheWords":
        # Match activities may have images in questions
        for word in config.get("match_words", []):
            if "image_path" in word:
                word["image_path"] = await storage_client.get_presigned_url(
                    normalize_path(word["image_path"])
                )

    # Handle audio paths (universal)
    if "audio_path" in config:
        config["audio_path"] = await storage_client.get_presigned_url(
            normalize_path(config["audio_path"])
        )

    return config

def normalize_path(relative_path: str) -> str:
    """Convert ./books/... to books/..."""
    return relative_path.lstrip("./")
```

**Example Transformation:**

```python
# Input (from database)
{
    "type": "dragdroppicture",
    "section_path": "./books/SwitchtoCLIL/images/HB/modules/M1/pages/p8s1.png",
    "words": ["capital", "old", "nice"]
}

# Output (API response to frontend)
{
    "type": "dragdroppicture",
    "section_path": "https://minio.yourdomain.com/dream-central-storage/books/SwitchtoCLIL/images/HB/modules/M1/pages/p8s1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
    "words": ["capital", "old", "nice"]
}
```

## 4.4 Book Catalog Sync

**Endpoint:** `POST /api/v1/admin/books/sync` (Admin only)

**Process:**
1. Admin triggers sync from Dream LMS UI
2. Backend fetches book list from Dream Central Storage
3. For each book:
   - Download `config.json`
   - Parse activities
   - Create/update `books` and `activities` tables
   - Transform cover image to pre-signed URL
4. Return sync summary

```python
async def sync_books_from_storage():
    """Sync book catalog from Dream Central Storage"""
    books_synced = 0
    activities_synced = 0

    # List all book directories
    book_objects = storage_client.list_objects(
        bucket="dream-central-storage",
        prefix="books/",
        recursive=False
    )

    for book_obj in book_objects:
        # Download config.json for each book
        config_path = f"{book_obj.object_name}/config.json"
        config_data = await storage_client.get_object(config_path)
        config = json.loads(config_data)

        # Create or update book record
        book = await create_or_update_book(config)
        books_synced += 1

        # Parse activities from config
        for module in config.get("books", [{}])[0].get("modules", []):
            for page in module.get("pages", []):
                for section in page.get("sections", []):
                    if section.get("activity"):
                        await create_or_update_activity(book.id, section["activity"])
                        activities_synced += 1

    return {
        "books_synced": books_synced,
        "activities_synced": activities_synced
    }
```

## 4.5 Teacher Material Upload

**Flow:**
1. Teacher selects file in React UI
2. Frontend: `POST /api/v1/materials` (multipart/form-data)
3. Backend validates file (type, size, virus scan)
4. Backend uploads to MinIO at path: `materials/{teacher_id}/{uuid}.{ext}`
5. Backend stores metadata in `materials` table with pre-signed URL
6. Backend returns material record to frontend

```python
@router.post("/materials")
async def upload_material(
    file: UploadFile,
    title: str = Form(...),
    description: str = Form(None),
    current_teacher: User = Depends(get_current_teacher)
):
    # Validate file type
    allowed_types = ["application/pdf", "video/mp4", "video/quicktime"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Invalid file type")

    # Validate file size (50 MB for PDFs, 100 MB for videos)
    max_size = 100 * 1024 * 1024  # 100 MB
    file_data = await file.read()
    if len(file_data) > max_size:
        raise HTTPException(400, "File too large")

    # Generate unique path
    file_ext = file.filename.split(".")[-1]
    object_path = f"materials/{current_teacher.teacher_id}/{uuid4()}.{file_ext}"

    # Upload to MinIO
    file_url = await storage_client.upload_file(
        file_data,
        object_path,
        file.content_type
    )

    # Create database record
    material = await material_service.create(
        teacher_id=current_teacher.teacher_id,
        title=title,
        description=description,
        material_type="pdf" if "pdf" in file.content_type else "video",
        file_url=file_url,
        file_size_bytes=len(file_data)
    )

    return material
```

## 4.6 Caching Strategy

**Problem:** Pre-signed URLs expire after 1 hour, frequent regeneration is expensive.

**Solution:** Redis cache with 45-minute TTL

```python
async def get_cached_presigned_url(object_path: str) -> str:
    """Get pre-signed URL from cache or generate new"""
    cache_key = f"presigned:{object_path}"

    # Try cache first
    cached_url = await redis.get(cache_key)
    if cached_url:
        return cached_url

    # Generate new URL
    url = await storage_client.get_presigned_url(object_path)

    # Cache for 45 minutes (before 1-hour expiry)
    await redis.setex(cache_key, 2700, url)

    return url
```

## 4.7 Error Handling

**Scenario:** Dream Central Storage is unavailable

```python
@router.get("/assignments/{id}/start")
async def start_assignment(id: UUID):
    try:
        activity = await get_activity(id)
        transformed_config = await transform_activity_config(activity)
        return transformed_config
    except S3Error as e:
        # Dream Central Storage error
        logger.error(f"Storage error: {e}")
        raise HTTPException(
            503,
            "Content storage temporarily unavailable. Please try again."
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(500, "Internal server error")
```

**Graceful Degradation:**
- Show cached book list (if available)
- Display friendly error message to students
- Queue activity starts for retry when storage recovers

## 4.8 Teacher Materials Storage (Story 13.1)

**Bucket:** `teachers`

**Purpose:** Personal storage for teachers to upload supplementary materials (documents, images, audio, video) that can be attached to assignments.

### Bucket Structure

```
teachers/
├── {teacher_uuid}/
│   ├── documents/
│   │   ├── abc123_lesson_plan.pdf
│   │   └── def456_worksheet.docx
│   ├── images/
│   │   ├── ghi789_diagram.png
│   │   └── jkl012_photo.jpg
│   ├── audio/
│   │   └── mno345_pronunciation.mp3
│   └── video/
│       └── pqr678_tutorial.mp4
```

### Setup Instructions

1. **Create bucket in MinIO:**
   ```bash
   # Via MinIO Client (mc)
   mc mb myminio/teachers

   # Or via MinIO Console
   # Navigate to Buckets → Create Bucket → Name: "teachers"
   ```

2. **Configure bucket policy:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {"AWS": ["arn:aws:iam::*:user/dream-lms-backend"]},
         "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
         "Resource": [
           "arn:aws:s3:::teachers/*",
           "arn:aws:s3:::teachers"
         ]
       }
     ]
   }
   ```

3. **CORS Configuration (if direct browser access needed):**
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://your-frontend-domain.com"],
         "AllowedMethods": ["GET"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["Content-Range", "Content-Length"],
         "MaxAgeSeconds": 3600
       }
     ]
   }
   ```

### Storage Quota

- Default: 500MB per teacher
- Configurable in `teacher_storage_quotas` table
- Quota tracked in database, not MinIO

### File Validation

| Type | MIME Types | Max Size |
|------|------------|----------|
| Document | `application/pdf`, `text/plain`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 100MB |
| Image | `image/jpeg`, `image/png`, `image/gif`, `image/webp` | 100MB |
| Audio | `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/mp4`, `audio/x-m4a` | 100MB |
| Video | `video/mp4`, `video/webm`, `video/quicktime` | 100MB |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/teachers/materials/upload` | Upload file |
| POST | `/api/v1/teachers/materials/notes` | Create text note |
| POST | `/api/v1/teachers/materials/urls` | Create URL link |
| GET | `/api/v1/teachers/materials` | List materials |
| GET | `/api/v1/teachers/materials/{id}` | Get material |
| GET | `/api/v1/teachers/materials/{id}/download` | Download file |
| GET | `/api/v1/teachers/materials/{id}/stream` | Stream media |
| GET | `/api/v1/teachers/materials/quota` | Get quota info |
| PATCH | `/api/v1/teachers/materials/{id}` | Update name |
| DELETE | `/api/v1/teachers/materials/{id}` | Delete material |

---
