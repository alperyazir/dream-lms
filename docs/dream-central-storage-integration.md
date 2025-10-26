# Dream Central Storage Integration Guide

**Document Version:** 1.0
**Last Updated:** 2025-10-23
**Status:** Integration Prerequisites

---

## 1. Overview

Dream Central Storage (DCS) is an **existing FastAPI + MinIO-based storage service** that Dream LMS integrates with to access book content, activity configurations, and store teacher-uploaded materials.

**Integration Type:** HTTP REST API with JWT Authentication
**Repository Location:** `/Users/alperyazir/Dev/dream-central-storage`

---

## 2. Dream Central Storage Architecture

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Backend | FastAPI | 0.111+ | REST API |
| Database | PostgreSQL | 16+ | Book metadata |
| Storage | MinIO | Latest | S3-compatible object storage |
| Auth | JWT | N/A | Token-based authentication |
| Reverse Proxy | Nginx | Latest | HTTPS, routing |

### Service Architecture

```
┌─────────────────────┐
│   Dream LMS         │
│   (FastAPI Backend) │
└──────────┬──────────┘
           │ HTTPS + JWT
           │
           ▼
┌─────────────────────┐       ┌──────────────────┐
│ Dream Central       │       │   MinIO          │
│ Storage API         │◄──────┤   S3 Storage     │
│ (FastAPI)           │       │   - Books/       │
│                     │       │   - Materials/   │
└─────────────────────┘       └──────────────────┘
           │
           ▼
┌─────────────────────┐
│   PostgreSQL        │
│   Book Metadata     │
└─────────────────────┘
```

---

## 3. Setup Prerequisites

### 3.1 Local Development Setup

**Step 1: Verify Dream Central Storage is Running**

```bash
cd /Users/alperyazir/Dev/dream-central-storage

# Check if services are running
docker ps | grep -E "dream-central|postgres|minio"

# If not running, start with Docker Compose
docker-compose up -d
```

**Step 2: Verify API Health**

```bash
# Test health endpoint
curl http://localhost:8000/health

# Expected response:
{
  "status": "ok",
  "service": "Dream Central Storage API",
  "version": "0.1.0"
}
```

**Step 3: Create Admin User (if needed)**

Dream Central Storage requires an admin user for authentication. Check if one exists:

```bash
# Access the API container
docker exec -it dream-central-storage-api-1 bash

# Run the seed script (if it exists)
python -m app.scripts.create_admin_user

# Or create manually via psql
docker exec -it dream-central-storage-postgres-1 psql -U dream_admin -d dream_central
```

### 3.2 Configuration Values

**From Dream Central Storage `.env.example`:**

```bash
# Dream Central Storage Connection Details
DCS_API_BASE_URL=http://localhost:8000  # Local dev
# Production: https://storage.yourdomain.com

# Authentication (JWT-based, not API keys!)
DCS_ADMIN_EMAIL=admin@dreamcentral.com
DCS_ADMIN_PASSWORD=<obtain from DCS team>

# MinIO Configuration (if direct access needed)
DCS_MINIO_ENDPOINT=localhost:9000
DCS_MINIO_ACCESS_KEY=dream_minio
DCS_MINIO_SECRET_KEY=dream_minio_secret
DCS_MINIO_SECURE=false  # true for production

# Database (read-only access for sync operations)
DCS_DATABASE_HOST=localhost
DCS_DATABASE_PORT=5432
DCS_DATABASE_USER=dream_admin
DCS_DATABASE_PASSWORD=dream_password
DCS_DATABASE_NAME=dream_central
```

**Add to Dream LMS `.env`:**

```bash
# Dream Central Storage Integration
DREAM_STORAGE_API_URL=http://localhost:8000
DREAM_STORAGE_ADMIN_EMAIL=admin@dreamcentral.com
DREAM_STORAGE_ADMIN_PASSWORD=<password>
DREAM_STORAGE_JWT_TOKEN=<obtained via login>
DREAM_STORAGE_TOKEN_EXPIRY_HOURS=24  # Refresh token before expiry
```

---

## 4. API Endpoints Reference

### 4.1 Authentication

**POST `/auth/login`**

Authenticate and obtain JWT token.

**Request:**
```json
{
  "email": "admin@dreamcentral.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer"
}
```

**GET `/auth/session`**

Validate current JWT token and get session info.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user_id": 1,
  "email": "admin@dreamcentral.com"
}
```

### 4.2 Books API

**GET `/books`**

List all available books.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "publisher": "FlowBook Publishing",
    "book_name": "Switch to CLIL",
    "language": "English",
    "category": "Education",
    "version": "1.0.0",
    "status": "published",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]
```

