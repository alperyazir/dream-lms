/**
 * AudioPlayer Component Tests
 * Story 10.2: Frontend Audio Player Component
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AudioPlayer } from "./AudioPlayer"

// Mock ResizeObserver (required by radix-ui/slider)
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

// Mock HTMLMediaElement methods
const mockPlay = vi.fn().mockResolvedValue(undefined)
const mockPause = vi.fn()
const mockLoad = vi.fn()

beforeEach(() => {
  // Mock ResizeObserver
  vi.stubGlobal("ResizeObserver", MockResizeObserver)

  // Mock the audio element
  vi.stubGlobal(
    "HTMLMediaElement",
    class {
      play = mockPlay
      pause = mockPause
      load = mockLoad
      currentTime = 0
      duration = 120 // 2 minutes
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
  )
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe("AudioPlayer", () => {
  const defaultProps = {
    src: "/api/v1/books/123/media/audio/test.mp3",
  }

  it("renders without crashing", () => {
    render(<AudioPlayer {...defaultProps} />)
    expect(screen.getByRole("region", { name: /audio player/i })).toBeInTheDocument()
  })

  it("renders play button", () => {
    render(<AudioPlayer {...defaultProps} />)
    // Initially shows loader since audio hasn't loaded
    // Use getAllByRole since there are multiple buttons now (play, speed, mute, close)
    const buttons = screen.getAllByRole("button")
    const playButton = buttons.find(
      (btn) => btn.getAttribute("aria-label")?.match(/loading audio|play/i),
    )
    expect(playButton).toBeInTheDocument()
  })

  it("renders time display", () => {
    render(<AudioPlayer {...defaultProps} />)
    // Should show two 0:00 elements (current time and duration)
    const timeElements = screen.getAllByText(/0:00/)
    expect(timeElements.length).toBe(2)
  })

  it("hides when isExpanded is false", () => {
    const { container } = render(<AudioPlayer {...defaultProps} isExpanded={false} />)
    expect(container.firstChild).toBeNull()
  })

  it("shows when isExpanded is true", () => {
    render(<AudioPlayer {...defaultProps} isExpanded={true} />)
    expect(screen.getByRole("region", { name: /audio player/i })).toBeInTheDocument()
  })

  it("renders close button when onClose provided", () => {
    const onClose = vi.fn()
    render(<AudioPlayer {...defaultProps} onClose={onClose} />)
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument()
  })

  it("does not render close button when onClose not provided", () => {
    render(<AudioPlayer {...defaultProps} />)
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument()
  })

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn()
    render(<AudioPlayer {...defaultProps} onClose={onClose} />)

    const closeButton = screen.getByRole("button", { name: /close/i })
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("renders progress slider", () => {
    render(<AudioPlayer {...defaultProps} />)
    // Radix slider puts role="slider" on the thumb
    // Now we have 2 sliders: progress and volume
    const sliders = screen.getAllByRole("slider")
    expect(sliders.length).toBeGreaterThanOrEqual(1)
  })

  it("applies custom className", () => {
    render(<AudioPlayer {...defaultProps} className="custom-class" />)
    const region = screen.getByRole("region", { name: /audio player/i })
    expect(region).toHaveClass("custom-class")
  })
})

describe("AudioPlayer time formatting", () => {
  it("formats time correctly as MM:SS", () => {
    // This tests the formatTime function indirectly through the UI
    render(<AudioPlayer src="/test.mp3" />)
    // Initial state shows 0:00 for both current time and duration
    const timeElements = screen.getAllByText(/0:00/)
    expect(timeElements.length).toBe(2)
  })
})

describe("AudioPlayer accessibility", () => {
  it("has proper aria-labels for all interactive elements", () => {
    const onClose = vi.fn()
    render(<AudioPlayer src="/test.mp3" onClose={onClose} />)

    // Region
    expect(
      screen.getByRole("region", { name: /audio player/i }),
    ).toBeInTheDocument()

    // Play/Pause button (multiple buttons exist, test for at least one play/pause/loading)
    const buttons = screen.getAllByRole("button")
    const playPauseButton = buttons.find((btn) =>
      btn.getAttribute("aria-label")?.match(/loading audio|play|pause/i),
    )
    expect(playPauseButton).toBeInTheDocument()

    // Progress slider (multiple sliders: progress and volume)
    const sliders = screen.getAllByRole("slider")
    expect(sliders.length).toBeGreaterThanOrEqual(1)

    // Close button
    expect(
      screen.getByRole("button", { name: /close audio player/i }),
    ).toBeInTheDocument()

    // Speed control button
    const speedButton = buttons.find(
      (btn) => btn.getAttribute("aria-label") === "Playback speed",
    )
    expect(speedButton).toBeInTheDocument()

    // Mute button
    const muteButton = buttons.find((btn) =>
      btn.getAttribute("aria-label")?.match(/mute|unmute/i),
    )
    expect(muteButton).toBeInTheDocument()
  })
})
