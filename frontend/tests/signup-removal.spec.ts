import { test, expect } from '@playwright/test'

test.describe('Signup Removal', () => {
  test('signup route returns 404 or redirects to login', async ({ page }) => {
    // Act
    await page.goto('/signup')

    // Assert - should be redirected to login or show 404
    await expect(page).toHaveURL(/\/(login|404)/)
  })

  test('login page has no signup link', async ({ page }) => {
    // Arrange
    await page.goto('/login')

    // Assert
    const signupLink = page.getByRole('link', { name: /sign up/i })
    await expect(signupLink).not.toBeVisible()
  })

  test('existing login flow still works', async ({ page }) => {
    // Arrange
    await page.goto('/login')

    // Act
    await page.fill('[name="username"]', 'admin@example.com')
    await page.fill('[name="password"]', 'changethis')
    await page.click('button[type="submit"]')

    // Assert
    await expect(page).toHaveURL(/\/dashboard|\//)
  })
})
