/**
 * Tests for Tour Step Definitions
 */

import { describe, expect, it } from "vitest"
import { publisherTourSteps } from "./publisherTourSteps"
import { studentTourSteps } from "./studentTourSteps"
import { teacherTourSteps } from "./teacherTourSteps"

describe("Tour Step Definitions", () => {
  describe("teacherTourSteps", () => {
    it("has 7 steps", () => {
      expect(teacherTourSteps).toHaveLength(7)
    })

    it("all steps have valid targets", () => {
      teacherTourSteps.forEach((step) => {
        // Target should be 'body' or a data-tour selector
        expect(step.target).toMatch(/^body$|^\[data-tour=/)
      })
    })

    it("all steps have non-empty title and content", () => {
      teacherTourSteps.forEach((step) => {
        expect(step.title).toBeTruthy()
        expect(step.title.length).toBeGreaterThan(0)
        expect(step.content).toBeTruthy()
      })
    })

    it("includes dashboard step", () => {
      const dashboardStep = teacherTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-dashboard"]',
      )
      expect(dashboardStep).toBeDefined()
      expect(dashboardStep?.title).toContain("Dashboard")
    })

    it("includes library step", () => {
      const libraryStep = teacherTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-library"]',
      )
      expect(libraryStep).toBeDefined()
    })

    it("includes assignments step", () => {
      const assignmentsStep = teacherTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-assignments"]',
      )
      expect(assignmentsStep).toBeDefined()
    })

    it("includes insights step", () => {
      const insightsStep = teacherTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-insights"]',
      )
      expect(insightsStep).toBeDefined()
    })

    it("includes messages step", () => {
      const messagesStep = teacherTourSteps.find(
        (step) => step.target === '[data-tour="navbar-messages"]',
      )
      expect(messagesStep).toBeDefined()
    })

    it("includes settings step", () => {
      const settingsStep = teacherTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-settings"]',
      )
      expect(settingsStep).toBeDefined()
    })
  })

  describe("studentTourSteps", () => {
    it("has 5 steps", () => {
      expect(studentTourSteps).toHaveLength(5)
    })

    it("all steps have valid targets", () => {
      studentTourSteps.forEach((step) => {
        expect(step.target).toMatch(/^body$|^\[data-tour=/)
      })
    })

    it("all steps have non-empty title and content", () => {
      studentTourSteps.forEach((step) => {
        expect(step.title).toBeTruthy()
        expect(step.title.length).toBeGreaterThan(0)
        expect(step.content).toBeTruthy()
      })
    })

    it("includes dashboard step", () => {
      const dashboardStep = studentTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-dashboard"]',
      )
      expect(dashboardStep).toBeDefined()
    })

    it("includes assignments step", () => {
      const assignmentsStep = studentTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-assignments"]',
      )
      expect(assignmentsStep).toBeDefined()
    })

    it("includes progress step", () => {
      const progressStep = studentTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-progress"]',
      )
      expect(progressStep).toBeDefined()
    })

    it("includes messages step", () => {
      const messagesStep = studentTourSteps.find(
        (step) => step.target === '[data-tour="navbar-messages"]',
      )
      expect(messagesStep).toBeDefined()
    })
  })

  describe("publisherTourSteps", () => {
    it("has 5 steps", () => {
      expect(publisherTourSteps).toHaveLength(5)
    })

    it("all steps have valid targets", () => {
      publisherTourSteps.forEach((step) => {
        expect(step.target).toMatch(/^body$|^\[data-tour=/)
      })
    })

    it("all steps have non-empty title and content", () => {
      publisherTourSteps.forEach((step) => {
        expect(step.title).toBeTruthy()
        expect(step.title.length).toBeGreaterThan(0)
        expect(step.content).toBeTruthy()
      })
    })

    it("includes dashboard step", () => {
      const dashboardStep = publisherTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-dashboard"]',
      )
      expect(dashboardStep).toBeDefined()
    })

    it("includes library step", () => {
      const libraryStep = publisherTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-library"]',
      )
      expect(libraryStep).toBeDefined()
    })

    it("includes schools step", () => {
      const schoolsStep = publisherTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-schools"]',
      )
      expect(schoolsStep).toBeDefined()
    })

    it("includes teachers step", () => {
      const teachersStep = publisherTourSteps.find(
        (step) => step.target === '[data-tour="sidebar-teachers"]',
      )
      expect(teachersStep).toBeDefined()
    })
  })

  describe("all tour steps", () => {
    const allSteps = [
      ...teacherTourSteps,
      ...studentTourSteps,
      ...publisherTourSteps,
    ]

    it("all steps have proper placement values", () => {
      const validPlacements = [
        "top",
        "bottom",
        "left",
        "right",
        "center",
        "auto",
        undefined,
      ]
      allSteps.forEach((step) => {
        expect(validPlacements).toContain(step.placement)
      })
    })

    it("welcome steps have center placement", () => {
      const welcomeSteps = allSteps.filter((step) => step.target === "body")
      welcomeSteps.forEach((step) => {
        expect(step.placement).toBe("center")
      })
    })

    it("sidebar steps have right placement", () => {
      const sidebarSteps = allSteps.filter((step) =>
        step.target.includes("sidebar"),
      )
      sidebarSteps.forEach((step) => {
        expect(step.placement).toBe("right")
      })
    })

    it("navbar steps have bottom placement", () => {
      const navbarSteps = allSteps.filter((step) =>
        step.target.includes("navbar"),
      )
      navbarSteps.forEach((step) => {
        expect(step.placement).toBe("bottom")
      })
    })
  })
})
