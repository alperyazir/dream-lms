import { createFileRoute } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Plus, Inbox, ArrowLeft, User } from "lucide-react"
import { ConversationList } from "@/components/messaging/ConversationList"
import { MessageThread } from "@/components/messaging/MessageThread"
import { MessageForm } from "@/components/messaging/MessageForm"
import { mockConversations, type Message } from "@/lib/mockData"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

export const Route = createFileRoute("/_layout/messaging/")({
  component: MessagingInbox,
})

function MessagingInbox() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const debouncedSearch = useDebouncedValue(searchTerm, 300)

  // Calculate total unread count
  const totalUnread = useMemo(
    () =>
      mockConversations.reduce(
        (sum, conv) => sum + conv.unread_count,
        0,
      ),
    [],
  )

  // Filter conversations based on search term
  const filteredConversations = useMemo(() => {
    if (!debouncedSearch) return mockConversations

    const searchLower = debouncedSearch.toLowerCase()
    return mockConversations.filter(
      (conv) =>
        conv.participant_name.toLowerCase().includes(searchLower) ||
        conv.last_message_preview.toLowerCase().includes(searchLower) ||
        conv.messages.some(
          (msg) =>
            msg.subject.toLowerCase().includes(searchLower) ||
            msg.body.toLowerCase().includes(searchLower),
        ),
    )
  }, [debouncedSearch])

  // Get selected conversation
  const selectedConversation = useMemo(
    () => selectedConversationId ? mockConversations.find((c) => c.id === selectedConversationId) : null,
    [selectedConversationId]
  )

  // Local messages state for selected conversation
  const [messages, setMessages] = useState<Message[]>([])

  // Update messages when conversation changes
  useMemo(() => {
    if (selectedConversation) {
      setMessages(selectedConversation.messages)
    }
  }, [selectedConversation])

  // Handle conversation selection
  const handleConversationClick = (conversationId: string) => {
    setSelectedConversationId(conversationId)
  }

  // Handle sending new message
  const handleSendMessage = async (messageBody: string) => {
    if (!selectedConversation) return

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      from_id: "teacher1",
      from_name: "Dr. Sarah Johnson",
      to_id: selectedConversation.participant_id,
      to_name: selectedConversation.participant_name,
      subject: "",
      body: messageBody,
      timestamp: new Date().toISOString(),
      read: true,
    }

    setMessages((prev) => [...prev, newMessage])

    // Store to localStorage
    try {
      const existingConversations = JSON.parse(
        localStorage.getItem("mockConversations") || "[]",
      )

      const conversationIndex = existingConversations.findIndex(
        (c: any) => c.id === selectedConversationId,
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

  // Handle compose new message
  const handleComposeNew = () => {
    // TODO: Open compose dialog
    console.log("Compose new message")
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
              Communicate with parents and administrators
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
                <ConversationList
                  conversations={filteredConversations}
                  selectedConversationId={selectedConversationId}
                  onConversationClick={handleConversationClick}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversation View or Empty State */}
        <div className="lg:col-span-2 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <Card className="shadow-lg flex-1 flex flex-col overflow-hidden">
              <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                {/* Conversation Header */}
                <div className="flex-none px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    {/* Back Button (Mobile) */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversationId(null)}
                      className="lg:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>

                    {/* Participant Info */}
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-teal-600 text-white">
                        {selectedConversation.participant_avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedConversation.participant_name}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-3 w-3 inline mr-1" />
                        Parent
                      </p>
                    </div>
                  </div>
                </div>

                {/* Message Thread - Scrollable */}
                <div className="flex-1 overflow-y-auto px-4">
                  <MessageThread
                    messages={messages}
                    currentUserId="teacher1"
                    currentUserName="Dr. Sarah Johnson"
                  />
                </div>

                {/* Message Form */}
                <div className="flex-none border-t border-gray-200 dark:border-gray-700">
                  <div className="px-4">
                    <MessageForm onSendMessage={handleSendMessage} />
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
    </div>
  )
}
