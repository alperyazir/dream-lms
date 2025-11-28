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
 * Book data from API
 */
export interface Book {
  id: string
  dream_storage_id: string
  title: string
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
  book_id: string
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
