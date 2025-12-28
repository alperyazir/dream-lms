/**
 * Analytics type definitions for Dream LMS.
 * Story 5.1: Individual Student Performance Dashboard
 */

/**
 * Time period for analytics filtering
 */
export type PeriodType = "7d" | "30d" | "3m" | "all"

/**
 * Basic student information for analytics display
 */
export interface StudentInfo {
  id: string
  name: string
  photo_url: string | null
}

/**
 * Aggregated summary metrics for a student
 */
export interface AnalyticsSummary {
  avg_score: number
  total_completed: number
  completion_rate: number
  current_streak: number
}

/**
 * Single recent assignment completion
 */
export interface RecentActivityItem {
  assignment_id: string
  assignment_name: string
  score: number
  completed_at: string // ISO 8601 datetime string
  time_spent_minutes: number
}

/**
 * Single data point in performance trend chart
 */
export interface PerformanceTrendPoint {
  date: string // ISO date format: YYYY-MM-DD
  score: number
}

/**
 * Performance breakdown by activity type
 */
export interface ActivityBreakdownItem {
  activity_type: string
  avg_score: number
  count: number
}

/**
 * Counts of assignments by status
 */
export interface StatusSummary {
  not_started: number
  in_progress: number
  completed: number
  past_due: number
}

/**
 * Time-based performance metrics
 */
export interface TimeAnalytics {
  avg_time_per_assignment: number
  total_time_this_week: number
  total_time_this_month: number
}

/**
 * Complete student analytics data response
 */
export interface StudentAnalyticsResponse {
  student: StudentInfo
  summary: AnalyticsSummary
  recent_activity: RecentActivityItem[]
  performance_trend: PerformanceTrendPoint[]
  activity_breakdown: ActivityBreakdownItem[]
  status_summary: StatusSummary
  time_analytics: TimeAnalytics
}

// ============================================================================
// Class Analytics Types - Story 5.2
// ============================================================================

/**
 * Time period for class analytics filtering (academic periods)
 */
export type ClassPeriodType = "weekly" | "monthly" | "semester" | "ytd"

/**
 * Aggregated summary metrics for a class
 */
export interface ClassAnalyticsSummary {
  avg_score: number
  completion_rate: number
  total_assignments: number
  active_students: number
}

/**
 * Single bucket in score distribution histogram
 */
export interface ScoreDistributionBucket {
  range_label: string // e.g., "0-59%", "60-69%"
  min_score: number
  max_score: number
  count: number
}

/**
 * Student entry in leaderboard
 */
export interface StudentLeaderboardItem {
  student_id: string
  name: string
  avg_score: number
  rank: number
}

/**
 * Student flagged as struggling
 */
export interface StrugglingStudentItem {
  student_id: string
  name: string
  avg_score: number
  past_due_count: number
  alert_reason: string // e.g., "Low average score", "Multiple past due assignments"
}

/**
 * Performance metrics for a single assignment
 */
export interface AssignmentPerformanceItem {
  assignment_id: string
  name: string
  avg_score: number
  completion_rate: number
  avg_time_spent: number // minutes
}

/**
 * Performance breakdown by activity type (for class analytics)
 */
export interface ActivityTypePerformanceItem {
  activity_type: string
  avg_score: number
  count: number
}

/**
 * Trend analysis for a metric
 */
export interface TrendData {
  metric_name: string
  current_value: number
  previous_value: number
  change_percent: number
  trend: "up" | "down" | "stable"
}

/**
 * Complete class analytics data response
 */
export interface ClassAnalyticsResponse {
  class_id: string
  class_name: string
  summary: ClassAnalyticsSummary
  score_distribution: ScoreDistributionBucket[]
  leaderboard: StudentLeaderboardItem[]
  struggling_students: StrugglingStudentItem[]
  assignment_performance: AssignmentPerformanceItem[]
  activity_type_performance: ActivityTypePerformanceItem[]
  trends: TrendData[]
}

// ============================================================================
// Assignment Detailed Results Types - Story 5.3
// ============================================================================

/**
 * Completion status counts for an assignment
 */
export interface CompletionOverview {
  completed: number
  in_progress: number
  not_started: number
  past_due: number
  total: number
}

/**
 * Score statistics for an assignment
 */
export interface ScoreStatistics {
  avg_score: number
  median_score: number
  highest_score: number
  lowest_score: number
}

/**
 * Individual student's result for an assignment
 */
