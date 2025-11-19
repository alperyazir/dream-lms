# Epic 3: Book Integration & Assignment Management

**Epic Goal:**

Integrate Dream LMS with Dream Central Storage to provide access to the complete book catalog and activity definitions. Enable teachers to create
 and manage classes, browse available books and their interactive activities, and create assignments with configurable settings (due dates, time 
limits, target students/classes). Students can view their assigned homework with all relevant details and deadlines. By the end of this epic, the
 core LMS assignment workflow is complete: teachers assign work, students see what's due, setting the foundation for activity completion in Epic
4.

## Story 3.0: Dream Central Storage Setup & Configuration

As a **developer**,
I want **to document and configure the Dream Central Storage integration credentials and environment**,
so that **the application can connect to Dream Central Storage in development and production environments**.

### Acceptance Criteria:

1. Environment variables added to `.env` and documented in `.env.example`:
   - `DREAM_CENTRAL_STORAGE_URL` (default: `http://localhost:8081` for dev, production URL for prod)
   - `DREAM_CENTRAL_STORAGE_EMAIL` (default: `admin@admin.com` for dev, to be changed in production)
   - `DREAM_CENTRAL_STORAGE_PASSWORD` (default: `admin` for dev, to be changed in production)
   - `DREAM_CENTRAL_STORAGE_TOKEN_EXPIRY` (default: 30 minutes - JWT token lifespan)
2. Configuration module `app/core/config.py` includes Dream Central Storage settings with validation
3. Developer documentation (`docs/setup.md` or similar) explains:
   - How to set up local Dream Central Storage instance for development
   - How credentials are used (JWT authentication flow)
   - Security note: Production credentials must be different from development defaults
   - How to test connectivity: `curl -X POST http://localhost:8081/auth/login -H "Content-Type: application/json" -d '{"email":"admin@admin.com","password":"admin"}'`
4. `.env.example` includes clear comments warning that default credentials are for development only
5. CI/CD pipeline documentation includes steps for setting production environment variables
6. Health check endpoint `GET /api/utils/health-check/` includes Dream Central Storage connectivity status
7. Admin panel (if exists) or management command to test Dream Central Storage connection
8. Security documentation warns against committing actual credentials to version control

### Technical Notes:

**Authentication Flow:**
1. Application uses email/password to obtain JWT access token from `POST /auth/login`
2. JWT token is cached and reused for subsequent API calls
3. Token expiration is tracked; new token is obtained when current one expires
4. All API requests include `Authorization: Bearer {token}` header

**Production Considerations:**
- Dream Central Storage URL will be different in production (e.g., `https://storage.dream-lms.com`)
- Production credentials must be securely managed (e.g., AWS Secrets Manager, environment variables)
- Token refresh logic should handle network failures gracefully

## Story 3.1: Dream Central Storage API Integration

As a **developer**,  
I want **a reusable HTTP client service that authenticates with and queries Dream Central Storage REST API**,  
so that **the backend can retrieve book catalogs, activity configurations, and media assets**.

### Acceptance Criteria:

1. Backend service class `DreamCentralStorageClient` is created using httpx async client
2. Client implements JWT authentication flow:
   - `authenticate()` method calls `POST /auth/login` with email/password from env variables
   - Stores JWT token with expiration timestamp (30 minutes from issue time)
   - Auto-refreshes token when expired or returns 401 Unauthorized
   - All API calls include `Authorization: Bearer {token}` header
