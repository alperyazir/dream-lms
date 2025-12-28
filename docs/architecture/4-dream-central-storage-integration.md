# 4. Dream Central Storage Integration

## 4.1 Overview

Dream Central Storage (DCS) is a **separate REST API service** that manages publishers, books, and content. It is backed by MinIO S3-compatible object storage for assets (images, audio, book covers) and teacher-uploaded materials. Dream LMS consumes data from DCS via REST API with in-memory caching.

**DCS Architecture (v2 - Since Story 24.x):**
- **DCS owns**: Publishers, Books, Book content, Media assets
- **LMS owns**: Schools, Teachers, Students, Assignments, Progress
- **Integration method**: REST API consumption (not database sync)
- **Caching strategy**: In-memory cache with TTL and webhook invalidation
- **No local copies**: Publishers and books are NOT stored in LMS database

**Key Integration Points:**
1. Fetch publishers/books from DCS REST API on-demand
2. Cache responses in-memory with configurable TTL
3. Webhook notifications trigger cache invalidation
4. Activity asset loading (pre-signed URL transformation)
5. Teacher material uploads (PDFs, videos)
6. Direct browser → MinIO access (no backend bottleneck)

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

## 4.4 DCS API Integration & Caching

**Architecture (v2):** LMS consumes publisher and book data from DCS REST API, not local database.

### DCS API Endpoints

LMS requires these DCS endpoints:
- `GET /publishers/` - List all publishers
- `GET /publishers/{id}` - Get publisher details
- `GET /publishers/{id}/logo` - Get publisher logo
- `GET /books/` - List all books
- `GET /books/{id}` - Get book details
- `GET /storage/books/{publisher}/{book}/config` - Get book config.json
- `GET /storage/books/{publisher}/{book}/cover` - Get book cover image
- `GET /storage/books/{publisher}/{book}/object` - Get book assets

### Publisher Service (v2)

```python
# backend/app/services/publisher_service_v2.py

class PublisherService:
    """
    Fetches publisher data from DCS API with caching.
    Does NOT store publishers in local database.
    """

    def __init__(self, dcs_client: DreamStorageClient, cache: DCSCache):
        self.dcs_client = dcs_client
        self.cache = cache

    async def list_publishers(self) -> list[PublisherPublic]:
        """Fetch all publishers from DCS (cached)."""
        return await self.cache.get_or_fetch(
            key=CacheKeys.PUBLISHER_LIST,
            fetch_fn=self.dcs_client.list_publishers,
            ttl=settings.DCS_CACHE_PUBLISHER_TTL,
        )

    async def get_publisher(self, publisher_id: str) -> PublisherPublic | None:
        """Fetch single publisher from DCS (cached)."""
        return await self.cache.get_or_fetch(
            key=CacheKeys.publisher_by_id(publisher_id),
            fetch_fn=lambda: self.dcs_client.get_publisher(publisher_id),
            ttl=settings.DCS_CACHE_PUBLISHER_TTL,
        )
```

### Book Service (v2)

```python
# backend/app/services/book_service_v2.py

class BookService:
    """
    Fetches book data from DCS API with caching.
    Does NOT store books in local database.
    """

    async def list_books(
        self,
        publisher_id: str | None = None
    ) -> list[BookPublic]:
        """Fetch all books from DCS (cached)."""
        if publisher_id:
            key = CacheKeys.books_by_publisher(publisher_id)
            fetch_fn = lambda: self.dcs_client.list_books(publisher_id=publisher_id)
        else:
            key = CacheKeys.BOOK_LIST
            fetch_fn = self.dcs_client.list_books

        return await self.cache.get_or_fetch(
            key=key,
            fetch_fn=fetch_fn,
            ttl=settings.DCS_CACHE_BOOK_TTL,
        )
```

### Cache Configuration

```python
# backend/app/core/config.py

class Settings(BaseSettings):
    # DCS Cache settings (in seconds)
    DCS_CACHE_DEFAULT_TTL: int = 300  # 5 minutes
    DCS_CACHE_PUBLISHER_TTL: int = 600  # 10 minutes
    DCS_CACHE_BOOK_TTL: int = 600  # 10 minutes
    DCS_CACHE_LOGO_TTL: int = 3600  # 1 hour
    DCS_CACHE_WARMUP_ENABLED: bool = False  # Optional warmup at startup
```

### Cache Warmup (Optional)

```python
# backend/app/main.py - lifespan startup

if settings.DCS_CACHE_WARMUP_ENABLED:
    publisher_service = get_publisher_service()

    try:
        # Pre-fetch publishers
        await publisher_service.list_publishers()
        logger.info("✅ Cache warmed: publishers")

        # Book list can be large, only warmup if needed
        # await book_service.list_books()
    except Exception as e:
        logger.warning(f"⚠️  Cache warmup failed: {e}")
```

### Webhook-Based Cache Invalidation

DCS sends webhook notifications when publishers or books are created/updated/deleted. LMS invalidates relevant cache entries.

```python
# backend/app/api/routes/webhooks.py

@router.post("/dream-storage")
async def receive_dream_storage_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSessionDep,
) -> dict:
    """
    Receive webhook from DCS and invalidate cache.

    Validates signature, logs event, queues background cache invalidation.
    """
    cache = get_dcs_cache()

    # Process based on event type
    if event_type.startswith("book."):
        if event_type == "book.created":
            await cache.invalidate(CacheKeys.BOOK_LIST)
            await cache.invalidate_pattern("dcs:books:publisher:")
        elif event_type == "book.updated":
            await cache.invalidate(CacheKeys.book_by_id(book_id))
            await cache.invalidate(CacheKeys.book_config(book_id))
            await cache.invalidate(CacheKeys.BOOK_LIST)
        elif event_type == "book.deleted":
            await cache.invalidate_pattern(f"dcs:books:id:{book_id}")
            await cache.invalidate(CacheKeys.BOOK_LIST)

    elif event_type.startswith("publisher."):
        if event_type == "publisher.created":
            await cache.invalidate(CacheKeys.PUBLISHER_LIST)
        elif event_type == "publisher.updated":
            await cache.invalidate(CacheKeys.publisher_by_id(publisher_id))
            await cache.invalidate(CacheKeys.publisher_logo(publisher_id))
            await cache.invalidate(CacheKeys.PUBLISHER_LIST)
        elif event_type == "publisher.deleted":
            await cache.invalidate_pattern(f"dcs:publishers:id:{publisher_id}")
            await cache.invalidate_pattern(f"dcs:books:publisher:{publisher_id}")
            await cache.invalidate(CacheKeys.PUBLISHER_LIST)

    return {"status": "received", "event_id": str(event_log.id)}
```

### Cache Monitoring

Admin-only endpoint for monitoring cache performance:

```python
# backend/app/api/routes/admin.py

@router.get("/cache/stats")
def get_cache_stats(_: User = require_role(UserRole.admin)) -> dict:
    """
    Get DCS cache statistics for monitoring.

    Returns:
    - entries: Current number of cached items
    - hits: Total cache hits since startup
    - misses: Total cache misses since startup
    - hit_rate: Cache hit rate (0.0 to 1.0)
    """
    cache = get_dcs_cache()
    return cache.stats()
```

**Target Metrics:**
- Cache hit rate: > 80% in normal operation
- API response time (cached): < 50ms
- API response time (uncached): < 500ms

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
