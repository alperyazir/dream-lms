import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import * as booksApi from "@/services/booksApi"
import { VideoPicker } from "./VideoPicker"

// Mock ResizeObserver for Radix UI components
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

beforeAll(() => {
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
})

// Mock the booksApi module
vi.mock("@/services/booksApi", () => ({
  getBookVideos: vi.fn(),
}))

const mockVideos = [
  {
    path: "videos/chapter1.mp4",
    name: "chapter1.mp4",
    size_bytes: 1024 * 1024 * 5, // 5 MB
    has_subtitles: true,
  },
  {
    path: "videos/chapter2.mp4",
    name: "chapter2.mp4",
    size_bytes: 1024 * 1024 * 10, // 10 MB
    has_subtitles: false,
  },
  {
    path: "videos/intro.mp4",
    name: "intro.mp4",
    size_bytes: 1024 * 500, // 500 KB
    has_subtitles: true,
  },
]

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe("VideoPicker", () => {
  const defaultProps = {
    bookId: "test-book-id",
    value: null,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading state while fetching videos", () => {
    vi.mocked(booksApi.getBookVideos).mockImplementation(
      () => new Promise(() => {}), // Never resolves - keeps loading
    )

    renderWithProviders(<VideoPicker {...defaultProps} />)

    expect(screen.getByText("Loading videos...")).toBeInTheDocument()
  })

  it("shows error state when fetch fails", async () => {
    vi.mocked(booksApi.getBookVideos).mockRejectedValue(new Error("API Error"))

    renderWithProviders(<VideoPicker {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Failed to load videos")).toBeInTheDocument()
    })
  })

  it("shows empty state when no videos available", async () => {
    vi.mocked(booksApi.getBookVideos).mockResolvedValue({
      book_id: "test-book-id",
      videos: [],
      total_count: 0,
    })

    renderWithProviders(<VideoPicker {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText("No videos available in this book"),
      ).toBeInTheDocument()
    })
  })

  it("renders select with videos when loaded", async () => {
    vi.mocked(booksApi.getBookVideos).mockResolvedValue({
      book_id: "test-book-id",
      videos: mockVideos,
      total_count: 3,
    })

    renderWithProviders(<VideoPicker {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    })

    expect(screen.getByText("Select a video...")).toBeInTheDocument()
  })

  it("shows selected video name", async () => {
    vi.mocked(booksApi.getBookVideos).mockResolvedValue({
      book_id: "test-book-id",
      videos: mockVideos,
      total_count: 3,
    })

    renderWithProviders(
      <VideoPicker {...defaultProps} value="videos/chapter1.mp4" />,
    )

    await waitFor(() => {
      expect(screen.getByText("chapter1.mp4")).toBeInTheDocument()
    })
  })

  it("shows preview button when video is selected and onPreview is provided", async () => {
    const onPreview = vi.fn()
    vi.mocked(booksApi.getBookVideos).mockResolvedValue({
      book_id: "test-book-id",
      videos: mockVideos,
      total_count: 3,
    })

    renderWithProviders(
      <VideoPicker
        {...defaultProps}
        value="videos/chapter1.mp4"
        onPreview={onPreview}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /preview video/i }),
      ).toBeInTheDocument()
    })
  })

  it("calls onPreview when preview button is clicked", async () => {
    const onPreview = vi.fn()
    vi.mocked(booksApi.getBookVideos).mockResolvedValue({
      book_id: "test-book-id",
      videos: mockVideos,
      total_count: 3,
    })

    renderWithProviders(
      <VideoPicker
        {...defaultProps}
        value="videos/chapter1.mp4"
        onPreview={onPreview}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /preview video/i }),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /preview video/i }))

    expect(onPreview).toHaveBeenCalledWith(mockVideos[0])
  })

  it("shows clear button when video is selected", async () => {
    vi.mocked(booksApi.getBookVideos).mockResolvedValue({
      book_id: "test-book-id",
      videos: mockVideos,
      total_count: 3,
    })

    renderWithProviders(
      <VideoPicker {...defaultProps} value="videos/chapter1.mp4" />,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /clear video selection/i }),
      ).toBeInTheDocument()
    })
  })

  it("calls onChange with null when clear button is clicked", async () => {
    const onChange = vi.fn()
    vi.mocked(booksApi.getBookVideos).mockResolvedValue({
      book_id: "test-book-id",
      videos: mockVideos,
      total_count: 3,
    })

    renderWithProviders(
      <VideoPicker
        {...defaultProps}
        value="videos/chapter1.mp4"
        onChange={onChange}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /clear video selection/i }),
      ).toBeInTheDocument()
    })

    fireEvent.click(
      screen.getByRole("button", { name: /clear video selection/i }),
    )

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it("applies custom className", async () => {
    vi.mocked(booksApi.getBookVideos).mockResolvedValue({
      book_id: "test-book-id",
      videos: mockVideos,
      total_count: 3,
    })

    const { container } = renderWithProviders(
      <VideoPicker {...defaultProps} className="custom-class" />,
    )

    await waitFor(() => {
      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  it("respects disabled state", async () => {
    vi.mocked(booksApi.getBookVideos).mockResolvedValue({
      book_id: "test-book-id",
      videos: mockVideos,
      total_count: 3,
    })

    renderWithProviders(<VideoPicker {...defaultProps} disabled={true} />)

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeDisabled()
    })
  })

  it("uses custom placeholder text", async () => {
    vi.mocked(booksApi.getBookVideos).mockResolvedValue({
      book_id: "test-book-id",
      videos: mockVideos,
      total_count: 3,
    })

    renderWithProviders(
      <VideoPicker {...defaultProps} placeholder="Choose a video..." />,
    )

    await waitFor(() => {
      expect(screen.getByText("Choose a video...")).toBeInTheDocument()
    })
  })
})
