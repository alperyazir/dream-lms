/**
 * Book and Activity type definitions for Dream LMS.
 * Story 3.6: Book Catalog Browsing for Teachers
 */

/**
 * Activity type enumeration matching backend ActivityType
 */
export type ActivityType =
  | "dragdroppicture"
  | "dragdroppicturegroup"
  | "matchTheWords"
  | "circle"
  | "markwithx"
  | "puzzleFindWords"
  | "fillSentencesWithDots"
  | "fillpicture"

/**
 * Activity types that have implemented players and can be assigned
 * Excludes: fillSentencesWithDots, fillpicture (not yet implemented)
 */
export const SUPPORTED_ACTIVITY_TYPES: ReadonlySet<ActivityType> = new Set([
  "dragdroppicture",
  "dragdroppicturegroup",
  "matchTheWords",
  "circle",
  "markwithx",
  "puzzleFindWords",
])

/**
 * Check if an activity type is supported for assignment
 */
export function isActivityTypeSupported(type: ActivityType): boolean {
  return SUPPORTED_ACTIVITY_TYPES.has(type)
}

/**
 * Book data from API
 *
 * Note: Book IDs are now integers (DCS book IDs) instead of UUIDs.
 * Books are fetched from Dream Central Storage on-demand.
 */
export interface Book {
  id: number // Changed from string to number (DCS book ID)
  dream_storage_id: string
  title: string
  publisher_id: number // DCS publisher ID for logo URL
  publisher_name: string
  description: string | null
  cover_image_url: string | null
  activity_count: number
}

/**
 * Activity data from API
 */
export interface Activity {
  id: string
  book_id: number // Changed from string to number (DCS book ID)
  activity_type: ActivityType
  title: string | null
  config_json: any
  order_index: number
}

/**
 * Paginated book list response
 */
export interface BookListResponse {
  items: Book[]
  total: number
  skip: number
  limit: number
}

/**
 * Filter parameters for book catalog
 */
export interface BooksFilter {
  search?: string
  publisher?: string
  activity_type?: ActivityType
  skip?: number
  limit?: number
}

/**
 * Activity type display configuration
 */
export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  {
    label: string
    color: string
    badgeVariant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  dragdroppicture: {
    label: "Drag & Drop",
    color: "blue",
    badgeVariant: "default",
  },
  dragdroppicturegroup: {
    label: "Drag & Drop Group",
    color: "blue",
    badgeVariant: "default",
  },
  matchTheWords: {
    label: "Match Words",
    color: "green",
    badgeVariant: "secondary",
  },
  circle: {
    label: "Circle",
    color: "purple",
    badgeVariant: "outline",
  },
  markwithx: {
    label: "Mark with X",
    color: "orange",
    badgeVariant: "outline",
  },
  puzzleFindWords: {
    label: "Find Words",
    color: "pink",
    badgeVariant: "secondary",
  },
  fillSentencesWithDots: {
    label: "Fill Sentences",
    color: "yellow",
    badgeVariant: "outline",
  },
  fillpicture: {
    label: "Fill Picture",
    color: "teal",
    badgeVariant: "secondary",
  },
}

// --- Story 8.2: Page-Based Activity Selection ---

/**
 * Information about a single page in a book module
 */
export interface PageInfo {
  page_number: number
  activity_count: number
  thumbnail_url: string
}

/**
 * A module with its pages containing activities
 */
export interface ModulePages {
  name: string
  pages: PageInfo[]
}

/**
 * Response from GET /api/v1/books/{book_id}/pages
 */
export interface BookPagesResponse {
  book_id: number // Changed from string to number (DCS book ID)
  modules: ModulePages[]
  total_pages: number
  total_activities: number
}

/**
 * Activity response for page-based selection (simplified)
 */
export interface PageActivity {
  id: string
  title: string | null
  activity_type: ActivityType
  section_index: number
  order_index: number
}

// --- Story 8.2 Enhanced: Page Viewer with Activity Markers ---

/**
 * Coordinates for an activity marker on a page
 */
export interface ActivityCoords {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Activity marker with position and metadata for page viewer
 */
export interface ActivityMarker {
  id: string
  title: string | null
  activity_type: ActivityType
  section_index: number
  coords: ActivityCoords | null
  config: Record<string, unknown>
}

/**
 * Audio marker for page viewer
 */
export interface AudioMarker {
  id: string
  src: string
  x: number
  y: number
  width: number
  height: number
}

/**
 * Video marker for page viewer
 */
export interface VideoMarker {
  id: string
  src: string
  poster: string | null
  subtitle_src: string | null
  x: number
  y: number
  width: number
  height: number
}

/**
 * Fill answer marker for page viewer (clickable answer areas)
 */
export interface FillAnswerMarker {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
}

/**
 * Detailed page information including image and activity markers
 */
export interface PageDetail {
  page_number: number
  image_url: string
  module_name: string
  activities: ActivityMarker[]
  audio?: AudioMarker[]
  video?: VideoMarker[]
  fill_answers?: FillAnswerMarker[]
}

/**
 * Module metadata for navigation shortcuts
 */
export interface ModuleInfo {
  name: string
  first_page_index: number // Index in the flat pages array
  page_count: number
}

/**
 * Module with detailed page information for page viewer
 * @deprecated Use ModuleInfo + flat pages list instead
 */
export interface ModulePagesDetail {
  name: string
  pages: PageDetail[]
}

/**
 * Enhanced book pages response with activity coordinates for page viewer
 */
export interface BookPagesDetailResponse {
  book_id: number // Changed from string to number (DCS book ID)
  modules: ModuleInfo[] // Module shortcuts for navigation
  pages: PageDetail[] // Flat list of ALL pages in order
  total_pages: number
  total_activities: number
}

// --- Story 9.5: Activity Selection Tabs ---

/**
 * Page information with activity IDs for bulk selection
 */
export interface PageWithActivities {
  page_number: number
  thumbnail_url: string
  activity_count: number
  activity_ids: string[]
}

/**
 * Module information with pages and activity IDs for bulk selection
 */
export interface ModuleWithActivities {
  name: string
  page_start: number
  page_end: number
  activity_count: number
  activity_ids: string[]
  pages: PageWithActivities[]
}

/**
 * Book structure response with modules and pages for activity selection tabs
 */
export interface BookStructureResponse {
  book_id: number // Changed from string to number (DCS book ID)
  modules: ModuleWithActivities[]
  total_pages: number
  total_activities: number
}
