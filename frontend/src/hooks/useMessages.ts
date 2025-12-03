/**
 * Custom hooks for direct messaging
 * Story 6.3: Direct Messaging Between Teachers & Students
 *
 * Uses TanStack Query with 30-second polling for real-time updates.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getConversations,
  getThread,
  sendMessage,
  markAsRead,
  getRecipients,
  getUnreadCount,
} from "@/services/messagesApi"
import type {
  ConversationQueryParams,
  Message,
  MessageCreate,
} from "@/types/message"

/**
 * Query keys for messages
 */
export const CONVERSATIONS_QUERY_KEY = ["messages", "conversations"] as const
export const MESSAGES_UNREAD_COUNT_QUERY_KEY = ["messages", "unread-count"] as const
export const RECIPIENTS_QUERY_KEY = ["messages", "recipients"] as const

/**
 * Query key factory for message thread
 */
export const threadQueryKey = (partnerId: string) =>
  ["messages", "thread", partnerId] as const

/**
 * Query key factory for filtered conversations
 */
export const conversationsQueryKey = (params?: ConversationQueryParams) =>
  params
    ? (["messages", "conversations", params] as const)
    : (["messages", "conversations"] as const)

/**
 * Hook for fetching conversations with optional pagination
 *
 * @param params - Optional query parameters for pagination
 * @param options - Optional query options
 */
export function useConversations(
  params: ConversationQueryParams = {},
  options: {
    enabled?: boolean
    refetchInterval?: number | false
  } = {}
) {
  const queryClient = useQueryClient()
  const { enabled = true, refetchInterval = 30000 } = options

  const query = useQuery({
    queryKey: conversationsQueryKey(params),
    queryFn: () => getConversations(params),
    enabled,
    staleTime: 30000, // 30 seconds
    refetchInterval: enabled ? refetchInterval : false,
    refetchIntervalInBackground: false, // Only poll when window is focused
  })

  return {
    conversations: query.data?.conversations ?? [],
    total: query.data?.total ?? 0,
    totalUnread: query.data?.total_unread ?? 0,
    hasMore: query.data?.has_more ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY }),
  }
}

/**
 * Hook for fetching a message thread with a specific user
 *
 * @param partnerId - ID of the conversation partner
 * @param options - Optional query options
 */
export function useMessageThread(
  partnerId: string | null,
  options: {
    enabled?: boolean
    refetchInterval?: number | false
  } = {}
) {
  const queryClient = useQueryClient()
  const { enabled = true, refetchInterval = 10000 } = options

  const query = useQuery({
    queryKey: partnerId ? threadQueryKey(partnerId) : ["messages", "thread", "none"],
    queryFn: async () => {
      const result = await getThread(partnerId!)
      // Backend marks messages as read when fetching thread,
      // so invalidate unread count and conversations to reflect this
      queryClient.invalidateQueries({ queryKey: MESSAGES_UNREAD_COUNT_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
      return result
    },
    enabled: enabled && !!partnerId,
    staleTime: 10000, // 10 seconds for active conversation
    refetchInterval: enabled && partnerId ? refetchInterval : false,
    refetchIntervalInBackground: false,
  })

  return {
    messages: query.data?.messages ?? [],
    participant: query.data
      ? {
          id: query.data.participant_id,
          name: query.data.participant_name,
          email: query.data.participant_email,
          role: query.data.participant_role,
        }
      : null,
    totalMessages: query.data?.total_messages ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    invalidate: () =>
      partnerId &&
      queryClient.invalidateQueries({ queryKey: threadQueryKey(partnerId) }),
  }
}

/**
 * Hook for fetching unread messages count
 * Polls every 30 seconds when window is focused
 */
export function useMessagesUnreadCount(
  options: {
    enabled?: boolean
    refetchInterval?: number | false
  } = {}
) {
  const { enabled = true, refetchInterval = 30000 } = options

  const query = useQuery({
    queryKey: MESSAGES_UNREAD_COUNT_QUERY_KEY,
    queryFn: getUnreadCount,
    enabled,
    staleTime: 30000, // 30 seconds
    refetchInterval: enabled ? refetchInterval : false,
    refetchIntervalInBackground: false,
  })

  return {
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for fetching allowed recipients
 */
export function useRecipients(
  options: {
    enabled?: boolean
  } = {}
) {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: RECIPIENTS_QUERY_KEY,
    queryFn: getRecipients,
    enabled,
    staleTime: 60000, // 1 minute (recipients change infrequently)
  })

  return {
    recipients: query.data?.recipients ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for sending a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: MessageCreate) => sendMessage(data),
    onSuccess: (newMessage) => {
      // Invalidate conversations to refresh the list
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })

      // Add the new message to the thread cache if it exists
      const recipientId = newMessage.recipient_id
      queryClient.setQueryData<{
        participant_id: string
        participant_name: string
        participant_email: string
        participant_role: string
        messages: Message[]
        total_messages: number
      }>(threadQueryKey(recipientId), (old) => {
        if (!old) return old
        return {
          ...old,
          messages: [...old.messages, newMessage],
          total_messages: old.total_messages + 1,
        }
      })
    },
  })

  return {
    sendMessage: mutation.mutate,
    sendMessageAsync: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    lastMessage: mutation.data,
  }
}

