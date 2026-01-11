/**
 * useAuth Hook Tests - Story 28.1
 * Tests for authentication hook including getUserRole functionality.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getMustChangePassword, getUserRole, isLoggedIn } from "./useAuth"

describe("useAuth helper functions", () => {
  beforeEach(() => {
    // Clear storage before each test
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  describe("isLoggedIn", () => {
    it("should return false when no access token exists", () => {
      expect(isLoggedIn()).toBe(false)
    })

    it("should return true when access token exists", () => {
      localStorage.setItem("access_token", "test-token")
      expect(isLoggedIn()).toBe(true)
    })
  })

  describe("getMustChangePassword", () => {
    it("should return false when must_change_password is not set", () => {
      expect(getMustChangePassword()).toBe(false)
    })

    it("should return true when must_change_password is 'true'", () => {
      sessionStorage.setItem("must_change_password", "true")
      expect(getMustChangePassword()).toBe(true)
    })

    it("should return false when must_change_password is 'false'", () => {
      sessionStorage.setItem("must_change_password", "false")
      expect(getMustChangePassword()).toBe(false)
    })
  })

  describe("getUserRole - Story 28.1", () => {
    it("should return null when user_role is not set", () => {
      expect(getUserRole()).toBeNull()
    })

    it("should return 'student' when user_role is student", () => {
      sessionStorage.setItem("user_role", "student")
      expect(getUserRole()).toBe("student")
    })

    it("should return 'teacher' when user_role is teacher", () => {
      sessionStorage.setItem("user_role", "teacher")
      expect(getUserRole()).toBe("teacher")
    })

    it("should return 'admin' when user_role is admin", () => {
      sessionStorage.setItem("user_role", "admin")
      expect(getUserRole()).toBe("admin")
    })

    it("should return 'publisher' when user_role is publisher", () => {
      sessionStorage.setItem("user_role", "publisher")
      expect(getUserRole()).toBe("publisher")
    })
  })
})

describe("Student password change prevention - Story 28.1", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it("should correctly identify student role for route guards", () => {
    sessionStorage.setItem("user_role", "student")

    // Simulate the check done in change-password beforeLoad
    const role = getUserRole()
    const shouldRedirectStudent = role === "student"

    expect(shouldRedirectStudent).toBe(true)
  })

  it("should not redirect non-student roles", () => {
    sessionStorage.setItem("user_role", "teacher")

    const role = getUserRole()
    const shouldRedirectStudent = role === "student"

    expect(shouldRedirectStudent).toBe(false)
  })

  it("should handle login flow skipping change-password for students", () => {
    // Simulate the check done in login onSuccess
    sessionStorage.setItem("user_role", "student")
    sessionStorage.setItem("must_change_password", "true")

    const storedRole = getUserRole()
    const mustChange = getMustChangePassword()

    // In login, we check: if (mustChange && storedRole !== "student")
    // For students, this should be false, so they go to "/" not "/change-password"
    const shouldGoToChangePassword = mustChange && storedRole !== "student"

    expect(shouldGoToChangePassword).toBe(false)
  })

  it("should redirect to change-password for teachers with must_change_password", () => {
    sessionStorage.setItem("user_role", "teacher")
    sessionStorage.setItem("must_change_password", "true")

    const storedRole = getUserRole()
    const mustChange = getMustChangePassword()

    const shouldGoToChangePassword = mustChange && storedRole !== "student"

    expect(shouldGoToChangePassword).toBe(true)
  })
})
