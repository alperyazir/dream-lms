/**
 * Materials API Service
 * Story 13.2: Frontend My Materials Management
 *
 * API client functions for teacher materials management.
 */

import axios, { type AxiosProgressEvent } from "axios"
import { OpenAPI } from "../client"
import type {
  Material,
  MaterialListResponse,
  MaterialType,
  MaterialUpdate,
  StorageQuota,
  TextNoteCreate,
  TextNoteUpdate,
  UploadResponse,
  UrlLinkCreate,
} from "../types/material"

/**
 * Create axios instance with OpenAPI config
 */
const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token interceptor
apiClient.interceptors.request.use(async (config) => {
  if (!config.baseURL) {
    config.baseURL = OpenAPI.BASE
  }

  const token = OpenAPI.TOKEN
  if (token) {
    const tokenValue =
      typeof token === "function"
        ? await token({
            method: (config.method || "GET") as
              | "GET"
              | "POST"
              | "PUT"
              | "DELETE"
              | "PATCH"
              | "OPTIONS"
              | "HEAD",
            url: config.url || "",
          })
        : token
    if (tokenValue) {
      config.headers.Authorization = `Bearer ${tokenValue}`
    }
  }
  return config
})

const MATERIALS_BASE = "/api/v1/teachers/materials"

/**
 * List teacher's materials with optional filtering
 */
export async function listMaterials(params?: {
  type?: MaterialType
  skip?: number
  limit?: number
}): Promise<MaterialListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.type) searchParams.set("type", params.type)
  if (params?.skip) searchParams.set("skip", String(params.skip))
  if (params?.limit) searchParams.set("limit", String(params.limit))

  const query = searchParams.toString()
  const url = `${MATERIALS_BASE}${query ? `?${query}` : ""}`
  const response = await apiClient.get<MaterialListResponse>(url)
  return response.data
}

/**
 * Get a single material by ID
 */
export async function getMaterial(materialId: string): Promise<Material> {
  const url = `${MATERIALS_BASE}/${materialId}`
  const response = await apiClient.get<Material>(url)
  return response.data
}

/**
 * Upload a file with progress tracking
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append("file", file)

  const url = `${MATERIALS_BASE}/upload`
  const response = await apiClient.post<UploadResponse>(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (event.total && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100)
        onProgress(progress)
      }
    },
  })
  return response.data
}

/**
 * Create a text note
 */
export async function createTextNote(data: TextNoteCreate): Promise<Material> {
  const url = `${MATERIALS_BASE}/notes`
  const response = await apiClient.post<Material>(url, data)
  return response.data
}

/**
 * Update a text note
 */
export async function updateTextNote(
  materialId: string,
  data: TextNoteUpdate,
): Promise<Material> {
  const url = `${MATERIALS_BASE}/notes/${materialId}`
  const response = await apiClient.put<Material>(url, data)
  return response.data
}

/**
 * Create a URL link
 */
export async function createUrlLink(data: UrlLinkCreate): Promise<Material> {
  const url = `${MATERIALS_BASE}/urls`
  const response = await apiClient.post<Material>(url, data)
  return response.data
}

/**
 * Update material name (rename)
 */
export async function updateMaterial(
  materialId: string,
  data: MaterialUpdate,
): Promise<Material> {
  const url = `${MATERIALS_BASE}/${materialId}`
  const response = await apiClient.patch<Material>(url, data)
  return response.data
}

/**
 * Delete a material
 */
export async function deleteMaterial(materialId: string): Promise<void> {
  const url = `${MATERIALS_BASE}/${materialId}`
  await apiClient.delete(url)
}

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<StorageQuota> {
  const url = `${MATERIALS_BASE}/quota`
  const response = await apiClient.get<StorageQuota>(url)
  return response.data
}

/**
 * Get download URL for a material
 */
export function getDownloadUrl(materialId: string): string {
  return `${OpenAPI.BASE}${MATERIALS_BASE}/${materialId}/download`
}

/**
 * Get stream URL for audio/video materials
 */
export function getStreamUrl(materialId: string): string {
  return `${OpenAPI.BASE}${MATERIALS_BASE}/${materialId}/stream`
}

/**
 * Get presigned URL for direct browser access
 */
export async function getPresignedUrl(
  materialId: string,
  expiresMinutes: number = 60,
): Promise<{
  url: string
  expires_in_seconds: number
  content_type: string | null
}> {
  const url = `${MATERIALS_BASE}/${materialId}/presigned-url?expires_minutes=${expiresMinutes}`
  const response = await apiClient.get(url)
  return response.data
}

/**
 * Get material content as a blob URL for browser preview
 * Uses the stream endpoint with authentication
 */
export async function getMaterialBlobUrl(materialId: string): Promise<string> {
  const url = `${MATERIALS_BASE}/${materialId}/stream`
  const response = await apiClient.get(url, {
    responseType: "blob",
  })
  return URL.createObjectURL(response.data)
}

/**
 * Get material content as a blob URL using download endpoint
 * For documents and images that need direct access
 */
export async function getDownloadBlobUrl(materialId: string): Promise<string> {
  const url = `${MATERIALS_BASE}/${materialId}/download`
  const response = await apiClient.get(url, {
    responseType: "blob",
  })
  return URL.createObjectURL(response.data)
}

/**
 * Export as object for easier imports
 */
export const materialsApi = {
  listMaterials,
  getMaterial,
  uploadFile,
  createTextNote,
  updateTextNote,
  createUrlLink,
  updateMaterial,
  deleteMaterial,
  getStorageQuota,
  getDownloadUrl,
  getStreamUrl,
  getPresignedUrl,
  getMaterialBlobUrl,
  getDownloadBlobUrl,
}

export default materialsApi
