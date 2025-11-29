/**
 * Benchmark type definitions for Dream LMS.
 * Story 5.7: Performance Comparison & Benchmarking
 */

/**
 * Benchmark level types
 */
export type BenchmarkLevel = "school" | "publisher"

/**
 * Benchmark time period types
 */
export type BenchmarkPeriod = "weekly" | "monthly" | "semester" | "all"

/**
 * Aggregated benchmark data for a level (school or publisher)
 */
export interface BenchmarkData {
  level: BenchmarkLevel
  average_score: number
  completion_rate: number
  sample_size: number
  period: BenchmarkPeriod
  is_available: boolean
}

/**
 * Performance comparison for a specific activity type
 */
export interface ActivityTypeBenchmark {
  activity_type: string
  activity_label: string
  class_average: number
  benchmark_average: number
  difference_percent: number
}

/**
 * Single data point in benchmark trend over time
 */
export interface BenchmarkTrendPoint {
  period: string
  period_label: string
  class_average: number
  school_benchmark: number | null
  publisher_benchmark: number | null
}

/**
 * Current class performance metrics
 */
export interface ClassMetrics {
  class_id: string
  class_name: string
  average_score: number
  completion_rate: number
  total_assignments: number
  active_students: number
}

/**
 * Message type for benchmark performance
 */
export type BenchmarkMessageType =
  | "excelling"
  | "above_average"
  | "at_average"
  | "below_average"
  | "needs_focus"

/**
 * Encouraging or constructive message based on performance
 */
export interface BenchmarkMessage {
  type: BenchmarkMessageType
  title: string
  description: string
  icon: string
  focus_area: string | null
}

/**
 * Complete benchmark comparison response for a class
 */
export interface ClassBenchmarkResponse {
  class_metrics: ClassMetrics
  school_benchmark: BenchmarkData | null
  publisher_benchmark: BenchmarkData | null
  activity_benchmarks: ActivityTypeBenchmark[]
  comparison_over_time: BenchmarkTrendPoint[]
  message: BenchmarkMessage | null
  benchmarking_enabled: boolean
  disabled_reason: string | null
}

/**
 * Benchmark settings for an entity
 */
export interface BenchmarkSettings {
  benchmarking_enabled: boolean
}

/**
 * Request to update benchmark settings
 */
export interface BenchmarkSettingsUpdate {
  benchmarking_enabled: boolean
}

/**
 * Response after updating benchmark settings
 */
export interface BenchmarkSettingsResponse {
  entity_type: "school" | "publisher"
  entity_id: string
  benchmarking_enabled: boolean
  updated_at: string
}

// Admin Benchmark Overview Types

/**
 * Summary of a school's benchmark status for admin view
 */
export interface SchoolBenchmarkSummary {
  school_id: string
  school_name: string
  benchmarking_enabled: boolean
  class_count: number
  average_score: number | null
  performance_status: "above_average" | "average" | "below_average" | null
}

/**
 * System-wide statistics for an activity type
 */
export interface ActivityTypeStat {
  activity_type: string
  activity_label: string
  system_average: number
  total_completions: number
}

/**
 * System-wide benchmark overview for admin dashboard
 */
export interface AdminBenchmarkOverview {
  total_schools: number
  schools_with_benchmarking: number
  schools_above_average: number
  schools_at_average: number
  schools_below_average: number
  system_average_score: number
  activity_type_stats: ActivityTypeStat[]
  school_summaries: SchoolBenchmarkSummary[]
  last_calculated: string
}
