/**
 * Custom hooks for notification management
 * Story 6.1: Notification System Foundation
 *
 * Uses TanStack Query with 30-second polling for real-time updates.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  cancelGlobalMute,
  getMuteStatus,
  getNotifications,
  getPreferences,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  setGlobalMute,
  updateSinglePreference,
} from "@/services/notificationsApi"
import type {
  GlobalMuteStatus,
  Notification,
  NotificationPreference,
  NotificationQueryParams,
  NotificationType,
} from "@/types/notification"

/**
 * Query keys for notifications
 */
export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const
export const UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const
export const PREFERENCES_QUERY_KEY = ["notifications", "preferences"] as const
export const MUTE_STATUS_QUERY_KEY = ["notifications", "mute"] as const

/**
 * Query key factory for filtered notifications
 */
export const notificationsQueryKey = (params?: NotificationQueryParams) =>
  params ? (["notifications", params] as const) : (["notifications"] as const)

/**
 * Hook for fetching notifications with optional filtering and pagination
 *
 * @param params - Optional query parameters for filtering
 * @param options - Optional query options
 */
export function useNotifications(
  params: NotificationQueryParams = {},
  options: {
    enabled?: boolean
    refetchInterval?: number | false
  } = {},
) {
  const queryClient = useQueryClient()
  const { enabled = true, refetchInterval = 30000 } = options

  const query = useQuery({
    queryKey: notificationsQueryKey(params),
    queryFn: () => getNotifications(params),
    enabled,
    staleTime: 30000, // 30 seconds
    refetchInterval: enabled ? refetchInterval : false,
    refetchIntervalInBackground: false, // Only poll when window is focused
  })

  return {
    notifications: query.data?.notifications ?? [],
    total: query.data?.total ?? 0,
    hasMore: query.data?.has_more ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  }
}

/**
 * Hook for fetching unread notification count
 * Polls every 30 seconds when window is focused
 */
export function useUnreadCount(
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  const { enabled = true, refetchInterval = 30000 } = options

  const query = useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: getUnreadCount,
    enabled,
    staleTime: 30000, // 30 seconds
    refetchInterval: enabled ? refetchInterval : false,
    refetchIntervalInBackground: false, // Only poll when window is focused
  })

  return {
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for marking a single notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: (updatedNotification) => {
      // Optimistically update the notification in all cached queries
      queryClient.setQueriesData<{
        notifications: Notification[]
        total: number
        has_more: boolean
      }>({ queryKey: NOTIFICATIONS_QUERY_KEY }, (old) => {
        if (!old) return old
        return {
          ...old,
          notifications: old.notifications.map((n) =>
            n.id === updatedNotification.id ? updatedNotification : n,
          ),
        }
      })

      // Update unread count
      queryClient.setQueryData<{ count: number }>(
        UNREAD_COUNT_QUERY_KEY,
        (old) => (old ? { count: Math.max(0, old.count - 1) } : { count: 0 }),
      )
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY })
    },
  })

  return {
    markAsRead: mutation.mutate,
    markAsReadAsync: mutation.mutateAsync,
    isMarking: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}

/**
 * Hook for marking all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      // Optimistically mark all notifications as read
      queryClient.setQueriesData<{
        notifications: Notification[]
        total: number
        has_more: boolean
      }>({ queryKey: NOTIFICATIONS_QUERY_KEY }, (old) => {
        if (!old) return old
        return {
          ...old,
          notifications: old.notifications.map((n) => ({
            ...n,
            is_read: true,
          })),
        }
      })

      // Set unread count to 0
      queryClient.setQueryData<{ count: number }>(UNREAD_COUNT_QUERY_KEY, {
        count: 0,
      })
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY })
    },
  })

  return {
    markAllAsRead: mutation.mutate,
    markAllAsReadAsync: mutation.mutateAsync,
    isMarking: mutation.isPending,
    markedCount: mutation.data?.marked_count ?? 0,
    error: mutation.error,
    reset: mutation.reset,
  }
}

/**
 * Combined hook for notification panel functionality
 * Provides all notification operations in one hook
 */
export function useNotificationPanel() {
  const notifications = useNotifications({ limit: 10 })
  const unreadCount = useUnreadCount()
  const markRead = useMarkAsRead()
  const markAllRead = useMarkAllAsRead()

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markRead.markAsReadAsync(notification.id)
    }
  }

  const handleMarkAllRead = async () => {
    await markAllRead.markAllAsReadAsync()
  }

  return {
    // Notifications data
    notifications: notifications.notifications,
    total: notifications.total,
    hasMore: notifications.hasMore,
    isLoading: notifications.isLoading,

    // Unread count
    unreadCount: unreadCount.count,

    // Actions
    onNotificationClick: handleNotificationClick,
    onMarkAllRead: handleMarkAllRead,

    // Mutation states
    isMarkingRead: markRead.isMarking,
    isMarkingAllRead: markAllRead.isMarking,

    // Refetch
    refetch: () => {
      notifications.refetch()
      unreadCount.refetch()
    },
  }
}

/**
 * Hook for the full notifications page with filtering support
 */
