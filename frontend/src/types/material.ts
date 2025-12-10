/**
 * Material types for Story 13.2: Frontend My Materials Management
 *
 * TypeScript interfaces matching the backend API schemas.
 */

/**
 * Material type enumeration
 */
export type MaterialType =
  | "document"
  | "image"
  | "audio"
  | "video"
  | "url"
  | "text_note"

/**
 * Material response from API
 */
export interface Material {
  id: string
  name: string
  type: MaterialType
  file_size: number | null
  mime_type: string | null
  original_filename: string | null
  url: string | null
  text_content: string | null
  created_at: string
  updated_at: string
  download_url: string | null
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  used_bytes: number
  quota_bytes: number
  used_percentage: number
  is_warning: boolean
  is_full: boolean
}

/**
 * Response when listing materials
 */
export interface MaterialListResponse {
  materials: Material[]
  total_count: number
  quota: StorageQuota
}

/**
 * Response after uploading a file or creating a material
 */
export interface UploadResponse {
  material: Material
  quota: StorageQuota
}

/**
 * Request to create a text note
 */
export interface TextNoteCreate {
  name: string
  content: string
}

/**
 * Request to update a text note
 */
export interface TextNoteUpdate {
  name?: string
  content?: string
}

/**
 * Request to create a URL link
 */
export interface UrlLinkCreate {
  name: string
  url: string
}

/**
 * Request to update material name
 */
export interface MaterialUpdate {
  name: string
}

/**
 * Upload state for tracking progress of multiple files
 */
export interface UploadingFile {
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "complete" | "error"
  error?: string
  material?: Material
}

/**
 * Allowed file extensions by type
 */
export const ALLOWED_EXTENSIONS: Record<string, MaterialType> = {
  // Documents
  pdf: "document",
  txt: "document",
  docx: "document",
  doc: "document",
  // Images
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  // Audio
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  m4a: "audio",
  // Video
  mp4: "video",
  webm: "video",
  mov: "video",
}

/**
 * Allowed MIME types by material type
 */
export const ALLOWED_MIME_TYPES: Record<string, MaterialType> = {
  // Documents
  "application/pdf": "document",
  "text/plain": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "document",
  "application/msword": "document",
  // Images
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  // Audio
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/mp4": "audio",
  "audio/x-m4a": "audio",
  // Video
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
}

/**
 * Maximum file size in bytes (100MB)
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024

/**
 * Maximum text note content size in bytes (50KB)
 */
export const MAX_TEXT_NOTE_SIZE = 50 * 1024

/**
 * Display names for material types
 */
export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  document: "Document",
  image: "Image",
  audio: "Audio",
  video: "Video",
  url: "URL Link",
  text_note: "Text Note",
}

/**
 * Get material type from file
 */
export function getMaterialType(file: File): MaterialType | null {
  // Try MIME type first
  if (file.type && ALLOWED_MIME_TYPES[file.type]) {
    return ALLOWED_MIME_TYPES[file.type]
  }

  // Fall back to extension
  const extension = file.name.split(".").pop()?.toLowerCase()
  if (extension && ALLOWED_EXTENSIONS[extension]) {
    return ALLOWED_EXTENSIONS[extension]
  }

  return null
}

/**
 * Validate file for upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }

  // Check file type
  const type = getMaterialType(file)
  if (!type) {
    return {
      valid: false,
      error: "File type not supported",
    }
  }

  return { valid: true }
}
