# 14. Rate Limiting Architecture

**Last Updated:** 2026-03-08
**Architecture Version:** v4

---

## 14.1 Overview

Rate limiting protects Dream LMS from abuse, brute-force attacks, and resource exhaustion. The system uses a **two-layer approach**: application-level rate limiting (primary) with reverse-proxy rate limiting (future hardening).

### Why Application-Level First?

Dream LMS has role-based access (admin, publisher, teacher, student). Rate limits must be **context-aware**:
- Teachers bulk-assigning books need higher limits than students browsing
- AI content generation endpoints are expensive and need strict per-user limits
- Auth endpoints need IP-based limits regardless of authentication status

Traefik (reverse proxy) only sees IPs and URLs — it cannot enforce role-aware or user-specific limits. Application-level limiting is required.

---

## 14.2 Architecture Decision

### Library: `slowapi`

| Criteria | slowapi | Custom Middleware | Traefik Plugin |
|----------|---------|-------------------|----------------|
| FastAPI integration | Native (decorator) | Manual | External |
| Redis support | Built-in | Manual | N/A |
| Per-user limits | Yes (custom key) | Yes | No |
| Role-aware | Yes (custom key) | Yes | No |
| Maintenance | Community | Internal | External |
| Implementation effort | Low | High | Medium |

**Decision:** `slowapi` — minimal code, Redis-backed, decorator-based, supports custom key functions for role-aware limiting.

### Algorithm: Sliding Window

- **Sliding window counter** (default in `slowapi` via `limits` library)
- Prevents burst-at-boundary exploits that fixed windows allow
- Fair distribution of requests across the time window
- Efficient Redis storage (2 keys per window per client)

### Failure Mode: Fail Open

When Redis is unavailable, **allow all requests through** and log a warning.

**Rationale:** An LMS should not become unusable because rate limiting infrastructure is down. Rate limiting is a security enhancement, not a core business requirement.

---

## 14.3 Rate Limit Tiers

### Tier Definitions

| Tier | Endpoints | Limit | Key Function | Rationale |
|------|-----------|-------|--------------|-----------|
| **AUTH** | `/login`, `/password-recovery`, `/reset-password` | 10/minute | Remote IP | Brute-force protection |
| **AI** | `/ai-content-proxy/*`, `/ai-usage/*` | 20/minute | `user_id` | Expensive AI operations |
| **WRITE** | All POST/PUT/DELETE (non-auth, non-AI) | 60/minute | `user_id` | Prevent spam/abuse |
| **READ** | All GET endpoints | 200/minute | `user_id` | General protection |
| **ADMIN** | `/admin/*` | 300/minute | `user_id` | Elevated limits for admin operations |
| **UPLOAD** | File upload endpoints | 10/minute | `user_id` | Bandwidth protection |

### Rate Limit Headers

All responses include standard rate limit headers:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1735689600
Retry-After: 45  (only on 429 responses)
```

### 429 Response Format

```json
{
  "detail": "Rate limit exceeded. Try again in 45 seconds.",
  "retry_after": 45
}
```

Follows the existing error response pattern from Section 3.5 of the API Architecture.

---

## 14.4 Implementation Architecture

### Request Flow

```
Client Request
    │
    ▼
┌─────────────────────┐
│  Traefik (future)   │  ← Layer 1: Blunt IP-based DDoS protection
│  Global: 1000/min   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  FastAPI App         │
│                      │
│  ┌────────────────┐  │
│  │ SlowAPI State   │  │  ← Exception handler for 429 responses
│  └────────────────┘  │
│                      │
│  Route Decorators:   │
│  @limiter.limit()    │  ← Layer 2: Per-route, role-aware limits
│                      │
│  Key Functions:      │
│  - get_remote_addr   │  ← For auth endpoints (IP-based)
│  - get_user_id       │  ← For authenticated endpoints (user-based)
│                      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Redis               │  ← Sliding window counter storage
│  Key pattern:        │
│  LIMITER:{key}:{window}
└─────────────────────┘
```

### File Structure

```
backend/app/
├── core/
│   └── rate_limit.py          # NEW — Limiter instance, key functions, tier constants
├── api/
│   ├── deps.py                # MOD — Optional: rate limit as dependency
│   └── routes/
│       ├── login.py           # MOD — AUTH tier decorators
│       ├── ai_content_proxy.py # MOD — AI tier decorators
│       ├── ai_usage.py        # MOD — AI tier decorators
│       ├── assignments.py     # MOD — WRITE/READ tier decorators
│       ├── messages.py        # MOD — WRITE/READ tier decorators
│       ├── admin.py           # MOD — ADMIN tier decorators
│       └── ... (other routes) # MOD — Appropriate tier decorators
├── main.py                    # MOD — Register SlowAPI exception handler + state
└── core/
    └── config.py              # MOD — Rate limit configuration settings