export function useNotificationsPage(
  initialParams: NotificationQueryParams = {},
) {
  const notifications = useNotifications(initialParams, {
    // Disable automatic polling on the full page
    refetchInterval: false,
  })
  const unreadCount = useUnreadCount({ refetchInterval: false })
  const markRead = useMarkAsRead()
  const markAllRead = useMarkAllAsRead()

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markRead.markAsReadAsync(notification.id)
    }
  }

  const handleMarkAllRead = async () => {
    await markAllRead.markAllAsReadAsync()
  }

  return {
    // Notifications data
    notifications: notifications.notifications,
    total: notifications.total,
    hasMore: notifications.hasMore,
    isLoading: notifications.isLoading,
    isFetching: notifications.isFetching,

    // Unread count
    unreadCount: unreadCount.count,

    // Actions
    onNotificationClick: handleNotificationClick,
    onMarkAllRead: handleMarkAllRead,

    // Mutation states
    isMarkingRead: markRead.isMarking,
    isMarkingAllRead: markAllRead.isMarking,

    // Refetch
    refetch: () => {
      notifications.refetch()
      unreadCount.refetch()
    },

    // Invalidate for filter changes
    invalidate: notifications.invalidate,
  }
}

// =============================================================================
// Notification Preferences Hooks (Story 6.8)
// =============================================================================

/**
 * Hook for fetching notification preferences
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: getPreferences,
    staleTime: 60000, // 1 minute - preferences don't change often
  })

  return {
    preferences: query.data?.preferences ?? [],
    globalMute: query.data?.global_mute ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY }),
  }
}

/**
 * Hook for updating a single notification preference
 */
export function useUpdatePreference() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      notificationType,
      enabled,
    }: {
      notificationType: NotificationType
      enabled: boolean
    }) => updateSinglePreference(notificationType, { enabled }),
    onMutate: async ({ notificationType, enabled }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PREFERENCES_QUERY_KEY })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(PREFERENCES_QUERY_KEY)

      // Optimistically update
      queryClient.setQueryData<{
        preferences: NotificationPreference[]
        global_mute: GlobalMuteStatus | null
      }>(PREFERENCES_QUERY_KEY, (old) => {
        if (!old) return old
        return {
          ...old,
          preferences: old.preferences.map((p) =>
            p.notification_type === notificationType ? { ...p, enabled } : p,
          ),
        }
      })

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(PREFERENCES_QUERY_KEY, context.previousData)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY })
    },
  })

  return {
    updatePreference: mutation.mutate,
    updatePreferenceAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}

/**
 * Hook for global notification mute
 */
export function useGlobalMute() {
  const queryClient = useQueryClient()

  const muteQuery = useQuery({
    queryKey: MUTE_STATUS_QUERY_KEY,
    queryFn: getMuteStatus,
    staleTime: 30000, // 30 seconds - mute can expire
    refetchInterval: 60000, // Poll every minute for expiration
  })

  const setMuteMutation = useMutation({
    mutationFn: (hours: number) => setGlobalMute({ hours }),
    onSuccess: (data) => {
      queryClient.setQueryData(MUTE_STATUS_QUERY_KEY, {
        is_muted: true,
        mute: data,
      })
      // Also invalidate preferences since it includes mute status
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY })
    },
  })

  const cancelMuteMutation = useMutation({
    mutationFn: cancelGlobalMute,
    onSuccess: () => {
      queryClient.setQueryData(MUTE_STATUS_QUERY_KEY, {
        is_muted: false,
        mute: null,
      })
      // Also invalidate preferences since it includes mute status
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY })
    },
  })

  return {
    isMuted: muteQuery.data?.is_muted ?? false,
    muteStatus: muteQuery.data?.mute ?? null,
    isLoading: muteQuery.isLoading,

    // Set mute
    setMute: setMuteMutation.mutate,
    setMuteAsync: setMuteMutation.mutateAsync,
    isSettingMute: setMuteMutation.isPending,
    setMuteError: setMuteMutation.error,

    // Cancel mute
    cancelMute: cancelMuteMutation.mutate,
    cancelMuteAsync: cancelMuteMutation.mutateAsync,
    isCancellingMute: cancelMuteMutation.isPending,
    cancelMuteError: cancelMuteMutation.error,

    refetch: muteQuery.refetch,
  }
}

/**
 * Combined hook for notification settings page
 * Provides all preference and mute operations
 */
export function useNotificationSettings() {
  const preferences = useNotificationPreferences()
  const updatePreference = useUpdatePreference()
  const globalMute = useGlobalMute()

  const handleTogglePreference = async (
    notificationType: NotificationType,
    enabled: boolean,
  ) => {
    await updatePreference.updatePreferenceAsync({ notificationType, enabled })
  }

  const handleSetMute = async (hours: number) => {
    await globalMute.setMuteAsync(hours)
  }

  const handleCancelMute = async () => {
    await globalMute.cancelMuteAsync()
  }

  return {
    // Preferences
    preferences: preferences.preferences,
    isLoadingPreferences: preferences.isLoading,
    preferencesError: preferences.error,

    // Global mute from preferences response (more accurate)
    globalMuteFromPrefs: preferences.globalMute,

    // Real-time mute status
    isMuted: globalMute.isMuted,
    muteStatus: globalMute.muteStatus,
    isLoadingMute: globalMute.isLoading,

    // Actions
    onTogglePreference: handleTogglePreference,
    onSetMute: handleSetMute,
    onCancelMute: handleCancelMute,

    // Mutation states
    isUpdatingPreference: updatePreference.isUpdating,
    isSettingMute: globalMute.isSettingMute,
    isCancellingMute: globalMute.isCancellingMute,

    // Refetch
    refetch: () => {
      preferences.refetch()
      globalMute.refetch()
    },
  }
}
