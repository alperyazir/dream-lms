/**
 * Message type definitions for Dream LMS Direct Messaging.
 * Story 6.3: Direct Messaging Between Teachers & Students
 */

/**
 * Message interface with all fields from API
 */
/**
 * System message categories for icon/color mapping
 */
export type MessageCategory =
  | "assignment_created"
  | "student_completed"
  | "feedback_received";

/**
 * Icon and color config for system message categories
 */
export const MESSAGE_CATEGORY_CONFIG: Record<
  MessageCategory,
  { icon: string; color: string; bgColor: string }
> = {
  assignment_created: {
    icon: "FileText",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  student_completed: {
    icon: "CheckCircle",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  feedback_received: {
    icon: "MessageSquare",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
};

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_email?: string | null;
  recipient_id: string;
  recipient_name: string;
  recipient_email?: string | null;
  subject: string | null;
  body: string;
  parent_message_id: string | null;
  is_read: boolean;
  sent_at: string; // ISO 8601 datetime string
  is_system: boolean;
  context_type: string | null;
  context_id: string | null;
  message_category: MessageCategory | null;
}

/**
 * Request payload for creating a new message
 */
export interface MessageCreate {
  recipient_id: string;
  subject?: string | null;
  body: string;
  parent_message_id?: string | null;
}

/**
 * Conversation summary for conversation list
 */
export interface Conversation {
  participant_id: string;
  participant_name: string;
  participant_email?: string | null;
  participant_role: string;
  last_message_preview: string;
  last_message_timestamp: string; // ISO 8601 datetime string
  unread_count: number;
}

/**
 * Paginated conversation list response from API
 */
export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  total_unread: number;
}

/**
 * Message thread response from API
 */
export interface MessageThreadResponse {
  participant_id: string;
  participant_name: string;
  participant_email?: string | null;
  participant_role: string;
  participant_organization_name?: string | null; // Publisher organization name
  messages: Message[];
  total_messages: number;
}

/**
 * Allowed recipient for messaging
 */
export interface Recipient {
  user_id: string;
  name: string;
  email?: string | null;
  role: string;
  organization_name?: string | null; // Publisher organization name (from DCS)
}

/**
 * Recipient list response from API
 */
export interface RecipientListResponse {
  recipients: Recipient[];
  total: number;
}

/**
 * Message read status update response
 */
export interface MessageReadResponse {
  id: string;
  is_read: boolean;
}

/**
 * Unread messages count response
 */
export interface UnreadMessagesCountResponse {
  count: number;
}

/**
 * Query parameters for fetching conversations
 */
export interface ConversationQueryParams {
  limit?: number;
  offset?: number;
}
