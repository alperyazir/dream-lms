/**
 * Custom hook for AI Usage data
 */

import { useQuery } from "@tanstack/react-query"
import { aiUsageApi } from "@/services/aiUsageApi"
import type { DateRange } from "@/types/ai-usage"

/**
 * Hook to get current user's own AI usage (teacher-accessible)
 * Returns current month's usage stored in teacher record
 */
export function useMyAIUsage() {
  return useQuery({
    queryKey: ["ai-usage", "my-usage"],
    queryFn: () => aiUsageApi.getMyUsage(),
    staleTime: 30000, // 30 seconds
  })
}

export function useAIUsageSummary(dateRange: DateRange) {
  return useQuery({
    queryKey: ["ai-usage", "summary", dateRange.from, dateRange.to],
    queryFn: () => aiUsageApi.getSummary(dateRange.from, dateRange.to),
    staleTime: 60000, // 1 minute
  })
}

export function useAIUsageByType(dateRange: DateRange) {
  return useQuery({
    queryKey: ["ai-usage", "by-type", dateRange.from, dateRange.to],
    queryFn: () => aiUsageApi.getByType(dateRange.from, dateRange.to),
    staleTime: 60000,
  })
}

export function useAIUsageByTeacher(dateRange: DateRange, limit = 100) {
  return useQuery({
    queryKey: ["ai-usage", "by-teacher", dateRange.from, dateRange.to, limit],
    queryFn: () => aiUsageApi.getByTeacher(dateRange.from, dateRange.to, limit),
    staleTime: 60000,
  })
}

export function useAIUsageByProvider(dateRange: DateRange) {
  return useQuery({
    queryKey: ["ai-usage", "by-provider", dateRange.from, dateRange.to],
    queryFn: () => aiUsageApi.getByProvider(dateRange.from, dateRange.to),
    staleTime: 60000,
  })
}

export function useAIUsageErrors(dateRange: DateRange, limit = 100) {
  return useQuery({
    queryKey: ["ai-usage", "errors", dateRange.from, dateRange.to, limit],
    queryFn: () => aiUsageApi.getErrors(dateRange.from, dateRange.to, limit),
    staleTime: 30000, // 30 seconds for errors
  })
}
