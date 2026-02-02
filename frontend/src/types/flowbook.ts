/**
 * FlowBook Viewer Type Definitions
 * Adapted from flowbook-online for LMS integration
 */

// ============================================================================
// Core Book Configuration Types
// ============================================================================

export interface BookConfig {
  id?: string
  title: string
  cover: string
  version?: string
  modules: Module[]
  pages: Page[]
}

export interface Module {
  id: string
  name: string
  startPage: number
  endPage?: number
}

export interface Page {
  id: string
  image: string
  audio?: AudioReference[]
  video?: VideoReference[]
  activities?: ActivityReference[]
  fillAnswers?: FillAnswerArea[]
  sections?: Section[]
}

export interface Section {
  id: string
  title: string
  startPage: number
  endPage: number
  audio?: AudioReference[]
  video?: VideoReference[]
  activities?: ActivityReference[]
  fillAnswers?: FillAnswerArea[]
}

// ============================================================================
// Media Reference Types
// ============================================================================

export interface AudioReference {
  id: string
  src: string
  x: number
  y: number
  width?: number
  height?: number
}

export interface VideoReference {
  id: string
  src: string
  poster?: string
  subtitleSrc?: string
  x: number
  y: number
  width?: number
  height?: number
}

export interface FillAnswerArea {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
}

// ============================================================================
// Activity Types
// ============================================================================

export interface ActivityReference {
  id: string
  type: ActivityType
  x: number
  y: number
  width: number
  height: number
  config: Record<string, unknown>
}

export type ActivityType =
  | "matchTheWords"
  | "dragDropPicture"
  | "dragDropPictureGroup"
  | "fillPicture"
  | "circleMark"
  | "fillBlanks"
  | "wordSearch"

// ============================================================================
// UI State Types
// ============================================================================

export type ViewMode = "single" | "double"

export type SidebarPanel = "none" | "toc" | "activities" | "tools" | "settings"

// ============================================================================
// Activity Config Types (for specific activity players)
// ============================================================================

export interface MatchTheWordsConfig {
  title?: string
  instructions?: string
  leftItems: Array<{ id: string; text: string }>
  rightItems: Array<{ id: string; text: string }>
  correctMatches: Record<string, string>
}

export interface DragDropPictureConfig {
  title?: string
  instructions?: string
  backgroundImage?: string
  items: Array<{
    id: string
    text?: string
    image?: string
  }>
  dropZones: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    acceptsItemId: string
  }>
}

export interface DragDropPictureGroupConfig {
  title?: string
  instructions?: string
  backgroundImage?: string
  groups: Array<{
    id: string
    label: string
    x: number
    y: number
    width: number
    height: number
  }>
  items: Array<{
    id: string
    text?: string
    image?: string
    correctGroupId: string
  }>
}

export interface FillPictureConfig {
  title?: string
  instructions?: string
  backgroundImage?: string
  clickAreas: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    correctAnswer: boolean
  }>
}

export interface CircleMarkConfig {
  title?: string
  instructions?: string
  backgroundImage?: string
  options: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    isCorrect: boolean
  }>
}

export interface FillBlanksConfig {
  title?: string
  instructions?: string
  sentences: Array<{
    id: string
    text: string // Text with __BLANK__ placeholders
    blanks: Array<{
      id: string
      correctAnswer: string
      alternatives?: string[]
    }>
  }>
}

export interface WordSearchConfig {
  title?: string
  instructions?: string
  grid: string[][]
  words: string[]
  foundWords?: string[]
}

// ============================================================================
// FlowbookViewer Component Props
// ============================================================================

export interface FlowbookViewerProps {
  /** Book configuration to display */
  bookConfig: BookConfig
  /** Callback when close button is clicked */
  onClose?: () => void
  /** Additional CSS classes */
  className?: string
  /** Initial page index (0-based) */
  initialPage?: number
  /** Whether to show the thumbnail strip */
  showThumbnails?: boolean
  /** Whether to show navigation controls */
  showNavigation?: boolean
}
