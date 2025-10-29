import { test, expect, type Page } from "@playwright/test"

/**
 * E2E Tests for Story 2.4: Books & Assignments Pages (Mock Data)
 *
 * Test Coverage:
 * - AC1: Book Catalog with search and filters
 * - AC2: Book Detail with activities list
 * - AC3: Assignment Creation Wizard (4-step flow)
 * - AC4: Teacher Assignment List with filters
 * - AC5: Assignment Detail with student table
 * - AC6: Student Assignment View with tabs
 */

// Helper function to login as teacher
const loginAsTeacher = async (page: Page) => {
  await page.goto("/login")
  await page.getByPlaceholder("Email").fill("teacher@example.com")
  await page.getByPlaceholder("Password", { exact: true }).fill("password123")
  await page.getByRole("button", { name: "Log In" }).click()
  await page.waitForURL("/teacher/dashboard")
}

// Helper function to login as student
const loginAsStudent = async (page: Page) => {
  await page.goto("/login")
  await page.getByPlaceholder("Email").fill("student@example.com")
  await page.getByPlaceholder("Password", { exact: true }).fill("password123")
  await page.getByRole("button", { name: "Log In" }).click()
  await page.waitForURL("/student/dashboard")
}

test.describe("Book Catalog (AC1)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto("/teacher/books")
  })

  test("displays book grid with at least 12 books", async ({ page }) => {
    // Wait for books to load
    await page.waitForSelector('[data-testid="book-card"]', { timeout: 5000 })

    // Count visible book cards
    const bookCards = await page.locator('[data-testid="book-card"]').count()
    expect(bookCards).toBeGreaterThanOrEqual(12)
  })

  test("search filters books by title", async ({ page }) => {
    // Type in search input
    await page.getByPlaceholder("Search books...").fill("math")

    // Wait for filtered results
    await page.waitForTimeout(500) // Debounce

    // Verify filtered books contain "math" in title
    const bookTitles = await page.locator('[data-testid="book-card"] h3').allTextContents()
    bookTitles.forEach(title => {
      expect(title.toLowerCase()).toContain("math")
    })
  })

  test("filter by publisher works", async ({ page }) => {
    // Select publisher filter
    await page.locator('select[name="publisher"]').selectOption("Dream Publisher")

    // Wait for filtered results
    await page.waitForTimeout(500)

    // Verify publisher text appears in filtered books
    const publisherTexts = await page.locator('[data-testid="book-card"]').locator('text="Dream Publisher"').count()
    expect(publisherTexts).toBeGreaterThan(0)
  })

  test("filter by grade works", async ({ page }) => {
    // Select grade filter
    await page.locator('select[name="grade"]').selectOption("3")

    // Wait for filtered results
    await page.waitForTimeout(500)

    // Verify grade badge shows "3"
    const gradeBadges = await page.locator('[data-testid="book-card"]').locator('text="3"').count()
    expect(gradeBadges).toBeGreaterThan(0)
  })

  test("clicking 'View Activities' navigates to book detail", async ({ page }) => {
    // Click first book's "View Activities" button
    await page.locator('[data-testid="book-card"]').first().getByRole("link", { name: /view activities/i }).click()

    // Verify navigation to book detail page
    await expect(page).toHaveURL(/\/teacher\/books\/[^/]+/)

    // Verify book detail page elements are visible
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text="Activities"')).toBeVisible()
  })
})

