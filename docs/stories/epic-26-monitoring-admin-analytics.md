# Epic 26: Platform Monitoring & Admin Analytics Dashboard - Brownfield Enhancement

## Status: Draft

## Epic Goal

Add production monitoring with Uptime Kuma and expand the admin dashboard with platform-wide analytics (usage trends, assignment metrics, AI generation stats, and system health) — giving admins full visibility into how the platform is performing and being used.

## Epic Description

**Existing System Context:**

- Current admin dashboard at `/admin/dashboard` shows basic stat cards (total students, teachers, schools, etc.)
- Rich `analytics_service.py` exists with student/class-level analytics (scores, trends, insights) — but no platform-wide rollups
- Docker Compose stack includes PostgreSQL, Redis, FastAPI backend, React frontend
- No uptime or infrastructure monitoring in place currently
- AI generation services exist across multiple activity types (quiz, fill-blank, word-builder, sentence-builder, mix-mode, etc.)

**Technology Stack:**

- Backend: FastAPI (Python), SQLModel/SQLAlchemy, PostgreSQL, Redis
- Frontend: React, TanStack Router/Query, shadcn/ui, Recharts
- Infrastructure: Docker Compose, Hetzner + Cloudflare (production target)
- Existing patterns: `AdminService` API client, `StatCard` component, `PageContainer`/`PageHeader` layout

**Integration Points:**

- Admin API routes (`backend/app/api/routes/admin.py`) — add new analytics endpoints
- Admin dashboard page (`frontend/src/routes/_layout/admin/dashboard.tsx`) — expand with new sections
- `docker-compose.yml` — add Uptime Kuma service
- Existing analytics service — reuse patterns for platform-level queries

**Enhancement Details:**

- **Uptime Kuma:** Self-hosted monitoring added to Docker Compose, configured to watch API, frontend, PostgreSQL, Redis, and external DCS services
- **Admin Analytics Dashboard:** Four new sections added to the existing admin dashboard with platform-wide metrics

**Success Criteria:**

- Uptime Kuma is accessible and monitoring all key services
- Admin dashboard shows real-time platform usage, assignment performance, AI generation stats, and system health
- All new endpoints are performant (< 500ms response time) with appropriate caching
- No regression on existing admin dashboard functionality

---

## Stories

### Story 1: Uptime Kuma Integration via Docker Compose

**Description:** Add Uptime Kuma to the Docker Compose stack, configured to monitor all critical services out of the box.

**Acceptance Criteria:**

- [ ] Uptime Kuma service added to `docker-compose.yml` with persistent volume for data
- [ ] Accessible on a designated port (e.g., `3001`)
- [ ] Pre-configured monitors (or documented setup) for:
  - API health endpoint (`/api/v1/health` or similar)
  - Frontend URL
  - PostgreSQL (TCP check on port 5432)
  - Redis (TCP check on port 6379)
  - External DCS service endpoints
- [ ] Status page available for quick at-a-glance view
- [ ] Service restarts cleanly and retains monitoring data via volume

**Technical Notes:**

- Use `louislam/uptime-kuma:1` image
- Add a health check endpoint to FastAPI if one doesn't already exist (simple `/health` returning DB and Redis connectivity status)
- Mount volume `uptime-kuma-data:/app/data` for persistence
- Consider adding to an internal network so it can reach DB/Redis directly
- No alert notifications needed at this stage — just the dashboard

---

### Story 2: Platform Usage & Assignment Analytics Endpoints

**Description:** Create backend API endpoints that provide platform-wide analytics data for the admin dashboard.

**Acceptance Criteria:**

- [ ] `GET /api/v1/admin/analytics/platform-usage` endpoint returning:
  - Daily/weekly/monthly active users (students and teachers separately)
  - Login trend data (last 30 days, daily granularity)
  - New user registrations over time
  - Current active sessions count (if trackable via Redis)
- [ ] `GET /api/v1/admin/analytics/assignment-metrics` endpoint returning:
  - Total assignments created (with trend over last 30 days)
  - Platform-wide completion rate
  - Average scores across all assignments
  - Completion rate by activity type
  - Top performing and lowest performing activity types
