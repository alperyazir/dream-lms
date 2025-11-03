import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MessageFormProps {
  onSendMessage: (messageBody: string) => void
  maxLength?: number
  placeholder?: string
}

/**
 * Message Form Component
 * Form for composing and sending messages with character count
 */
export const MessageForm = React.memo(
  ({
    onSendMessage,
    maxLength = 1000,
    placeholder = "Type your message...",
  }: MessageFormProps) => {
    const [messageBody, setMessageBody] = useState("")
    const [isSending, setIsSending] = useState(false)

    const characterCount = messageBody.length
    const isOverLimit = characterCount > maxLength
    const isValid = messageBody.trim().length > 0 && !isOverLimit

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      if (!isValid || isSending) return

      setIsSending(true)

      try {
        await onSendMessage(messageBody.trim())
        setMessageBody("") // Clear form after sending
      } catch (error) {
        console.error("Error sending message:", error)
      } finally {
        setIsSending(false)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Ctrl+Enter or Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        handleSubmit(e)
      }
    }

    return (
      <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="space-y-3">
          {/* Textarea */}
          <Textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[100px] resize-none focus:ring-2 focus:ring-teal-500"
            maxLength={maxLength + 100} // Allow typing slightly over for better UX
            aria-label="Message content"
          />

          {/* Footer: Character Count + Send Button */}
          <div className="flex items-center justify-between">
            <div
              className={cn(
                "text-sm",
                isOverLimit
                  ? "text-red-600 dark:text-red-400 font-semibold"
                  : "text-gray-500 dark:text-gray-400",
              )}
            >
              {characterCount} / {maxLength} characters
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Ctrl+Enter to send
              </span>
              <Button
                type="submit"
                disabled={!isValid || isSending}
                className="bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    )
  },
)

MessageForm.displayName = "MessageForm"
