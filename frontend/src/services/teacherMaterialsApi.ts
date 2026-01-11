/**
 * Teacher Materials AI Processing API Service
 * Story 27.15: Teacher Materials Processing
 *
 * API client functions for teacher material upload, text extraction,
 * and AI-generated content management.
 */

import axios, { type AxiosProgressEvent } from "axios"
import { OpenAPI } from "../client"
import type {
  GeneratedContent,
  GeneratedContentListResponse,
  TeacherMaterial,
  TeacherMaterialListResponse,
  TeacherMaterialUploadResponse,
  TextMaterialCreate,
} from "../types/teacher-material"

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

// =============================================================================
// PDF Upload & Text Processing
// =============================================================================

/**
 * Upload a PDF file for AI text extraction
 */
export async function uploadPdfForAI(
  file: File,
  name: string,
  description?: string,
  onProgress?: (progress: number) => void,
): Promise<TeacherMaterialUploadResponse> {
  const formData = new FormData()
  formData.append("file", file)

  const params = new URLSearchParams()
  params.set("name", name)
  if (description) {
    params.set("description", description)
  }

  const url = `${MATERIALS_BASE}/ai/upload-pdf?${params.toString()}`
  const response = await apiClient.post<TeacherMaterialUploadResponse>(
    url,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (event.total && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      },
    },
  )
  return response.data
}

/**
 * Create a material from pasted text for AI processing
 */
export async function createTextMaterial(
  data: TextMaterialCreate,
): Promise<TeacherMaterialUploadResponse> {
  const url = `${MATERIALS_BASE}/ai/text`
  const response = await apiClient.post<TeacherMaterialUploadResponse>(
    url,
    data,
  )
  return response.data
}

// =============================================================================
// AI-Processable Materials
// =============================================================================

/**
 * List materials that have extracted text available for AI generation
 */
export async function listProcessableMaterials(): Promise<TeacherMaterialListResponse> {
  const url = `${MATERIALS_BASE}/ai/processable`
  const response = await apiClient.get<TeacherMaterialListResponse>(url)
  return response.data
}

/**
 * Get a material by ID for AI processing
 */
export async function getMaterialForAI(
  materialId: string,
): Promise<TeacherMaterial> {
  const url = `${MATERIALS_BASE}/ai/${materialId}`
  const response = await apiClient.get<TeacherMaterial>(url)
  return response.data
}

// =============================================================================
// Generated Content Management
// =============================================================================

/**
 * List all generated content for the current teacher
 */
export async function listGeneratedContent(params?: {
  activity_type?: string
}): Promise<GeneratedContentListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.activity_type) {
    searchParams.set("activity_type", params.activity_type)
  }

  const query = searchParams.toString()
  const url = `${MATERIALS_BASE}/generated${query ? `?${query}` : ""}`
  const response = await apiClient.get<GeneratedContentListResponse>(url)
  return response.data
}

/**
 * Get a single generated content item by ID
 */
export async function getGeneratedContent(
  contentId: string,
): Promise<GeneratedContent> {
  const url = `${MATERIALS_BASE}/generated/${contentId}`
  const response = await apiClient.get<GeneratedContent>(url)
  return response.data
}

/**
 * Delete a generated content item
 * Cannot delete content that is used in an assignment
 */
export async function deleteGeneratedContent(contentId: string): Promise<void> {
  const url = `${MATERIALS_BASE}/generated/${contentId}`
  await apiClient.delete(url)
}

// =============================================================================
// Export
// =============================================================================

/**
 * Export as object for easier imports
 */
export const teacherMaterialsApi = {
  // PDF & Text Processing
  uploadPdfForAI,
  createTextMaterial,
  // AI-Processable Materials
  listProcessableMaterials,
  getMaterialForAI,
  // Generated Content
  listGeneratedContent,
  getGeneratedContent,
  deleteGeneratedContent,
}

export default teacherMaterialsApi
