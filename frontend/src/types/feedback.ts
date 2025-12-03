/**
 * Feedback type definitions for Dream LMS Teacher Feedback.
 * Story 6.4: Teacher Feedback on Assignments
 * Story 6.5: Feedback Enhancements (Badges & Emoji Reactions)
 */

/**
 * Badge information type (Story 6.5)
 */
export interface BadgeInfo {
  slug: string
  label: string
  icon: string
}

/**
 * Emoji reaction information type (Story 6.5)
 */
export interface EmojiInfo {
  slug: string
  emoji: string
}

/**
 * Predefined badges matching backend constants (Story 6.5, AC: 2)
 */
export const PREDEFINED_BADGES: BadgeInfo[] = [
  { slug: "perfect_score", label: "Perfect Score", icon: "💯" },
  { slug: "great_improvement", label: "Great Improvement", icon: "📈" },
  { slug: "creative_thinking", label: "Creative Thinking", icon: "💡" },
  { slug: "hard_worker", label: "Hard Worker", icon: "💪" },
  { slug: "fast_learner", label: "Fast Learner", icon: "⚡" },
  { slug: "needs_review", label: "Needs Review", icon: "📚" },
]

/**
 * Available emoji reactions matching backend constants (Story 6.5, AC: 5)
 */
export const AVAILABLE_EMOJI_REACTIONS: EmojiInfo[] = [
  { slug: "thumbs_up", emoji: "👍" },
  { slug: "heart", emoji: "❤️" },
  { slug: "star", emoji: "⭐" },
  { slug: "party", emoji: "🎉" },
  { slug: "fire", emoji: "🔥" },
  { slug: "hundred", emoji: "💯" },
]

/**
 * Badge labels lookup for display
 */
export const BADGE_LABELS: Record<string, string> = Object.fromEntries(
  PREDEFINED_BADGES.map((b) => [b.slug, b.label])
)

/**
 * Badge icons lookup for display
 */
export const BADGE_ICONS: Record<string, string> = Object.fromEntries(
  PREDEFINED_BADGES.map((b) => [b.slug, b.icon])
)

/**
 * Emoji display lookup
 */
export const EMOJI_DISPLAY: Record<string, string> = Object.fromEntries(
  AVAILABLE_EMOJI_REACTIONS.map((e) => [e.slug, e.emoji])
)

/**
 * Request payload for creating feedback
 */
export interface FeedbackCreate {
  feedback_text: string
  is_draft?: boolean
  badges?: string[] // Story 6.5: Badge slugs to award
  emoji_reaction?: string | null // Story 6.5: Single emoji reaction slug
}

/**
 * Request payload for updating feedback
 */
export interface FeedbackUpdate {
  feedback_text?: string
  is_draft?: boolean
  badges?: string[] // Story 6.5: Badge slugs to update
  emoji_reaction?: string | null // Story 6.5: Emoji reaction slug to update
}

/**
 * Student badge counts response (Story 6.5, AC: 9, 14)
 */
export interface StudentBadgeCountsResponse {
  badge_counts: Record<string, number>
  total: number
  this_month: Record<string, number>
  this_month_total: number
}

/**
 * Full feedback response (for teachers)
 */
export interface FeedbackPublic {
  id: string
  assignment_student_id: string
  teacher_id: string
  feedback_text: string | null
  badges: string[]
  emoji_reactions: string[]
  is_draft: boolean
  created_at: string // ISO 8601 datetime string
  updated_at: string // ISO 8601 datetime string
  assignment_id: string
  assignment_name: string
  student_id: string
  student_name: string
  student_user_id: string
  teacher_name: string
  teacher_user_id: string
  score: number | null
}

/**
 * Limited feedback view for students
 */
export interface FeedbackStudentView {
  id: string
  feedback_text: string | null
  badges: string[]
  emoji_reactions: string[]
  created_at: string // ISO 8601 datetime string
  updated_at: string // ISO 8601 datetime string
  teacher_name: string
  teacher_user_id: string
  assignment_name: string
  assignment_id: string
}

/**
 * Union type for feedback responses (API can return either)
 */
export type FeedbackResponse = FeedbackPublic | FeedbackStudentView

/**
 * Type guard to check if feedback is the full public version
 */
export function isFeedbackPublic(
  feedback: FeedbackResponse
): feedback is FeedbackPublic {
  return "is_draft" in feedback && "student_id" in feedback
}

/**
 * Type guard to check if feedback is the student view
 */
export function isFeedbackStudentView(
  feedback: FeedbackResponse
): feedback is FeedbackStudentView {
  return !("is_draft" in feedback)
}