/**
 * Hook for marking a message as read
 */
export function useMarkMessageAsRead() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (messageId: string) => markAsRead(messageId),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: MESSAGES_UNREAD_COUNT_QUERY_KEY })
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
 * Combined hook for the messaging page functionality
 * Provides all messaging operations in one hook
 */
export function useMessagingPage(selectedPartnerId: string | null = null) {
  const conversations = useConversations({}, { refetchInterval: 30000 })
  const thread = useMessageThread(selectedPartnerId, { refetchInterval: 10000 })
  const recipients = useRecipients()
  const unreadCount = useMessagesUnreadCount()
  const send = useSendMessage()
  // markRead not used - backend auto-marks messages as read when fetching thread

  const handleSendMessage = async (body: string, subject?: string) => {
    if (!selectedPartnerId) return null

    const message = await send.sendMessageAsync({
      recipient_id: selectedPartnerId,
      body,
      subject,
    })

    return message
  }

  const handleSelectConversation = (partnerId: string) => {
    // Messages in the thread will be automatically marked as read
    // by the backend when fetching the thread
    return partnerId
  }

  return {
    // Conversations
    conversations: conversations.conversations,
    conversationsTotal: conversations.total,
    conversationsLoading: conversations.isLoading,
    conversationsHasMore: conversations.hasMore,

    // Current thread
    messages: thread.messages,
    participant: thread.participant,
    threadLoading: thread.isLoading,
    threadFetching: thread.isFetching,

    // Recipients for composing
    recipients: recipients.recipients,
    recipientsLoading: recipients.isLoading,

    // Unread count
    unreadCount: unreadCount.count,
    totalUnread: conversations.totalUnread,

    // Actions
    onSendMessage: handleSendMessage,
    onSelectConversation: handleSelectConversation,

    // Mutation states
    isSending: send.isSending,
    sendError: send.error,

    // Refetch
    refetch: () => {
      conversations.refetch()
      thread.refetch()
      unreadCount.refetch()
    },

    // Invalidate
    invalidateConversations: conversations.invalidate,
    invalidateThread: thread.invalidate,
  }
}

/**
 * Hook for composing a new message (used in compose modal)
 */
export function useComposeMessage() {
  const recipients = useRecipients()
  const send = useSendMessage()

  const handleSend = async (data: MessageCreate) => {
    const message = await send.sendMessageAsync(data)
    return message
  }

  return {
    recipients: recipients.recipients,
    recipientsLoading: recipients.isLoading,
    recipientsError: recipients.error,
    sendMessage: handleSend,
    isSending: send.isSending,
    sendError: send.error,
    lastMessage: send.lastMessage,
    reset: send.reset,
  }
}
