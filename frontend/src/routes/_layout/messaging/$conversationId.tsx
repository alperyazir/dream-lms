import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Loader2, User } from "lucide-react"
import { MessageForm } from "@/components/messaging/MessageForm"
import { MessageThread } from "@/components/messaging/MessageThread"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useMessageThread, useSendMessage } from "@/hooks/useMessages"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/messaging/$conversationId")({
  component: ConversationView,
})

function ConversationView() {
  const { conversationId } = Route.useParams()
  const { user } = useAuth()

  // Use real API hooks
  const {
    messages,
    participant,
    isLoading,
    refetch,
  } = useMessageThread(conversationId)

  const sendMessage = useSendMessage()

  // Handle sending new message
  const handleSendMessage = async (messageBody: string) => {
    if (!conversationId) return

    try {
      await sendMessage.sendMessageAsync({
        recipient_id: conversationId,
        body: messageBody,
      })
      refetch()
    } catch (error) {
      console.error("Error sending message:", error)
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!participant) {
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
                {getInitials(participant.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {participant.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <User className="h-3 w-3 inline mr-1" />
                {participant.role.charAt(0).toUpperCase() + participant.role.slice(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Thread - Scrollable Area Only */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 min-h-0">
        <MessageThread
          messages={messages}
          currentUserId={user?.id ?? ""}
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
