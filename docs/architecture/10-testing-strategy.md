# 10. Testing Strategy

## 10.1 Backend Testing (pytest)

```python
# tests/test_assignments.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_assignment(client: AsyncClient, teacher_token: str):
    response = await client.post(
        "/api/v1/assignments",
        json={
            "name": "Test Assignment",
            "activity_id": "...",
            "due_date": "2025-12-31T23:59:59Z",
            "student_ids": [...]
        },
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Assignment"
```

## 10.2 Frontend Testing (Vitest)

```typescript
// tests/components/AssignmentCard.test.tsx
import { render, screen } from '@testing-library/react';
import { AssignmentCard } from '@/components/AssignmentCard';

describe('AssignmentCard', () => {
  it('renders assignment details', () => {
    const assignment = {
      name: 'Math Quiz',
      due_date: '2025-12-31',
      status: 'pending'
    };

    render(<AssignmentCard assignment={assignment} />);

    expect(screen.getByText('Math Quiz')).toBeInTheDocument();
    expect(screen.getByText('Due: 2025-12-31')).toBeInTheDocument();
  });
});
```

---
