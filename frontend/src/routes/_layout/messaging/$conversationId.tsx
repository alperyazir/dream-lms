import { createFileRoute, Link } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, User } from "lucide-react"
import { MessageThread } from "@/components/messaging/MessageThread"
import { MessageForm } from "@/components/messaging/MessageForm"
import { mockConversations, type Message } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/messaging/$conversationId")({
  component: ConversationView,
})

function ConversationView() {
  const { conversationId } = Route.useParams()

  // Find conversation
  const conversation = useMemo(
    () => mockConversations.find((c) => c.id === conversationId),
    [conversationId],
  )

  // Local messages state (includes both mock and new messages)
  const [messages, setMessages] = useState<Message[]>(
    conversation?.messages || [],
  )

  // Handle sending new message
  const handleSendMessage = async (messageBody: string) => {
    if (!conversation) return

    // Create new message
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      from_id: "teacher1",
      from_name: "Dr. Sarah Johnson",
      to_id: conversation.participant_id,
      to_name: conversation.participant_name,
      subject: "", // No subject for replies
      body: messageBody,
      timestamp: new Date().toISOString(),
      read: true,
    }

    // Add to local state
    setMessages((prev) => [...prev, newMessage])

    // Store to localStorage (persist mock data updates)
    try {
      const existingConversations = JSON.parse(
        localStorage.getItem("mockConversations") || "[]",
      )

      const conversationIndex = existingConversations.findIndex(
        (c: any) => c.id === conversationId,
      )

      if (conversationIndex >= 0) {
        existingConversations[conversationIndex].messages.push(newMessage)
        existingConversations[conversationIndex].last_message_preview =
          messageBody.substring(0, 100)
        existingConversations[conversationIndex].last_message_timestamp =
          newMessage.timestamp

        localStorage.setItem(
          "mockConversations",
          JSON.stringify(existingConversations),
        )
      }
    } catch (error) {
      console.error("Error saving message to localStorage:", error)
    }
  }

  if (!conversation) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Conversation Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The requested conversation could not be found.
          </p>
          <Link to="/messaging">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inbox
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Back Button & Header - Fixed */}
      <div className="flex-none bg-background shrink-0">
        {/* Back Button (Mobile) */}
        <div className="lg:hidden px-4 pt-2">
          <Link to="/messaging">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        {/* Conversation Header */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            {/* Desktop Back Button */}
            <Link to="/messaging" className="hidden lg:block">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>

            {/* Participant Info */}
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-teal-600 text-white">
                {conversation.participant_avatar}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {conversation.participant_name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <User className="h-3 w-3 inline mr-1" />
                Parent
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Thread - Scrollable Area Only */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 min-h-0">
        <MessageThread
          messages={messages}
          currentUserId="teacher1"
          currentUserName="Dr. Sarah Johnson"
        />
      </div>

      {/* Message Form - Fixed at Bottom */}
      <div className="flex-none border-t border-gray-200 dark:border-gray-700 bg-background shrink-0">
        <div className="px-4">
          <MessageForm onSendMessage={handleSendMessage} />
        </div>
      </div>
    </div>
  )
}
