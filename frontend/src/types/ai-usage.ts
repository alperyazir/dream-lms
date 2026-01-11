/**
 * AI Usage Dashboard Types
 */

export interface UsageSummary {
  total_generations: number
  total_cost: number
  success_rate: number
  total_llm_generations: number
  total_tts_generations: number
  total_input_tokens: number
  total_output_tokens: number
  total_audio_characters: number
  average_duration_ms: number
  date_range: {
    from: string | null
    to: string | null
  }
}

export interface UsageByType {
  activity_type: string
  count: number
  cost: number
  success_rate: number
  percentage: number
}

export interface UsageByTeacher {
  teacher_id: string
  teacher_name: string
  total_generations: number
  estimated_cost: number
  top_activity_type: string | null
  last_activity_date: string | null
}

export interface ProviderUsage {
  provider: string
  count: number
  cost: number
}

export interface ProviderBreakdown {
  llm_providers: ProviderUsage[]
  tts_providers: ProviderUsage[]
}

export interface ErrorStatistics {
  total_requests: number
  total_errors: number
  error_rate_percentage: number
  success_rate_percentage: number
}

export interface AIError {
  id: string
  timestamp: string
  provider: string
  error_message: string
  teacher_id: string
  teacher_name: string
  activity_type: string
  operation_type: string
}

export interface ErrorResponse {
  error_statistics: ErrorStatistics
  recent_errors: AIError[]
}

export interface DateRange {
  from: Date | null
  to: Date | null
}
