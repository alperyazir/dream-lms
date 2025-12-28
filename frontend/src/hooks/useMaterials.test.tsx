/**
 * Tests for useMaterials hooks
 * Story 13.2: Frontend My Materials Management
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as materialsApi from "@/services/materialsApi"
import type {
  Material,
  MaterialListResponse,
  StorageQuota,
  UploadResponse,
} from "@/types/material"
import {
  useCreateTextNote,
  useCreateUrlLink,
  useDeleteMaterial,
  useMaterial,
  useMaterials,
  useMaterialsPage,
  useRenameMaterial,
  useStorageQuota,
  useUploadMaterial,
} from "./useMaterials"

// Mock the API
vi.mock("@/services/materialsApi", () => ({
  listMaterials: vi.fn(),
  getMaterial: vi.fn(),
  getStorageQuota: vi.fn(),
  uploadFile: vi.fn(),
  createTextNote: vi.fn(),
  createUrlLink: vi.fn(),
  updateMaterial: vi.fn(),
  deleteMaterial: vi.fn(),
}))

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data
const mockMaterial: Material = {
  id: "mat-1",
  name: "Test Document.pdf",
  type: "document",
  file_size: 1024000,
  mime_type: "application/pdf",
  original_filename: "Test Document.pdf",
  url: null,
  text_content: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  download_url: "/api/v1/teachers/materials/mat-1/download",
}

const mockQuota: StorageQuota = {
  used_bytes: 1024000,
  quota_bytes: 524288000, // 500MB
  used_percentage: 0.2,
  is_warning: false,
  is_full: false,
}

const mockListResponse: MaterialListResponse = {
  materials: [mockMaterial],
  total_count: 1,
  quota: mockQuota,
}

describe("useMaterials hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch materials list", async () => {
    vi.mocked(materialsApi.listMaterials).mockResolvedValue(mockListResponse)

    const { result } = renderHook(() => useMaterials(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data?.materials).toHaveLength(1)
    expect(result.current.data?.materials[0].name).toBe("Test Document.pdf")
    expect(materialsApi.listMaterials).toHaveBeenCalledTimes(1)
  })

  it("should fetch materials with type filter", async () => {
    vi.mocked(materialsApi.listMaterials).mockResolvedValue(mockListResponse)

    const { result } = renderHook(() => useMaterials({ type: "document" }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(materialsApi.listMaterials).toHaveBeenCalledWith({
      type: "document",
    })
  })
})

describe("useMaterial hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch a single material", async () => {
    vi.mocked(materialsApi.getMaterial).mockResolvedValue(mockMaterial)

    const { result } = renderHook(() => useMaterial("mat-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data?.name).toBe("Test Document.pdf")
    expect(materialsApi.getMaterial).toHaveBeenCalledWith("mat-1")
  })

  it("should not fetch when materialId is null", async () => {
    const { result } = renderHook(() => useMaterial(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(materialsApi.getMaterial).not.toHaveBeenCalled()
  })
})

describe("useStorageQuota hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch storage quota", async () => {
    vi.mocked(materialsApi.getStorageQuota).mockResolvedValue(mockQuota)

    const { result } = renderHook(() => useStorageQuota(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data?.used_bytes).toBe(1024000)
    expect(result.current.data?.is_warning).toBe(false)
  })
})

describe("useUploadMaterial hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should upload a file", async () => {
    const mockUploadResponse: UploadResponse = {
      material: mockMaterial,
      quota: mockQuota,
    }
    vi.mocked(materialsApi.uploadFile).mockResolvedValue(mockUploadResponse)

    const { result } = renderHook(() => useUploadMaterial(), {
      wrapper: createWrapper(),
    })

    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    })

    result.current.mutate({ file })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(materialsApi.uploadFile).toHaveBeenCalled()
  })
})

describe("useCreateTextNote hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should create a text note", async () => {
    const mockNote: Material = {
      ...mockMaterial,
      id: "note-1",
      name: "Test Note",
      type: "text_note",
      text_content: "Note content",
      file_size: null,
    }
    vi.mocked(materialsApi.createTextNote).mockResolvedValue(mockNote)

    const { result } = renderHook(() => useCreateTextNote(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ name: "Test Note", content: "Note content" })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(materialsApi.createTextNote).toHaveBeenCalledWith({
      name: "Test Note",
      content: "Note content",
    })
  })
})

describe("useCreateUrlLink hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should create a URL link", async () => {
    const mockLink: Material = {
      ...mockMaterial,
      id: "url-1",
      name: "Test Link",
      type: "url",
      url: "https://example.com",
      file_size: null,
    }
    vi.mocked(materialsApi.createUrlLink).mockResolvedValue(mockLink)

    const { result } = renderHook(() => useCreateUrlLink(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ name: "Test Link", url: "https://example.com" })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(materialsApi.createUrlLink).toHaveBeenCalledWith({
      name: "Test Link",
      url: "https://example.com",
    })
  })
})

describe("useRenameMaterial hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should rename a material", async () => {
    const renamedMaterial: Material = {
      ...mockMaterial,
      name: "Renamed Document.pdf",
    }
    vi.mocked(materialsApi.updateMaterial).mockResolvedValue(renamedMaterial)

    const { result } = renderHook(() => useRenameMaterial(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ materialId: "mat-1", name: "Renamed Document.pdf" })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(materialsApi.updateMaterial).toHaveBeenCalledWith("mat-1", {
      name: "Renamed Document.pdf",
    })
  })
})

describe("useDeleteMaterial hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should delete a material", async () => {
    vi.mocked(materialsApi.deleteMaterial).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteMaterial(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("mat-1")

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(materialsApi.deleteMaterial).toHaveBeenCalledWith("mat-1")
  })
})

describe("useMaterialsPage hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return materials data and actions", async () => {
    vi.mocked(materialsApi.listMaterials).mockResolvedValue(mockListResponse)

    const { result } = renderHook(() => useMaterialsPage(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.materials).toHaveLength(1)
    expect(result.current.quota).toEqual(mockQuota)
    expect(result.current.totalCount).toBe(1)
    expect(typeof result.current.uploadFile).toBe("function")
    expect(typeof result.current.createTextNote).toBe("function")
    expect(typeof result.current.createUrlLink).toBe("function")
    expect(typeof result.current.renameMaterial).toBe("function")
    expect(typeof result.current.deleteMaterial).toBe("function")
  })
})
