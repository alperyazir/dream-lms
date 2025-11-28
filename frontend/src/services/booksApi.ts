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
  BooksFilter,
} from "../types/book"

/**
 * Create axios instance with OpenAPI config
 */
const apiClient = axios.create({
  baseURL: OpenAPI.BASE,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token interceptor (async to handle async TOKEN function)
apiClient.interceptors.request.use(async (config) => {
  const token = OpenAPI.TOKEN
  if (token) {
    // Handle both sync and async token functions
    const tokenValue = typeof token === "function" ? await token({ method: (config.method || "GET") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD", url: config.url || "" }) : token
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
 * @param bookId - UUID of the book
 * @returns Promise with book data or null if not found
 */
export async function getBookById(bookId: string): Promise<Book | null> {
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
    console.warn("Missing required parameters for image URL:", { bookId, sectionPath })
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

/**
 * Export as object for easier imports
 */
export const booksApi = {
  getBooks,
  getBookActivities,
  getBookById,
  getAuthenticatedCoverUrl,
  getActivityImageUrl,
}

export default booksApi
