# Reliability Audit Report — Story 27.3

**Date:** 2026-03-25
**Auditor:** Quinn (QA Agent)
**Scope:** Error handling, data integrity, race conditions, API contracts, frontend state, edge cases

---

## Critical Findings

### REL-C1: AI Quota Race Condition (TOCTOU)
- **Location:** `backend/app/services/usage_tracking_service.py:72-79`
- **Description:** Quota check reads `ai_generations_used`, generation runs, then increment happens later. Concurrent requests can both pass the check and overspend.
- **Risk:** Teachers can exceed their AI generation quota by N-1 with N concurrent requests.
- **Fix:** Use atomic `UPDATE teachers SET ai_generations_used = ai_generations_used + 1 WHERE id = :id AND ai_generations_used < :quota RETURNING ai_generations_used`.

### REL-C2: No JWT Expiry Handling in Frontend
- **Location:** `frontend/src/client/core/request.ts:252-322`
- **Description:** No 401 interceptor or token refresh. Expired tokens cause broken pages with error states throughout the app. No auto-redirect to login.
- **Risk:** Users with expired tokens see errors on every page until manual refresh.
- **Fix:** Add response interceptor that catches 401, clears token, redirects to `/login`.

### REL-C3: In-Memory Quiz Storage Lost on Restart
- **Location:** `backend/app/services/ai_generation/quiz_storage_service.py:114-205`
- **Description:** 16+ dict storage maps for generated content. Lost on server restart. Incompatible with multi-instance deployment.
- **Risk:** Teachers lose generated content on restart. Multi-instance load balancing causes 404 errors.
- **Fix:** Migrate to Redis-backed storage, or ensure frontend always sends `content` in save requests.

---

## High Findings

### REL-H1: Exception Messages Leaked to API Clients
- **Location:** 25+ locations across `ai_generation.py`, `vocabulary_explorer.py`, `teacher_materials.py`, `webhooks.py`, `teachers.py`, `admin.py`, `scheduled_tasks.py`, `books.py`
- **Description:** `detail=f"...{str(e)}"` exposes internal implementation details (DB errors, file paths, service URLs).
- **Fix:** Return generic messages to clients. Log full exceptions server-side.

### REL-H2: Arq Worker — No Retry, No Error Handler
- **Location:** `backend/app/worker.py:30-44`
- **Description:** `max_tries` defaults to 1. No `on_job_error` handler. Failed tasks permanently lost.
- **Fix:** Add `max_tries=3`, `retry_delay=5`. Implement `on_job_error` callback.

### REL-H3: Messaging Task — No Error Handling
- **Location:** `backend/app/tasks/messaging.py:26-46`
- **Description:** No try/except. DB failures permanently lose messages. Cache invalidation failure masks success.
- **Fix:** Add try/except with logging. Separate commit and cache invalidation.

### REL-H4: Division by Zero in `scoreCircleOrMark()`
- **Location:** `frontend/src/lib/scoring.ts:172-173`
- **Description:** `(correct - incorrect) / totalCorrect` where `totalCorrect` can be 0.
- **Fix:** Guard: `totalCorrect > 0 ? ... : 0`.

### REL-H5: Division by Zero in `scoreWordSearch()`
- **Location:** `frontend/src/lib/scoring.ts:244-246`
- **Description:** `correct / total` where `total` can be 0.
- **Fix:** Guard: `total > 0 ? ... : 0`.

### REL-H6: Book Type Mismatch — Frontend vs Backend
- **Location:** `frontend/src/types/book.ts:46-54` vs `backend/app/schemas/book.py`
- **Description:** Frontend `Book` expects `description`, `cover_image_url` which don't exist on backend `BookResponse`.
- **Fix:** Align types.

---

## Medium Findings

- REL-M1: Silent `except Exception: pass` in assignments (4 locations)
- REL-M2: Silent `except Exception: pass` in messages
- REL-M3: Report jobs stuck in "processing" if error handler itself fails
- REL-M4: Storage quota race condition (read-modify-write without locking)
- REL-M5: Assignment submission not atomic (dual submission can overwrite)
- REL-M6: Bulk messaging task — all-or-nothing commit, partial cache invalidation
- REL-M7: Webhook processing via BackgroundTask — lost on server restart
- REL-M8: SaveActions mutations don't invalidate content library queries
- REL-M9: AI quiz frontend type missing `correct_index` field
- REL-M10: Inconsistent pagination contract (books use `skip`, rest use `offset`)
- REL-M11: Division by zero in ReadingComprehensionPlayerAdapter
- REL-M12: Division by zero in useActivityTimer (timeLimitMinutes=0)
- REL-M13: TTS manager errors silently swallowed (no logging)
- REL-M14: `_count_questions()` silently returns 0 on error (no logging)

---

## Low Findings

- REL-L1: Silent cache errors in auth (`deps.py:108-109`)
- REL-L2: Webhook logs raw payload at INFO level
- REL-L3: `BookAssignment.assigned_by` uses CASCADE (assignments lost if admin deleted)
- REL-L4: Admin dashboard error message says "check console"
- REL-L5: Frontend `AI_QUIZ_MAX_QUESTIONS=20` vs backend allows 50

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 6 |
| Medium | 14 |
| Low | 5 |
| **Total** | **28** |
