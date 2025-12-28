/**
 * useBookResources Hook Tests
 * Story 21.2: Conditional Resources Section
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as booksApi from "@/services/booksApi"
import { useBookResources } from "./useBookResources"

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

describe("useBookResources", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty arrays and false flags when no resources", async () => {
    vi.spyOn(booksApi, "getBookVideos").mockResolvedValue({
      book_id: "123",
      videos: [],
      total_count: 0,
    })

    const { result } = renderHook(() => useBookResources("123"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.videos).toEqual([])
    expect(result.current.hasVideos).toBe(false)
    expect(result.current.hasAnyContent).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it("returns videos and true flags when videos exist", async () => {
    const mockVideos = [
      {
        path: "video/1.mp4",
        name: "Video 1",
        size_bytes: 1024,
        has_subtitles: false,
      },
      {
        path: "video/2.mp4",
        name: "Video 2",
        size_bytes: 2048,
        has_subtitles: true,
      },
    ]

    vi.spyOn(booksApi, "getBookVideos").mockResolvedValue({
      book_id: "123",
      videos: mockVideos,
      total_count: 2,
    })

    const { result } = renderHook(() => useBookResources("123"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.videos).toEqual(mockVideos)
    expect(result.current.hasVideos).toBe(true)
    expect(result.current.hasAnyContent).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it("handles loading state correctly", () => {
    vi.spyOn(booksApi, "getBookVideos").mockReturnValue(
      new Promise(() => {}), // Never resolves
    )

    const { result } = renderHook(() => useBookResources("123"), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.videos).toEqual([])
    expect(result.current.hasVideos).toBe(false)
    expect(result.current.hasAnyContent).toBe(false)
  })

  it("handles errors correctly", async () => {
    const error = new Error("API Error")
    vi.spyOn(booksApi, "getBookVideos").mockRejectedValue(error)

    const { result } = renderHook(() => useBookResources("123"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.videos).toEqual([])
    expect(result.current.hasVideos).toBe(false)
    expect(result.current.hasAnyContent).toBe(false)
  })

  it("does not fetch when bookId is undefined", () => {
    const getBookVideosSpy = vi.spyOn(booksApi, "getBookVideos")

    const { result } = renderHook(() => useBookResources(undefined), {
      wrapper: createWrapper(),
    })

    expect(getBookVideosSpy).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.videos).toEqual([])
  })

  it("works with numeric bookId", async () => {
    vi.spyOn(booksApi, "getBookVideos").mockResolvedValue({
      book_id: "456",
      videos: [
        {
          path: "video/test.mp4",
          name: "Test",
          size_bytes: 1024,
          has_subtitles: false,
        },
      ],
      total_count: 1,
    })

    const { result } = renderHook(() => useBookResources(456), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasVideos).toBe(true)
    expect(booksApi.getBookVideos).toHaveBeenCalledWith(456)
  })
})
