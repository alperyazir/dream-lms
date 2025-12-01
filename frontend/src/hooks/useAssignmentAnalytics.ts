/**
 * Assignment Analytics Hooks
 * Story 8.4: Multi-Activity Assignment Analytics
 *
 * React Query hooks for fetching assignment analytics data.
 */

import { useQuery } from "@tanstack/react-query"
import {
  getAssignmentAnalytics,
  getStudentAssignmentResult,
} from "@/services/assignmentsApi"
import type {
  MultiActivityAnalyticsResponse,
  StudentAssignmentResultResponse,
} from "@/types/assignment"

/**
 * Query key factory for analytics queries
 */
export const analyticsQueryKeys = {
  all: ["analytics"] as const,
  assignment: (assignmentId: string) =>
    [...analyticsQueryKeys.all, "assignment", assignmentId] as const,
  assignmentExpanded: (assignmentId: string, activityId: string) =>
    [...analyticsQueryKeys.assignment(assignmentId), "expanded", activityId] as const,
  studentResult: (assignmentId: string) =>
    [...analyticsQueryKeys.all, "studentResult", assignmentId] as const,
}

/**
 * Hook to fetch analytics for a multi-activity assignment (teacher view)
 *
 * @param assignmentId - ID of the assignment
 * @param expandActivityId - Optional activity ID to expand with per-student scores
 * @param enabled - Whether the query should run
 * @returns Query result with analytics data
 */
export function useAssignmentAnalytics(
  assignmentId: string,
  expandActivityId?: string,
  enabled = true,
) {
  return useQuery<MultiActivityAnalyticsResponse>({
    queryKey: expandActivityId
      ? analyticsQueryKeys.assignmentExpanded(assignmentId, expandActivityId)
      : analyticsQueryKeys.assignment(assignmentId),
    queryFn: () => getAssignmentAnalytics(assignmentId, expandActivityId),
    enabled: enabled && Boolean(assignmentId),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  })
}

/**
 * Hook to fetch student's own result for a multi-activity assignment (student view)
 *
 * @param assignmentId - ID of the assignment
 * @param enabled - Whether the query should run
 * @returns Query result with student's score breakdown
 */
export function useStudentAssignmentResult(
  assignmentId: string,
  enabled = true,
) {
  return useQuery<StudentAssignmentResultResponse>({
    queryKey: analyticsQueryKeys.studentResult(assignmentId),
    queryFn: () => getStudentAssignmentResult(assignmentId),
    enabled: enabled && Boolean(assignmentId),
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
  })
}
