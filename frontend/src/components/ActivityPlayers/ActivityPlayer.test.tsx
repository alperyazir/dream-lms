/**
 * ActivityPlayer Restoration Tests
 * Story 4.8: Activity Progress Persistence (Save & Resume)
 *
 * Tests progress restoration logic for all activity types
 */

import { describe, expect, it } from "vitest"
import { restoreProgressFromJson } from "./ActivityPlayer"

describe("restoreProgressFromJson", () => {
  describe("dragdroppicture activity type", () => {
    it("restores Map<string, string> from JSON object", () => {
      const savedProgress = {
        "10-20": "apple",
        "30-40": "banana",
        "50-60": "cherry",
      }

      const result = restoreProgressFromJson(savedProgress, "dragdroppicture")

      expect(result).toBeInstanceOf(Map)
      expect(result).toEqual(
        new Map([
          ["10-20", "apple"],
          ["30-40", "banana"],
          ["50-60", "cherry"],
        ]),
      )
    })

    it("handles empty progress", () => {
      const result = restoreProgressFromJson({}, "dragdroppicture")
      expect(result).toBeInstanceOf(Map)
      expect((result as Map<string, string>).size).toBe(0)
    })
  })

  describe("dragdroppicturegroup activity type", () => {
    it("restores Map<string, string> from JSON object", () => {
      const savedProgress = {
        "10-20": "animal",
        "30-40": "fruit",
      }

      const result = restoreProgressFromJson(
        savedProgress,
        "dragdroppicturegroup",
      )

      expect(result).toBeInstanceOf(Map)
      expect(result).toEqual(
        new Map([
          ["10-20", "animal"],
          ["30-40", "fruit"],
        ]),
      )
    })
  })

  describe("matchTheWords activity type", () => {
    it("restores Map<string, string> from JSON object", () => {
      const savedProgress = {
        "The cat is sleeping": "sleeping",
        "Birds can fly": "fly",
      }

      const result = restoreProgressFromJson(savedProgress, "matchTheWords")

      expect(result).toBeInstanceOf(Map)
      expect(result).toEqual(
        new Map([
          ["The cat is sleeping", "sleeping"],
          ["Birds can fly", "fly"],
        ]),
      )
    })
  })

  describe("circle activity type", () => {
    it("restores Map<number, number> from JSON object", () => {
      const savedProgress = {
        "0": 1,
        "1": 0,
        "2": 3,
      }

      const result = restoreProgressFromJson(savedProgress, "circle")

      expect(result).toBeInstanceOf(Map)
      expect(result).toEqual(
        new Map([
          [0, 1],
          [1, 0],
          [2, 3],
        ]),
      )
    })

    it("parses string keys as integers", () => {
      const savedProgress = {
        "5": 10,
        "15": 20,
      }

      const result = restoreProgressFromJson(savedProgress, "circle") as Map<
        number,
        number
      >

      expect(result.get(5)).toBe(10)
      expect(result.get(15)).toBe(20)
      // String keys should not exist
      expect(result.get("5" as any)).toBeUndefined()
    })
  })

  describe("markwithx activity type", () => {
    it("restores Map<number, number> from JSON object", () => {
      const savedProgress = {
        "0": 2,
        "1": 1,
      }

      const result = restoreProgressFromJson(savedProgress, "markwithx")

      expect(result).toBeInstanceOf(Map)
      expect(result).toEqual(
        new Map([
          [0, 2],
          [1, 1],
        ]),
      )
    })
  })

  describe("puzzleFindWords activity type", () => {
    it("restores Set<string> from words array", () => {
      const savedProgress = {
        words: ["cat", "dog", "bird", "fish"],
      }

      const result = restoreProgressFromJson(savedProgress, "puzzleFindWords")

      expect(result).toBeInstanceOf(Set)
      expect(result).toEqual(new Set(["cat", "dog", "bird", "fish"]))
    })

    it("handles empty words array", () => {
      const savedProgress = {
        words: [],
      }

      const result = restoreProgressFromJson(savedProgress, "puzzleFindWords")

      expect(result).toBeInstanceOf(Set)
      expect((result as Set<string>).size).toBe(0)
    })

    it("handles missing words key", () => {
      const savedProgress = {}

      const result = restoreProgressFromJson(savedProgress, "puzzleFindWords")

      expect(result).toBeInstanceOf(Set)
      expect((result as Set<string>).size).toBe(0)
    })
  })

  describe("null and undefined handling", () => {
    it("returns null for null progress", () => {
      const result = restoreProgressFromJson(null, "circle")
      expect(result).toBeNull()
    })

    it("returns null for undefined progress", () => {
      const result = restoreProgressFromJson(undefined, "circle")
      expect(result).toBeNull()
    })
  })

  describe("unknown activity type", () => {
    it("returns null for unknown activity type", () => {
      const savedProgress = { test: "data" }
      const result = restoreProgressFromJson(savedProgress, "unknown-activity")
      expect(result).toBeNull()
    })
  })

  describe("error handling", () => {
    it("returns null on restoration error", () => {
      // This would trigger an error in the try-catch
      const invalidProgress = null
      const result = restoreProgressFromJson(invalidProgress, "dragdroppicture")
      expect(result).toBeNull()
    })
  })

  describe("data integrity", () => {
    it("preserves all entries when restoring Map types", () => {
      const savedProgress = {
        a: "1",
        b: "2",
        c: "3",
        d: "4",
        e: "5",
      }

      const result = restoreProgressFromJson(
        savedProgress,
        "matchTheWords",
      ) as Map<string, string>

      expect(result.size).toBe(5)
      expect(result.get("a")).toBe("1")
      expect(result.get("e")).toBe("5")
    })

    it("preserves all entries when restoring Set types", () => {
      const savedProgress = {
        words: ["apple", "banana", "cherry", "date", "elderberry"],
      }

      const result = restoreProgressFromJson(
        savedProgress,
        "puzzleFindWords",
      ) as Set<string>

      expect(result.size).toBe(5)
      expect(result.has("apple")).toBe(true)
      expect(result.has("elderberry")).toBe(true)
    })

    it("handles special characters in Map keys", () => {
      const savedProgress = {
        "special-key-123": "value1",
        "key with spaces": "value2",
        key_with_underscore: "value3",
      }

      const result = restoreProgressFromJson(
        savedProgress,
        "dragdroppicture",
      ) as Map<string, string>

      expect(result.get("special-key-123")).toBe("value1")
      expect(result.get("key with spaces")).toBe("value2")
      expect(result.get("key_with_underscore")).toBe("value3")
    })

    it("handles special characters in Set values", () => {
      const savedProgress = {
        words: ["hello world", "test-value", "value_123", "café"],
      }

      const result = restoreProgressFromJson(
        savedProgress,
        "puzzleFindWords",
      ) as Set<string>

      expect(result.has("hello world")).toBe(true)
      expect(result.has("test-value")).toBe(true)
      expect(result.has("value_123")).toBe(true)
      expect(result.has("café")).toBe(true)
    })
  })
})
