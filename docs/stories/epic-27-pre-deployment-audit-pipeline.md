# Epic 27 — Pre-Deployment Audit & Production Pipeline

**Status:** Draft
**Created:** 2026-03-25
**Priority:** Critical (blocks production launch)

---

## Epic Goal

Systematically audit the Dream LMS codebase for security vulnerabilities, performance bottlenecks, and reliability risks, then build a production deployment pipeline — ensuring the system is safe, performant, and deployable before going live.

---

## Epic Description

### Existing System Context

- **Stack:** FastAPI + SQLModel + PostgreSQL (backend), React + TypeScript + Vite (frontend)
- **Infrastructure:** Docker Compose, PgBouncer, Redis, Traefik
- **External services:** Dream Central Storage (DCS), DeepSeek/Gemini LLM, Edge TTS
- **Auth:** JWT + role-based access (admin, supervisor, teacher, student) + DCS API key
- **Target scale:** 5,000 concurrent users initially, scaling to 50k+
- **Deployment target:** Hetzner VPS + Cloudflare

### Why This Epic

The codebase has grown through rapid feature development. Before production launch, we need to:
1. Identify and fix security gaps that could lead to data breaches or unauthorized access
2. Find performance bottlenecks that would degrade under real user load
3. Catch reliability bugs that work in dev but fail in production
4. Build a repeatable, safe deployment process with rollback capability

### Success Criteria

- Zero critical/high security findings remaining
- All API endpoints validated for auth, input validation, and rate limiting
- Database queries optimized (no N+1, proper indexes)
- Production Docker images built and tested
- CI/CD pipeline running with automated checks
- Deployment runbook documented
- Rollback procedure tested

---

## Stories

### Story 27.0 — Codebase Cleanup

**Goal:** Remove dead code, debug artifacts, and dev-only leftovers so QA audits a clean codebase.

**Scope:**

- **Console Logs:** Remove ~101 `console.log/debug/warn` calls across 24 frontend files (scoring, API services, activity players, routes, stores). Keep only intentional error logging.
- **Python TODOs/HACKs:** Review 5 occurrences in backend (analytics_service, models, ai_generation, webhooks). Fix or remove.
- **Dead Code:** Remove unused imports, unreachable code, commented-out blocks. Run linters to catch.
- **Untracked Files:** Clean up `todo.txt`, `nohup.out`, and any other dev artifacts. Update `.gitignore` for patterns like `*.pyc`, `nohup.out`, `todo.txt`.
- **Dependency Cleanup:** Remove unused pip/npm packages. Audit `requirements.txt`/`package.json` for packages imported nowhere.
- **Git Hygiene:** Ensure `.env` and `.DS_Store` are fully untracked (already done). Verify no large binaries or generated files in history.
- **Code Formatting:** Run `black` + `ruff` on backend, `prettier` + `eslint` on frontend. Fix all lint errors.

**Acceptance Criteria:**
- [ ] Zero `console.log` in production frontend code (except intentional error handlers)
- [ ] Zero TODO/HACK/FIXME comments without linked issues
- [ ] Linters pass with zero errors (backend + frontend)
- [ ] No unused dependencies in package.json or requirements.txt
- [ ] `.gitignore` covers all dev artifacts
- [ ] All code formatted consistently

---

### Story 27.1 — Security Audit

**Goal:** Identify and document all security vulnerabilities across the codebase.

**Scope:**
- **Authentication & Authorization:** Review all endpoints for proper auth guards, role checks, and token validation. Verify cached user objects don't bypass permission checks.
- **Input Validation:** Check all API inputs for SQL injection, XSS, path traversal, and payload size limits.
- **Secrets Management:** Verify no secrets in code/logs, .env is gitignored, API keys are properly scoped.
- **CORS & Headers:** Validate CORS policy, security headers (CSP, HSTS, X-Frame-Options).
- **Rate Limiting:** Verify all public and sensitive endpoints have rate limits.
- **Dependency Vulnerabilities:** Scan Python and npm dependencies for known CVEs.
- **DCS Integration:** Review API key handling, storage auth, webhook secret validation.

**Output:** Security findings report with severity ratings (Critical/High/Medium/Low) and recommended fixes.

**Acceptance Criteria:**
- [ ] Every API route reviewed for auth requirements
- [ ] All user inputs validated at API boundary
- [ ] No secrets in source code or logs
- [ ] CORS configured for production domains only
- [ ] Rate limits on auth, generation, and admin endpoints
- [ ] Dependency scan completed with no critical CVEs
- [ ] Findings report delivered with prioritized fix list

---

### Story 27.2 — Performance Audit

**Goal:** Identify performance bottlenecks that would impact 5k+ concurrent users.

**Scope:**
- **Database Queries:** Review all SQLModel/SQLAlchemy queries for N+1 problems, missing indexes, unnecessary eager loading, and large result sets without pagination.
- **Connection Pooling:** Validate PgBouncer configuration aligns with expected connection patterns. Check for connection leaks in async code.
- **Redis Caching:** Review cache hit rates, TTL strategy, invalidation gaps. Identify hot paths that should be cached but aren't.
- **API Response Times:** Profile the slowest endpoints (AI generation, book listing, assignment loading).
- **Frontend Performance:** Bundle size analysis, lazy loading coverage, unnecessary re-renders, large list virtualization.
- **External Service Calls:** DCS, LLM, and TTS call patterns — timeouts, retries, circuit breakers.

**Output:** Performance findings report with bottleneck severity and optimization recommendations.

**Acceptance Criteria:**
- [ ] All database queries reviewed for N+1 and missing indexes
- [ ] PgBouncer pool sizing validated for target concurrency
- [ ] Redis caching strategy documented with TTL rationale
- [ ] Top 10 slowest endpoints identified with optimization plan
- [ ] Frontend bundle under 500KB gzipped (core)
- [ ] No synchronous blocking calls in async endpoints

