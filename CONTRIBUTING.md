# Contributing to Dream LMS

Thank you for your interest in contributing to Dream LMS! This document provides guidelines and instructions for contributing to the project.

---

## 📋 Table of Contents

- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)

---

## 🔄 Development Workflow

### 1. Branch Strategy

We use **Git Flow** for branch management:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### 2. Starting New Work

```bash
# Update your local repository
git checkout develop
git pull origin develop

# Create a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b bugfix/your-bug-fix
```

### 3. Making Changes

1. Write your code following our [coding standards](#coding-standards)
2. Add tests for new functionality
3. Run linting and tests locally
4. Commit your changes with [proper commit messages](#commit-message-format)

### 4. Submitting Changes

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
# - Fill out the PR template
# - Link related issues
# - Request reviews from team members
```

---

## 📝 Coding Standards

### Backend (Python)

**Style Guide:**
- Follow [PEP 8](https://pep8.org/) Python style guide
- Use **Black** for automatic formatting (line length: 100)
- Use **Flake8** for linting
- Use type hints for all function signatures

**Example:**
```python
from typing import List

async def get_users(limit: int = 10) -> List[User]:
    """
    Fetch users from database.

    Args:
        limit: Maximum number of users to return

    Returns:
        List of User objects
    """
    return await db.query(User).limit(limit).all()
```

**Best Practices:**
- Use async/await for all database operations
- Keep functions small and focused (< 50 lines)
- Use descriptive variable names
- Add docstrings to all public functions
- Handle errors explicitly with try/except

**Formatting Commands:**
```bash
# Format code
black .

# Check formatting
black --check .

# Lint code
flake8 app/ tests/
```

### Frontend (TypeScript/React)

**Style Guide:**
- Follow [Airbnb React/JSX Style Guide](https://github.com/airbnb/javascript/tree/master/react)
- Use **ESLint** for linting
- Use functional components with hooks
- Use TypeScript strict mode

**Example:**
```typescript
import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

export const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const response = await fetch('/api/users');
    const data = await response.json();
    setUsers(data);
  };

  return (
    <div className="user-list">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};
```

**Best Practices:**
- Use functional components over class components
- Keep components small and reusable
- Use custom hooks for shared logic
- Use Tailwind CSS utility classes
- Use TypeScript interfaces for prop types
- Avoid inline styles

**Linting Commands:**
```bash
# Lint code
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

---

## 💬 Commit Message Format

We follow the **Conventional Commits** specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

### Examples

```bash
# Feature
git commit -m "feat(auth): add JWT authentication endpoint"

# Bug fix
git commit -m "fix(api): resolve CORS issue with frontend"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Multiple lines
git commit -m "feat(user): add user profile page

- Add profile component
- Create user service
- Add tests for user profile

Closes #123"
```

### Rules

- Use present tense ("add" not "added")
- Use imperative mood ("move" not "moves")
- Keep first line under 72 characters
- Reference issues and PRs in footer

---

## 🔀 Pull Request Process

### 1. Before Creating PR

- [ ] Code follows style guidelines
- [ ] All tests pass locally
- [ ] Linting passes without errors
- [ ] New features have tests
- [ ] Documentation updated if needed
- [ ] Commit messages follow format

### 2. Creating the PR

Use the Pull Request template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested your changes

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
```

### 3. Review Process

1. **Automated Checks**: CI pipeline must pass (linting, tests)
2. **Code Review**: At least one approval from team member required
3. **Testing**: Reviewer should test changes locally
4. **Feedback**: Address all review comments
5. **Merge**: Squash and merge to develop branch

### 4. After Merge

- Delete your feature branch
- Update your local develop branch
- Close related issues

---

## 🧪 Testing Guidelines

### Backend Tests

**Structure:**
```
backend/tests/
├── conftest.py           # Shared fixtures
├── test_api/
│   ├── test_auth.py
│   └── test_users.py
└── test_services/
    └── test_user_service.py
```

**Example Test:**
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    """Test user creation endpoint."""
    response = await client.post(
        "/api/users",
        json={"name": "Test User", "email": "test@example.com"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test User"
    assert "id" in data
```

**Requirements:**
- All API endpoints must have tests
- Aim for 80%+ code coverage
- Test both success and error cases
- Use fixtures for common setup
- Mock external services

### Frontend Tests

**Structure:**
```
frontend/src/
├── components/
│   ├── UserCard.tsx
│   └── UserCard.test.tsx
└── test/
    └── setup.ts
```

**Example Test:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  it('renders user information', () => {
    const user = { id: 1, name: 'John Doe', email: 'john@example.com' };
    render(<UserCard user={user} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<UserCard user={user} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(user.id);
  });
});
```

**Requirements:**
- All components must have tests
- Test user interactions
- Test different states (loading, error, success)
- Use React Testing Library best practices
- Avoid implementation details

---

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., macOS, Windows]
- Browser: [e.g., Chrome, Firefox]
- Version: [e.g., 0.1.0]
```

---

## ❓ Questions?

- Check existing [issues](https://github.com/your-repo/issues)
- Join our team chat
- Contact maintainers

---

## 📄 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

---

**Thank you for contributing to Dream LMS! 🚀**
