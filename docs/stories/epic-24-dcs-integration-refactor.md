# Epic 24: DCS Integration Refactor

## Overview

Refactor LMS to consume DCS (Dream Central Storage) as a service rather than syncing data locally. This eliminates data synchronization issues and establishes a clean architecture where DCS owns publishers/books and LMS owns learning workflows.

## Business Value

- **Eliminate sync bugs**: No more orphaned records, duplicate handling, or missed webhooks
- **Single source of truth**: Publishers and books always reflect DCS state
- **Reduced complexity**: Remove sync logic, webhook handlers for data replication
- **Future-ready**: Prepares architecture for multi-app DCS ecosystem

## Architecture Change

### Before (Current)
```
DCS ──webhook──> LMS Sync Logic ──> LMS Database (publishers, books)
                                          ↓
                                    LMS Application
```

### After (Target)
```
DCS API <────────── LMS Services (with caching)
                          ↓
                    LMS Database (assignments, progress, schools, teachers, students)
```

## Scope

### In Scope
- Remove local `publishers` table from LMS
- Remove local `books` table from LMS
- Create cached DCS client services
- Update all queries to use DCS API
- Simplify webhook handlers to cache invalidation only
- Database migrations for FK changes

### Out of Scope
- Auth consolidation (Phase 3 - future epic)
- User/identity migration to DCS
- Changes to DCS API (already sufficient)

## Stories

| Story | Title | Estimate | Dependencies |
|-------|-------|----------|--------------|
| 24.1 | LMS Caching Infrastructure | 3 pts | None |
| 24.2 | Publisher Service Migration | 5 pts | 24.1 |
| 24.3 | Book Service Migration | 8 pts | 24.1 |
| 24.4 | Cleanup and Optimization | 3 pts | 24.2, 24.3 |

## Technical Approach

### Caching Strategy
- Use in-memory cache with TTL (start simple)
- Webhook-based cache invalidation for real-time updates
- Fallback to DCS API on cache miss
- Future: Upgrade to Redis if needed

### Migration Strategy
- Parallel mode: Keep old tables, add new services
- Verify parity between old and new
- Switch over when confident
- Drop old tables

### Database Changes
```sql
-- Publishers: Remove table, keep dcs_publisher_id references
-- Books: Remove table, update assignments.book_id → assignments.dcs_book_id
-- Schools: school.publisher_id → school.dcs_publisher_id
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| DCS downtime affects LMS | Aggressive caching, graceful degradation |
| Performance regression | Cache warm-up, preload common data |
| Migration breaks assignments | Parallel mode testing, rollback plan |

## Success Criteria

- [ ] No `publishers` table in LMS database
- [ ] No `books` table in LMS database
- [ ] All publisher/book data fetched from DCS API
- [ ] No sync-related bugs possible
- [ ] Webhook handlers only invalidate cache
- [ ] All existing functionality preserved

## Definition of Done

- All stories completed and tested
- Database migrations executed
- Old sync code removed
- Documentation updated
- Performance benchmarks acceptable