- [ ] `GET /api/v1/admin/analytics/ai-usage` endpoint returning:
  - Total AI generations count (with trend over last 30 days)
  - Breakdown by activity type (quiz, fill-blank, word-builder, sentence-builder, mix-mode, reading, writing, speaking, vocabulary)
  - Average generation time per type (if tracked)
  - Most frequently generated activity type
- [ ] All endpoints require admin role authentication
- [ ] Response times < 500ms with Redis caching (5-minute TTL)
- [ ] Period filter support: `?period=7d|30d|90d`

**Technical Notes:**

- Follow existing patterns in `analytics_service.py` — create a new `platform_analytics_service.py`
- Use existing Redis caching patterns from `redis_cache.py`
- Leverage SQLModel aggregate queries (func.count, func.avg, func.date_trunc)
- AI generation counts may require adding a simple tracking table or querying existing activity records by creation metadata
- Rate limit these endpoints using existing `slowapi` setup

---

### Story 3: Admin Dashboard Frontend — Analytics Sections

**Description:** Expand the existing admin dashboard page with four new visual sections displaying platform analytics.

**Acceptance Criteria:**

- [ ] **Platform Usage Section:**
  - Active users stat cards (DAU, WAU, MAU) for students and teachers
  - Line chart showing login trends over the selected period
  - Period selector (7d / 30d / 90d)
- [ ] **Assignment Metrics Section:**
  - Stat cards: total assignments, completion rate, average score
  - Bar chart: completion rate by activity type
  - Trend line: assignments created over time
- [ ] **AI Generation Stats Section:**
  - Total generations stat card with trend indicator
  - Donut/pie chart: breakdown by activity type
  - Bar chart: generation volume over time
- [ ] **System Health Section (lightweight):**
  - Link/iframe to Uptime Kuma status page, OR
  - Simple status indicators for key services (API, DB, Redis) using the health endpoint from Story 1
- [ ] All sections handle loading and error states gracefully
- [ ] Responsive layout (works on tablet and desktop)
- [ ] Data auto-refreshes every 60 seconds

**Technical Notes:**

- Extend existing `admin/dashboard.tsx` — add sections below current stat cards
- Use Recharts (already in the project) for all charts
- Use existing `StatCard` component for KPI cards
- Use TanStack Query with `staleTime: 60000` for auto-refresh
- Follow existing shadcn/ui patterns for cards and layout
- Consider a tab or accordion layout if the page gets too long
- For the system health section, a simple link to Uptime Kuma (`http://localhost:3001`) is acceptable for v1

---

## Compatibility Requirements

- [x] Existing admin dashboard stat cards remain unchanged
- [x] Existing APIs remain unchanged — new endpoints only
- [x] Database schema changes are backward compatible (if any tracking table is added)
- [x] UI changes follow existing admin dashboard patterns (StatCard, PageContainer, Recharts)
- [x] Performance impact is minimal — new queries are cached and don't affect user-facing endpoints
- [x] Docker Compose additions don't affect existing service startup order

## Risk Mitigation

- **Primary Risk:** New aggregate queries could be slow on large datasets
- **Mitigation:** Redis caching with 5-minute TTL on all analytics endpoints; use database indexes on timestamp columns; use `date_trunc` for efficient time-series grouping
- **Rollback Plan:** New endpoints and Uptime Kuma service can be removed independently without affecting existing functionality. Dashboard sections are additive — removing them restores original dashboard.

## Definition of Done

- [ ] Uptime Kuma running in Docker Compose and monitoring all key services
- [ ] Health check endpoint available and tested
- [ ] All three analytics endpoints returning accurate data with caching
- [ ] Admin dashboard displays all four analytics sections with charts
- [ ] Existing admin dashboard functionality verified (no regression)
- [ ] All new endpoints have appropriate authentication and rate limiting
- [ ] Responsive layout tested on desktop and tablet viewports

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running FastAPI + React + PostgreSQL + Redis in Docker Compose
- Integration points: admin API routes, admin dashboard page, docker-compose.yml, existing analytics service patterns, existing Redis cache service
- Existing patterns to follow: `analytics_service.py` service layer, `redis_cache.py` caching, `StatCard` component, Recharts charts, TanStack Query data fetching, shadcn/ui components
- Critical compatibility requirements: existing admin dashboard must remain fully functional, no changes to existing API contracts
- Each story must include verification that existing functionality remains intact

The epic should maintain system integrity while delivering full platform visibility through monitoring and analytics."
