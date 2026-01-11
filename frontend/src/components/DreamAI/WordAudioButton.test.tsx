/**
 * Word Audio Button Component Tests
 * Story 27.18: Vocabulary Explorer with Audio Player
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import axios from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { WordAudioButton } from "./WordAudioButton"

// Mock axios
vi.mock("axios")

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock OpenAPI
vi.mock("@/client", () => ({
  OpenAPI: {
    BASE: "http://localhost:8081",
    TOKEN: "test-token",
  },
}))

describe("WordAudioButton", () => {
  const mockBlobData = new Blob(["audio-data"], { type: "audio/mpeg" })

  beforeEach(() => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:test-url")
    global.URL.revokeObjectURL = vi.fn()

    // Mock Audio API with proper constructor
    global.Audio = vi.fn(function (this: any, src: string) {
      this.src = src
      this.play = vi.fn().mockResolvedValue(undefined)
      this.pause = vi.fn()
      this.addEventListener = vi.fn()
      this.removeEventListener = vi.fn()
      this.onended = null
      this.onerror = null
    }) as any

    // Mock axios response
    vi.mocked(axios.get).mockResolvedValue({
      data: mockBlobData,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders audio button", () => {
    render(<WordAudioButton bookId={1} wordId="word_1" word="hello" />)
    const button = screen.getByRole("button", {
      name: /play pronunciation of hello/i,
    })
    expect(button).toBeInTheDocument()
  })

  it("shows loading state when fetching audio", async () => {
    // Make the API call slow
    vi.mocked(axios.get).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: mockBlobData,
              }),
            100,
          ),
        ),
    )

    render(<WordAudioButton bookId={1} wordId="word_1" word="hello" />)
    const button = screen.getByRole("button")

    fireEvent.click(button)

    // Should show loading spinner
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })

  it("calls axios with correct URL and auth header when clicked", async () => {
    render(
      <WordAudioButton bookId={1} wordId="word_1" word="hello" language="en" />,
    )
    const button = screen.getByRole("button")

    fireEvent.click(button)

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "http://localhost:8081/api/v1/ai/audio/vocabulary/1/en/word_1",
        {
          responseType: "blob",
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      )
    })
  })

  it("creates blob URL and Audio element", async () => {
    render(<WordAudioButton bookId={1} wordId="word_1" word="hello" />)
    const button = screen.getByRole("button")

    fireEvent.click(button)

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(global.Audio).toHaveBeenCalledWith("blob:test-url")
    })
  })

  it("uses default language 'en' when not specified", async () => {
    render(<WordAudioButton bookId={1} wordId="word_1" word="hello" />)
    const button = screen.getByRole("button")

    fireEvent.click(button)

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/en/word_1"),
        expect.any(Object),
      )
    })
  })

  it("uses wordId in URL, not word text", async () => {
    render(<WordAudioButton bookId={31} wordId="word_42" word="absent" />)
    const button = screen.getByRole("button")

    fireEvent.click(button)

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "http://localhost:8081/api/v1/ai/audio/vocabulary/31/en/word_42",
        expect.any(Object),
      )
    })
  })
})
