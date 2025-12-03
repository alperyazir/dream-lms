import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, Inbox, Loader2, Plus, Search, User } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { ConversationList } from "@/components/messaging/ConversationList"
import { MessageForm } from "@/components/messaging/MessageForm"
import { MessageThread } from "@/components/messaging/MessageThread"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useMessagingPage, useSendMessage } from "@/hooks/useMessages"
import useAuth from "@/hooks/useAuth"
import { ComposeMessageModal } from "@/components/messaging/ComposeMessageModal"

// Search params schema for the messaging page
const messagingSearchSchema = z.object({
  user: z.string().optional(),
})

export const Route = createFileRoute("/_layout/messaging/")({
  component: MessagingInbox,
  validateSearch: messagingSearchSchema,
})

function MessagingInbox() {
  const { user } = useAuth()
  const { user: userParam } = Route.useSearch()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(searchTerm, 300)

  // Set selected partner from URL param on mount
  useEffect(() => {
    if (userParam) {
      setSelectedPartnerId(userParam)
    }
  }, [userParam])

  // Use the messaging page hook
  const {
    conversations,
    totalUnread,
    conversationsLoading,
    messages,
    participant,
    threadLoading,
    refetch,
  } = useMessagingPage(selectedPartnerId)

  const sendMessage = useSendMessage()

  // Filter conversations based on search term
  const filteredConversations = useMemo(() => {
    if (!debouncedSearch) return conversations

    const searchLower = debouncedSearch.toLowerCase()
    return conversations.filter(
      (conv) =>
        conv.participant_name.toLowerCase().includes(searchLower) ||
        conv.last_message_preview.toLowerCase().includes(searchLower),
    )
  }, [conversations, debouncedSearch])

  // Handle conversation selection
  const handleConversationClick = (participantId: string) => {
    setSelectedPartnerId(participantId)
  }

  // Handle sending new message
  const handleSendMessage = async (messageBody: string) => {
    if (!selectedPartnerId) return

    try {
      await sendMessage.sendMessageAsync({
        recipient_id: selectedPartnerId,
        body: messageBody,
      })
      refetch()
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Handle compose new message
  const handleComposeNew = () => {
    setIsComposeOpen(true)
  }

  // Handle compose success
  const handleComposeSuccess = (recipientId: string) => {
    setIsComposeOpen(false)
    setSelectedPartnerId(recipientId)
    refetch()
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
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex-none px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Messages
              </h1>
              {totalUnread > 0 && (
                <Badge className="bg-blue-600 text-white text-sm px-3 py-1">
                  {totalUnread} unread
                </Badge>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Direct messaging with teachers and students
            </p>
          </div>
          <Button
            onClick={handleComposeNew}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      {/* Messaging Interface */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 pb-4 overflow-hidden">
        {/* Conversation List Panel */}
        <div className="lg:col-span-1 flex flex-col overflow-hidden">
          <Card className="shadow-lg flex-1 flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              {/* Search Bar */}
              <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    aria-label="Search conversations"
                  />
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto">
                {conversationsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                  </div>
                ) : (
                  <ConversationList
                    conversations={filteredConversations}
                    selectedParticipantId={selectedPartnerId ?? undefined}
                    onConversationClick={handleConversationClick}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversation View or Empty State */}
        <div className="lg:col-span-2 flex flex-col overflow-hidden">
          {selectedPartnerId && participant ? (
            <Card className="shadow-lg flex-1 flex flex-col overflow-hidden">
              <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                {/* Conversation Header */}
                <div className="flex-none px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    {/* Back Button (Mobile) */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPartnerId(null)}
                      className="lg:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>

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

                {/* Message Thread - Scrollable */}
                <div className="flex-1 overflow-y-auto px-4">
                  {threadLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                    </div>
                  ) : (
                    <MessageThread
                      messages={messages}
                      currentUserId={user?.id ?? ""}
                    />
                  )}
                </div>

                {/* Message Form */}
                <div className="flex-none border-t border-gray-200 dark:border-gray-700">
                  <div className="px-4">
                    <MessageForm
                      onSendMessage={handleSendMessage}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg flex-1">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center py-12">
                  <Inbox className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Conversation Selected
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                    Select a conversation from the list to view messages, or
                    start a new conversation.
                  </p>
                  <Button
                    onClick={handleComposeNew}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Conversation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Compose Message Modal */}
      <ComposeMessageModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleComposeSuccess}
      />
    </div>
  )
}
