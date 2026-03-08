import React, { useEffect, useRef } from "react"
import { Link } from "@tanstack/react-router"
import {
  CheckCircle,
  FileText,
  MessageSquare,
  Bot,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Message, MessageCategory } from "@/types/message"

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  assignment_created: FileText,
  student_completed: CheckCircle,
  feedback_received: MessageSquare,
}

const CATEGORY_COLORS: Record<string, string> = {
  assignment_created: "text-blue-600",
  student_completed: "text-green-600",
  feedback_received: "text-emerald-600",
}

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

    // Scroll to latest message when messages load or change
    useEffect(() => {
      const el = messagesEndRef.current
      if (!el) return
      // Scroll the nearest scrollable parent instead of the whole page
      const scrollParent = el.closest("[class*='overflow-y']") as HTMLElement
      if (scrollParent) {
        scrollParent.scrollTop = scrollParent.scrollHeight
      }
    }, [messages])

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

              // System message rendering
              if (message.is_system) {
                const CategoryIcon =
                  CATEGORY_ICONS[message.message_category || ""] || Bot
                const iconColor =
                  CATEGORY_COLORS[message.message_category || ""] ||
                  "text-gray-500"

                const assignmentLink =
                  message.context_type === "assignment" && message.context_id
                    ? `/student/assignments/${message.context_id}`
                    : null

                return (
                  <div key={message.id} className="flex gap-3">
                    {/* System Icon */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                      <CategoryIcon className={cn("h-5 w-5", iconColor)} />
                    </div>

                    {/* System Message Content */}
                    <div className="flex-1 max-w-[85%]">
                      <div className="flex items-baseline gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-medium text-muted-foreground"
                        >
                          System
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(message.sent_at)}
                        </span>
                        {!message.is_read && (
                          <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5">
                            New
                          </Badge>
                        )}
                      </div>

                      <div className="rounded-lg px-4 py-3 bg-muted/50 border border-border/50">
                        {message.subject && (
                          <div className="font-semibold text-sm mb-1">
                            {assignmentLink ? (
                              <Link
                                to={assignmentLink}
                                className="hover:underline text-primary"
                              >
                                {message.subject}
                              </Link>
                            ) : (
                              message.subject
                            )}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                          {message.body}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }

              // Regular message rendering
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
                          : "bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white",
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