**GET `/books/{book_id}`**

Get specific book metadata.

**POST `/books`**

Create new book metadata (admin only).

**PATCH `/books/{book_id}`**

Update book metadata (admin only).

**DELETE `/books/{book_id}`**

Delete book (moves to trash).

**POST `/books/{book_id}/upload`**

Upload book ZIP archive containing config.json and assets.

### 4.3 Storage API

**GET `/storage/browse`**

Browse storage contents by path.

**Query Parameters:**
- `publisher`: Filter by publisher
- `book_name`: Filter by book name
- `path`: Relative path within book (optional)

**Response:**
```json
{
  "objects": [
    {
      "name": "books/SwitchtoCLIL/config.json",
      "size": 15234,
      "last_modified": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**GET `/storage/download`**

Generate pre-signed URL for object download.

**Query Parameters:**
- `path`: Object path in MinIO

**Response:**
```json
{
  "url": "http://minio:9000/dream-central-storage/books/...",
  "expires_in_seconds": 3600
}
```

---

## 5. Integration Patterns for Dream LMS

### 5.1 Authentication Flow

```python
# services/dream_storage_client.py
import httpx
from datetime import datetime, timedelta
from typing import Optional

class DreamStorageClient:
    def __init__(self, base_url: str, admin_email: str, admin_password: str):
        self.base_url = base_url
        self.admin_email = admin_email
        self.admin_password = admin_password
        self._token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    async def _ensure_authenticated(self):
        """Ensure we have a valid JWT token."""
        if self._token and self._token_expires_at:
            if datetime.utcnow() < self._token_expires_at - timedelta(minutes=5):
                return  # Token still valid

        # Login to get new token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/auth/login",
                json={"email": self.admin_email, "password": self.admin_password}
            )
            response.raise_for_status()
            data = response.json()
            self._token = data["access_token"]
            # JWT tokens from DCS expire in 24 hours (configurable)
            self._token_expires_at = datetime.utcnow() + timedelta(hours=23)

    async def get_books(self) -> list[dict]:
        """Fetch all books from Dream Central Storage."""
        await self._ensure_authenticated()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/books",
                headers={"Authorization": f"Bearer {self._token}"}
            )
            response.raise_for_status()
            return response.json()

    async def get_presigned_url(self, object_path: str) -> str:
        """Get pre-signed URL for a storage object."""
        await self._ensure_authenticated()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/storage/download",
                params={"path": object_path},
                headers={"Authorization": f"Bearer {self._token}"}
            )
            response.raise_for_status()
            data = response.json()
            return data["url"]
```

### 5.2 Config.json Retrieval

```python
async def get_book_config(self, book_id: int) -> dict:
    """Fetch and parse config.json for a book."""
    # 1. Get book metadata
    book = await self.get_book(book_id)

    # 2. Construct config.json path
    config_path = f"books/{book['book_name']}/config.json"

    # 3. Get pre-signed URL
    config_url = await self.get_presigned_url(config_path)

    # 4. Download and parse
    async with httpx.AsyncClient() as client:
        response = await client.get(config_url)
        response.raise_for_status()
        return response.json()
```

### 5.3 Activity Asset URL Transformation

```python
async def transform_activity_config(self, activity_config: dict) -> dict:
    """Transform relative paths in activity config to pre-signed URLs."""
    config = activity_config.copy()

    # Example: Transform image paths
    if "section_path" in config:
        relative_path = config["section_path"].lstrip("./")
        config["section_path"] = await self.get_presigned_url(relative_path)

    # Transform audio paths
    if "audio_path" in config:
        relative_path = config["audio_path"].lstrip("./")
        config["audio_path"] = await self.get_presigned_url(relative_path)

    return config
```

---

## 6. Testing the Integration

### 6.1 Manual Testing

```bash
# 1. Start Dream Central Storage
cd /Users/alperyazir/Dev/dream-central-storage
docker-compose up -d

# 2. Test authentication
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dreamcentral.com","password":"your_password"}'

# Copy the access_token from response

# 3. Test book listing
curl http://localhost:8000/books \
  -H "Authorization: Bearer <your_token>"

# 4. Test storage browsing
curl "http://localhost:8000/storage/browse?publisher=FlowBook" \
  -H "Authorization: Bearer <your_token>"
```

### 6.2 Integration Tests

```python
# tests/integration/test_dream_storage.py
import pytest
from app.services.dream_storage_client import DreamStorageClient

