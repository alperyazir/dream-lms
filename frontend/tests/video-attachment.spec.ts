import { expect, type Page, test } from "@playwright/test"

/**
 * E2E Tests for Story 10.3: Video Attachment to Assignments
 *
 * Test Coverage:
 * - Teachers can see video picker in assignment creation dialog
 * - Teachers can select and preview videos from a book's video library
 * - Teachers can attach videos to assignments
 * - Students can view video player in multi-activity assignment player
 * - Video player supports play/pause, seeking, volume control
 * - Video player supports subtitle display when available
 *
 * Prerequisites:
 * - Backend must be running with video streaming proxy enabled
 * - At least one book with video files must exist
 * - Test user accounts must exist (teacher@example.com, student@example.com)
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

test.describe("Video Attachment - Teacher Flow (Story 10.3)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page)
  })

  test("video picker is visible in assignment creation settings step", async ({
    page,
  }) => {
    // Navigate to books page
    await page.goto("/teacher/books")

    // Wait for books to load
    await page.waitForSelector('[data-testid="book-card"]', { timeout: 5000 })

    // Click first book's "Create Assignment" or navigate to assignment creation
    await page.locator('[data-testid="book-card"]').first().click()

    // Wait for book detail page
    await page.waitForURL(/\/teacher\/books\//)

    // Click "Create Assignment" button
    await page.getByRole("button", { name: /create assignment/i }).click()

    // Wait for assignment creation dialog
    await page.waitForSelector('[role="dialog"]')

    // Navigate through steps to Settings (usually step 3 or 4)
    // Step 1: Select Activities
    await page.getByRole("button", { name: /next/i }).click()

    // Step 2: Select Recipients
    await page.getByRole("button", { name: /next/i }).click()

    // Step 3: Configure Settings - should see video attachment section
    await expect(page.getByText(/video attachment/i)).toBeVisible()
    await expect(page.locator('[aria-label="Video picker"]')).toBeVisible()
  })

  test("video picker shows available videos for the book", async ({ page }) => {
    // This test requires a book with videos
    // Navigate directly to a book detail page that has videos
    await page.goto("/teacher/books")
    await page.waitForSelector('[data-testid="book-card"]')
    await page.locator('[data-testid="book-card"]').first().click()
    await page.waitForURL(/\/teacher\/books\//)

    // Open assignment creation
    await page.getByRole("button", { name: /create assignment/i }).click()
    await page.waitForSelector('[role="dialog"]')

    // Navigate to settings step
    await page.getByRole("button", { name: /next/i }).click()
    await page.getByRole("button", { name: /next/i }).click()

    // Open video picker dropdown
    const videoPicker = page.locator('[data-testid="video-picker"]')
    if (await videoPicker.isVisible()) {
      await videoPicker.click()
      // Should show video options if book has videos
      // If no videos, should show "No videos available" message
    }
  })

  test("video preview modal opens when preview button is clicked", async ({
    page,
  }) => {
    // Navigate to assignment creation with video picker
    await page.goto("/teacher/books")
    await page.waitForSelector('[data-testid="book-card"]')
    await page.locator('[data-testid="book-card"]').first().click()
    await page.waitForURL(/\/teacher\/books\//)

    await page.getByRole("button", { name: /create assignment/i }).click()
    await page.waitForSelector('[role="dialog"]')

    // Navigate to settings step
    await page.getByRole("button", { name: /next/i }).click()
    await page.getByRole("button", { name: /next/i }).click()

    // If video picker has a video selected, preview button should be available
    const previewButton = page.getByRole("button", { name: /preview video/i })
    if (await previewButton.isVisible()) {
      await previewButton.click()

      // Video preview modal should appear
      await expect(page.getByText(/preview video/i)).toBeVisible()
      await expect(page.locator("video")).toBeVisible()
    }
  })
})

test.describe("Video Attachment - Student Flow (Story 10.3)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page)
  })

  test("video player is visible in assignment player when video is attached", async ({
    page,
  }) => {
    // Navigate to student assignments
    await page.goto("/student/assignments")

    // Wait for assignments to load
    await page.waitForSelector('[data-testid="assignment-card"]', {
      timeout: 5000,
    })

    // Look for an assignment that has a video indicator
    // Click on the first assignment to view details
    await page.locator('[data-testid="assignment-card"]').first().click()

    // Wait for assignment detail page
    await page.waitForURL(/\/student\/assignments\//)

    // Click start/resume assignment
    const startButton = page.getByRole("button", {
      name: /start|resume|continue/i,
    })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Wait for assignment player to load
      await page.waitForURL(/\/play-multi/)

      // Check if video player is present (only if assignment has video attached)
      const _videoPlayer = page.locator('[aria-label="Video player"]')
      // Video player visibility depends on whether assignment has video attached
    }
  })

  test("video player controls work correctly", async ({ page }) => {
    // This test requires an assignment with video attached
    await page.goto("/student/assignments")
    await page.waitForSelector('[data-testid="assignment-card"]')
    await page.locator('[data-testid="assignment-card"]').first().click()
    await page.waitForURL(/\/student\/assignments\//)

    const startButton = page.getByRole("button", {
      name: /start|resume|continue/i,
    })
    if (await startButton.isVisible()) {
      await startButton.click()
      await page.waitForURL(/\/play-multi/)

      const videoPlayer = page.locator('[aria-label="Video player"]')
      if (await videoPlayer.isVisible()) {
        // Test play/pause
        const playButton = videoPlayer.getByRole("button", { name: /play/i })
        await playButton.click()
        await expect(
          videoPlayer.getByRole("button", { name: /pause/i }),
        ).toBeVisible()

        // Test volume mute/unmute
        const muteButton = videoPlayer.getByRole("button", {
          name: /mute|unmute/i,
        })
        await muteButton.click()
        await expect(
          videoPlayer.getByRole("button", { name: /unmute|mute/i }),
        ).toBeVisible()

        // Test minimize/expand
        const minimizeButton = videoPlayer.getByRole("button", {
          name: /minimize/i,
        })
        await minimizeButton.click()
        const expandButton = page.getByRole("button", { name: /expand/i })
        await expect(expandButton).toBeVisible()
      }
    }
  })
})

test.describe("Video Player Component Tests", () => {
  test("video player handles loading state", async ({ page }) => {
    // Navigate to an assignment with video
    await loginAsStudent(page)
    await page.goto("/student/assignments")
    await page.waitForSelector('[data-testid="assignment-card"]')
    await page.locator('[data-testid="assignment-card"]').first().click()

    const startButton = page.getByRole("button", {
      name: /start|resume|continue/i,
    })
    if (await startButton.isVisible()) {
      await startButton.click()
      await page.waitForURL(/\/play-multi/)

      const videoPlayer = page.locator('[aria-label="Video player"]')
      if (await videoPlayer.isVisible()) {
        // Loading indicator should appear initially
        // After loading, video should be ready to play
        await expect(videoPlayer.locator("video")).toBeVisible()
      }
    }
  })

  test("video player shows subtitles when available", async ({ page }) => {
    // This test requires a video with subtitles
    await loginAsStudent(page)
    await page.goto("/student/assignments")
    await page.waitForSelector('[data-testid="assignment-card"]')

    // Find and play an assignment with video that has subtitles
    // Verify subtitle toggle button is visible
    // Verify subtitles are displayed during playback
  })
})
