# Security Audit Report — Story 27.1

**Date:** 2026-03-25
**Auditor:** Quinn (QA Agent)
**Scope:** Authentication, authorization, input validation, secrets, CORS, headers, rate limiting, dependencies

---

## Critical Findings

### SEC-C1: AI Content Proxy — Zero Authentication (DELETE included)
- **Location:** `backend/app/api/routes/ai_content_proxy.py` (all 4 endpoints)
- **Description:** All endpoints in both routers have ZERO authentication. Anyone can list, read, stream audio, and **DELETE** AI content.
- **Risk:** Unauthenticated data destruction. Anyone on the network can delete AI-generated content.
- **Fix:** Add `CurrentUser` dependency to all endpoints. DELETE must require teacher/admin role.

### SEC-C2: AI Generation — 36 Endpoints with Zero Rate Limiting
- **Location:** `backend/app/api/routes/ai_generation.py` (entire file)
- **Description:** ~36 route handlers including all LLM-powered generation endpoints have no `@limiter.limit` decorators. `RateLimits.AI = "20/minute"` exists but is never used.
- **Risk:** Unlimited LLM API credit consumption. A single user can trigger unlimited expensive AI requests.
- **Fix:** Add `@limiter.limit(RateLimits.AI)` to all generation endpoints.

---

## High Findings

### SEC-H1: No Security Headers
- **Location:** `backend/app/main.py` (missing middleware)
- **Description:** None of the standard security headers are configured: X-Content-Type-Options, X-Frame-Options, HSTS, CSP, Referrer-Policy.
- **Risk:** Clickjacking, MIME sniffing, SSL stripping attacks.
- **Fix:** Add SecurityHeaders middleware to FastAPI.

### SEC-H2: Dev Endpoints Available in Staging Without Auth
- **Location:** `backend/app/api/routes/dev.py`
- **Description:** `instant-login/{username}` bypasses password auth entirely. Available when `ENVIRONMENT != "production"` (includes staging). No auth, no rate limiting.
- **Risk:** Complete auth bypass in staging. Anyone can get JWT for any user.
- **Fix:** Restrict to `ENVIRONMENT == "local"` only, or add API key requirement.

### SEC-H3: Cached Users — Password Changes Broken
- **Location:** `backend/app/api/deps.py:71-84`
- **Description:** Cached users have `hashed_password=""`. Password verification always fails for cached users.
- **Risk:** Teachers can't change passwords until cache expires (1 hour).
- **Fix:** Force DB reload for endpoints that need `hashed_password`.

### SEC-H4: Cached Users — AI Generation Endpoints Fail
- **Location:** `backend/app/api/routes/ai_generation.py` (5+ endpoints)
- **Description:** `current_user.teacher` is always `None` for cached users. Endpoints return 404 instead of functioning.
- **Risk:** Intermittent failures for teachers using AI generation.
- **Fix:** Add DB query fallback (same pattern as `teacher_materials.py:114`).

### SEC-H5: publisher_id AttributeError
- **Location:** `backend/app/api/routes/assignments.py:5049,5201,5366`
- **Description:** Code uses `current_user.publisher_id` but the field is `dcs_publisher_id`.
- **Risk:** Assignment preview/edit completely broken for publisher users.
- **Fix:** Change to `current_user.dcs_publisher_id`.

### SEC-H6: Webhook Secret Partially Logged
- **Location:** `backend/app/api/routes/webhooks.py:431`
- **Description:** Logs first 10 characters of webhook secret on validation failure.
- **Risk:** Partial secret disclosure in logs.
- **Fix:** Remove the log line entirely.

### SEC-H7: Full Request Headers Logged
- **Location:** `backend/app/api/routes/webhooks.py:404`
- **Description:** `dict(request.headers)` logged at INFO level, including signatures and auth tokens.
- **Risk:** Sensitive headers in plaintext logs.
- **Fix:** Remove or filter to non-sensitive headers only.

### SEC-H8: Default DCS Credentials Not Validated
- **Location:** `backend/app/core/config.py:111-114`
- **Description:** `admin@admin.com` / `admin` defaults are not checked by `_enforce_non_default_secrets`. Only webhook secret is validated.
- **Risk:** Production could silently use default credentials if env vars missing.
- **Fix:** Add validation for DCS password in non-local environments.

---

## Medium Findings

### SEC-M1: CORS Allows All Methods and Headers
- **Location:** `backend/app/main.py:204-205`
- **Fix:** Restrict to `["GET","POST","PUT","PATCH","DELETE","OPTIONS"]` and `["Authorization","Content-Type"]`.

### SEC-M2: 10 Route Files Rely on Default Rate Limits Only
- **Location:** `book_assignments.py`, `reports.py`, `feedback.py`, `webhooks.py`, `avatars.py`, `vocabulary_explorer.py`, `utils.py`, `book_assets.py`, `book_media.py`, `private.py`
- **Fix:** Add explicit rate limits to write endpoints.

### SEC-M3: Rate Limiter Fails Open When Redis Down
- **Location:** `backend/app/main.py:183-186`
- **Fix:** Log at ERROR level, consider fallback in-memory counter for critical endpoints.

### SEC-M4: X-Forwarded-For Spoofing
- **Location:** `backend/app/core/rate_limit.py:34`
- **Fix:** Configure Traefik to overwrite X-Forwarded-For from real client IP.

### SEC-M5: Password Recovery Reveals User Existence
- **Location:** `backend/app/api/routes/login.py:72-76`
- **Fix:** Always return success message regardless of whether email exists.

### SEC-M6: 8-Day JWT Tokens with No Revocation
- **Location:** `backend/app/core/config.py:36`
- **Fix:** Reduce to 15-60 minutes with refresh token rotation, or add Redis token blacklist.

### SEC-M7: No Path Traversal Validation on Audio Proxy
- **Location:** `backend/app/api/routes/ai_content_proxy.py:69-101`
- **Fix:** Add `_validate_asset_path()` on `filename` and `content_id`.

### SEC-M8: Unsanitized Filename in Content-Disposition Header
- **Location:** `backend/app/api/routes/ai_content_proxy.py:123`
- **Fix:** Sanitize filename or use `urllib.parse.quote`.

### SEC-M9: SECRET_KEY Auto-generates on Restart
- **Location:** `backend/app/core/config.py:34`
- **Fix:** Set default to `"changethis"` to trigger existing validator.

### SEC-M10: Scheduler API Key Auth Defined But Never Wired
- **Location:** `backend/app/api/routes/scheduled_tasks.py:38-70`
- **Fix:** Wire `verify_scheduler_access` as actual dependency.

---

## Low Findings

- SEC-L1: Dev CORS origins may leak to production if .env not updated
- SEC-L2: Rate limiting can be disabled via env var silently
- SEC-L3: Missing `max_length` on `AssignmentCreate.name`, `MessageCreate.body`
- SEC-L4: DCS URL defaults to HTTP, no HTTPS enforcement
- SEC-L5: Book cover presigned URL expiry is 24 hours (generous)
- SEC-L6: Health check leaks service topology

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 8 |
| Medium | 10 |
| Low | 6 |
| **Total** | **26** |