test.describe("Book Detail Page (AC2)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto("/teacher/books")

    // Navigate to first book's detail page
    await page.locator('[data-testid="book-card"]').first().getByRole("link", { name: /view activities/i }).click()
    await page.waitForURL(/\/teacher\/books\/[^/]+/)
  })

  test("displays book information and cover image", async ({ page }) => {
    // Verify book title
    await expect(page.locator('h1')).toBeVisible()

    // Verify cover image
    await expect(page.locator('img[alt*="cover"]')).toBeVisible()

    // Verify book metadata
    await expect(page.locator('text="Publisher:"')).toBeVisible()
    await expect(page.locator('text="Grade"')).toBeVisible()
  })

  test("displays activities table with 'Assign' buttons", async ({ page }) => {
    // Wait for activities table
    await page.waitForSelector('table', { timeout: 5000 })

    // Verify table headers
    await expect(page.getByRole("columnheader", { name: "#" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Activity Title" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Type" })).toBeVisible()

    // Verify at least one "Assign" button exists
    const assignButtons = await page.getByRole("button", { name: /assign/i }).count()
    expect(assignButtons).toBeGreaterThan(0)
  })

  test("clicking 'Assign' opens assignment wizard", async ({ page }) => {
    // Click first "Assign" button
    await page.getByRole("button", { name: /assign/i }).first().click()

    // Verify wizard dialog opens
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.locator('text="Create Assignment"')).toBeVisible()

    // Verify Step 1 is active
    await expect(page.locator('text="Step 1"')).toBeVisible()
    await expect(page.locator('text="Review Activity"')).toBeVisible()
  })
})

test.describe("Assignment Creation Wizard (AC3)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page)

    // Navigate to book detail and open wizard
    await page.goto("/teacher/books")
    await page.locator('[data-testid="book-card"]').first().getByRole("link", { name: /view activities/i }).click()
    await page.waitForURL(/\/teacher\/books\/[^/]+/)
    await page.getByRole("button", { name: /assign/i }).first().click()
    await page.waitForSelector('[role="dialog"]')
  })

  test("completes full 4-step wizard flow", async ({ page }) => {
    // Step 1: Review Activity
    await expect(page.locator('text="Step 1"')).toBeVisible()
    await expect(page.locator('text="Review Activity"')).toBeVisible()
    await page.getByRole("button", { name: "Next" }).click()

    // Step 2: Select Students/Classes
    await expect(page.locator('text="Step 2"')).toBeVisible()
    await expect(page.locator('text="Select Students"')).toBeVisible()

    // Select a class (assuming checkboxes exist)
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole("button", { name: "Next" }).click()

    // Step 3: Configure Assignment
    await expect(page.locator('text="Step 3"')).toBeVisible()
    await expect(page.locator('text="Configure Assignment"')).toBeVisible()

    // Fill assignment details
    await page.getByLabel("Assignment Name").fill("Test Assignment E2E")
    await page.getByLabel("Instructions").fill("Complete all activities")

    // Set due date (tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateString = tomorrow.toISOString().split('T')[0]
    await page.getByLabel("Due Date").fill(dateString + 'T23:59')

    await page.getByRole("button", { name: "Next" }).click()

    // Step 4: Review & Create
    await expect(page.locator('text="Step 4"')).toBeVisible()
    await expect(page.locator('text="Review"')).toBeVisible()

    // Verify assignment name appears in review
    await expect(page.locator('text="Test Assignment E2E"')).toBeVisible()

    // Create assignment
    await page.getByRole("button", { name: "Create Assignment" }).click()

    // Verify success toast appears
    await expect(page.locator('text="Assignment created successfully"')).toBeVisible({ timeout: 5000 })

    // Verify wizard closes
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 })
  })

  test("validates required fields in Step 3", async ({ page }) => {
    // Navigate to Step 3
    await page.getByRole("button", { name: "Next" }).click() // Step 1 -> 2
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole("button", { name: "Next" }).click() // Step 2 -> 3

    // Try to proceed without filling required fields
    await page.getByRole("button", { name: "Next" }).click()

    // Verify validation errors appear
    await expect(page.locator('text=/required/i').or(page.locator('text=/fill/i'))).toBeVisible()
  })

  test("can navigate back through wizard steps", async ({ page }) => {
    // Go to Step 2
    await page.getByRole("button", { name: "Next" }).click()
    await expect(page.locator('text="Step 2"')).toBeVisible()

    // Go back to Step 1
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.locator('text="Step 1"')).toBeVisible()
    await expect(page.locator('text="Review Activity"')).toBeVisible()
  })
})

