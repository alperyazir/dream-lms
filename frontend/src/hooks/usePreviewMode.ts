/**
 * Preview Mode Hook - Story 9.7
 *
 * State management for activity preview and assignment test mode.
 * Handles loading preview data and managing preview/test mode state.
 */

import { useMutation, useQuery } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { previewActivity, previewAssignment } from "@/services/assignmentsApi"
import type {
  ActivityPreviewResponse,
  AssignmentPreviewResponse,
} from "@/types/assignment"

interface UseActivityPreviewOptions {
  activityId: string | null
  enabled?: boolean
}

interface UseAssignmentPreviewOptions {
  assignmentId: string | null
  enabled?: boolean
}

/**
 * Hook for previewing a single activity
 */
export function useActivityPreview({
  activityId,
  enabled = true,
}: UseActivityPreviewOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const {
    data: activity,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["activity-preview", activityId],
    queryFn: () => previewActivity(activityId!),
    enabled: enabled && !!activityId && isModalOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const openPreview = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const closePreview = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return {
    activity,
    isLoading,
    error,
    isModalOpen,
    openPreview,
    closePreview,
    refetch,
  }
}

/**
 * Hook for testing an assignment (preview mode)
 */
export function useAssignmentPreview({
  assignmentId,
  enabled = true,
}: UseAssignmentPreviewOptions) {
  const [isTestModeActive, setIsTestModeActive] = useState(false)
  const [testKey, setTestKey] = useState(0) // For forcing re-mount on retry

  const {
    data: assignment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["assignment-preview", assignmentId],
    queryFn: () => previewAssignment(assignmentId!),
    enabled: enabled && !!assignmentId && isTestModeActive,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const startTestMode = useCallback(() => {
    setIsTestModeActive(true)
  }, [])

  const exitTestMode = useCallback(() => {
    setIsTestModeActive(false)
  }, [])

  const retryTestMode = useCallback(() => {
    // Increment key to force MultiActivityPlayer to re-mount
    setTestKey((prev) => prev + 1)
  }, [])

  return {
    assignment,
    isLoading,
    error,
    isTestModeActive,
    testKey,
    startTestMode,
    exitTestMode,
    retryTestMode,
    refetch,
  }
}

/**
 * Hook for quick activity preview (fetch on demand)
 */
export function useQuickActivityPreview() {
  const [previewActivity, setPreviewActivity] =
    useState<ActivityPreviewResponse | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: (activityId: string) =>
      import("@/services/assignmentsApi").then((mod) =>
        mod.previewActivity(activityId),
      ),
    onSuccess: (data) => {
      setPreviewActivity(data)
      setIsModalOpen(true)
    },
  })

  const openPreview = useCallback((activityId: string) => {
    mutation.mutate(activityId)
  }, [mutation])

  const closePreview = useCallback(() => {
    setIsModalOpen(false)
    setPreviewActivity(null)
  }, [])

  return {
    previewActivity,
    isLoading: mutation.isPending,
    error: mutation.error,
    isModalOpen,
    openPreview,
    closePreview,
  }
}

/**
 * Hook for quick assignment test mode (fetch on demand)
 */
export function useQuickAssignmentTest() {
  const [previewAssignment, setPreviewAssignment] =
    useState<AssignmentPreviewResponse | null>(null)
  const [isTestModeActive, setIsTestModeActive] = useState(false)
  const [testKey, setTestKey] = useState(0)

  const mutation = useMutation({
    mutationFn: (assignmentId: string) =>
      import("@/services/assignmentsApi").then((mod) =>
        mod.previewAssignment(assignmentId),
      ),
    onSuccess: (data) => {
      setPreviewAssignment(data)
      setIsTestModeActive(true)
    },
  })

  const startTestMode = useCallback((assignmentId: string) => {
    mutation.mutate(assignmentId)
  }, [mutation])

  const exitTestMode = useCallback(() => {
    setIsTestModeActive(false)
    setPreviewAssignment(null)
  }, [])

  const retryTestMode = useCallback(() => {
    setTestKey((prev) => prev + 1)
  }, [])

  return {
    previewAssignment,
    isLoading: mutation.isPending,
    error: mutation.error,
    isTestModeActive,
    testKey,
    startTestMode,
    exitTestMode,
    retryTestMode,
  }
}
