# Epic 3: Book Integration & Assignment Management

**Epic Goal:**

Integrate Dream LMS with Dream Central Storage to provide access to the complete book catalog and activity definitions. Enable teachers to create
 and manage classes, browse available books and their interactive activities, and create assignments with configurable settings (due dates, time 
limits, target students/classes). Students can view their assigned homework with all relevant details and deadlines. By the end of this epic, the
 core LMS assignment workflow is complete: teachers assign work, students see what's due, setting the foundation for activity completion in Epic
4.

## Story 3.1: Dream Central Storage API Integration

As a **developer**,  
I want **a reusable HTTP client service that authenticates with and queries Dream Central Storage REST API**,  
so that **the backend can retrieve book catalogs, activity configurations, and media assets**.

### Acceptance Criteria:

1. Backend service class `DreamCentralStorageClient` is created using httpx async client
2. Client authenticates with Dream Central Storage using provided credentials/API keys (configuration from environment variables)
3. Client implements retry logic with exponential backoff for transient failures (max 3 retries)
4. Client includes timeout configuration (e.g., 30 seconds for API calls)
5. Error handling differentiates between client errors (4xx), server errors (5xx), and network failures
6. Client implements connection pooling for performance optimization
7. Client methods include: `get_books()`, `get_book_by_id(book_id)`, `get_book_config(book_id)`, `get_asset_url(asset_path)`
8. Response caching layer stores frequently accessed book data (e.g., 15-minute TTL using in-memory cache or Redis)
9. API endpoint documentation from Dream Central Storage is incorporated into developer documentation
10. Unit tests mock Dream Central Storage responses to test error handling and retry logic
11. Integration tests verify successful communication with actual Dream Central Storage API (using test credentials)
12. Logging captures all API requests/responses for debugging and monitoring
13. Rate limiting is respected based on Dream Central Storage API quotas

## Story 3.2: Book Catalog & Activity Data Models

As a **developer**,
I want **database models and API schemas for books, activities, and their metadata**,
so that **the application can store book references and parse activity configurations**.

### Acceptance Criteria:

1. Book model includes: id, dream_storage_id (external ID), title, publisher_id (foreign key), description, cover_image_url, created_at,
updated_at
2. BookAccess model implements publisher permissions: id, book_id (foreign key), publisher_id (foreign key), granted_at
3. Activity model includes: id, book_id (foreign key), dream_activity_id, activity_type (enum: drag_drop, word_match, multiple_choice, 
true_false, word_search), title, config_json (JSONB field), order_index
4. Database migration creates these tables with appropriate indexes (book_id, publisher_id, activity_type)
5. Backend service `BookService` syncs book data from Dream Central Storage to local database
6. Config.json parser extracts activity definitions and populates Activity table
7. API endpoint `GET /api/books/sync` (admin-only) triggers book catalog synchronization from Dream Central Storage
8. Pydantic schemas for API responses: BookResponse, ActivityResponse with proper validation
9. Unit tests verify config.json parsing for all activity types
10. Integration tests verify book sync creates/updates database records correctly
11. Composite index on (publisher_id, book_id) for efficient permission queries

## Story 3.3: Teacher Class Management

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

## Story 3.4: Book Catalog Browsing for Teachers

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

## Story 3.5: Assignment Creation Dialog & Configuration

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

## Story 3.6: Teacher Assignment Management Dashboard

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

## Story 3.7: Student Assignment View & Dashboard

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
