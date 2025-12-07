/**
 * Messages API Service
 * Story 6.3: Direct Messaging Between Teachers & Students
 *
 * This service provides functions to interact with the Messages API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  ConversationListResponse,
  ConversationQueryParams,
  Message,
  MessageCreate,
  MessageReadResponse,
  MessageThreadResponse,
  RecipientListResponse,
  UnreadMessagesCountResponse,
} from "../types/message"

/**
 * Create axios instance with OpenAPI config
 */
const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token interceptor (async to handle async TOKEN function)
apiClient.interceptors.request.use(async (config) => {
  // Set baseURL dynamically to ensure it uses the value set in main.tsx
  if (!config.baseURL) {
    config.baseURL = OpenAPI.BASE
  }

  const token = OpenAPI.TOKEN
  if (token) {
    // Handle both sync and async token functions
    const tokenValue =
      typeof token === "function"
        ? await token({
            method: (config.method || "GET") as
              | "GET"
              | "POST"
              | "PUT"
              | "DELETE"
              | "PATCH"
              | "OPTIONS"
              | "HEAD",
            url: config.url || "",
          })
        : token
    if (tokenValue) {
      config.headers.Authorization = `Bearer ${tokenValue}`
    }
  }
  return config
})

/**
 * Get conversations for the current user with optional pagination
 *
 * @param params - Query parameters for pagination
 * @returns Promise with paginated conversation list
 */
export async function getConversations(
  params: ConversationQueryParams = {},
): Promise<ConversationListResponse> {
  const url = `/api/v1/messages/conversations`
  const response = await apiClient.get<ConversationListResponse>(url, {
    params: {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    },
  })
  return response.data
}

/**
 * Get message thread with a specific user
 *
 * @param partnerId - ID of the conversation partner
 * @returns Promise with message thread
 */
export async function getThread(
  partnerId: string,
): Promise<MessageThreadResponse> {
  const url = `/api/v1/messages/thread/${partnerId}`
  const response = await apiClient.get<MessageThreadResponse>(url)
  return response.data
}

/**
 * Send a new message
 *
 * @param data - Message creation data
 * @returns Promise with the created message
 */
export async function sendMessage(data: MessageCreate): Promise<Message> {
  const url = `/api/v1/messages`
  const response = await apiClient.post<Message>(url, data)
  return response.data
}

/**
 * Mark a specific message as read
 *
 * @param messageId - ID of the message to mark as read
 * @returns Promise with the updated message read status
 */
export async function markAsRead(
  messageId: string,
): Promise<MessageReadResponse> {
  const url = `/api/v1/messages/${messageId}/read`
  const response = await apiClient.patch<MessageReadResponse>(url)
  return response.data
}

/**
 * Get list of allowed recipients for the current user
 *
 * @returns Promise with recipient list
 */
export async function getRecipients(): Promise<RecipientListResponse> {
  const url = `/api/v1/messages/recipients`
  const response = await apiClient.get<RecipientListResponse>(url)
  return response.data
}

/**
 * Get count of unread messages for the current user
 *
 * @returns Promise with unread count
 */
export async function getUnreadCount(): Promise<UnreadMessagesCountResponse> {
  const url = `/api/v1/messages/unread-count`
  const response = await apiClient.get<UnreadMessagesCountResponse>(url)
  return response.data
}

/**
 * Export as object for easier imports
 */
export const messagesApi = {
  getConversations,
  getThread,
  sendMessage,
  markAsRead,
  getRecipients,
  getUnreadCount,
}

export default messagesApi
