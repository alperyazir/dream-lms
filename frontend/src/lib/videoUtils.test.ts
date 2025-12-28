import { describe, expect, it } from "vitest"
import {
  formatVideoTime,
  getCurrentSubtitle,
  parseSRT,
  parseSubtitles,
  parseVTT,
  type Subtitle,
} from "./videoUtils"

describe("videoUtils", () => {
  describe("parseSRT", () => {
    it("parses valid SRT content", () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:05,500 --> 00:00:08,250
Second subtitle`

      const result = parseSRT(srt)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 1,
        startTime: 1,
        endTime: 4,
        text: "Hello world",
      })
      expect(result[1]).toEqual({
        id: 2,
        startTime: 5.5,
        endTime: 8.25,
        text: "Second subtitle",
      })
    })

    it("handles multi-line subtitles", () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
Line one
Line two
Line three`

      const result = parseSRT(srt)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe("Line one\nLine two\nLine three")
    })

    it("handles Windows line endings (CRLF)", () => {
      const srt = "1\r\n00:00:01,000 --> 00:00:04,000\r\nHello world\r\n\r\n"

      const result = parseSRT(srt)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe("Hello world")
    })

    it("handles timestamps with dots instead of commas", () => {
      const srt = `1
00:00:01.000 --> 00:00:04.500
Test subtitle`

      const result = parseSRT(srt)

      expect(result).toHaveLength(1)
      expect(result[0].startTime).toBe(1)
      expect(result[0].endTime).toBe(4.5)
    })

    it("handles hours in timestamps", () => {
      const srt = `1
01:30:45,123 --> 02:00:00,000
Long video subtitle`

      const result = parseSRT(srt)

      expect(result).toHaveLength(1)
      expect(result[0].startTime).toBe(5445.123) // 1*3600 + 30*60 + 45 + 0.123
      expect(result[0].endTime).toBe(7200) // 2*3600
    })

    it("returns empty array for invalid content", () => {
      const invalid = "This is not a valid SRT file"
      const result = parseSRT(invalid)
      expect(result).toHaveLength(0)
    })

    it("skips malformed entries but parses valid ones", () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
Valid subtitle

invalid
not a timestamp
some text

3
00:00:10,000 --> 00:00:15,000
Another valid one`

      const result = parseSRT(srt)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[1].id).toBe(3)
    })
  })

  describe("parseVTT", () => {
    it("parses valid VTT content", () => {
      const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello world

00:00:05.500 --> 00:00:08.250
Second subtitle`

      const result = parseVTT(vtt)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 1,
        startTime: 1,
        endTime: 4,
        text: "Hello world",
      })
    })

    it("handles cue identifiers", () => {
      const vtt = `WEBVTT

intro
00:00:01.000 --> 00:00:04.000
With identifier`

      const result = parseVTT(vtt)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe("With identifier")
    })

    it("skips NOTE blocks", () => {
      const vtt = `WEBVTT

NOTE This is a comment

00:00:01.000 --> 00:00:04.000
Actual subtitle`

      const result = parseVTT(vtt)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe("Actual subtitle")
    })
  })

  describe("parseSubtitles", () => {
    it("auto-detects VTT format", () => {
      const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
VTT subtitle`

      const result = parseSubtitles(vtt)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe("VTT subtitle")
    })

    it("defaults to SRT format", () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
SRT subtitle`

      const result = parseSubtitles(srt)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe("SRT subtitle")
    })
  })

  describe("getCurrentSubtitle", () => {
    const subtitles: Subtitle[] = [
      { id: 1, startTime: 1, endTime: 4, text: "First" },
      { id: 2, startTime: 5, endTime: 8, text: "Second" },
      { id: 3, startTime: 10, endTime: 15, text: "Third" },
    ]

    it("returns subtitle when time is within range", () => {
      expect(getCurrentSubtitle(subtitles, 2)).toEqual(subtitles[0])
      expect(getCurrentSubtitle(subtitles, 6)).toEqual(subtitles[1])
      expect(getCurrentSubtitle(subtitles, 12)).toEqual(subtitles[2])
    })

    it("returns subtitle at exact start time", () => {
      expect(getCurrentSubtitle(subtitles, 1)).toEqual(subtitles[0])
      expect(getCurrentSubtitle(subtitles, 5)).toEqual(subtitles[1])
    })

    it("returns subtitle at exact end time", () => {
      expect(getCurrentSubtitle(subtitles, 4)).toEqual(subtitles[0])
      expect(getCurrentSubtitle(subtitles, 8)).toEqual(subtitles[1])
    })

    it("returns null when no subtitle matches", () => {
      expect(getCurrentSubtitle(subtitles, 0)).toBeNull()
      expect(getCurrentSubtitle(subtitles, 4.5)).toBeNull()
      expect(getCurrentSubtitle(subtitles, 9)).toBeNull()
      expect(getCurrentSubtitle(subtitles, 20)).toBeNull()
    })

    it("returns null for empty subtitle array", () => {
      expect(getCurrentSubtitle([], 5)).toBeNull()
    })
  })

  describe("formatVideoTime", () => {
    it("formats seconds under a minute", () => {
      expect(formatVideoTime(0)).toBe("0:00")
      expect(formatVideoTime(5)).toBe("0:05")
      expect(formatVideoTime(45)).toBe("0:45")
    })

    it("formats minutes", () => {
      expect(formatVideoTime(60)).toBe("1:00")
      expect(formatVideoTime(90)).toBe("1:30")
      expect(formatVideoTime(125)).toBe("2:05")
      expect(formatVideoTime(599)).toBe("9:59")
    })

    it("formats hours", () => {
      expect(formatVideoTime(3600)).toBe("1:00:00")
      expect(formatVideoTime(3661)).toBe("1:01:01")
      expect(formatVideoTime(7325)).toBe("2:02:05")
    })

    it("handles edge cases", () => {
      expect(formatVideoTime(-5)).toBe("0:00")
      expect(formatVideoTime(NaN)).toBe("0:00")
      expect(formatVideoTime(Infinity)).toBe("0:00")
    })

    it("rounds down partial seconds", () => {
      expect(formatVideoTime(5.9)).toBe("0:05")
      expect(formatVideoTime(59.99)).toBe("0:59")
    })
  })
})
