/**
 * Books API Service
 * Story 3.6: Book Catalog Browsing for Teachers
 *
 * This service provides functions to interact with the Books API endpoints.
 * Note: These endpoints are not yet in the generated OpenAPI client,
 * so we use axios directly with the OpenAPI configuration.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  Activity,
  Book,
  BookListResponse,
  BookPagesDetailResponse,
  BookPagesResponse,
  BookStructureResponse,
  BooksFilter,
  PageActivity,
} from "../types/book"

/**
 * Create axios instance with OpenAPI config
 */
const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token interceptor (async to handle async TOKEN function)
apiClient.interceptors.request.use(async (config) => {
  // Set baseURL from OpenAPI config to ensure requests go to correct backend
  config.baseURL = OpenAPI.BASE

  const token = OpenAPI.TOKEN
  if (token) {
    // Handle both sync and async token functions
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
 * Get paginated list of books accessible to the current teacher
 *
 * @param filters - Filter and pagination parameters
 * @returns Promise with book list response
 */
export async function getBooks(
  filters: BooksFilter = {},
): Promise<BookListResponse> {
  const params = new URLSearchParams()

  if (filters.skip !== undefined) params.append("skip", filters.skip.toString())
  if (filters.limit !== undefined)
    params.append("limit", filters.limit.toString())
  if (filters.search) params.append("search", filters.search)
  if (filters.publisher) params.append("publisher", filters.publisher)
  if (filters.activity_type)
    params.append("activity_type", filters.activity_type)

  const queryString = params.toString()
  const url = `/api/v1/books${queryString ? `?${queryString}` : ""}`

  const response = await apiClient.get<BookListResponse>(url)
  return response.data
}

/**
 * Get all activities for a specific book
 *
 * @param bookId - UUID of the book
 * @returns Promise with array of activities
 */
export async function getBookActivities(bookId: string): Promise<Activity[]> {
  const url = `/api/v1/books/${bookId}/activities`
  const response = await apiClient.get<Activity[]>(url)
  return response.data
}

/**
 * Get a single book by ID (for detail page)
 * Note: This uses the list endpoint to find the specific book
 * In a future story, we could add a dedicated GET /books/{id} endpoint
 *
 * @param bookId - DCS book ID (numeric)
 * @returns Promise with book data or null if not found
 */
export async function getBookById(bookId: number): Promise<Book | null> {
  // For now, fetch with high limit and filter client-side
  // This is not ideal for production but works for MVP
  const response = await getBooks({ limit: 100 })
  const book = response.items.find((b) => b.id === bookId)
  return book || null
}

/**
 * Get authenticated book cover image URL
 *
 * Fetches the cover image with authentication headers and returns a blob URL
 * that can be used in <img> tags.
 *
 * @param coverImageUrl - The cover_image_url from the book object
 * @returns Promise with blob URL string, or null if fetch fails
 */
export async function getAuthenticatedCoverUrl(
  coverImageUrl: string | null,
): Promise<string | null> {
  if (!coverImageUrl) return null

  try {
    // Fetch image with authentication
    const response = await apiClient.get(coverImageUrl, {
      responseType: "blob",
    })

    // Create blob URL
    const blobUrl = URL.createObjectURL(response.data)
    return blobUrl
  } catch (error) {
    console.error("Failed to fetch book cover:", error)
    return null
  }
}

/**
 * Get authenticated activity image URL from section_path
 *
 * Fetches activity image with authentication and returns a blob URL.
 * Similar to getAuthenticatedCoverUrl but for activity images.
 *
 * Story 4.2: Real Config.json Integration (AC 11-14)
 *
 * @param bookId - Book UUID
 * @param sectionPath - section_path from config.json (e.g., "./books/BRAINS/images/M3/p30s1.png")
 * @returns Promise with blob URL string, or null if fetch fails
 */
export async function getActivityImageUrl(
  bookId: string,
  sectionPath: string | null,
): Promise<string | null> {
  if (!sectionPath || !bookId) {
    console.warn("Missing required parameters for image URL:", {
      bookId,
      sectionPath,
    })
    return null
  }

  try {
    // Extract asset path from section_path
    // Convert "./books/BOOKNAME/images/M3/p30s1.png" to "images/M3/p30s1.png"
    let assetPath = sectionPath
    const booksPrefix = /^\.\/books\/[^/]+\//
    if (booksPrefix.test(sectionPath)) {
      assetPath = sectionPath.replace(booksPrefix, "")
    }

    // Remove leading slash if present
    if (assetPath.startsWith("/")) {
      assetPath = assetPath.substring(1)
    }

    // Construct backend proxy URL
    const url = `/api/v1/books/${bookId}/assets/${assetPath}`

    console.log("Fetching activity image:", {
      bookId,
      sectionPath,
      assetPath,
      url,
    })

    // Fetch image with authentication
    const response = await apiClient.get(url, {
      responseType: "blob",
    })

    // Create blob URL
    const blobUrl = URL.createObjectURL(response.data)

    console.log("Activity image loaded successfully, blob URL created")

    return blobUrl
  } catch (error) {
    console.error("Failed to fetch activity image:", error, {
      bookId,
      sectionPath,
    })
    return null
  }
}

// --- Story 10.2: Audio Media Streaming ---

/**
 * Get authenticated blob URL for activity audio
 *
 * Story 10.2: Frontend Audio Player Component
 *
 * Fetches audio via authenticated API and returns a blob URL
 * that can be used by the <audio> element.
 *
 * @param bookId - Book UUID
 * @param audioPath - audio_extra.path from config.json (e.g., "./books/SwitchtoCLIL/audio/08.mp3")
 * @returns Promise with blob URL string, or null if fetch fails
 */
export async function getActivityAudioUrl(
  bookId: string,
  audioPath: string | null,
): Promise<string | null> {
  if (!audioPath || !bookId) {
    console.warn("Missing required parameters for audio URL:", {
      bookId,
      audioPath,
    })
    return null
  }

  try {
    // Extract asset path from audio_path
    // Convert "./books/BOOKNAME/audio/08.mp3" to "audio/08.mp3"
    let assetPath = audioPath
    const booksPrefix = /^\.\/books\/[^/]+\//
    if (booksPrefix.test(audioPath)) {
      assetPath = audioPath.replace(booksPrefix, "")
    }

    // Remove leading "./" if still present
    if (assetPath.startsWith("./")) {
      assetPath = assetPath.substring(2)
    }

    // Remove leading slash if present
    if (assetPath.startsWith("/")) {
      assetPath = assetPath.substring(1)
    }

    // Use the media streaming endpoint for audio
    const url = `/api/v1/books/${bookId}/media/${assetPath}`

    console.log("Fetching activity audio:", {
      bookId,
      audioPath,
      assetPath,
      url,
    })

    // Fetch audio with authentication
    const response = await apiClient.get(url, {
      responseType: "blob",
    })

    // Create blob URL
    const blobUrl = URL.createObjectURL(response.data)

    console.log("Activity audio loaded successfully, blob URL created")

    return blobUrl
  } catch (error) {
    console.error("Failed to fetch activity audio:", error, {
      bookId,
      audioPath,
    })
    return null
  }
}

// --- Story 10.3: Video Attachment to Assignments ---

/**
 * Video information from DCS
 */
export interface VideoInfo {
  path: string
  name: string
  size_bytes: number
  has_subtitles: boolean
}

/**
 * Response from book videos endpoint
 */
export interface BookVideosResponse {
  book_id: string
  videos: VideoInfo[]
  total_count: number
}

/**
 * Get list of videos available in a book
 *
 * Story 10.3: Video Attachment to Assignments
 *
 * @param bookId - UUID of the book
 * @returns Promise with list of videos
 */
export async function getBookVideos(
  bookId: string | number,
): Promise<BookVideosResponse> {
  const url = `/api/v1/books/${bookId}/videos`
  const response = await apiClient.get<BookVideosResponse>(url)
  return response.data
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem("access_token")
}

/**
 * Get authenticated video stream URL
 *
 * Story 10.3: Video Attachment to Assignments
 *
 * HTML5 video elements don't send Authorization headers, so we include
 * the token as a query parameter for authentication.
 *
 * @param bookId - Book UUID
 * @param videoPath - Video path from VideoInfo (e.g., "video/1.mp4")
 * @returns The URL to stream video with auth token
 */
export function getVideoStreamUrl(bookId: string, videoPath: string): string {
  const token = getAuthToken()
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ""
  return `${OpenAPI.BASE}/api/v1/books/${bookId}/media/${videoPath}${tokenParam}`
}

/**
 * Get subtitle file URL for a video
 *
 * Story 10.3: Video Attachment to Assignments
 *
 * HTML5 video elements don't send Authorization headers, so we include
 * the token as a query parameter for authentication.
 *
 * @param bookId - Book UUID
 * @param videoPath - Video path (e.g., "video/1.mp4")
 * @returns The URL to fetch subtitles (replaces .mp4 with .srt) with auth token
 */
export function getSubtitleUrl(bookId: string, videoPath: string): string {
  const subtitlePath = videoPath.replace(/\.[^.]+$/, ".srt")
  const token = getAuthToken()
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ""
  return `${OpenAPI.BASE}/api/v1/books/${bookId}/media/${subtitlePath}${tokenParam}`
}

// --- Story 8.2: Page-Based Activity Selection ---

/**
 * Get book pages grouped by module
 *
 * Story 8.2: Page-Based Activity Selection
 *
 * @param bookId - UUID of the book
 * @returns Promise with book pages grouped by module
 */
export async function getBookPages(bookId: string): Promise<BookPagesResponse> {
  const url = `/api/v1/books/${bookId}/pages`
  const response = await apiClient.get<BookPagesResponse>(url)
  return response.data
}

/**
 * Get activities for a specific page
 *
 * Story 8.2: Page-Based Activity Selection
 *
 * @param bookId - UUID of the book
 * @param pageNumber - Page number to get activities for
 * @param moduleName - Optional module name filter
 * @returns Promise with array of activities on the page
 */
export async function getPageActivities(
  bookId: string,
  pageNumber: number,
  moduleName?: string,
): Promise<PageActivity[]> {
  const params = new URLSearchParams()
  if (moduleName) {
    params.append("module_name", moduleName)
  }

  const queryString = params.toString()
  const url = `/api/v1/books/${bookId}/pages/${pageNumber}/activities${queryString ? `?${queryString}` : ""}`

  const response = await apiClient.get<PageActivity[]>(url)
  return response.data
}

/**
 * Get authenticated page thumbnail URL
 *
 * Story 8.2: Page-Based Activity Selection
 *
 * @param bookId - UUID of the book
 * @param thumbnailUrl - The thumbnail_url from PageInfo (e.g., "/api/v1/books/{id}/assets/images/M1/p7.png")
 * @returns Promise with blob URL string, or null if fetch fails
 */
export async function getPageThumbnailUrl(
  thumbnailUrl: string,
): Promise<string | null> {
  if (!thumbnailUrl) return null

  try {
    // Fetch image with authentication
    const response = await apiClient.get(thumbnailUrl, {
      responseType: "blob",
    })

    // Create blob URL
    const blobUrl = URL.createObjectURL(response.data)
    return blobUrl
  } catch (error) {
    console.error("Failed to fetch page thumbnail:", error)
    return null
  }
}

// --- Story 8.2 Enhanced: Page Viewer with Activity Markers ---

/**
 * Get detailed book pages with activity coordinates
 *
 * Story 8.2 Enhanced: Page Viewer with Activity Markers
 *
 * @param bookId - UUID of the book
 * @returns Promise with detailed book pages including activity coordinates
 */
export async function getBookPagesDetail(
  bookId: string,
): Promise<BookPagesDetailResponse> {
  const url = `/api/v1/books/${bookId}/pages/detail`
  const response = await apiClient.get<BookPagesDetailResponse>(url)
  return response.data
}

/**
 * Get authenticated page image URL (full size for page viewer)
 *
 * Story 8.2 Enhanced: Page Viewer
 *
 * @param imageUrl - The image_url from PageDetail
 * @returns Promise with blob URL string, or null if fetch fails
 */
export async function getPageImageUrl(
  imageUrl: string,
): Promise<string | null> {
  if (!imageUrl) return null

  try {
    const response = await apiClient.get(imageUrl, {
      responseType: "blob",
    })

    const blobUrl = URL.createObjectURL(response.data)
    return blobUrl
  } catch (error) {
    console.error("Failed to fetch page image:", error)
    return null
  }
}

/**
 * Get authenticated media URL (for audio/video)
 *
 * Story 29.3: FlowbookViewer Integration
 *
 * Fetches media with authentication headers and returns a blob URL.
 *
 * @param mediaUrl - The media URL (audio or video)
 * @returns Promise with blob URL string, or null if fetch fails
 */
export async function getMediaUrl(mediaUrl: string): Promise<string | null> {
  if (!mediaUrl) return null

  try {
    const response = await apiClient.get(mediaUrl, {
      responseType: "blob",
    })

    const blobUrl = URL.createObjectURL(response.data)
    return blobUrl
  } catch (error) {
    console.error("Failed to fetch media:", error)
    return null
  }
}

/**
 * Get a single book by ID
 *
 * Story 29.3: FlowbookViewer Integration
 *
 * @param bookId - Book ID (string or number)
 * @returns Promise with book data
 */
export async function getBook(bookId: string | number): Promise<Book> {
  const url = `/api/v1/books/${bookId}`
  const response = await apiClient.get<Book>(url)
  return response.data
}

// --- Story 9.5: Activity Selection Tabs ---

/**
 * Get book structure with modules and pages for activity selection tabs
 *
 * Story 9.5: Activity Selection Tabs
 *
 * Returns modules with page ranges, activity counts, and activity IDs
 * for bulk selection in "By Page" and "By Module" selection modes.
 *
 * @param bookId - UUID of the book
 * @returns Promise with book structure including activity IDs
 */
export async function getBookStructure(
  bookId: string | number,
): Promise<BookStructureResponse> {
  const url = `/api/v1/books/${bookId}/structure`
  const response = await apiClient.get<BookStructureResponse>(url)
  return response.data
}

// --- Story 29.3: Book Bundle Download ---

/**
 * Platform options for standalone app bundle download
 */
export type Platform = "mac" | "win" | "win7-8" | "linux"

/**
 * Response from book bundle request
 */
export interface BundleResponse {
  download_url: string
  file_name: string
  file_size: number
  expires_at: string | null
}

/**
 * Request a standalone app bundle download URL for a book
 *
 * Story 29.3: Book Preview and Download Actions
 *
 * Calls the backend to get a signed download URL for the book bundle.
 * The returned URL can be used to download the standalone app.
 *
 * @param bookId - Book ID (DCS book ID)
 * @param platform - Target platform (mac, win, win7-8, linux)
 * @returns Promise with bundle response containing download URL
 */
export async function requestBookBundle(
  bookId: string | number,
  platform: Platform,
): Promise<BundleResponse> {
  const url = `/api/v1/books/${bookId}/bundle`
  const response = await apiClient.post<BundleResponse>(url, { platform })
  return response.data
}

/**
 * Export as object for easier imports
 */
export const booksApi = {
  getBooks,
  getBook,
  getBookActivities,
  getBookById,
  getAuthenticatedCoverUrl,
  getActivityImageUrl,
  getActivityAudioUrl,
  getBookPages,
  getPageActivities,
  getPageThumbnailUrl,
  getBookPagesDetail,
  getPageImageUrl,
  getMediaUrl,
  getBookStructure,
  getBookVideos,
  getVideoStreamUrl,
  getSubtitleUrl,
  requestBookBundle,
}

export default booksApi
