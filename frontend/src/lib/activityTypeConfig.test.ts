/**
 * Activity Type Configuration Tests
 * Story 27.20: Unified Activity Player Integration
 */

import {
  BookOpen,
  CheckSquare,
  FileQuestion,
  HelpCircle,
  PenLine,
  Type,
} from "lucide-react"
import { describe, expect, it } from "vitest"
import {
  ACTIVITY_TYPE_CONFIG,
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "./activityTypeConfig"

describe("activityTypeConfig", () => {
  describe("ACTIVITY_TYPE_CONFIG", () => {
    it("includes all existing DCS activity types", () => {
      const existingTypes = [
        "matchTheWords",
        "dragdroppicture",
        "dragdroppicturegroup",
        "fillSentencesWithDots",
        "fillpicture",
        "circle",
        "puzzleFindWords",
        "markwithx",
      ]

      for (const type of existingTypes) {
        expect(ACTIVITY_TYPE_CONFIG[type]).toBeDefined()
        expect(ACTIVITY_TYPE_CONFIG[type].icon).toBeTruthy()
        expect(ACTIVITY_TYPE_CONFIG[type].label).toBeTruthy()
        expect(ACTIVITY_TYPE_CONFIG[type].color).toBeTruthy()
      }
    })

    it("includes all AI-generated activity types", () => {
      const aiTypes = [
        "vocabulary_quiz",
        "ai_quiz",
        "reading_comprehension",
        "sentence_builder",
        "word_builder",
      ]

      for (const type of aiTypes) {
        expect(ACTIVITY_TYPE_CONFIG[type]).toBeDefined()
        expect(ACTIVITY_TYPE_CONFIG[type].icon).toBeTruthy()
        expect(ACTIVITY_TYPE_CONFIG[type].label).toBeTruthy()
        expect(ACTIVITY_TYPE_CONFIG[type].color).toBeTruthy()
      }
    })

    it("has unique labels for each activity type", () => {
      const labels = Object.values(ACTIVITY_TYPE_CONFIG).map(
        (config) => config.label,
      )
      const uniqueLabels = new Set(labels)
      expect(uniqueLabels.size).toBe(labels.length)
    })
  })

  describe("getActivityTypeConfig", () => {
    it("returns correct config for vocabulary_quiz", () => {
      const config = getActivityTypeConfig("vocabulary_quiz")
      expect(config.icon).toBe(FileQuestion)
      expect(config.label).toBe("Vocabulary Quiz")
      expect(config.color).toBe("blue")
    })

    it("returns correct config for ai_quiz", () => {
      const config = getActivityTypeConfig("ai_quiz")
      expect(config.icon).toBe(CheckSquare)
      expect(config.label).toBe("Quiz")
      expect(config.color).toBe("green")
    })

    it("returns correct config for reading_comprehension", () => {
      const config = getActivityTypeConfig("reading_comprehension")
      expect(config.icon).toBe(BookOpen)
      expect(config.label).toBe("Reading Comprehension")
      expect(config.color).toBe("orange")
    })

    it("returns correct config for sentence_builder", () => {
      const config = getActivityTypeConfig("sentence_builder")
      expect(config.icon).toBe(PenLine)
      expect(config.label).toBe("Sentence Builder")
      expect(config.color).toBe("cyan")
    })

    it("returns correct config for word_builder", () => {
      const config = getActivityTypeConfig("word_builder")
      expect(config.icon).toBe(Type)
      expect(config.label).toBe("Word Builder")
      expect(config.color).toBe("pink")
    })

    it("returns default config for unknown activity type", () => {
      const config = getActivityTypeConfig("unknown_type")
      expect(config.icon).toBe(HelpCircle)
      expect(config.label).toBe("Unknown Activity")
      expect(config.color).toBe("gray")
    })

    it("returns config for all existing activity types", () => {
      const existingTypes = [
        "matchTheWords",
        "dragdroppicture",
        "dragdroppicturegroup",
        "circle",
        "puzzleFindWords",
      ]

      for (const type of existingTypes) {
        const config = getActivityTypeConfig(type)
        expect(config.icon).toBeTruthy()
        expect(config.label).toBeTruthy()
        expect(config.color).toBeTruthy()
      }
    })
  })

  describe("getActivityTypeColorClasses", () => {
    it("returns correct Tailwind classes for blue", () => {
      const classes = getActivityTypeColorClasses("blue")
      expect(classes.bg).toContain("bg-blue-100")
      expect(classes.text).toContain("text-blue-700")
      expect(classes.border).toContain("border-blue-300")
    })

    it("returns correct Tailwind classes for green", () => {
      const classes = getActivityTypeColorClasses("green")
      expect(classes.bg).toContain("bg-green-100")
      expect(classes.text).toContain("text-green-700")
      expect(classes.border).toContain("border-green-300")
    })

    it("returns correct Tailwind classes for purple", () => {
      const classes = getActivityTypeColorClasses("purple")
      expect(classes.bg).toContain("bg-purple-100")
      expect(classes.text).toContain("text-purple-700")
      expect(classes.border).toContain("border-purple-300")
    })

    it("returns default gray classes for unknown color", () => {
      const classes = getActivityTypeColorClasses("unknown_color")
      expect(classes.bg).toContain("bg-gray-100")
      expect(classes.text).toContain("text-gray-700")
      expect(classes.border).toContain("border-gray-300")
    })

    it("includes dark mode variants", () => {
      const classes = getActivityTypeColorClasses("blue")
      expect(classes.bg).toContain("dark:bg-blue-900")
      expect(classes.text).toContain("dark:text-blue-300")
      expect(classes.border).toContain("dark:border-blue-700")
    })
  })
})
