/**
 * Compose Message Modal Component
 *
 * For students tab: pick a recipient, write a message, send → opens conversation.
 * For classes tab: pick a class, write a message → broadcast to all students.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Send, Users, Check } from "lucide-react"
import React, { useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useComposeMessage, CONVERSATIONS_QUERY_KEY } from "@/hooks/useMessages"
import useAuth from "@/hooks/useAuth"
import { getMyClasses } from "@/services/teachersApi"
import { broadcastToClass } from "@/services/messagesApi"
import type { Recipient } from "@/types/message"
import type { Class } from "@/types/teacher"
import { RecipientItem } from "./RecipientItem"

export interface ComposeMessageModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (recipientId: string) => void
}

export const ComposeMessageModal = React.memo(
  ({ isOpen, onClose, onSuccess }: ComposeMessageModalProps) => {
    const { user } = useAuth()
    const isTeacher = user?.role === "teacher"

    const [tab, setTab] = useState<string>("students")
    const [selectedRecipient, setSelectedRecipient] =
      useState<Recipient | null>(null)
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [classSearchTerm, setClassSearchTerm] = useState("")
    const [body, setBody] = useState("")

    const { recipients, recipientsLoading, sendMessage, isSending, sendError } =
      useComposeMessage()
    const queryClient = useQueryClient()

    const { data: classes = [], isLoading: classesLoading } = useQuery({
      queryKey: ["teacher", "classes"],
      queryFn: getMyClasses,
      enabled: isOpen && isTeacher,
      staleTime: 60000,
    })

    const broadcastMutation = useMutation({
      mutationFn: broadcastToClass,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
      },
    })

    const isBroadcasting = broadcastMutation.isPending
    const sending = isSending || isBroadcasting

    const filteredRecipients = React.useMemo(() => {
      if (!searchTerm) return recipients
      const s = searchTerm.toLowerCase()
      return recipients.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.email.toLowerCase().includes(s) ||
          r.organization_name?.toLowerCase().includes(s),
      )
    }, [recipients, searchTerm])

    const filteredClasses = React.useMemo(() => {
      if (!classSearchTerm) return classes
      const s = classSearchTerm.toLowerCase()
      return classes.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.grade_level?.toLowerCase().includes(s) ||
          c.subject?.toLowerCase().includes(s),
      )
    }, [classes, classSearchTerm])

    const resetAndClose = () => {
      setSelectedRecipient(null)
      setSelectedClass(null)
      setSearchTerm("")
      setClassSearchTerm("")
      setBody("")
      setTab("students")
      onClose()
    }

    const handleClose = () => {
      if (!sending) resetAndClose()
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!body.trim()) return

      if (tab === "classes" && selectedClass) {
        try {
          await broadcastMutation.mutateAsync({
            class_id: selectedClass.id,
            body: body.trim(),
          })
          resetAndClose()
          onSuccess?.("")
        } catch (error) {
          console.error("Error broadcasting message:", error)
        }
      } else if (tab === "students" && selectedRecipient) {
        try {
          await sendMessage({
            recipient_id: selectedRecipient.user_id,
            body: body.trim(),
          })
          const id = selectedRecipient.user_id
          resetAndClose()
          onSuccess?.(id)
        } catch (error) {
          console.error("Error sending message:", error)
        }
      }
    }

    const isValid =
      body.trim().length > 0 &&
      ((tab === "students" && selectedRecipient) ||
        (tab === "classes" && selectedClass))

    const error = sendError || broadcastMutation.error

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              {isTeacher
                ? "Send a message to a student or an entire class."
                : "Send a direct message."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            {isTeacher ? (
              <Tabs
                value={tab}
                onValueChange={(v) => {
                  setTab(v)
                  setSelectedRecipient(null)
                  setSelectedClass(null)
                  setSearchTerm("")
                  setClassSearchTerm("")
                  setBody("")
                }}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="students" className="flex-1">
                    Students
                  </TabsTrigger>
                  <TabsTrigger value="classes" className="flex-1">
                    Classes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="students" className="mt-3 space-y-3">
                  <Input
                    type="text"
                    placeholder="Search for a recipient..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <RecipientList
                    recipients={filteredRecipients}
                    loading={recipientsLoading}
                    selectedId={selectedRecipient?.user_id ?? null}
                    onToggle={(r) =>
                      setSelectedRecipient((prev) =>
                        prev?.user_id === r.user_id ? null : r,
                      )
                    }
                    emptyText={
                      recipients.length === 0
                        ? "No recipients available"
                        : "No recipients found"
                    }
                  />
                </TabsContent>

                <TabsContent value="classes" className="mt-3 space-y-3">
                  <Input
                    type="text"
                    placeholder="Search for a class..."
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                  />
                  <ClassList
                    classes={filteredClasses}
                    loading={classesLoading}
                    selectedId={selectedClass?.id ?? null}
                    onToggle={(c) =>
                      setSelectedClass((prev) =>
                        prev?.id === c.id ? null : c,
                      )
                    }
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Search for a recipient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <RecipientList
                  recipients={filteredRecipients}
                  loading={recipientsLoading}
                  selectedId={selectedRecipient?.user_id ?? null}
                  onToggle={(r) =>
                    setSelectedRecipient((prev) =>
                      prev?.user_id === r.user_id ? null : r,
                    )
                  }
                  emptyText={
                    recipients.length === 0
                      ? "No recipients available"
                      : "No recipients found"
                  }
                />
              </div>
            )}

            {/* Message body — shown when a recipient or class is selected */}
            {(selectedRecipient || selectedClass) && (
              <div className="space-y-2 mt-3">
                <Label htmlFor="msg-body">
                  Message{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Textarea
                  id="msg-body"
                  placeholder={
                    selectedClass
                      ? "Type your message to the class..."
                      : "Type your message..."
                  }
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[80px] resize-y"
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {body.length} / 5000
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive mt-2">
                Failed to send message. Please try again.
              </p>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || sending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {selectedClass ? "Send to Class" : "Send Message"}
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

/** Scrollable recipient list with click-to-toggle selection */
function RecipientList({
  recipients,
  loading,
  selectedId,
  onToggle,
  emptyText,
}: {
  recipients: Recipient[]
  loading: boolean
  selectedId: string | null
  onToggle: (r: Recipient) => void
  emptyText: string
}) {
  return (
    <div className="max-h-48 overflow-y-auto border rounded-lg">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
        </div>
      ) : recipients.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {emptyText}
        </div>
      ) : (
        <div className="p-1">
          {recipients.map((r) => (
            <RecipientItem
              key={r.user_id}
              recipient={r}
              selected={r.user_id === selectedId}
              onClick={() => onToggle(r)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Scrollable class list with click-to-toggle selection */
function ClassList({
  classes,
  loading,
  selectedId,
  onToggle,
}: {
  classes: Class[]
  loading: boolean
  selectedId: string | null
  onToggle: (c: Class) => void
}) {
  return (
    <div className="max-h-48 overflow-y-auto border rounded-lg">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No classes found
        </div>
      ) : (
        <div className="p-1">
          {classes.map((cls) => {
            const isSelected = cls.id === selectedId
            return (
              <div
                key={cls.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-teal-50 dark:bg-teal-950 ring-1 ring-teal-500"
                    : "hover:bg-muted"
                }`}
                onClick={() => onToggle(cls)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onToggle(cls)
                  }
                }}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900">
                  <Users className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {cls.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {cls.student_count} student
                    {cls.student_count !== 1 ? "s" : ""}
                    {cls.grade_level && ` · Grade ${cls.grade_level}`}
                  </span>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-teal-600 shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
