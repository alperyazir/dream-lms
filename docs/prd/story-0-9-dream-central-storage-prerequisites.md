# Story 0.9: Dream Central Storage Integration Prerequisites

**Epic:** Pre-Epic 1 (Foundation Prerequisites)
**Priority:** CRITICAL - Must complete before Story 2.1
**Estimated Effort:** 2-4 hours (Setup + Testing)

---

## Story

As a **developer**,
I want **Dream Central Storage to be accessible and configured for Dream LMS integration**,
so that **we can integrate book content and activities starting in Epic 2**.

---

## Background

Dream Central Storage (DCS) is an existing FastAPI + MinIO-based service that stores:
- Book metadata (PostgreSQL)
- Book assets: images, audio, config.json files (MinIO S3-compatible storage)
- Teacher-uploaded materials (future use)

Dream LMS will integrate with DCS via HTTP REST API using JWT authentication.

**Repository:** `/Users/alperyazir/Dev/dream-central-storage`

---

## Acceptance Criteria

### Environment Setup

1. **Dream Central Storage is running locally**
   - Services verified: `docker ps | grep -E "dream-central|postgres|minio"`
   - API health check passes: `GET http://localhost:8000/health` returns `{"status": "ok"}`
   - MinIO console accessible: `http://localhost:9001`
   - PostgreSQL accessible on port 5432

2. **Admin credentials are configured**
   - Admin user exists in DCS PostgreSQL database
   - Admin email and password documented in team password manager
   - Test authentication succeeds: `POST /auth/login` returns valid JWT token

3. **Dream LMS environment variables configured**
   - `backend/.env` includes:
     ```
     DREAM_STORAGE_API_URL=http://localhost:8000
     DREAM_STORAGE_ADMIN_EMAIL=admin@dreamcentral.com
     DREAM_STORAGE_ADMIN_PASSWORD=<secure_password>
     ```
   - `backend/.env.example` updated with DCS variables (passwords redacted)

4. **Network connectivity verified**
   - Dream LMS backend can reach DCS API
   - Test with curl or httpx from Dream LMS container
   - No firewall/network issues blocking communication

### Documentation

5. **Integration guide created**
   - `docs/dream-central-storage-integration.md` exists
   - Documents:
     - Setup instructions
     - Authentication flow (JWT-based)
     - Available API endpoints (`/auth`, `/books`, `/storage`)
     - Error handling strategies
     - Pre-signed URL pattern for assets

6. **API endpoint reference documented**
   - All DCS endpoints listed with:
     - HTTP method
     - Path
     - Authentication requirements
     - Request/response examples
   - Example Python client code provided

### Integration Testing

7. **Manual authentication test passes**
   ```bash
   curl -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@dreamcentral.com","password":"test_password"}'
   ```
   - Returns `{"access_token": "...", "token_type": "Bearer"}`

8. **Book listing test passes**
   ```bash
   curl http://localhost:8000/books \
     -H "Authorization: Bearer <token>"
   ```
   - Returns array of book objects (may be empty initially)

9. **Storage browsing test passes**
   ```bash
   curl "http://localhost:8000/storage/browse?publisher=Test" \
     -H "Authorization: Bearer <token>"
   ```
   - Returns storage objects or empty array

10. **Pre-signed URL generation test passes**
    ```bash
    curl "http://localhost:8000/storage/download?path=books/test/config.json" \
      -H "Authorization: Bearer <token>"
    ```
    - Returns `{"url": "...", "expires_in_seconds": 3600}`

### Code Preparation

11. **DreamStorageClient stub created**
    - `backend/app/services/dream_storage_client.py` exists
    - Implements:
      - `__init__(base_url, admin_email, admin_password)`
      - `async _ensure_authenticated()` - JWT token management
      - `async get_books()` - Fetch all books
      - `async get_book(book_id)` - Fetch specific book
      - `async get_presigned_url(object_path)` - Generate pre-signed URL
    - Includes error handling for:
      - Connection errors
      - Token expiry (401)
      - Service unavailable (503)

12. **Integration test suite created**
    - `backend/tests/integration/test_dream_storage.py` exists
    - Tests:
      - Authentication flow
      - Token refresh on expiry
      - Book listing
      - Error handling
    - Tests can be skipped if DCS not running (pytest markers)

---

## Definition of Done

- [ ] Dream Central Storage services running and healthy
- [ ] Admin credentials tested and documented
- [ ] Dream LMS can authenticate with DCS and get JWT token
- [ ] All manual API tests pass
- [ ] Integration guide document completed
- [ ] DreamStorageClient class implemented with basic methods
- [ ] Integration tests written (may be marked as optional/skip if DCS not running)
- [ ] Team walkthrough completed - all developers know how to:
  - Start Dream Central Storage locally
  - Authenticate and test endpoints
  - Access integration documentation

---

## Technical Notes

### Authentication Flow

Dream Central Storage uses **JWT tokens** (NOT API keys):

1. Login with email/password → Receive JWT token
2. Include token in all subsequent requests: `Authorization: Bearer <token>`
3. Tokens expire after 24 hours (configurable in DCS)
4. Dream LMS should cache token and refresh before expiry

### Key Endpoints for Dream LMS

| Endpoint | Purpose |
|----------|---------|
| `POST /auth/login` | Authenticate, get JWT token |
| `GET /books` | List all books with metadata |
| `GET /books/{id}` | Get specific book details |
| `GET /storage/download?path=...` | Get pre-signed URL for asset |
| `GET /storage/browse?publisher=...` | Browse storage by publisher/book |

### MinIO Access Pattern

Dream LMS should **NOT** access MinIO directly. Instead:
1. Request pre-signed URLs from DCS API (`/storage/download`)
2. Pass pre-signed URLs to frontend
3. Frontend loads assets directly from MinIO via pre-signed URL

This pattern:
- Maintains security (DCS controls access)
- Reduces Dream LMS backend load
- Allows URL caching (45-minute TTL recommended)

---

## Dependencies

**Blocks:**
- Story 2.1: Dream Central Storage API Integration
- All Epic 2 stories (cannot sync books without DCS)

**Requires:**
- Dream Central Storage repository access
- Docker and Docker Compose installed
- Network access between Dream LMS and DCS

---

## Future Considerations

Since we control both Dream LMS and Dream Central Storage codebases, we can:

1. **Add custom endpoints** if needed (e.g., batch pre-signed URLs)
2. **Optimize authentication** (shared JWT secrets, service-to-service auth)
3. **Add webhooks** for book updates (notify Dream LMS when new books added)
4. **Implement caching layer** (Redis) shared between both services

These are POST-MVP optimizations.

---

## Questions for Team

1. **Admin Credentials:** Should we create a dedicated service account for Dream LMS, or use the main admin account?
2. **Token Expiry:** 24-hour default OK, or should we request longer-lived tokens for service-to-service?
3. **Error Handling:** When DCS is down, should Dream LMS cache book data locally, or return errors to users?
4. **Deployment:** Will both services run on same VPS (simpler) or separate servers (more scalable)?

---

## References

- **Integration Guide:** `docs/dream-central-storage-integration.md`
- **DCS Repository:** `/Users/alperyazir/Dev/dream-central-storage`
- **DCS API Docs:** `http://localhost:8000/docs` (when running locally)
- **Architecture Section 4:** Dream Central Storage Integration

---

**End of Story**
