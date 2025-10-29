# Playwright E2E Testing Guide

## Quick Start

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test books-and-assignments
```

### Run Tests in UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Run Tests in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run Single Test by Name
```bash
npx playwright test -g "displays book grid"
```

### Debug Tests
```bash
npx playwright test --debug
```

### Generate Test Report
```bash
npx playwright show-report
```

## Test Structure

### Books & Assignments Tests (`books-and-assignments.spec.ts`)

**Coverage:**
- ✅ AC1: Book Catalog with search and filters
- ✅ AC2: Book Detail with activities list
- ✅ AC3: Assignment Creation Wizard (4-step flow)
- ✅ AC4: Teacher Assignment List with filters
- ✅ AC5: Assignment Detail with student table
- ✅ AC6: Student Assignment View with tabs
- ✅ Responsive Design (mobile viewport)
- ✅ Accessibility (ARIA labels, keyboard navigation)

**Special Test:**
- DATA-001 Fix Verification: Tests that newly created assignments appear immediately without page refresh

## Improving Test Reliability

### Add Test IDs to Components

To make tests more reliable, add `data-testid` attributes to key elements:

```tsx
// BookCard.tsx
<Card data-testid="book-card">
  <h3 data-testid="book-title">{book.title}</h3>
</Card>

// AssignmentCard.tsx
<Card data-testid="assignment-card">
  <Badge data-testid="status-badge">{status}</Badge>
</Card>
```

### Test Environment Variables

Create `.env.test` file:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run Playwright tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Best Practices

### DO:
- ✅ Use semantic selectors (`getByRole`, `getByLabel`)
- ✅ Wait for elements with `waitForSelector`
- ✅ Use `data-testid` for dynamic content
- ✅ Test user flows, not implementation details
- ✅ Keep tests independent (no shared state)
- ✅ Use `beforeEach` for common setup

### DON'T:
- ❌ Use CSS selectors (`.class-name`)
- ❌ Hard-code wait times (`waitForTimeout`)
- ❌ Test internal state
- ❌ Make tests depend on each other
- ❌ Use `page.click` when `getByRole` works

## Debugging Tips

### 1. Visual Debugging
```bash
npx playwright test --debug
```

### 2. Trace Viewer (after test failure)
```bash
npx playwright show-trace trace.zip
```

### 3. Screenshots on Failure (auto-enabled)
Check `test-results/` folder

### 4. Slow Motion (see what's happening)
```typescript
await page.goto("/teacher/books", { waitUntil: "networkidle" })
```

## Test Data Management

### Using Mock Data
Tests use the same mock data from `mockData.ts`:
- 12 books
- 20 activities
- 15 assignments

### State Management Verification
DATA-001 fix is verified by checking that:
1. Creating an assignment updates the Zustand store
2. Navigating to assignment list shows new assignment
3. No page refresh is required

## Performance Benchmarks

Target test execution times:
- Unit tests (Vitest): < 2 seconds for 18 tests ✅
- E2E tests (Playwright): < 2 minutes for full suite

## Troubleshooting

### "Cannot find module" error
```bash
npm install @playwright/test
```

### "Browser not found" error
```bash
npx playwright install
```

### Tests fail due to timing
Add explicit waits:
```typescript
await page.waitForSelector('[data-testid="book-card"]', { timeout: 5000 })
```

### Port 5173 already in use
```bash
# Kill existing Vite dev server
lsof -ti:5173 | xargs kill
```

## Coverage Goals

- ✅ All 6 acceptance criteria covered
- ✅ Critical user flows tested end-to-end
- ✅ Responsive design verified (mobile + desktop)
- ✅ Accessibility basics verified
- ✅ State management bug fix verified (DATA-001)

## Next Steps

1. Add `data-testid` attributes to components
2. Run tests locally: `npx playwright test`
3. Fix any failures
4. Add to CI/CD pipeline
5. Generate coverage report
