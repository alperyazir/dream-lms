# Performance Audit Report — Story 27.2

**Date:** 2026-03-25
**Auditor:** Quinn (QA Agent)
**Scope:** Database queries, connection pooling, caching, external services, frontend bundle

---

## Critical Findings

### PERF-C1: N+1 Query in Content Library Listing
- **Location:** `backend/app/api/routes/ai_generation.py:2277-2331`
- **Description:** Library listing iterates over paginated items and runs 4 individual queries per item (material name, teacher info, skill category, activity format). 20 items = 80 extra queries.
- **Impact:** Library page load hammers DB under concurrent teacher access.
- **Fix:** Batch-collect unique IDs, issue 4 `WHERE id IN (...)` queries before the loop.

### PERF-C2: New Sync Engine Created Per AI Generation Request
- **Location:** `backend/app/api/routes/ai_generation.py:3054-3065, 3647-3658`
- **Description:** `create_engine()` + `Session()` + `dispose()` on every request in an async handler. Blocks the event loop and creates a new connection pool each time.
- **Impact:** Under 50 concurrent AI requests, creates 50 connection pools. Event loop blocked during sync operations.
- **Fix:** Use existing engine from `app.core.db` or convert dispatcher to async.

---

## High Findings

### PERF-H1: `time.sleep()` Blocks Event Loop in LLM Retry
- **Location:** `backend/app/services/llm/providers/deepseek.py:229,240` and `gemini.py:349,360`
- **Description:** Synchronous `time.sleep()` in async retry logic blocks the entire event loop.
- **Fix:** Replace with `await asyncio.sleep()`.

### PERF-H2: Missing Index on `AssignmentStudent.status`
- **Location:** `backend/app/models.py:1224`
- **Description:** Used in WHERE clauses throughout analytics. Full table scan on what could be millions of rows.
- **Fix:** Add `Index("ix_assignment_students_status", "status")`.

### PERF-H3: Missing Index on `AssignmentStudent.completed_at`
- **Location:** `backend/app/models.py:1229`
- **Description:** Used in ORDER BY and WHERE for streaks, periods, trends. No index.
- **Fix:** Add composite index `("student_id", "completed_at")`.

### PERF-H4: N+1 in Publisher Teacher Listing
- **Location:** `backend/app/api/routes/publishers.py:335-353`
- **Description:** 2 COUNT queries per teacher in a loop, no pagination on the list.
- **Fix:** Use SQL subqueries for counts, add pagination.

### PERF-H5: Connection Pool Misalignment
- **Location:** `config.py`, `pgbouncer.ini`, `postgresql-tuning.conf`
- **Description:** PgBouncer `default_pool_size=200` equals PostgreSQL `max_connections=200`. No headroom for admin connections.
- **Fix:** Set PostgreSQL `max_connections=220` or add `superuser_reserved_connections=10`.

### PERF-H6: No Circuit Breaker for External Services
- **Location:** `dream_storage_client.py`, `llm/manager.py`
- **Description:** No circuit breaker. When DCS/LLM is down, every request retries with backoff (7-14s) then fails. Causes request pile-up and connection exhaustion.
- **Fix:** Implement circuit breaker (e.g., `pybreaker`). Fail fast after N consecutive failures.

### PERF-H7: Admin Routes — Zero Caching (3321 lines)
- **Location:** `backend/app/api/routes/admin.py`
- **Fix:** Add Redis caching for dashboard stats and user lists (TTL 60-300s).

### PERF-H8: Student Listing — No Caching
- **Location:** `backend/app/api/routes/students.py:557-651`
- **Fix:** Add Redis cache with `teacher:{user_id}:students:list` key.

### PERF-H9: Publisher Endpoints — Zero Caching
- **Location:** `backend/app/api/routes/publishers.py`
- **Fix:** Cache publisher profile/stats (TTL 300s).

### PERF-H10: Unpaginated Teacher List
- **Location:** `backend/app/api/routes/publishers.py:326-332`
- **Fix:** Add `limit` and `offset` query parameters.

### PERF-H11: Unpaginated Class Analytics
- **Location:** `backend/app/services/analytics_service.py:468-478`
- **Description:** Loads ALL submissions for ALL students in a class, filters in Python.
- **Fix:** Push period filtering into SQL. Add LIMIT for aggregation.

### PERF-H12: `xlsx` (400KB) Imported at Module Level
- **Location:** `frontend/src/utils/exportAnalytics.ts:8`
- **Description:** Full namespace import of SheetJS for a rare export action. Inflates initial bundle.
- **Fix:** Dynamic import: `const XLSX = await import("xlsx")`.

---

## Medium Findings

- PERF-M1: Stale cache — assignments cached 1h with no write-time invalidation
- PERF-M2: Stale cache — skills cached 1h with no invalidation on submission
- PERF-M3: Teacher materials cache not invalidated on create/update
- PERF-M4: No vendor chunk splitting (recharts, fabric, xlsx)
- PERF-M5: DCS `get_book_by_id()` not cached unlike `get_books()`
- PERF-M6: DCS connection pool limited to 10 with no backpressure
- PERF-M7: `PgBouncer max_client_conn=1500` may be insufficient for 5k users
- PERF-M8: Missing indexes on `skill_id`, `format_id`, `parent_message_id`
- PERF-M9: Unpaginated streak calculation (loads all completion dates)
- PERF-M10: Library listing fetches ALL books from DCS for title lookup

---

## Low Findings

- PERF-L1: DCSCache is process-local (not shared across workers)
- PERF-L2: Student email lookup cached 24h with no invalidation
- PERF-L3: No global `staleTime` default in React Query
- PERF-L4: Missing index on `Assignment.status`
- PERF-L5: Background report processing creates new engine per job

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 12 |
| Medium | 10 |
| Low | 5 |
| **Total** | **29** |
