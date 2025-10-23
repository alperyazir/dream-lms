# 7. Analytics Engine

## 7.1 Performance Calculation Queries

```python
# services/analytics_service.py
async def get_student_analytics(student_id: UUID, period: str):
    """Calculate student performance metrics"""
    query = select(
        func.avg(AssignmentStudent.score).label('avg_score'),
        func.count(AssignmentStudent.id).label('total_completed'),
        func.sum(AssignmentStudent.time_spent_minutes).label('total_time')
    ).where(
        AssignmentStudent.student_id == student_id,
        AssignmentStudent.status == 'completed',
        AssignmentStudent.completed_at >= get_period_start(period)
    )

    result = await db.execute(query)
    return result.one()
```

## 7.2 Error Pattern Detection

```python
async def detect_error_patterns(teacher_id: UUID):
    """Identify common mistakes across assignments"""
    # Query assignments with low scores
    low_score_assignments = await db.execute(
        select(Assignment, AssignmentStudent)
        .join(AssignmentStudent)
        .where(
            Assignment.teacher_id == teacher_id,
            AssignmentStudent.score < 65
        )
    )

    # Analyze answers_json for common incorrect patterns
    patterns = []
    for assignment, student_assignment in low_score_assignments:
        if assignment.activity.activity_type == 'matchTheWords':
            # Analyze which pairs are frequently mismatched
            pass

    return patterns
```

---
