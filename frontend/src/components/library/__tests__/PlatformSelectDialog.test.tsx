/**
 * PlatformSelectDialog Component Tests
 * Story 29.3: Book Preview and Download Actions
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PlatformSelectDialog } from "../PlatformSelectDialog"

// Mock booksApi
vi.mock("@/services/booksApi", () => ({
  booksApi: {
    requestBookBundle: vi.fn(),
  },
}))

import { booksApi } from "@/services/booksApi"

describe("PlatformSelectDialog", () => {
  const mockOnClose = vi.fn()

  const defaultProps = {
    bookId: 123,
    bookTitle: "Test Book",
    isOpen: true,
    onClose: mockOnClose,
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders dialog with book title", () => {
    render(<PlatformSelectDialog {...defaultProps} />)

    expect(screen.getByText("Download Book")).toBeInTheDocument()
    expect(screen.getByText(/Test Book/)).toBeInTheDocument()
  })

  it("renders all platform options", () => {
    render(<PlatformSelectDialog {...defaultProps} />)

    expect(screen.getByText("macOS")).toBeInTheDocument()
    expect(screen.getByText("Windows")).toBeInTheDocument()
    expect(screen.getByText("Windows 7/8")).toBeInTheDocument()
    expect(screen.getByText("Linux")).toBeInTheDocument()
  })

  it("shows platform descriptions", () => {
    render(<PlatformSelectDialog {...defaultProps} />)

    expect(screen.getByText("For macOS 10.13 or later")).toBeInTheDocument()
    expect(screen.getByText("For Windows 10/11")).toBeInTheDocument()
    expect(screen.getByText("For legacy Windows versions")).toBeInTheDocument()
    expect(screen.getByText("For Linux distributions")).toBeInTheDocument()
  })

  it("calls API when platform is selected", async () => {
    const mockRequestBundle = vi.mocked(booksApi.requestBookBundle)
    mockRequestBundle.mockResolvedValueOnce({
      download_url: "https://example.com/download",
      file_name: "test-bundle.zip",
      file_size: 1000000,
      expires_at: null,
    })

    render(<PlatformSelectDialog {...defaultProps} />)

    const macButton = screen.getByText("macOS").closest("button")
    fireEvent.click(macButton!)

    await waitFor(() => {
      expect(mockRequestBundle).toHaveBeenCalledWith(123, "mac")
    })
  })

  it("shows loading state while requesting bundle", async () => {
    const mockRequestBundle = vi.mocked(booksApi.requestBookBundle)
    // Never resolve to keep loading state
    mockRequestBundle.mockReturnValue(new Promise(() => {}))

    render(<PlatformSelectDialog {...defaultProps} />)

    const macButton = screen.getByText("macOS").closest("button")
    fireEvent.click(macButton!)

    // Buttons should be disabled during loading
    await waitFor(() => {
      const buttons = screen.getAllByRole("button")
      buttons.forEach((button) => {
        if (button.textContent?.includes("macOS") ||
            button.textContent?.includes("Windows") ||
            button.textContent?.includes("Linux")) {
          expect(button).toBeDisabled()
        }
      })
    })
  })

  it("shows error message on API failure", async () => {
    const mockRequestBundle = vi.mocked(booksApi.requestBookBundle)
    mockRequestBundle.mockRejectedValueOnce(new Error("Network error"))

    render(<PlatformSelectDialog {...defaultProps} />)

    const macButton = screen.getByText("macOS").closest("button")
    fireEvent.click(macButton!)

    await waitFor(() => {
      expect(screen.getByText(/Failed to generate download link/)).toBeInTheDocument()
    })
  })

  it("shows retry button on error", async () => {
    const mockRequestBundle = vi.mocked(booksApi.requestBookBundle)
    mockRequestBundle.mockRejectedValueOnce(new Error("Network error"))

    render(<PlatformSelectDialog {...defaultProps} />)

    const macButton = screen.getByText("macOS").closest("button")
    fireEvent.click(macButton!)

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument()
    })
  })

  it("does not render when isOpen is false", () => {
    render(<PlatformSelectDialog {...defaultProps} isOpen={false} />)

    expect(screen.queryByText("Download Book")).not.toBeInTheDocument()
  })

  it("shows helper text about automatic download", () => {
    render(<PlatformSelectDialog {...defaultProps} />)

    expect(
      screen.getByText(/download will start automatically/)
    ).toBeInTheDocument()
  })
})