3. Client implements retry logic with exponential backoff for transient failures (max 3 retries)
4. Client includes timeout configuration (30 seconds for API calls, 60 seconds for file downloads)
5. Error handling differentiates between:
   - 401 Unauthorized (trigger re-authentication and retry)
   - 403 Forbidden (insufficient permissions, log and raise)
   - 404 Not Found (resource doesn't exist, return None or raise)
   - 5xx Server errors (retry with backoff)
   - Network failures (retry with backoff)
6. Client implements connection pooling for performance optimization (max 10 concurrent connections)
7. Client methods include:
   - `authenticate() -> TokenResponse` - Obtain JWT access token
   - `get_books() -> List[BookRead]` - Fetch all books from `GET /books/`
   - `get_book_by_id(book_id: int) -> BookRead` - Fetch specific book from `GET /books/{book_id}`
   - `get_book_config(publisher: str, book_name: str) -> dict` - Fetch config.json from `GET /storage/books/{publisher}/{book_name}/config`
   - `list_book_contents(publisher: str, book_name: str) -> List[str]` - List files from `GET /storage/books/{publisher}/{book_name}`
   - `get_asset_url(publisher: str, book_name: str, asset_path: str) -> str` - Generate authenticated URL for `GET /storage/books/{publisher}/{book_name}/object?path={asset_path}`
   - `download_asset(publisher: str, book_name: str, asset_path: str) -> bytes` - Download asset file
8. Response caching layer stores book catalog and config data:
   - Book list cache: 15-minute TTL (in-memory or Redis)
   - Config.json cache: 30-minute TTL (config rarely changes)
   - Cache invalidation on sync operation
9. Token caching and refresh:
   - JWT token cached in memory with expiration tracking
   - Token refreshed automatically 5 minutes before expiry or on 401 response
   - Thread-safe token refresh (prevent concurrent re-auth requests)
10. Unit tests mock Dream Central Storage responses for all client methods
11. Unit tests verify retry logic, token refresh, and error handling paths
12. Integration tests verify successful communication with actual Dream Central Storage API (using test credentials)
13. Logging captures:
    - Authentication attempts and token refresh events
    - All API requests with method, URL, and response status
    - Error responses with full error details
    - Cache hits/misses for monitoring
14. Rate limiting detection: If 429 Too Many Requests received, respect Retry-After header

## Story 3.2: Book Catalog & Activity Data Models

As a **developer**,
I want **database models and API schemas for books, activities, and their metadata**,
so that **the application can store book references and parse activity configurations**.

### Acceptance Criteria:

1. **Book model** includes:
   - `id` (primary key, auto-increment)
   - `dream_storage_id` (integer, external ID from Dream Central Storage)
   - `book_name` (string, unique identifier used in Dream Central Storage paths, e.g., "BRAINS", "KEEN A")
   - `title` (string, display name from config.json `book_title` field)
   - `publisher` (string, publisher name from Dream Central Storage, e.g., "Universal ELT")
   - `publisher_id` (foreign key to Publisher table - mapped from publisher string)
   - `language` (string, e.g., "en")
   - `category` (string, e.g., "English", "fun")
   - `status` (enum: published, draft, archived - from Dream Central Storage)
   - `cover_image_url` (string, local path to cached cover image, e.g., `/media/book_covers/{book_id}_cover.png`)
   - `config_json` (JSONB, full config.json for reference)
   - `created_at`, `updated_at` (timestamps)
   - `synced_at` (timestamp, last sync from Dream Central Storage)
   - Unique constraint on `(dream_storage_id)`
   - Index on `(publisher_id, status)`

2. **BookAccess model** implements publisher permissions:
   - `id` (primary key)
   - `book_id` (foreign key to Book)
   - `publisher_id` (foreign key to Publisher)
   - `granted_at` (timestamp)
   - Unique constraint on `(book_id, publisher_id)`

3. **Activity model** includes:
   - `id` (primary key)
   - `book_id` (foreign key to Book)
   - `module_name` (string, e.g., "Module 1", "Intro" - from config.json)
   - `page_number` (integer, page in the book)
   - `section_index` (integer, section order within page)
   - `activity_type` (enum: `matchTheWords`, `dragdroppicture`, `dragdroppicturegroup`, `fillSentencesWithDots`, `fillpicture`, `circle`)
   - `title` (string, extracted from config `headerText` or generated from type)
   - `config_json` (JSONB, full activity configuration from config.json section)
   - `order_index` (integer, global order across all activities in book for sorting)
   - `created_at`, `updated_at` (timestamps)
   - Index on `(book_id, order_index)`
   - Index on `(book_id, activity_type)`

4. Database migration creates these tables with appropriate indexes

5. **Backend service `BookService`** implements sync logic:
   - `sync_all_books()` - Fetches all books from Dream Central Storage and syncs to database
   - `sync_book(dream_storage_id: int)` - Syncs single book including config parsing
   - Creates/updates Book records (upsert based on dream_storage_id)
   - Maps `publisher` string to `Publisher` entity (lookup or create)
   - Downloads and caches book cover images locally during sync:
     - Downloads from `{DREAM_CENTRAL_STORAGE_URL}/storage/books/{publisher}/{book_name}/object?path=images/book_cover.png`
     - Saves to `media/book_covers/{book_id}_cover.png`
     - Updates `cover_image_url` with local path
     - Only re-downloads if book updated or local file missing
   - Updates `synced_at` timestamp on successful sync

6. **Config.json parser** (`ConfigParser` class or module):
   - Parses nested structure: `books → modules → pages → sections`
   - **Activity Detection Rule**: A section is an activity if and only if it contains an `activity` field
   - For each section with `activity` field:
     - Determines `activity_type` from `section.activity.type`
     - Extracts `title` from `section.activity.headerText` or generates from type (e.g., "Audio Activity" for audio type)
     - Calculates `order_index` based on module order, page number, and section index
     - Stores full `section.activity` object in `config_json` field
   - Handles all known activity types: `matchTheWords`, `dragdroppicture`, `dragdroppicturegroup`, `fillSentencesWithDots`, `fillpicture`, `circle`
   - Note: Sections with `type: "audio"` that don't have an `activity` field are not activities (just page decorations)
   - Validates required fields for each activity type
   - Skips sections without `activity` field (non-interactive page elements)

7. API endpoint `GET /api/v1/books/sync` (admin-only):
   - Triggers book catalog synchronization from Dream Central Storage
   - Returns sync summary: books created/updated, activities created/updated, errors
   - Runs asynchronously (returns immediately, sync happens in background task)
   - Logs detailed sync progress for debugging

8. **Pydantic schemas** for API responses:
   - `BookResponse`: id, title, book_name, publisher, language, category, cover_image_url, activity_count
   - `ActivityResponse`: id, book_id, module_name, page_number, activity_type, title, config (partial or full depending on use case)
   - `BookSyncResponse`: success, books_synced, activities_created, errors

9. Unit tests verify:
   - Config.json parsing for all activity types (use sample configs)
   - Publisher string mapping to Publisher entity
   - Cover image URL construction
   - Activity order_index calculation
   - Upsert logic (update existing vs create new)

10. Integration tests verify:
    - Book sync creates Book and Activity records correctly
    - Re-sync updates existing records without duplication
    - BookAccess grants permissions to correct publishers
    - Sync handles missing/malformed config.json gracefully

11. Composite index on `(publisher_id, book_id)` for efficient permission queries

### Technical Notes:

**Config.json Structure Example:**
```json
{
  "book_cover": "./books/BRAINS/images/book_cover.png",
  "book_title": "BRAINS",
  "books": [
    {
      "modules": [
        {
          "name": "Module 1",
          "pages": [
            {
              "page_number": 7,
              "sections": [
                {
                  "type": "fill",
                  "activity": {
                    "type": "matchTheWords",
                    "headerText": "Look, read, and match.",
                    "match_words": [...],
                    "sentences": [...]
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Activity Types Found:**
- `matchTheWords` - Word matching exercise
- `dragdroppicture` - Drag and drop pictures
- `dragdroppicturegroup` - Drag and drop picture groups
- `fillSentencesWithDots` - Fill in the blanks
- `fillpicture` - Fill picture exercise
- `circle` - Circle the correct answer

**Note:** Sections with `type: "audio"` are page elements (for audio playback), not activities. Only sections containing an `activity` field are actual activities.

**Cover Image Strategy:**
- Book covers are downloaded from Dream Central Storage during sync and cached locally
- Source pattern: `{DREAM_CENTRAL_STORAGE_URL}/storage/books/{publisher}/{book_name}/object?path=images/book_cover.png`
- Local storage: `media/book_covers/{book_id}_cover.png` or similar
- Database stores local path in `cover_image_url` field
- During sync, if cover doesn't exist locally or book updated, download and cache
- Frontend accesses cached cover via local media URL (no authentication required)

## Story 3.3: Book Asset Proxy & Delivery

As a **developer**,
I want **a backend API endpoint that serves authenticated book assets (images, audio, etc.) from Dream Central Storage**,
so that **the frontend can display book content without handling Dream Central Storage authentication**.

### Acceptance Criteria:

1. API endpoint `GET /api/v1/books/{book_id}/assets/{asset_path:path}` serves book assets:
   - `book_id` - ID of the book in local database
   - `asset_path` - Relative path to asset (e.g., `images/M1/p7m5.jpg`, `audio/6a.mp3`)
   - Requires user authentication (student, teacher, or admin)
   - Verifies user has access to the book through their publisher
2. Endpoint proxies request to Dream Central Storage:
   - Looks up book's `publisher` and `book_name` from database
   - Constructs Dream Central Storage URL: `GET /storage/books/{publisher}/{book_name}/object?path={asset_path}`
   - Uses DreamCentralStorageClient with JWT authentication
   - Streams response back to client with appropriate Content-Type header
3. Asset caching layer (optional for MVP, recommended for production):
   - Cache frequently accessed assets locally (images, audio)
   - Use asset path hash as cache key
   - Set cache expiration (e.g., 24 hours)
   - Serve from cache if available, otherwise fetch from Dream Central Storage
4. Error handling:
   - 403 Forbidden if user doesn't have access to book's publisher
   - 404 Not Found if book doesn't exist or asset not found in Dream Central Storage
   - 500 Internal Server Error if Dream Central Storage is unreachable
5. Performance optimizations:
   - Stream large files (don't load entire file into memory)
   - Set appropriate cache headers (`Cache-Control`, `ETag`) for browser caching
   - Support range requests for audio/video streaming (optional for MVP)
6. Security:
   - Validate `asset_path` to prevent path traversal attacks
   - Only allow paths within book's directory structure
   - Log asset access for auditing
7. API endpoint `GET /api/v1/books/{book_id}/page-image/{page_number}` serves page images:
   - Convenience endpoint for page images
   - Returns image from `images/{module}/{ page_number}.png` pattern
   - Same authentication and authorization as generic asset endpoint
8. Unit tests verify:
   - Authorization checks (user must have access to book's publisher)
   - Path validation (prevent traversal attacks)
   - Error handling for missing assets
9. Integration tests verify:
   - Asset streaming from Dream Central Storage
   - Cache hit/miss behavior (if caching implemented)
   - Browser receives correct Content-Type and cache headers

### Technical Notes:

**Common Asset Paths:**
- Page images: `images/{module}/{page_number}.png` (e.g., `images/M1/7.png`)
- Activity images: `images/{module}/p{page}m{index}.jpg` (e.g., `images/M1/p7m5.jpg`)
- Audio files: `audio/{page}{letter}.mp3` (e.g., `audio/6a.mp3`, `audio/8b.mp3`)
- Book cover: `images/book_cover.png` (cached locally, not served via proxy)

**Frontend Usage Example:**
```javascript
// Instead of:
const imageUrl = `${dreamStorageUrl}/storage/books/${publisher}/${bookName}/object?path=images/M1/7.png`

// Frontend uses:
const imageUrl = `/api/v1/books/${bookId}/assets/images/M1/7.png`
```

**Caching Strategy:**
- Images: Cache locally for 24 hours (rarely change)
- Audio: Cache locally for 24 hours (rarely change)
- Config JSON: Already cached in Story 3.1 (30-minute TTL)

## Story 3.4: Dream Central Storage Webhook Integration

As a **developer**,
I want **to receive webhook notifications from Dream Central Storage when books are created, updated, or deleted**,
so that **the LMS can automatically sync book catalog changes without manual intervention**.

### Acceptance Criteria:

1. API endpoint `POST /api/v1/webhooks/dream-storage` receives webhook events:
   - Accepts JSON payload with event type and book data
   - Validates webhook signature/secret to ensure authenticity
   - Returns 200 OK immediately (processes webhook asynchronously)
   - Returns 401 Unauthorized if signature invalid
2. Webhook secret configuration:
   - Environment variable `DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET`
   - Used to validate webhook signatures (HMAC-SHA256 or similar)
   - Documented in `.env.example` with security warning
3. Supported webhook event types:
   - `book.created` - New book added to Dream Central Storage
   - `book.updated` - Book metadata or config.json updated
   - `book.deleted` - Book soft-deleted in Dream Central Storage
4. Webhook event handling:
   - `book.created`: Trigger `BookService.sync_book(dream_storage_id)`
   - `book.updated`: Trigger `BookService.sync_book(dream_storage_id)` with force refresh
   - `book.deleted`: Soft-delete or archive book in local database
5. Background job processing:
   - Webhook handler queues background task (using Celery, ARQ, or similar)
   - Background task performs actual sync operation
   - Prevents webhook timeout (Dream Central Storage expects quick response)
6. Retry logic:
   - If sync fails, retry up to 3 times with exponential backoff
   - Log failures for manual investigation
   - Send alert to admins if all retries fail (email or notification)
7. Webhook event logging:
   - Log all incoming webhook events (event type, book_id, timestamp)
   - Log processing results (success, failure, retry count)
   - Store in database for auditing and debugging
8. Webhook testing endpoint (development only):
   - `POST /api/v1/webhooks/dream-storage/test` (admin-only, dev environment only)
   - Allows triggering test webhook events manually
   - Not available in production
9. Documentation:
   - Document webhook endpoint URL format for Dream Central Storage configuration
   - Document expected payload structure
   - Document webhook secret setup process
10. Unit tests verify:
    - Webhook signature validation
    - Event type routing to correct handlers
    - Background job queuing
11. Integration tests verify:
    - End-to-end webhook processing
    - Book sync triggered by webhook
    - Retry logic on failures

### Technical Notes:

**Webhook Payload Example:**
```json
{
  "event": "book.updated",
  "timestamp": "2025-11-14T18:30:00Z",
  "data": {
    "id": 1,
    "book_name": "BRAINS",
    "publisher": "Universal ELT",
    "version": "1.4.6"
  },
  "signature": "sha256=abc123..."
}
```

**Signature Validation:**
- Dream Central Storage signs webhook payload with shared secret
- LMS validates signature using same secret
- Prevents unauthorized webhook calls

**Alternative: Polling Strategy** (fallback if webhooks not available):
- Scheduled job runs every 6-12 hours
- Fetches all books from Dream Central Storage
- Compares version numbers or `updated_at` timestamps
- Syncs books that changed
- Less efficient but more reliable if webhooks fail

## Story 3.5: Teacher Class Management

As a **teacher**,
I want **to create and manage classes and assign students to them**,
so that **I can organize my students into logical groups for assignment distribution**.

### Acceptance Criteria:

1. Class model includes: id, name, teacher_id (foreign key), school_id (foreign key), grade_level, subject, academic_year, created_at, 
updated_at, is_active
2. ClassStudent model (junction table): id, class_id (foreign key), student_id (foreign key), enrolled_at
3. Teacher dashboard displays list of classes with student count and recent activity summary
4. Teacher can create new class via form modal (fields: class name, grade level, subject, academic year)
5. Teacher can edit class details (name, grade, subject)
6. Teacher can archive/deactivate class (soft delete) with confirmation
7. Teacher can view class detail page showing enrolled students list
8. Teacher can add students to class via multi-select dropdown (shows only students they created)
9. Teacher can remove students from class with confirmation
10. Teacher can add multiple students at once using checkboxes
11. API endpoint `POST /api/classes` creates new class owned by authenticated teacher
12. API endpoint `GET /api/classes` returns only classes owned by authenticated teacher
13. API endpoint `POST /api/classes/{class_id}/students` adds students to class with validation (student must belong to teacher)
14. Frontend shows empty state when teacher has no classes: "Create your first class to get started"
15. Unit tests verify teacher can only manage their own classes and students
16. Integration tests cover full class CRUD workflow

## Story 3.6: Book Catalog Browsing for Teachers

As a **teacher**,
I want **to browse the catalog of books available to me and view their interactive activities**,
so that **I can discover content to assign to my students**.

### Acceptance Criteria:

1. Teacher navigation includes "Books" menu item leading to book catalog page
2. Book catalog displays all books accessible to teacher's publisher with grid or list view toggle
3. Each book card shows: cover image, title, publisher name, description (truncated), and "View Activities" button
4. Book catalog includes search functionality (by title or publisher)
5. Book catalog includes filter options: publisher, activity type, grade level (if metadata available)
6. Clicking "View Activities" opens book detail page or modal showing list of all activities
7. Activity list displays: activity title, activity type badge (drag-drop, word-match, etc.), estimated duration (if available)
8. Each activity has "Preview" button (placeholder/disabled for now - full preview in Epic 3)
9. Each activity has "Assign" button that opens assignment creation dialog
10. API endpoint `GET /api/books` returns books filtered by teacher's publisher with pagination
11. API endpoint `GET /api/books/{book_id}/activities` returns activities for specified book with config data
12. Backend verifies teacher has access to book through publisher permissions (BookAccess table)
13. Frontend displays appropriate message if no books are available: "No books assigned to your school yet. Contact your administrator."
14. Responsive design: grid view on desktop, list view on mobile
15. Integration tests verify teacher can only see books from their publisher

## Story 3.7: Assignment Creation Dialog & Configuration

As a **teacher**,
I want **to create assignments by selecting a book activity and configuring settings through a guided dialog**,
so that **I can assign work to my students with appropriate deadlines and parameters**.

### Acceptance Criteria:

1. Clicking "Assign" button on any activity opens assignment creation dialog (modal)
2. **Dialog Step 1 - Review Activity**: Shows activity title, book name, activity type, and brief description with "Next" button
3. **Dialog Step 2 - Select Recipients**: Multi-select interface to choose target classes or individual students with "Select All" and search
functionality
4. **Dialog Step 3 - Configure Settings**: Form with fields: assignment name (auto-populated, editable), due date (date picker), optional time
limit (number input in minutes), instructions (textarea, optional)
5. **Dialog Step 4 - Review & Create**: Summary view showing activity, recipients count, due date, time limit, with "Create Assignment" and
"Back" buttons
6. Assignment model includes: id, teacher_id (FK), activity_id (FK), book_id (FK), name, instructions, due_date, time_limit_minutes, created_at, 
updated_at
7. AssignmentStudent model (junction): id, assignment_id (FK), student_id (FK), status (enum: not_started, in_progress, completed), score,
started_at, completed_at, time_spent_minutes
8. API endpoint `POST /api/assignments` creates assignment and links to students/classes
9. Backend validates: due date is in future, time limit is positive integer, teacher has access to activity, all selected students belong to
teacher
10. Frontend validates all form fields before allowing submission
11. Success confirmation shows "Assignment created successfully! X students will be notified."
12. Dialog can be cancelled at any step, discarding unsaved data with confirmation
13. After creation, teacher is redirected to assignment detail page
14. Unit tests verify assignment creation logic and validation rules
15. Integration tests verify end-to-end assignment creation flow with various configurations

## Story 3.8: Teacher Assignment Management Dashboard

As a **teacher**,
I want **to view and manage all assignments I've created**,
so that **I can track which work has been assigned and monitor upcoming deadlines**.

### Acceptance Criteria:

1. Teacher navigation includes "Assignments" menu item leading to assignments dashboard
2. Assignments dashboard displays list of all assignments with columns: assignment name, book/activity, assigned to (class/student count), due
date, completion rate, actions
3. List view includes status badges: "Upcoming", "In Progress", "Past Due", "Completed"
4. List is sortable by: due date, creation date, completion rate, assignment name
5. List is filterable by: status, class, book, date range
6. Search functionality allows finding assignments by name
7. Each row has action buttons: "View Details", "Edit", "Delete"
8. Clicking "View Details" navigates to assignment detail page showing student completion list (detailed in Epic 4)
9. Clicking "Edit" opens dialog to modify: assignment name, instructions, due date, time limit (cannot change activity or recipients)
10. Clicking "Delete" shows confirmation dialog and soft-deletes assignment
11. Empty state when no assignments exist: "No assignments yet. Browse books to create your first assignment."
12. API endpoint `GET /api/assignments` returns all assignments created by authenticated teacher with eager-loaded relationships
13. API endpoint `PATCH /api/assignments/{assignment_id}` updates editable fields with validation
14. API endpoint `DELETE /api/assignments/{assignment_id}` soft-deletes assignment
15. Completion rate calculated as: (completed students / total assigned students) × 100%
16. Integration tests verify teacher can only view/edit/delete their own assignments

## Story 3.9: Student Assignment View & Dashboard

As a **student**,
I want **to see all homework assigned to me with due dates and status**,
so that **I know what work I need to complete and when it's due**.

### Acceptance Criteria:

1. Student dashboard "Assignments" section now displays actual assigned homework (replacing empty state from Epic 1)
2. Assignments are organized into tabs: "To Do" (not started + in progress), "Completed", "Past Due"
3. Each assignment card shows: assignment name, book cover thumbnail, activity type badge, due date (with countdown timer if within 24 hours),
status (not started/in progress/completed), score (if completed)
4. "To Do" tab sorts assignments by due date (soonest first)
5. Past due assignments display warning badge and red highlight
6. Clicking assignment card navigates to assignment detail page showing: full description, instructions, book/activity info, time limit (if set),
 "Start Assignment" button
7. "Start Assignment" button is placeholder for Epic 3 (shows message: "Activity player coming soon")
8. Completed assignments show score, completion date, and "View Feedback" button (placeholder for Epic 5)
9. API endpoint `GET /api/students/me/assignments` returns all assignments for authenticated student with filtering by status
10. Backend calculates assignment status based on due_date and AssignmentStudent.status
11. Frontend displays appropriate empty states for each tab
12. Notification dot appears on "Assignments" menu when student has new assignments (count badge)
13. Student cannot see assignments assigned to other students
14. Responsive design optimized for mobile devices (students may primarily use phones)
15. Integration tests verify student can only view their own assignments

---
