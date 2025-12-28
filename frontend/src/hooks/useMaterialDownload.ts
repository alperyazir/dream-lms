import axios from "axios"
import { useState } from "react"
import { OpenAPI } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"

interface DownloadState {
  isDownloading: boolean
  progress: number | null
  error: string | null
}

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

export function useMaterialDownload() {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [state, setState] = useState<DownloadState>({
    isDownloading: false,
    progress: null,
    error: null,
  })

  const downloadMaterial = async (materialId: string, filename: string) => {
    setState({ isDownloading: true, progress: 0, error: null })

    try {
      // Use axios to fetch file as blob with authentication
      const url = `/api/v1/teachers/materials/${materialId}/download`
      const response = await apiClient.get(url, {
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100,
            )
            setState((prev) => ({ ...prev, progress }))
          }
        },
      })

      // Create blob URL and trigger download
      const blob = response.data
      const blobUrl = window.URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      link.style.display = "none"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up
      window.URL.revokeObjectURL(blobUrl)

      setState({ isDownloading: false, progress: 100, error: null })
      showSuccessToast(`Downloaded ${filename}`)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Download failed. Please try again."

      setState({ isDownloading: false, progress: null, error: errorMessage })
      showErrorToast(errorMessage)
      throw error
    }
  }

  const resetState = () => {
    setState({ isDownloading: false, progress: null, error: null })
  }

  return {
    downloadMaterial,
    isDownloading: state.isDownloading,
    progress: state.progress,
    error: state.error,
    resetState,
  }
}