export interface StudentResultItem {
  student_id: string
  name: string
  status: string
  score: number | null
  time_spent_minutes: number
  completed_at: string | null // ISO 8601 datetime string
  has_feedback: boolean
}

/**
 * Distribution of answers for a single option
 */
export interface AnswerDistributionItem {
  option: string
  count: number
  percentage: number
  is_correct: boolean
}

/**
 * Analysis of a single question/item
 */
export interface QuestionAnalysis {
  question_id: string
  question_text: string
  correct_percentage: number
  total_responses: number
  answer_distribution: AnswerDistributionItem[]
}

/**
 * A question that was frequently missed
 */
export interface MostMissedQuestion {
  question_id: string
  question_text: string
  correct_percentage: number
  common_wrong_answer: string | null
}

/**
 * Common incorrect word pair mappings
 */
export interface WordMatchingError {
  word: string
  correct_match: string
  common_incorrect_match: string
  error_count: number
}

/**
 * Analysis for a fill-in-blank item
 */
export interface FillInBlankAnalysis {
  blank_id: string
  blank_context: string
  correct_answer: string
  correct_rate: number
  common_wrong_answers: string[]
}

/**
 * Analysis for word search activity
 */
export interface WordSearchAnalysis {
  word: string
  find_rate: number
  found_count: number
  total_attempts: number
}

/**
 * Activity-type specific analysis results
 */
export interface ActivityTypeAnalysis {
  activity_type: string
  questions: QuestionAnalysis[] | null
  most_missed: MostMissedQuestion[] | null
  word_matching_errors: WordMatchingError[] | null
  fill_in_blank: FillInBlankAnalysis[] | null
  word_search: WordSearchAnalysis[] | null
}

/**
 * Individual student's full answers for an assignment
 */
export interface StudentAnswersResponse {
  student_id: string
  name: string
  status: string
  score: number | null
  time_spent_minutes: number
  started_at: string | null // ISO 8601 datetime string
  completed_at: string | null // ISO 8601 datetime string
  answers_json: Record<string, unknown> | null
}

/**
 * Complete detailed results for an assignment
 */
export interface AssignmentDetailedResultsResponse {
  assignment_id: string
  assignment_name: string
  activity_type: string
  due_date: string | null // ISO 8601 datetime string
  completion_overview: CompletionOverview
  score_statistics: ScoreStatistics | null
  student_results: StudentResultItem[]
  question_analysis: ActivityTypeAnalysis | null
}

// ============================================================================
// Student Progress Types - Story 5.5
// ============================================================================

/**
 * Time period for student progress filtering
 */
export type StudentProgressPeriod = "this_week" | "this_month" | "all_time"

/**
 * Trend of student improvement
 */
export type ImprovementTrend = "improving" | "stable" | "declining"

/**
 * Overall student progress statistics
 */
export interface StudentProgressStats {
  total_completed: number
  avg_score: number
  current_streak: number
  streak_start_date: string | null // ISO date format: YYYY-MM-DD
  improvement_trend: ImprovementTrend
}

/**
 * Student's average score for an activity type with user-friendly label
 */
export interface ActivityTypeScore {
  activity_type: string
  avg_score: number
  total_completed: number
  label: string // User-friendly label (e.g., "Word Matching" instead of "matchTheWords")
}

/**
 * Data point for score trend chart
 */
export interface ScoreTrendPoint {
  date: string // ISO date format: YYYY-MM-DD
  score: number
  assignment_name: string
}

/**
 * Recent assignment for student progress view
 */
export interface ProgressRecentAssignment {
  id: string
  name: string
  score: number
  completed_at: string // ISO 8601 datetime string
  has_feedback: boolean
  activity_type: string
  book_title: string
}

/**
 * Student achievement/badge
 */
export interface Achievement {
  id: string
  type: string // e.g., "perfect_score", "streak_7", "first_complete"
  title: string
  description: string
  earned_at: string // ISO 8601 datetime string
  icon: string // Icon identifier (e.g., "star", "flame", "trophy")
}

/**
 * Study time statistics
 */
export interface StudyTimeStats {
  this_week_minutes: number
  this_month_minutes: number
  avg_per_assignment: number
}

/**
 * Complete student progress response
 */
export interface StudentProgressResponse {
  stats: StudentProgressStats
  score_trend: ScoreTrendPoint[]
  activity_breakdown: ActivityTypeScore[]
  recent_assignments: ProgressRecentAssignment[]
  achievements: Achievement[]
  study_time: StudyTimeStats
  improvement_tips: string[]
}
