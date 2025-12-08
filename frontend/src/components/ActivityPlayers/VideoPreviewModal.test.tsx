import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { VideoPreviewModal } from "./VideoPreviewModal"
import type { VideoInfo } from "@/services/booksApi"

// Mock ResizeObserver for Radix UI components
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

beforeAll(() => {
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
})

// Mock the VideoPlayer component
vi.mock("./VideoPlayer", () => ({
  VideoPlayer: vi.fn(({ src, subtitleSrc }) => (
    <div data-testid="mock-video-player" data-src={src} data-subtitle={subtitleSrc}>
      Mock VideoPlayer
    </div>
  )),
}))

const mockVideo: VideoInfo = {
  path: "videos/chapter1.mp4",
  name: "chapter1.mp4",
  size_bytes: 1024 * 1024 * 5, // 5 MB
  has_subtitles: true,
}

const mockVideoNoSubtitles: VideoInfo = {
  path: "videos/chapter2.mp4",
  name: "chapter2.mp4",
  size_bytes: 1024 * 1024 * 10, // 10 MB
  has_subtitles: false,
}

describe("VideoPreviewModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    video: mockVideo,
    bookId: "test-book-id",
  }

  it("renders nothing when video is null", () => {
    const { container } = render(
      <VideoPreviewModal {...defaultProps} video={null} />
    )
    // Dialog should still render but with empty content
    expect(container).toBeEmptyDOMElement()
  })

  it("renders the dialog when open with video", () => {
    render(<VideoPreviewModal {...defaultProps} />)

    expect(screen.getByText("Preview Video")).toBeInTheDocument()
    expect(screen.getByText("chapter1.mp4")).toBeInTheDocument()
    expect(screen.getByText("(5.0 MB)")).toBeInTheDocument()
  })

  it("shows subtitles indicator when video has subtitles", () => {
    render(<VideoPreviewModal {...defaultProps} />)

    expect(screen.getByText("Subtitles")).toBeInTheDocument()
  })

  it("does not show subtitles indicator when video has no subtitles", () => {
    render(<VideoPreviewModal {...defaultProps} video={mockVideoNoSubtitles} />)

    expect(screen.queryByText("Subtitles")).not.toBeInTheDocument()
  })

  it("renders the VideoPlayer with correct src", () => {
    render(<VideoPreviewModal {...defaultProps} />)

    const player = screen.getByTestId("mock-video-player")
    expect(player).toHaveAttribute(
      "data-src",
      "/api/v1/books/test-book-id/media/videos/chapter1.mp4"
    )
  })

  it("renders the VideoPlayer with subtitle src when available", () => {
    render(<VideoPreviewModal {...defaultProps} />)

    const player = screen.getByTestId("mock-video-player")
    expect(player).toHaveAttribute(
      "data-subtitle",
      "/api/v1/books/test-book-id/media/videos/chapter1.srt"
    )
  })

  it("renders Cancel button", () => {
    render(<VideoPreviewModal {...defaultProps} />)

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
  })

  it("renders Attach button when onAttach is provided", () => {
    const onAttach = vi.fn()
    render(<VideoPreviewModal {...defaultProps} onAttach={onAttach} />)

    expect(
      screen.getByRole("button", { name: /attach this video/i })
    ).toBeInTheDocument()
  })

  it("does not render Attach button when showAttachButton is false", () => {
    const onAttach = vi.fn()
    render(
      <VideoPreviewModal
        {...defaultProps}
        onAttach={onAttach}
        showAttachButton={false}
      />
    )

    expect(
      screen.queryByRole("button", { name: /attach this video/i })
    ).not.toBeInTheDocument()
  })

  it("calls onOpenChange with false when Cancel is clicked", () => {
    const onOpenChange = vi.fn()
    render(<VideoPreviewModal {...defaultProps} onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("calls onAttach with video and closes when Attach is clicked", () => {
    const onAttach = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <VideoPreviewModal
        {...defaultProps}
        onAttach={onAttach}
        onOpenChange={onOpenChange}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /attach this video/i }))

    expect(onAttach).toHaveBeenCalledWith(mockVideo)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("uses custom attach button label", () => {
    const onAttach = vi.fn()
    render(
      <VideoPreviewModal
        {...defaultProps}
        onAttach={onAttach}
        attachButtonLabel="Select Video"
      />
    )

    expect(
      screen.getByRole("button", { name: /select video/i })
    ).toBeInTheDocument()
  })

  it("uses provided videoSrc instead of constructing it", () => {
    render(
      <VideoPreviewModal
        {...defaultProps}
        videoSrc="https://custom.url/video.mp4"
      />
    )

    const player = screen.getByTestId("mock-video-player")
    expect(player).toHaveAttribute("data-src", "https://custom.url/video.mp4")
  })

  it("uses provided subtitleSrc instead of constructing it", () => {
    render(
      <VideoPreviewModal
        {...defaultProps}
        subtitleSrc="https://custom.url/subtitles.srt"
      />
    )

    const player = screen.getByTestId("mock-video-player")
    expect(player).toHaveAttribute(
      "data-subtitle",
      "https://custom.url/subtitles.srt"
    )
  })
})
