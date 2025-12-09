/**
 * Tests for getTourStepsForRole utility function
 */

import { describe, expect, it } from "vitest"
import { getTourStepsForRole } from "./getTourSteps"

describe("getTourStepsForRole", () => {
  it("returns 7 steps for teacher role", () => {
    const steps = getTourStepsForRole("teacher")
    expect(steps).toHaveLength(7)
  })

  it("returns 5 steps for student role", () => {
    const steps = getTourStepsForRole("student")
    expect(steps).toHaveLength(5)
  })

  it("returns 5 steps for publisher role", () => {
    const steps = getTourStepsForRole("publisher")
    expect(steps).toHaveLength(5)
  })

  it("returns empty array for admin role", () => {
    const steps = getTourStepsForRole("admin")
    expect(steps).toHaveLength(0)
  })

  it("all steps have required properties", () => {
    const roles = ["teacher", "student", "publisher"] as const
    roles.forEach((role) => {
      const steps = getTourStepsForRole(role)
      steps.forEach((step) => {
        expect(step.target).toBeDefined()
        expect(step.target).not.toBe("")
        expect(step.title).toBeTruthy()
        expect(step.content).toBeTruthy()
      })
    })
  })

  it("all teacher steps have disableBeacon set to true", () => {
    const steps = getTourStepsForRole("teacher")
    steps.forEach((step) => {
      expect(step.disableBeacon).toBe(true)
    })
  })

  it("all student steps have disableBeacon set to true", () => {
    const steps = getTourStepsForRole("student")
    steps.forEach((step) => {
      expect(step.disableBeacon).toBe(true)
    })
  })

  it("all publisher steps have disableBeacon set to true", () => {
    const steps = getTourStepsForRole("publisher")
    steps.forEach((step) => {
      expect(step.disableBeacon).toBe(true)
    })
  })

  it("first step of each role tour targets body (welcome message)", () => {
    const roles = ["teacher", "student", "publisher"] as const
    roles.forEach((role) => {
      const steps = getTourStepsForRole(role)
      expect(steps[0].target).toBe("body")
      expect(steps[0].placement).toBe("center")
    })
  })
})
