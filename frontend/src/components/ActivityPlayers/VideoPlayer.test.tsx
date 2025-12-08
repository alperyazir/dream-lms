import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { VideoPlayer } from "./VideoPlayer"

// Mock ResizeObserver for Radix UI components
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

beforeAll(() => {
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
})

// Mock the videoUtils module
vi.mock("@/lib/videoUtils", () => ({
  parseSRT: vi.fn(() => [
    { id: 1, startTime: 0, endTime: 5, text: "Test subtitle" },
  ]),
  getCurrentSubtitle: vi.fn(() => null),
}))

// Mock HTMLVideoElement methods
const mockPlay = vi.fn(() => Promise.resolve())
const mockPause = vi.fn()
const mockLoad = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Mock video element
  Object.defineProperty(HTMLVideoElement.prototype, "play", {
    configurable: true,
    value: mockPlay,
  })
  Object.defineProperty(HTMLVideoElement.prototype, "pause", {
    configurable: true,
    value: mockPause,
  })
  Object.defineProperty(HTMLVideoElement.prototype, "load", {
    configurable: true,
    value: mockLoad,
  })
  Object.defineProperty(HTMLVideoElement.prototype, "duration", {
    configurable: true,
    get: () => 120,
  })
  Object.defineProperty(HTMLVideoElement.prototype, "currentTime", {
    configurable: true,
    get: () => 30,
    set: vi.fn(),
  })
  Object.defineProperty(HTMLVideoElement.prototype, "volume", {
    configurable: true,
    get: () => 1,
    set: vi.fn(),
  })
  Object.defineProperty(HTMLVideoElement.prototype, "muted", {
    configurable: true,
    get: () => false,
    set: vi.fn(),
  })
  Object.defineProperty(HTMLVideoElement.prototype, "paused", {
    configurable: true,
    get: () => true,
  })
  Object.defineProperty(HTMLVideoElement.prototype, "playbackRate", {
    configurable: true,
    get: () => 1,
    set: vi.fn(),
  })

  // Mock fetch for subtitles
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(`1
00:00:00,000 --> 00:00:05,000
Test subtitle`),
    } as Response)
  )

  // Mock document.fullscreenElement
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => null,
  })
})

describe("VideoPlayer", () => {
  const defaultProps = {
    src: "http://localhost:8081/api/v1/books/123/media/videos/test.mp4",
    title: "Test Video",
  }

  it("renders video element with correct source", () => {
    render(<VideoPlayer {...defaultProps} />)

    const video = document.querySelector("video")
    expect(video).toBeInTheDocument()
    // Video uses src directly on the video element
    expect(video?.getAttribute("src")).toBe(defaultProps.src)
  })

  it("renders the video player container with aria-label", () => {
    render(<VideoPlayer {...defaultProps} />)

    const container = screen.getByRole("region", { name: "Video player" })
    expect(container).toBeInTheDocument()
  })

  it("renders play/loading button initially", () => {
    render(<VideoPlayer {...defaultProps} />)

    // Initial state shows loading since video metadata hasn't loaded
    const button = screen.getByRole("button", { name: /loading video/i })
    expect(button).toBeInTheDocument()
  })

  it("renders mute button (volume control)", () => {
    render(<VideoPlayer {...defaultProps} />)

    const muteButton = screen.getByRole("button", { name: /mute/i })
    expect(muteButton).toBeInTheDocument()
  })

  it("renders fullscreen button", () => {
    render(<VideoPlayer {...defaultProps} />)

    const fullscreenButton = screen.getByRole("button", {
      name: /fullscreen/i,
    })
    expect(fullscreenButton).toBeInTheDocument()
  })

  it("renders minimize button when onMinimize is provided", () => {
    const onMinimize = vi.fn()
    render(<VideoPlayer {...defaultProps} onMinimize={onMinimize} />)

    const minimizeButton = screen.getByRole("button", {
      name: /minimize video player/i,
    })
    expect(minimizeButton).toBeInTheDocument()
  })

  it("renders playback speed control", () => {
    render(<VideoPlayer {...defaultProps} />)

    const speedButton = screen.getByRole("button", { name: /playback speed/i })
    expect(speedButton).toBeInTheDocument()
  })

  it("shows expand button when collapsed (isExpanded=false)", () => {
    const onExpand = vi.fn()
    render(
      <VideoPlayer {...defaultProps} isExpanded={false} onExpand={onExpand} />
    )

    // In collapsed state, should show expand button
    const expandButton = screen.getByRole("button", {
      name: /expand video player/i,
    })
    expect(expandButton).toBeInTheDocument()
  })

  it("calls onMinimize when minimize button is clicked", () => {
    const onMinimize = vi.fn()
    render(<VideoPlayer {...defaultProps} onMinimize={onMinimize} />)

    const minimizeButton = screen.getByRole("button", {
      name: /minimize video player/i,
    })
    fireEvent.click(minimizeButton)

    expect(onMinimize).toHaveBeenCalled()
  })

  it("renders subtitle toggle when subtitleSrc is provided", async () => {
    render(
      <VideoPlayer
        {...defaultProps}
        subtitleSrc="http://localhost:8081/api/v1/books/123/media/videos/test.srt"
      />
    )

    await waitFor(() => {
      const ccButton = screen.getByRole("button", { name: /subtitles/i })
      expect(ccButton).toBeInTheDocument()
    })
  })

  it("renders custom className", () => {
    const { container } = render(
      <VideoPlayer {...defaultProps} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass("custom-class")
  })

  it("shows loading indicator initially", () => {
    render(<VideoPlayer {...defaultProps} />)

    // Loading spinner is shown via aria-label on the play button
    const loadingButton = screen.getByRole("button", { name: /loading video/i })
    expect(loadingButton).toBeInTheDocument()
  })

  it("renders volume slider container", () => {
    render(<VideoPlayer {...defaultProps} />)

    // The Radix Slider has aria-label on the container, not the thumb
    const volumeContainer = screen.getByLabelText(/volume/i)
    expect(volumeContainer).toBeInTheDocument()
  })

  it("renders video progress slider container", () => {
    render(<VideoPlayer {...defaultProps} />)

    // The Radix Slider has aria-label on the container, not the thumb
    const progressContainer = screen.getByLabelText(/video progress/i)
    expect(progressContainer).toBeInTheDocument()
  })
})

describe("VideoPlayer collapsed state", () => {
  const defaultProps = {
    src: "http://localhost:8081/api/v1/books/123/media/videos/test.mp4",
    title: "Test Video",
  }

  it("calls onExpand when expand button is clicked", () => {
    const onExpand = vi.fn()
    render(
      <VideoPlayer {...defaultProps} isExpanded={false} onExpand={onExpand} />
    )

    const expandButton = screen.getByRole("button", {
      name: /expand video player/i,
    })
    fireEvent.click(expandButton)

    expect(onExpand).toHaveBeenCalled()
  })
})
