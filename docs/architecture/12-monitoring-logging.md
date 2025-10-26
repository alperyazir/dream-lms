# 12. Monitoring & Logging

## 12.1 Structured Logging

```python
import structlog

logger = structlog.get_logger()

@router.post("/assignments")
async def create_assignment(assignment: AssignmentCreate, user: User):
    logger.info(
        "assignment_created",
        teacher_id=user.teacher_id,
        assignment_name=assignment.name,
        student_count=len(assignment.student_ids)
    )
    # ... implementation
```

## 12.2 Application Performance Monitoring

**Recommended:** Sentry for error tracking

```python
import sentry_sdk

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,
    traces_sample_rate=0.1
)
```

**Key Metrics to Track:**
- API response times (p50, p95, p99)
- Database query duration
- Dream Central Storage latency
- Active users (concurrent)
- Assignment completion rate

---
