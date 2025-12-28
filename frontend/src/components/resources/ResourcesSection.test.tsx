/**
 * ResourcesSection Component Tests
 * Story 21.2: Conditional Resources Section
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as booksApi from "@/services/booksApi"
import { ResourcesSection } from "./ResourcesSection"

// Mock VideoPreviewModal to avoid complex dependencies
vi.mock("@/components/ActivityPlayers/VideoPreviewModal", () => ({
  VideoPreviewModal: () => <div data-testid="video-preview-modal" />,
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("ResourcesSection", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when no resources or videos (AC 1-2)", async () => {
    vi.spyOn(booksApi, "getBookVideos").mockResolvedValue({
      book_id: "123",
      videos: [],
      total_count: 0,
    })

    const { container } = render(<ResourcesSection bookId="123" />, {
      wrapper: createWrapper(),
    })

    // Wait for loading to complete
    await waitFor(() => {
      expect(booksApi.getBookVideos).toHaveBeenCalledWith("123")
    })

    // Component should render nothing
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it("renders when book has videos (AC 3)", async () => {
    vi.spyOn(booksApi, "getBookVideos").mockResolvedValue({
      book_id: "123",
      videos: [
        {
          path: "video/test.mp4",
          name: "Test Video",
          size_bytes: 1024,
          has_subtitles: false,
        },
      ],
      total_count: 1,
    })

    render(<ResourcesSection bookId="123" />, {
      wrapper: createWrapper(),
    })

    // Should show section header
    await waitFor(() => {
      expect(screen.getByText("Resources & Videos")).toBeInTheDocument()
    })

    // Should show video
    expect(screen.getByText("Test Video")).toBeInTheDocument()
  })

  it("renders multiple videos correctly (AC 3)", async () => {
    vi.spyOn(booksApi, "getBookVideos").mockResolvedValue({
      book_id: "123",
      videos: [
        {
          path: "video/1.mp4",
          name: "Video 1",
          size_bytes: 1024,
          has_subtitles: true,
        },
        {
          path: "video/2.mp4",
          name: "Video 2",
          size_bytes: 2048,
          has_subtitles: false,
        },
      ],
      total_count: 2,
    })

    render(<ResourcesSection bookId="123" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByText("Video 1")).toBeInTheDocument()
      expect(screen.getByText("Video 2")).toBeInTheDocument()
      expect(screen.getByText("Videos (2)")).toBeInTheDocument()
    })
  })

  it("shows skeleton while loading (AC 9-10)", () => {
    vi.spyOn(booksApi, "getBookVideos").mockReturnValue(
      new Promise(() => {}), // Never resolves
    )

    render(<ResourcesSection bookId="123" />, {
      wrapper: createWrapper(),
    })

    // Should show skeleton
    expect(screen.getByTestId("resources-skeleton")).toBeInTheDocument()
    expect(screen.getByLabelText("Loading resources")).toBeInTheDocument()
  })

  it("hides on error (AC 11)", async () => {
    // Mock console.error before it's potentially called
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})

    vi.spyOn(booksApi, "getBookVideos").mockRejectedValue(
      new Error("API Error"),
    )

    const { container } = render(<ResourcesSection bookId="123" />, {
      wrapper: createWrapper(),
    })

    // Wait for query to complete and error to be set
    await waitFor(
      () => {
        expect(container.firstChild).toBeNull()
      },
      { timeout: 3000 },
    )

    // Verify API was called
    expect(booksApi.getBookVideos).toHaveBeenCalledWith("123")

    consoleErrorSpy.mockRestore()
  })

  it("displays subtitle information when available", async () => {
    vi.spyOn(booksApi, "getBookVideos").mockResolvedValue({
      book_id: "123",
      videos: [
        {
          path: "video/test.mp4",
          name: "Test Video with Subs",
          size_bytes: 1024,
          has_subtitles: true,
        },
      ],
      total_count: 1,
    })

    render(<ResourcesSection bookId="123" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByText("Subtitles available")).toBeInTheDocument()
    })
  })

  it("does not query when bookId is undefined", () => {
    const getBookVideosSpy = vi.spyOn(booksApi, "getBookVideos")

    const { container } = render(
      <ResourcesSection bookId={undefined as any} />,
      {
        wrapper: createWrapper(),
      },
    )

    // Should not call API
    expect(getBookVideosSpy).not.toHaveBeenCalled()

    // Should render nothing
    expect(container.firstChild).toBeNull()
  })

  it("supports custom className", async () => {
    vi.spyOn(booksApi, "getBookVideos").mockResolvedValue({
      book_id: "123",
      videos: [
        {
          path: "video/test.mp4",
          name: "Test Video",
          size_bytes: 1024,
          has_subtitles: false,
        },
      ],
      total_count: 1,
    })

    const { container } = render(
      <ResourcesSection bookId="123" className="custom-class" />,
      {
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => {
      expect(screen.getByText("Resources & Videos")).toBeInTheDocument()
    })

    // Check that section has custom class
    const section = container.querySelector("section")
    expect(section).toHaveClass("custom-class")
  })
})