@pytest.mark.asyncio
async def test_dream_storage_authentication():
    client = DreamStorageClient(
        base_url="http://localhost:8000",
        admin_email="admin@dreamcentral.com",
        admin_password="test_password"
    )

    books = await client.get_books()
    assert isinstance(books, list)

@pytest.mark.asyncio
async def test_config_json_retrieval():
    client = DreamStorageClient(...)
    config = await client.get_book_config(book_id=1)
    assert "books" in config  # FlowBook config structure
```

---

## 7. Production Considerations

### 7.1 Deployment

**Option 1: Same VPS (Recommended for MVP)**
- Both Dream LMS and Dream Central Storage run on same VPS
- Internal network communication (no external HTTPS needed)
- Use Docker Compose networking

```yaml
# docker-compose.yml (Dream LMS)
services:
  dream-lms-backend:
    environment:
      - DREAM_STORAGE_API_URL=http://dream-central-storage-api:8000
    networks:
      - shared_network

networks:
  shared_network:
    external: true
    name: dream-central-storage_default
```

**Option 2: Separate Servers**
- Dream Central Storage on dedicated server
- HTTPS required for external communication
- Use domain: `https://storage.yourdomain.com`

### 7.2 Security

**Token Management:**
- Store JWT token in Redis with TTL
- Refresh before expiry (24 hours default)
- Never expose token in frontend

**Error Handling:**
```python
try:
    books = await dream_storage_client.get_books()
except httpx.HTTPError as e:
    if e.response.status_code == 401:
        # Token expired, re-authenticate
        await dream_storage_client._ensure_authenticated()
        books = await dream_storage_client.get_books()
    else:
        raise
```

---

## 8. Troubleshooting

### Common Issues

**Issue 1: "Connection refused" errors**
```bash
# Check if Dream Central Storage is running
docker ps | grep dream-central

# Check logs
docker logs dream-central-storage-api-1
```

**Issue 2: "Invalid token" errors**
```bash
# Token might be expired (24-hour default)
# Re-authenticate via /auth/login endpoint
```

**Issue 3: "Book not found" errors**
```bash
# Verify books exist in database
docker exec -it dream-central-storage-postgres-1 psql -U dream_admin -d dream_central -c "SELECT * FROM books;"
```

**Issue 4: "MinIO bucket not found"**
```bash
# Check MinIO buckets
docker exec -it dream-central-storage-minio-1 mc ls local/

# Create bucket if needed
docker exec -it dream-central-storage-minio-1 mc mb local/dream-central-storage
```

---

## 9. API Changes or Customizations

Since both projects are under our control, we can modify either side:

### Potential Enhancements

**Add Publisher-Specific Endpoints:**
```python
# Dream Central Storage: Add publisher filtering
@router.get("/books/by-publisher/{publisher_id}")
def list_books_by_publisher(publisher_id: int, credentials: ...):
    ...
```

**Add Batch Pre-signed URL Generation:**
```python
# Reduce round trips for activities with multiple assets
@router.post("/storage/batch-presigned-urls")
def get_batch_presigned_urls(paths: list[str], credentials: ...):
    ...
```

---

## 10. Summary Checklist

- [ ] Dream Central Storage is running locally (`docker ps`)
- [ ] Admin user exists and credentials are known
- [ ] Test authentication via `/auth/login`
- [ ] Test book listing via `/books`
- [ ] Environment variables configured in Dream LMS `.env`
- [ ] DreamStorageClient implemented in Dream LMS
- [ ] Integration tests pass
- [ ] Error handling for token expiry implemented
- [ ] Pre-signed URL transformation tested

---

## Appendix A: Full API Endpoint List

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | No | Authenticate and get JWT |
| GET | `/auth/session` | Yes | Validate token |
| GET | `/books` | Yes | List all books |
| GET | `/books/{id}` | Yes | Get book by ID |
| POST | `/books` | Yes | Create book |
| PATCH | `/books/{id}` | Yes | Update book |
| DELETE | `/books/{id}` | Yes | Delete book (to trash) |
| POST | `/books/{id}/upload` | Yes | Upload book ZIP |
| GET | `/storage/browse` | Yes | Browse storage |
| GET | `/storage/download` | Yes | Get pre-signed URL |
| GET | `/storage/trash` | Yes | List trash entries |
| POST | `/storage/restore` | Yes | Restore from trash |
| DELETE | `/storage/trash` | Yes | Permanently delete |
| GET | `/health` | No | Health check |
| GET | `/metrics` | No | Prometheus metrics |

---

**End of Document**
