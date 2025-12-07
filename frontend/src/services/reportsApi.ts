/**
 * Reports API Service
 * Story 5.6: Time-Based Reporting & Trend Analysis
 *
 * This service provides functions to interact with the Reports API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  ReportGenerateRequest,
  ReportHistoryResponse,
  ReportJobResponse,
  ReportStatusResponse,
  SavedReportTemplate,
  SavedReportTemplateCreate,
} from "../types/reports"

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

/**
 * Generate a new report
 *
 * @param config - Report configuration
 * @returns Job response with job_id for status polling
 */
export async function generateReport(
  config: ReportGenerateRequest,
): Promise<ReportJobResponse> {
  const response = await apiClient.post<ReportJobResponse>(
    "/api/v1/reports/generate",
    config,
  )
  return response.data
}

/**
 * Check report generation status
 *
 * @param jobId - Job UUID
 * @returns Current status and progress
 */
export async function getReportStatus(
  jobId: string,
): Promise<ReportStatusResponse> {
  const response = await apiClient.get<ReportStatusResponse>(
    `/api/v1/reports/${jobId}/status`,
  )
  return response.data
}

/**
 * Download a generated report
 *
 * @param jobId - Job UUID
 * @param filename - Optional filename for the download
 */
export async function downloadReport(
  jobId: string,
  filename?: string,
): Promise<void> {
  const response = await apiClient.get(`/api/v1/reports/${jobId}/download`, {
    responseType: "blob",
  })

  // Create a download link
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement("a")
  link.href = url

  // Get filename from content-disposition header or use default
  const contentDisposition = response.headers["content-disposition"]
  let downloadFilename = filename || `report-${jobId}.pdf`

  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
    if (filenameMatch) {
      downloadFilename = filenameMatch[1]
    }
  }

  link.setAttribute("download", downloadFilename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Get report generation history (last 7 days)
 *
 * @returns List of previous reports
 */
export async function getReportHistory(): Promise<ReportHistoryResponse> {
  const response = await apiClient.get<ReportHistoryResponse>(
    "/api/v1/reports/history",
  )
  return response.data
}

/**
 * Save a report configuration as a template
 *
 * @param template - Template name and configuration
 * @returns Created template
 */
export async function saveReportTemplate(
  template: SavedReportTemplateCreate,
): Promise<SavedReportTemplate> {
  const response = await apiClient.post<SavedReportTemplate>(
    "/api/v1/reports/templates",
    template,
  )
  return response.data
}

/**
 * Get all saved report templates
 *
 * @returns List of saved templates
 */
export async function getReportTemplates(): Promise<SavedReportTemplate[]> {
  const response = await apiClient.get<SavedReportTemplate[]>(
    "/api/v1/reports/templates",
  )
  return response.data
}

/**
 * Delete a saved report template
 *
 * @param templateId - Template UUID
 */
export async function deleteReportTemplate(templateId: string): Promise<void> {
  await apiClient.delete(`/api/v1/reports/templates/${templateId}`)
}

/**
 * Reports API object for easier imports
 */
export const reportsApi = {
  generateReport,
  getReportStatus,
  downloadReport,
  getReportHistory,
  saveReportTemplate,
  getReportTemplates,
  deleteReportTemplate,
}

export default reportsApi
