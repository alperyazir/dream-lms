/**
 * useContentLibrary Hook Tests
 * Story 27.21: Content Library UI - Task 11
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as contentLibraryApi from "@/services/contentLibraryApi"
import { useContentLibrary, useDeleteContent } from "./useContentLibrary"

// Mock the API
vi.mock("@/services/contentLibraryApi")

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useContentLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches content library data", async () => {
    const mockData = {
      items: [
        {
          id: "test-id-1",
          activity_type: "ai_quiz",
          title: "Test Quiz",
          source_type: "book" as const,
          book_id: 123,
          book_title: "Test Book",
          material_id: null,
          material_name: null,
          item_count: 10,
          created_at: "2024-01-15T10:00:00Z",
          updated_at: null,
          used_in_assignments: 2,
          is_shared: true,
          created_by: {
            id: "teacher-id",
            name: "John Doe",
          },
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      has_more: false,
    }

    vi.mocked(contentLibraryApi.listLibraryContent).mockResolvedValue(mockData)

    const { result } = renderHook(() => useContentLibrary(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockData)
    expect(contentLibraryApi.listLibraryContent).toHaveBeenCalledWith(undefined)
  })

  it("fetches content library with filters", async () => {
    const mockData = {
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      has_more: false,
    }

    vi.mocked(contentLibraryApi.listLibraryContent).mockResolvedValue(mockData)

    const filters = {
      type: "ai_quiz",
      source_type: "book" as const,
      page: 1,
      page_size: 20,
    }

    const { result } = renderHook(() => useContentLibrary(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(contentLibraryApi.listLibraryContent).toHaveBeenCalledWith(filters)
  })

  it("handles error when fetching fails", async () => {
    const error = new Error("Failed to fetch")
    vi.mocked(contentLibraryApi.listLibraryContent).mockRejectedValue(error)

    const { result } = renderHook(() => useContentLibrary(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})

describe("useDeleteContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deletes content successfully", async () => {
    const mockResponse = {
      message: "Content deleted successfully",
      content_id: "test-id-1",
    }

    vi.mocked(contentLibraryApi.deleteLibraryContent).mockResolvedValue(
      mockResponse,
    )

    const { result } = renderHook(() => useDeleteContent(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("test-id-1")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(contentLibraryApi.deleteLibraryContent).toHaveBeenCalledWith(
      "test-id-1",
    )
    expect(result.current.data).toEqual(mockResponse)
  })

  it("handles delete error", async () => {
    const error = new Error("Delete failed")
    vi.mocked(contentLibraryApi.deleteLibraryContent).mockRejectedValue(error)

    const { result } = renderHook(() => useDeleteContent(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("test-id-1")

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})