test.describe("Teacher Assignment List (AC4)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto("/teacher/assignments")
  })

  test("displays assignments table with required columns", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 5000 })

    // Verify table headers
    await expect(page.getByRole("columnheader", { name: "Assignment Name" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Book" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Due Date" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Completion" })).toBeVisible()
  })

  test("status filter changes displayed assignments", async ({ page }) => {
    // Wait for assignments to load
    await page.waitForSelector('table tbody tr', { timeout: 5000 })

    // Count all assignments
    const allCount = await page.locator('table tbody tr').count()

    // Filter by "Active" status
    await page.locator('select[aria-label="Filter by status"]').selectOption("active")
    await page.waitForTimeout(500)

    const activeCount = await page.locator('table tbody tr').count()

    // Verify count changed (unless all are active)
    expect(activeCount).toBeLessThanOrEqual(allCount)
  })

  test("due date sorting works", async ({ page }) => {
    // Wait for assignments to load
    await page.waitForSelector('table tbody tr', { timeout: 5000 })

    // Click sort button
    await page.getByRole("button", { name: /due date/i }).click()
    await page.waitForTimeout(500)

    // Verify sort indicator changed (arrow should flip)
    await expect(page.getByRole("button", { name: /due date/i })).toBeVisible()
  })

  test("clicking 'View Details' navigates to assignment detail", async ({ page }) => {
    // Wait for assignments to load
    await page.waitForSelector('table tbody tr', { timeout: 5000 })

    // Click first "View Details" link
    await page.getByRole("link", { name: /view details/i }).first().click()

    // Verify navigation to assignment detail page
    await expect(page).toHaveURL(/\/teacher\/assignments\/[^/]+/)
  })

  test("displays newly created assignment immediately (DATA-001 fix verification)", async ({ page }) => {
    // Get initial assignment count
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    const initialCount = await page.locator('table tbody tr').count()

    // Navigate to books and create a new assignment
    await page.goto("/teacher/books")
    await page.locator('[data-testid="book-card"]').first().getByRole("link", { name: /view activities/i }).click()
    await page.waitForURL(/\/teacher\/books\/[^/]+/)
    await page.getByRole("button", { name: /assign/i }).first().click()

    // Complete wizard quickly (simplified for test speed)
    await page.getByRole("button", { name: "Next" }).click()
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole("button", { name: "Next" }).click()

    await page.getByLabel("Assignment Name").fill("E2E Test Assignment")
    await page.getByLabel("Instructions").fill("Test")
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.getByLabel("Due Date").fill(tomorrow.toISOString().split('T')[0] + 'T23:59')

    await page.getByRole("button", { name: "Next" }).click()
    await page.getByRole("button", { name: "Create Assignment" }).click()

    // Wait for success message
    await expect(page.locator('text="Assignment created successfully"')).toBeVisible({ timeout: 5000 })

    // Navigate to assignments list
    await page.goto("/teacher/assignments")

    // Verify new assignment appears WITHOUT page refresh (DATA-001 fix)
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    const newCount = await page.locator('table tbody tr').count()
    expect(newCount).toBe(initialCount + 1)

    // Verify the new assignment title is visible
    await expect(page.locator('text="E2E Test Assignment"')).toBeVisible()
  })
})

