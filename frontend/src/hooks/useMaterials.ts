/**
 * Custom hooks for teacher materials management
 * Story 13.2: Frontend My Materials Management
 *
 * Uses TanStack Query for data fetching and mutations.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createTextNote,
  createUrlLink,
  deleteMaterial,
  getMaterial,
  getStorageQuota,
  listMaterials,
  updateMaterial,
  updateTextNote,
  uploadFile,
} from "@/services/materialsApi"
import type {
  Material,
  MaterialType,
  TextNoteCreate,
  TextNoteUpdate,
  UrlLinkCreate,
} from "@/types/material"

/**
 * Query keys
 */
export const MATERIALS_KEY = ["teacher-materials"] as const
export const QUOTA_KEY = ["teacher-quota"] as const

/**
 * Hook for listing materials with optional filtering
 */
export function useMaterials(params?: {
  type?: MaterialType
  skip?: number
  limit?: number
}) {
  return useQuery({
    queryKey: [...MATERIALS_KEY, params],
    queryFn: () => listMaterials(params),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook for getting a single material
 */
export function useMaterial(materialId: string | null) {
  return useQuery({
    queryKey: [...MATERIALS_KEY, materialId],
    queryFn: () => getMaterial(materialId!),
    enabled: !!materialId,
  })
}

/**
 * Hook for getting storage quota
 */
export function useStorageQuota() {
  return useQuery({
    queryKey: QUOTA_KEY,
    queryFn: () => getStorageQuota(),
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook for uploading a file
 */
export function useUploadMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File
      onProgress?: (progress: number) => void
    }) => uploadFile(file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_KEY })
      queryClient.invalidateQueries({ queryKey: QUOTA_KEY })
    },
  })
}

/**
 * Hook for creating a text note
 */
export function useCreateTextNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TextNoteCreate) => createTextNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_KEY })
    },
  })
}

/**
 * Hook for updating a text note
 */
export function useUpdateTextNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      materialId,
      data,
    }: {
      materialId: string
      data: TextNoteUpdate
    }) => updateTextNote(materialId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_KEY })
    },
  })
}

/**
 * Hook for creating a URL link
 */
export function useCreateUrlLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UrlLinkCreate) => createUrlLink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_KEY })
    },
  })
}

/**
 * Hook for renaming a material
 */
export function useRenameMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ materialId, name }: { materialId: string; name: string }) =>
      updateMaterial(materialId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_KEY })
    },
  })
}

/**
 * Hook for deleting a material
 */
export function useDeleteMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (materialId: string) => deleteMaterial(materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_KEY })
      queryClient.invalidateQueries({ queryKey: QUOTA_KEY })
    },
  })
}

/**
 * Combined hook for the materials page
 * Provides all materials operations in one hook
 */
export function useMaterialsPage(params?: {
  type?: MaterialType
  skip?: number
  limit?: number
}) {
  const queryClient = useQueryClient()
  const materialsQuery = useMaterials(params)
  const uploadMutation = useUploadMaterial()
  const createNoteMutation = useCreateTextNote()
  const updateNoteMutation = useUpdateTextNote()
  const createUrlMutation = useCreateUrlLink()
  const renameMutation = useRenameMaterial()
  const deleteMutation = useDeleteMaterial()

  return {
    // Data
    materials: materialsQuery.data?.materials ?? [],
    totalCount: materialsQuery.data?.total_count ?? 0,
    quota: materialsQuery.data?.quota ?? null,
    isLoading: materialsQuery.isLoading,
    error: materialsQuery.error,

    // Upload actions
    uploadFile: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    // Text note actions
    createTextNote: createNoteMutation.mutateAsync,
    updateTextNote: async (materialId: string, data: TextNoteUpdate) =>
      updateNoteMutation.mutateAsync({ materialId, data }),
    isCreatingNote:
      createNoteMutation.isPending || updateNoteMutation.isPending,

    // URL link actions
    createUrlLink: createUrlMutation.mutateAsync,
    isCreatingUrl: createUrlMutation.isPending,

    // Rename action
    renameMaterial: async (materialId: string, name: string) =>
      renameMutation.mutateAsync({ materialId, name }),
    isRenaming: renameMutation.isPending,

    // Delete action
    deleteMaterial: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // Refetch
    refetch: materialsQuery.refetch,

    // Invalidate all
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_KEY })
      queryClient.invalidateQueries({ queryKey: QUOTA_KEY })
    },
  }
}

/**
 * Hook for batch uploading multiple files
 */
export function useBatchUpload() {
  const uploadMutation = useUploadMaterial()
  const queryClient = useQueryClient()

  const uploadFiles = async (
    files: File[],
    onFileProgress?: (fileId: string, progress: number) => void,
    onFileComplete?: (fileId: string, material: Material) => void,
    onFileError?: (fileId: string, error: string) => void,
  ) => {
    const results: { file: File; material?: Material; error?: string }[] = []

    for (const file of files) {
      const fileId = `${file.name}-${Date.now()}`
      try {
        const result = await uploadMutation.mutateAsync({
          file,
          onProgress: (progress) => onFileProgress?.(fileId, progress),
        })
        results.push({ file, material: result.material })
        onFileComplete?.(fileId, result.material)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed"
        results.push({ file, error: errorMessage })
        onFileError?.(fileId, errorMessage)
      }
    }

    // Ensure queries are invalidated after all uploads
    queryClient.invalidateQueries({ queryKey: MATERIALS_KEY })
    queryClient.invalidateQueries({ queryKey: QUOTA_KEY })

    return results
  }

  return {
    uploadFiles,
    isPending: uploadMutation.isPending,
  }
}
