import React from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/lib/mockData"

export interface ConversationListProps {
  conversations: Conversation[]
  selectedConversationId?: string
  onConversationClick: (conversationId: string) => void
}

/**
 * Conversation List Component
 * Displays all conversations with participant info, last message preview, and unread indicators
 */
export const ConversationList = React.memo(
  ({
    conversations,
    selectedConversationId,
    onConversationClick,
  }: ConversationListProps) => {
    // Format timestamp for display
    const formatTimestamp = (timestamp: string): string => {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

      if (diffInHours < 1) {
        const minutes = Math.floor(diffInHours * 60)
        return `${minutes}m ago`
      }
      if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`
      }
      if (diffInHours < 48) {
        return "Yesterday"
      }
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }

    return (
      <div className="px-2 py-1">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No conversations found
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              onClick={() => onConversationClick(conversation.id)}
              className={cn(
                "w-full p-4 flex items-start gap-3 rounded-lg transition-colors text-left mb-1",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "focus:outline-none focus:ring-2 focus:ring-teal-500",
                selectedConversationId === conversation.id
                  ? "bg-teal-50 dark:bg-teal-900/20 border-l-4 border-teal-600"
                  : "border-l-4 border-transparent",
              )}
            >
              {/* Avatar */}
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarFallback className="bg-teal-600 text-white">
                  {conversation.participant_avatar}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1">
                    <span
                      className={cn(
                        "font-semibold text-gray-900 dark:text-white truncate",
                        conversation.unread_count > 0 && "font-bold",
                      )}
                    >
                      {conversation.participant_name}
                    </span>
                    {conversation.unread_count > 0 && (
                      <div className="flex-shrink-0">
                        <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5">
                          {conversation.unread_count}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formatTimestamp(conversation.last_message_timestamp)}
                  </span>
                </div>

                {/* Last Message Preview */}
                <p
                  className={cn(
                    "text-sm text-gray-600 dark:text-gray-400 truncate",
                    conversation.unread_count > 0 && "font-semibold text-gray-900 dark:text-white",
                  )}
                >
                  {conversation.last_message_preview}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    )
  },
)

ConversationList.displayName = "ConversationList"
