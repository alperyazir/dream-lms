/**
 * Video utilities for subtitle parsing and time formatting
 * Story 10.3: Video Attachment to Assignments
 */

export interface Subtitle {
  id: number
  startTime: number // in seconds
  endTime: number // in seconds
  text: string
}

/**
 * Parse SRT (SubRip) subtitle format
 * SRT format:
 * 1
 * 00:00:01,000 --> 00:00:04,000
 * First subtitle text
 *
 * 2
 * 00:00:05,000 --> 00:00:08,000
 * Second subtitle text
 */
export function parseSRT(srtText: string): Subtitle[] {
  const subtitles: Subtitle[] = []

  // Normalize line endings and split into blocks
  const normalized = srtText.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const blocks = normalized.split(/\n\n+/).filter((block) => block.trim())

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim())

    if (lines.length < 2) continue

    // First line should be the subtitle number
    const id = parseInt(lines[0], 10)
    if (isNaN(id)) continue

    // Second line should be the timestamp
    const timestampLine = lines[1]
    const timestampMatch = timestampLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]?\d{0,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]?\d{0,3})/
    )

    if (!timestampMatch) continue

    const startTime = parseTimestamp(timestampMatch[1])
    const endTime = parseTimestamp(timestampMatch[2])

    // Remaining lines are the subtitle text
    const text = lines.slice(2).join("\n").trim()

    if (text) {
      subtitles.push({ id, startTime, endTime, text })
    }
  }

  return subtitles
}

/**
 * Parse SRT timestamp to seconds
 * Format: HH:MM:SS,mmm or HH:MM:SS.mmm
 */
function parseTimestamp(timestamp: string): number {
  // Replace comma with dot for consistency
  const normalized = timestamp.replace(",", ".")

  const match = normalized.match(/(\d{2}):(\d{2}):(\d{2})\.?(\d{0,3})/)
  if (!match) return 0

  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const seconds = parseInt(match[3], 10)
  const milliseconds = match[4] ? parseInt(match[4].padEnd(3, "0"), 10) : 0

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

/**
 * Get the current subtitle for a given time
 */
export function getCurrentSubtitle(
  subtitles: Subtitle[],
  currentTime: number
): Subtitle | null {
  for (const subtitle of subtitles) {
    if (currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) {
      return subtitle
    }
  }
  return null
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatVideoTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00"

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

/**
 * Parse VTT (WebVTT) subtitle format
 * VTT format:
 * WEBVTT
 *
 * 00:00:01.000 --> 00:00:04.000
 * First subtitle text
 *
 * 00:00:05.000 --> 00:00:08.000
 * Second subtitle text
 */
export function parseVTT(vttText: string): Subtitle[] {
  const subtitles: Subtitle[] = []

  // Normalize line endings and split into blocks
  const normalized = vttText.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const blocks = normalized.split(/\n\n+/).filter((block) => block.trim())

  let idCounter = 1

  for (const block of blocks) {
    // Skip WEBVTT header and NOTE blocks
    if (block.startsWith("WEBVTT") || block.startsWith("NOTE")) continue

    const lines = block.split("\n").filter((line) => line.trim())
    if (lines.length < 1) continue

    // Find the timestamp line (could be first or second line)
    let timestampLineIndex = 0
    let timestampMatch = lines[0].match(
      /(\d{2}:\d{2}:\d{2}[,.]?\d{0,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]?\d{0,3})/
    )

    // If first line doesn't have timestamp, it might be an optional cue identifier
    if (!timestampMatch && lines.length > 1) {
      timestampLineIndex = 1
      timestampMatch = lines[1].match(
        /(\d{2}:\d{2}:\d{2}[,.]?\d{0,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]?\d{0,3})/
      )
    }

    if (!timestampMatch) continue

    const startTime = parseTimestamp(timestampMatch[1])
    const endTime = parseTimestamp(timestampMatch[2])

    // Text is everything after the timestamp line
    const text = lines
      .slice(timestampLineIndex + 1)
      .join("\n")
      .trim()

    if (text) {
      subtitles.push({ id: idCounter++, startTime, endTime, text })
    }
  }

  return subtitles
}

/**
 * Auto-detect and parse subtitle format
 */
export function parseSubtitles(text: string): Subtitle[] {
  const trimmed = text.trim()

  // VTT files start with WEBVTT
  if (trimmed.startsWith("WEBVTT")) {
    return parseVTT(text)
  }

  // Default to SRT
  return parseSRT(text)
}