---

### Story 27.3 — Bug & Reliability Audit

**Goal:** Find edge cases, error handling gaps, and reliability risks before real users hit them.

**Scope:**
- **Error Handling:** Review all try/except blocks — are exceptions caught too broadly? Are errors logged? Do users get helpful messages?
- **Data Integrity:** Check cascade deletes, orphan record risks, race conditions in concurrent writes (e.g., quota decrement, assignment submission).
- **Edge Cases:** Empty states, null values, Unicode handling, large file uploads, timeout scenarios.
- **API Contract Mismatches:** Verify frontend types match backend response schemas. Check for fields the frontend expects but backend doesn't always send.
- **State Management:** Redis cache staleness, in-memory quiz storage expiry, auth token edge cases (cached user without relationships).
- **Background Tasks:** Arq worker reliability, task retry behavior, failure handling.

**Output:** Bug report with severity ratings and reproduction steps.

**Acceptance Criteria:**
- [ ] All API error responses return consistent format
- [ ] No unhandled exceptions that crash the server
- [ ] Data integrity constraints verified (FK, unique, not null)
- [ ] Frontend handles all empty/error/loading states
- [ ] Race conditions in concurrent operations addressed
- [ ] Background task failures are logged and recoverable

---

### Story 27.4 — Fix Critical & High Findings

**Goal:** Resolve all critical and high-severity findings from stories 27.1-27.3.

**Scope:**
- Fix all Critical findings (security vulnerabilities, data loss risks)
- Fix all High findings (auth bypasses, performance blockers, reliability gaps)
- Document Medium/Low findings as tech debt for post-launch

**Acceptance Criteria:**
- [ ] Zero Critical findings remaining
- [ ] Zero High findings remaining
- [ ] Medium/Low findings documented in backlog
- [ ] All fixes verified by re-running relevant audit checks
- [ ] No regressions introduced by fixes

---

### Story 27.5 — Production Deployment Pipeline

**Goal:** Build a repeatable, safe deployment process for Hetzner + Cloudflare.

**Scope:**
- **Docker Production Images:** Optimize Dockerfiles (multi-stage builds, minimal base images, non-root user).
- **Docker Compose Production:** Separate production compose with proper resource limits, restart policies, health checks.
- **Environment Configuration:** Production .env template with all required variables documented. Secret rotation procedure.
- **Database Migrations:** Alembic migration strategy for zero-downtime deploys. Migration verification step.
- **CI/CD Pipeline:** GitHub Actions workflow — lint, test, build, deploy. Branch protection rules.
- **SSL/TLS:** Traefik + Let's Encrypt or Cloudflare SSL configuration.
- **Health Checks:** Backend `/health` endpoint, container health checks, uptime monitoring.
- **Logging:** Structured logging to file/stdout, log rotation, error alerting.
- **Backup Strategy:** PostgreSQL automated backups, backup verification, restore procedure.
- **Rollback:** Documented rollback procedure — previous Docker image, database migration rollback.

**Acceptance Criteria:**
- [ ] `docker compose -f docker-compose.prod.yml up` starts full production stack
- [ ] GitHub Actions pipeline: push to main triggers lint + test + build
- [ ] Production deploy via single command or CI trigger
- [ ] SSL/TLS configured and verified
- [ ] Health check endpoint returns system status
- [ ] Automated daily database backups
- [ ] Rollback tested and documented
- [ ] Deployment runbook written

---

### Story 27.6 — Final Sign-Off & Go-Live Checklist

**Goal:** Verify everything works end-to-end in production-like environment before launch.

**Scope:**
- Run full regression test on staging/production environment
- Verify all user roles can perform their core flows (admin, supervisor, teacher, student)
- Load test with realistic traffic pattern (100 concurrent users minimum)
- DNS + SSL verification
- Monitoring + alerting verified
- Stakeholder sign-off

**Acceptance Criteria:**
- [ ] All 4 user roles tested end-to-end
- [ ] AI generation works (quota, save to library, assign)
- [ ] Book content loads (covers, modules, activities)
- [ ] Assignment flow works (create, assign, submit, grade)
- [ ] Load test passes at target concurrency without errors
- [ ] Monitoring dashboard shows real-time metrics
- [ ] Go-live checklist completed and signed off

---

## Compatibility Requirements

- [ ] All existing APIs remain backward compatible
- [ ] No database schema changes that break running instances
- [ ] Frontend builds remain compatible with current browser targets
- [ ] DCS integration works with both API key and JWT fallback

## Risk Mitigation

- **Primary Risk:** Audit findings reveal deep architectural issues requiring major refactoring
- **Mitigation:** Triage findings by severity. Fix critical/high only. Defer medium/low to post-launch sprints.
- **Rollback Plan:** Each story is independent. Pipeline changes are additive (new files, not modifications to existing).

## Story Sequence

```
27.0 Cleanup ──→ 27.1 Security Audit ──┐
                 27.2 Performance Audit ├──→ 27.4 Fix Findings ──→ 27.5 Deploy Pipeline ──→ 27.6 Sign-Off
                 27.3 Bug/Reliability ──┘
```

Story 27.0 runs **first** (clean code before audit). Stories 27.1-27.3 can run in **parallel** after cleanup. Story 27.4 depends on all three. Story 27.5 can start alongside 27.4. Story 27.6 requires everything complete.

## Definition of Done

- [ ] All 6 stories completed with acceptance criteria met
- [ ] Zero critical/high security or reliability findings
- [ ] Production pipeline tested and documented
- [ ] System deployed to production environment
- [ ] Go-live checklist signed off
