/**
 * Compose Message Modal Component
 * Story 6.3: Direct Messaging Between Teachers & Students
 *
 * Modal dialog for composing and sending new messages to allowed recipients.
 */

import { Loader2, Send, User } from "lucide-react"
import React, { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useComposeMessage } from "@/hooks/useMessages"
import { cn } from "@/lib/utils"
import type { Recipient } from "@/types/message"

export interface ComposeMessageModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (recipientId: string) => void
}

/**
 * Compose Message Modal
 * Allows users to select a recipient and compose a new message.
 */
export const ComposeMessageModal = React.memo(
  ({ isOpen, onClose, onSuccess }: ComposeMessageModalProps) => {
    const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [subject, setSubject] = useState("")
    const [body, setBody] = useState("")

    const { recipients, recipientsLoading, sendMessage, isSending, sendError } =
      useComposeMessage()

    // Filter recipients based on search
    const filteredRecipients = React.useMemo(() => {
      if (!searchTerm) return recipients
      const searchLower = searchTerm.toLowerCase()
      return recipients.filter(
        (r) =>
          r.name.toLowerCase().includes(searchLower) ||
          r.email.toLowerCase().includes(searchLower),
      )
    }, [recipients, searchTerm])

    // Get initials from name
    const getInitials = (name: string): string => {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      if (!selectedRecipient || !body.trim()) return

      try {
        await sendMessage({
          recipient_id: selectedRecipient.user_id,
          subject: subject.trim() || undefined,
          body: body.trim(),
        })

        // Reset form
        setSelectedRecipient(null)
        setSearchTerm("")
        setSubject("")
        setBody("")

        // Call success callback
        onSuccess?.(selectedRecipient.user_id)
      } catch (error) {
        console.error("Error sending message:", error)
      }
    }

    // Handle close
    const handleClose = () => {
      if (!isSending) {
        setSelectedRecipient(null)
        setSearchTerm("")
        setSubject("")
        setBody("")
        onClose()
      }
    }

    // Handle recipient selection
    const handleSelectRecipient = (recipient: Recipient) => {
      setSelectedRecipient(recipient)
      setSearchTerm("")
    }

    // Check if form is valid
    const isValid = selectedRecipient && body.trim().length > 0

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Send a direct message to a teacher or student.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Recipient Selection */}
              <div className="space-y-2">
                <Label htmlFor="recipient">To</Label>
                {selectedRecipient ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-teal-600 text-white text-sm">
                          {getInitials(selectedRecipient.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedRecipient.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedRecipient.role.charAt(0).toUpperCase() +
                            selectedRecipient.role.slice(1)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRecipient(null)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id="recipient"
                      type="text"
                      placeholder="Search for a recipient..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      {recipientsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                        </div>
                      ) : filteredRecipients.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          {recipients.length === 0
                            ? "No recipients available"
                            : "No recipients found"}
                        </div>
                      ) : (
                        filteredRecipients.map((recipient) => (
                          <button
                            key={recipient.user_id}
                            type="button"
                            onClick={() => handleSelectRecipient(recipient)}
                            className={cn(
                              "w-full p-3 flex items-center gap-3 text-left",
                              "hover:bg-gray-100 dark:hover:bg-gray-800",
                              "focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800",
                              "border-b last:border-b-0",
                            )}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-teal-600 text-white text-sm">
                                {getInitials(recipient.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {recipient.name}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {recipient.role.charAt(0).toUpperCase() +
                                  recipient.role.slice(1)}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Subject (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="Enter a subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={500}
                />
              </div>

              {/* Message Body */}
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  placeholder="Type your message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[120px] resize-none"
                  maxLength={5000}
                />
                <p className="text-xs text-gray-500 text-right">
                  {body.length} / 5000 characters
                </p>
              </div>

              {/* Error Message */}
              {sendError && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  Failed to send message. Please try again.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isSending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  },
)

ComposeMessageModal.displayName = "ComposeMessageModal"
