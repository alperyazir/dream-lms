import React, { useRef } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Message } from "@/types/message"

export interface MessageThreadProps {
  messages: Message[]
  currentUserId: string
}

/**
 * Message Thread Component
 * Displays all messages in a conversation with sender/receiver alignment
 */
export const MessageThread = React.memo(
  ({ messages, currentUserId }: MessageThreadProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Format timestamp for display
    const formatTimestamp = (sentAt: string): string => {
      const date = new Date(sentAt)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()

      if (isToday) {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      }

      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    }

    // Get initials from name
    const getInitials = (name: string): string => {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }

    return (
      <div className="p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No messages in this conversation yet
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isCurrentUser = message.sender_id === currentUserId
              const senderInitials = getInitials(message.sender_name)

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isCurrentUser ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback
                      className={cn(
                        isCurrentUser
                          ? "bg-teal-600 text-white"
                          : "bg-gray-600 text-white",
                      )}
                    >
                      {senderInitials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message Content */}
                  <div
                    className={cn(
                      "flex-1 max-w-[70%]",
                      isCurrentUser ? "items-end" : "items-start",
                    )}
                  >
                    {/* Sender Name & Timestamp */}
                    <div
                      className={cn(
                        "flex items-baseline gap-2 mb-1",
                        isCurrentUser ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {message.sender_name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(message.sent_at)}
                      </span>
                      {!message.is_read && !isCurrentUser && (
                        <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5">
                          New
                        </Badge>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={cn(
                        "rounded-lg px-4 py-3 shadow-sm",
                        isCurrentUser
                          ? "bg-teal-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                      )}
                    >
                      {/* Subject (if first message or different subject) */}
                      {message.subject && (
                        <div
                          className={cn(
                            "font-semibold mb-2 pb-2 border-b",
                            isCurrentUser
                              ? "border-teal-500"
                              : "border-gray-300 dark:border-gray-700",
                          )}
                        >
                          {message.subject}
                        </div>
                      )}

                      {/* Message Body */}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.body}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    )
  },
)

MessageThread.displayName = "MessageThread"
