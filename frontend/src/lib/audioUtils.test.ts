/**
 * Audio Utility Functions Tests
 * Story 10.2: Frontend Audio Player Component
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getAudioPath, getAudioUrl, hasAudio } from "./audioUtils"

// Mock import.meta.env
vi.stubGlobal("import.meta", {
  env: {
    VITE_API_URL: "http://localhost:8000",
  },
})

describe("getAudioUrl", () => {
  const bookId = "book-uuid-123"
  const testToken = "test-jwt-token"
  const baseUrl = "http://localhost:8000"

  beforeEach(() => {
    // Mock localStorage.getItem to return a test token
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(testToken)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("transforms path with ./ prefix and books folder correctly", () => {
    const audioPath = "./books/SwitchtoCLIL/audio/08.mp3"
    const result = getAudioUrl(bookId, audioPath)
    expect(result).toBe(
      `${baseUrl}/api/v1/books/book-uuid-123/media/audio/08.mp3?token=${testToken}`,
    )
  })

  it("transforms path without ./ prefix", () => {
    const audioPath = "books/SwitchtoCLIL/audio/track01.mp3"
    const result = getAudioUrl(bookId, audioPath)
    expect(result).toBe(
      `${baseUrl}/api/v1/books/book-uuid-123/media/audio/track01.mp3?token=${testToken}`,
    )
  })

  it("handles path with only ./ prefix (no books folder)", () => {
    const audioPath = "./audio/lesson.mp3"
    const result = getAudioUrl(bookId, audioPath)
    expect(result).toBe(
      `${baseUrl}/api/v1/books/book-uuid-123/media/audio/lesson.mp3?token=${testToken}`,
    )
  })

  it("handles simple relative path", () => {
    const audioPath = "audio/chapter1.mp3"
    const result = getAudioUrl(bookId, audioPath)
    expect(result).toBe(
      `${baseUrl}/api/v1/books/book-uuid-123/media/audio/chapter1.mp3?token=${testToken}`,
    )
  })

  it("handles nested audio paths", () => {
    const audioPath = "./books/MyBook/audio/unit1/lesson1.mp3"
    const result = getAudioUrl(bookId, audioPath)
    expect(result).toBe(
      `${baseUrl}/api/v1/books/book-uuid-123/media/audio/unit1/lesson1.mp3?token=${testToken}`,
    )
  })

  it("handles paths with special characters in filename", () => {
    const audioPath = "./books/TestBook/audio/track 01.mp3"
    const result = getAudioUrl(bookId, audioPath)
    // Note: Path is not URL-encoded (space remains as space), only the token param is encoded
    expect(result).toBe(
      `${baseUrl}/api/v1/books/book-uuid-123/media/audio/track 01.mp3?token=${testToken}`,
    )
  })

  it("preserves file extension", () => {
    const audioPath = "./books/Book/audio/file.wav"
    const result = getAudioUrl(bookId, audioPath)
    expect(result).toBe(
      `${baseUrl}/api/v1/books/book-uuid-123/media/audio/file.wav?token=${testToken}`,
    )
  })

  it("returns URL without token param when no token in localStorage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null)
    const audioPath = "./books/SwitchtoCLIL/audio/08.mp3"
    const result = getAudioUrl(bookId, audioPath)
    expect(result).toBe(
      `${baseUrl}/api/v1/books/book-uuid-123/media/audio/08.mp3`,
    )
  })
})

describe("hasAudio", () => {
  it("returns true for valid audio_extra with path", () => {
    const activity = {
      type: "circle",
      audio_extra: { path: "./audio/test.mp3" },
    }
    expect(hasAudio(activity)).toBe(true)
  })

  it("returns false for missing audio_extra", () => {
    const activity = {
      type: "circle",
    }
    expect(hasAudio(activity)).toBe(false)
  })

  it("returns false for null audio_extra", () => {
    const activity = {
      type: "circle",
      audio_extra: null,
    }
    expect(hasAudio(activity)).toBe(false)
  })

  it("returns false for audio_extra without path", () => {
    const activity = {
      type: "circle",
      audio_extra: {},
    }
    expect(hasAudio(activity)).toBe(false)
  })

  it("returns false for audio_extra with non-string path", () => {
    const activity = {
      type: "circle",
      audio_extra: { path: 123 },
    }
    expect(hasAudio(activity)).toBe(false)
  })

  it("returns false for audio_extra with empty string path", () => {
    const activity = {
      type: "circle",
      audio_extra: { path: "" },
    }
    expect(hasAudio(activity)).toBe(false)
  })

  it("returns false for null activity", () => {
    expect(hasAudio(null)).toBe(false)
  })

  it("returns false for undefined activity", () => {
    expect(hasAudio(undefined)).toBe(false)
  })

  it("returns false for non-object activity", () => {
    expect(hasAudio("string")).toBe(false)
    expect(hasAudio(123)).toBe(false)
    expect(hasAudio(true)).toBe(false)
  })

  it("works as type guard - provides access to audio_extra.path", () => {
    const activity: unknown = {
      type: "circle",
      audio_extra: { path: "./audio/test.mp3" },
    }

    if (hasAudio(activity)) {
      // TypeScript should allow this access
      expect(activity.audio_extra.path).toBe("./audio/test.mp3")
    }
  })
})

describe("getAudioPath", () => {
  it("returns path for valid audio_extra", () => {
    const activity = {
      type: "circle",
      audio_extra: { path: "./audio/test.mp3" },
    }
    expect(getAudioPath(activity)).toBe("./audio/test.mp3")
  })

  it("returns null for missing audio_extra", () => {
    const activity = {
      type: "circle",
    }
    expect(getAudioPath(activity)).toBeNull()
  })

  it("returns null for null activity", () => {
    expect(getAudioPath(null)).toBeNull()
  })

  it("returns null for undefined activity", () => {
    expect(getAudioPath(undefined)).toBeNull()
  })
})