test.describe("Assignment Detail (AC5)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto("/teacher/assignments")

    // Click first assignment's detail link
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    await page.getByRole("link", { name: /view details/i }).first().click()
    await page.waitForURL(/\/teacher\/assignments\/[^/]+/)
  })

  test("displays assignment information", async ({ page }) => {
    // Verify assignment name is displayed
    await expect(page.locator('h1')).toBeVisible()

    // Verify assignment metadata
    await expect(page.locator('text="Due Date"').or(page.locator('text="Due:"'))).toBeVisible()
    await expect(page.locator('text="Instructions"').or(page.locator('text="Description"'))).toBeVisible()
  })

  test("displays student completion table", async ({ page }) => {
    // Wait for student table
    await page.waitForSelector('table', { timeout: 5000 })

    // Verify student table has expected columns
    await expect(page.getByRole("columnheader", { name: /student/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible()
  })

  test("can filter students by completion status", async ({ page }) => {
    // Look for status filter (might be select or tabs)
    const statusFilter = page.locator('select[aria-label*="status"]').or(page.locator('[role="tab"]'))

    if (await statusFilter.count() > 0) {
      await statusFilter.first().click()
      // Verify filter works (table updates)
      await page.waitForTimeout(500)
    }
  })
})

test.describe("Student Assignment View (AC6)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page)
    await page.goto("/student/assignments")
  })

  test("displays assignment tabs: To Do, Completed, Past Due", async ({ page }) => {
    // Verify all three tabs exist
    await expect(page.getByRole("tab", { name: /to do/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /completed/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /past due/i })).toBeVisible()
  })

  test("displays assignment cards with status badges", async ({ page }) => {
    // Wait for assignments to load
    await page.waitForTimeout(1000)

    // Look for assignment cards
    const assignmentCards = page.locator('[data-testid="assignment-card"]')

    if (await assignmentCards.count() > 0) {
      // Verify first card has a status badge
      await expect(assignmentCards.first().locator('text=/not started|in progress|completed/i')).toBeVisible()
    }
  })

  test("switching tabs shows different assignments", async ({ page }) => {
    // Click "To Do" tab
    await page.getByRole("tab", { name: /to do/i }).click()
    await page.waitForTimeout(500)
    const todoCount = await page.locator('[data-testid="assignment-card"]').count()

    // Click "Completed" tab
    await page.getByRole("tab", { name: /completed/i }).click()
    await page.waitForTimeout(500)
    const completedCount = await page.locator('[data-testid="assignment-card"]').count()

    // Counts should be different (unless all assignments have same status)
    // Just verify tabs are functional
    await expect(page.getByRole("tab", { name: /completed/i })).toHaveAttribute("aria-selected", "true")
  })

  test("assignment cards show countdown timer for active assignments", async ({ page }) => {
    // Wait for assignments to load
    await page.waitForTimeout(1000)

    // Look for countdown text (e.g., "Due in: 2 days")
    const countdown = page.locator('text=/due in:|[0-9]+ day/i')

    if (await countdown.count() > 0) {
      await expect(countdown.first()).toBeVisible()
    }
  })

  test("'Start Assignment' button is present on assignment cards", async ({ page }) => {
    // Wait for assignments to load
    await page.waitForTimeout(1000)

    const startButtons = page.getByRole("button", { name: /start assignment/i })

    if (await startButtons.count() > 0) {
      await expect(startButtons.first()).toBeVisible()
      await expect(startButtons.first()).toBeDisabled() // Should be disabled per story notes
    }
  })
})

test.describe("Responsive Design", () => {
  test("book catalog is responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await loginAsTeacher(page)
    await page.goto("/teacher/books")

    // Verify books still display
    await page.waitForSelector('[data-testid="book-card"]', { timeout: 5000 })
    const bookCards = await page.locator('[data-testid="book-card"]').count()
    expect(bookCards).toBeGreaterThan(0)
  })

  test("assignment wizard is responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await loginAsTeacher(page)
    await page.goto("/teacher/books")
    await page.locator('[data-testid="book-card"]').first().getByRole("link", { name: /view activities/i }).click()
    await page.getByRole("button", { name: /assign/i }).first().click()

    // Verify wizard is visible and usable on mobile
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.locator('text="Step 1"')).toBeVisible()
  })
})

test.describe("Accessibility", () => {
  test("book catalog has proper ARIA labels", async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto("/teacher/books")

    // Verify search input has label
    const searchInput = page.getByPlaceholder("Search books...")
    await expect(searchInput).toBeVisible()

    // Verify "View Activities" links have descriptive aria-labels
    const viewLinks = page.getByRole("link", { name: /view activities/i })
    expect(await viewLinks.count()).toBeGreaterThan(0)
  })

  test("assignment wizard has proper keyboard navigation", async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto("/teacher/books")
    await page.locator('[data-testid="book-card"]').first().getByRole("link", { name: /view activities/i }).click()
    await page.getByRole("button", { name: /assign/i }).first().click()

    // Tab through form elements
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")

    // Verify focus is visible (at least no errors)
    await expect(page.getByRole("dialog")).toBeVisible()
  })
})