```

### Core Module: `rate_limit.py`

```python
# backend/app/core/rate_limit.py

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.core.config import settings


def get_user_id_or_ip(request: Request) -> str:
    """
    Extract user ID from JWT for authenticated requests,
    fall back to IP address for unauthenticated requests.
    """
    # Authorization header present → extract user_id from token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.core.security import decode_token
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            return f"user:{payload.get('sub', get_remote_address(request))}"
        except Exception:
            pass
    return f"ip:{get_remote_address(request)}"


# Rate limit tier constants
class RateLimits:
    AUTH = "5/minute"
    AI = "10/minute"
    WRITE = "30/minute"
    READ = "120/minute"
    ADMIN = "200/minute"
    UPLOAD = "10/minute"


limiter = Limiter(
    key_func=get_user_id_or_ip,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri=settings.RATE_LIMIT_REDIS_URL,
    strategy="fixed-window-elastic-expiry",
    enabled=settings.RATE_LIMIT_ENABLED,
)
```

### Configuration

```python
# Added to backend/app/core/config.py

class Settings(BaseSettings):
    # ... existing settings ...

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REDIS_URL: str = "redis://redis:6379/1"  # DB 1 (separate from cache DB 0)
    RATE_LIMIT_DEFAULT: str = "120/minute"
```

### Route Decorator Usage

```python
# Example: Auth route (IP-based, strict)
from app.core.rate_limit import limiter, RateLimits
from slowapi.util import get_remote_address

@router.post("/login/access-token")
@limiter.limit(RateLimits.AUTH, key_func=get_remote_address)
async def login(request: Request, ...):
    ...

# Example: AI route (user-based, moderate)
@router.post("/ai-content/generate")
@limiter.limit(RateLimits.AI)
async def generate_ai_content(request: Request, ...):
    ...

# Example: Standard CRUD (user-based, light)
@router.get("/assignments")
@limiter.limit(RateLimits.READ)
async def list_assignments(request: Request, ...):
    ...
```

### FastAPI App Registration

```python
# backend/app/main.py
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

---

## 14.5 Frontend Handling

### Global 429 Interceptor

The frontend axios/fetch client should handle 429 responses globally:

```typescript
// In API client interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60
      toast.warning(
        `Too many requests. Please wait ${retryAfter} seconds.`
      )
    }
    throw error
  }
)
```

No retry logic — show user-friendly message and let the user naturally retry.

---

## 14.6 Redis Database Allocation

| DB | Purpose |
|----|---------|
| 0 | DCS Cache (existing) |
| 1 | Rate Limiting (new) |
| 2 | Celery Broker (existing) |
| 3 | Celery Results (existing) |

Rate limiting uses a separate Redis DB to avoid key collisions and allow independent flushing.

---

## 14.7 Monitoring & Observability

### Logging

- Log all 429 responses with: user/IP, endpoint, current count, limit
- Log Redis connection failures (fail-open events)

### Admin Visibility (Future)

- Rate limit stats could be exposed via `/admin/rate-limits/stats` (future story)
- Dashboard showing top rate-limited users/IPs

---

## 14.8 Future: Traefik Layer (Production Hardening)

When deploying to production at scale, add Traefik-level rate limiting as a first line of defense:

```yaml
# traefik dynamic config (future)
http:
  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        burst: 200
        period: 1m
```

This catches volumetric attacks before they reach the application. The application-level limits remain for fine-grained, role-aware control.

---

**Reference:** See `docs/architecture/9-security-architecture.md` for authentication and RBAC details.
**Reference:** See `docs/architecture/3-api-architecture.md` Section 3.6 for rate limit overview.
