import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import axios from "axios"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMaterialDownload } from "./useMaterialDownload"

// Mock dependencies
const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()

vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}))

vi.mock("axios")

// Create wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock DOM APIs
const mockCreateElement = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockClick = vi.fn()
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Setup DOM mocks
  const mockLink = {
    href: "",
    download: "",
    style: { display: "" },
    click: mockClick,
  }

  mockCreateElement.mockReturnValue(mockLink)
  document.createElement = mockCreateElement
  document.body.appendChild = mockAppendChild
  document.body.removeChild = mockRemoveChild
  window.URL.createObjectURL =
    mockCreateObjectURL.mockReturnValue("blob:mock-url")
  window.URL.revokeObjectURL = mockRevokeObjectURL

  // Setup axios mocks
  const mockAxiosInstance = {
    get: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((_callback) => {
          // Store the callback for later if needed
          return 0
        }),
      },
    },
  }
  vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)
})

describe("useMaterialDownload", () => {
  it("downloads file successfully", async () => {
    const mockBlob = new Blob(["test content"], { type: "application/pdf" })
    const mockGet = vi.fn().mockResolvedValue({
      data: mockBlob,
    })

    const mockAxiosInstance = {
      get: mockGet,
      interceptors: {
        request: {
          use: vi.fn(),
        },
      },
    }
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

    const { result } = renderHook(() => useMaterialDownload(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isDownloading).toBe(false)

    await act(async () => {
      await result.current.downloadMaterial("test-id-123", "test.pdf")
    })

    // Verify API call
    expect(mockGet).toHaveBeenCalledWith(
      "/api/v1/teachers/materials/test-id-123/download",
      expect.objectContaining({
        responseType: "blob",
      }),
    )

    // Verify download process
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(mockCreateElement).toHaveBeenCalledWith("a")
    expect(mockAppendChild).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRemoveChild).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url")

    // Verify success state
    await waitFor(() => {
      expect(result.current.isDownloading).toBe(false)
      expect(result.current.progress).toBe(100)
      expect(result.current.error).toBe(null)
    })

    expect(mockShowSuccessToast).toHaveBeenCalledWith("Downloaded test.pdf")
  })

  it("handles download error", async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error("Download failed"))

    const mockAxiosInstance = {
      get: mockGet,
      interceptors: {
        request: {
          use: vi.fn(),
        },
      },
    }
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

    const { result } = renderHook(() => useMaterialDownload(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.downloadMaterial("test-id-123", "test.pdf")
      } catch (_err) {
        // Expected to throw
      }
    })

    // Verify error state
    await waitFor(() => {
      expect(result.current.isDownloading).toBe(false)
      expect(result.current.error).toBe("Download failed")
      expect(result.current.progress).toBe(null)
    })

    expect(mockShowErrorToast).toHaveBeenCalledWith("Download failed")
  })

  it("handles network error", async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error("Network error"))

    const mockAxiosInstance = {
      get: mockGet,
      interceptors: {
        request: {
          use: vi.fn(),
        },
      },
    }
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

    const { result } = renderHook(() => useMaterialDownload(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.downloadMaterial("test-id-123", "test.pdf")
      } catch (_err) {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.isDownloading).toBe(false)
      expect(result.current.error).toBe("Network error")
    })

    expect(mockShowErrorToast).toHaveBeenCalledWith("Network error")
  })

  it("resets state correctly", () => {
    const { result } = renderHook(() => useMaterialDownload(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.resetState()
    })

    expect(result.current.isDownloading).toBe(false)
    expect(result.current.progress).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it("sets downloading state during download", async () => {
    const mockBlob = new Blob(["test"], { type: "application/pdf" })

    // Create a promise that we can control
    let resolveDownload: (value: unknown) => void
    const downloadPromise = new Promise((resolve) => {
      resolveDownload = resolve
    })

    const mockGet = vi.fn().mockReturnValue(downloadPromise)
    const mockAxiosInstance = {
      get: mockGet,
      interceptors: {
        request: {
          use: vi.fn(),
        },
      },
    }
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

    const { result } = renderHook(() => useMaterialDownload(), {
      wrapper: createWrapper(),
    })

    // Start download
    act(() => {
      result.current.downloadMaterial("test-id-123", "test.pdf")
    })

    // Should be downloading
    await waitFor(() => {
      expect(result.current.isDownloading).toBe(true)
      expect(result.current.progress).toBe(0)
    })

    // Complete download
    await act(async () => {
      resolveDownload!({
        data: mockBlob,
      })
    })

    // Should be done
    await waitFor(() => {
      expect(result.current.isDownloading).toBe(false)
    })
  })

  it("uses correct filename for download", async () => {
    const mockBlob = new Blob(["test"], { type: "application/pdf" })
    const mockGet = vi.fn().mockResolvedValue({
      data: mockBlob,
    })

    const mockAxiosInstance = {
      get: mockGet,
      interceptors: {
        request: {
          use: vi.fn(),
        },
      },
    }
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

    const mockLink = {
      href: "",
      download: "",
      style: { display: "" },
      click: mockClick,
    }
    mockCreateElement.mockReturnValue(mockLink)

    const { result } = renderHook(() => useMaterialDownload(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.downloadMaterial("test-id-123", "my-document.pdf")
    })

    expect(mockLink.download).toBe("my-document.pdf")
  })
})
