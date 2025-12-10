/**
 * TextNoteModal Component
 * Story 13.2: Frontend My Materials Management
 *
 * Modal for creating and editing text notes with rich text editor.
 */

import { AlertCircle, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
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
import type { Material, TextNoteCreate, TextNoteUpdate } from "@/types/material"
import { MAX_TEXT_NOTE_SIZE } from "@/types/material"
import { RichTextEditor } from "./RichTextEditor"

interface TextNoteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material?: Material | null
  onSave: (data: TextNoteCreate | TextNoteUpdate) => Promise<void>
  isSaving?: boolean
}

/**
 * TextNoteModal for creating/editing text notes
 */
export function TextNoteModal({
  open,
  onOpenChange,
  material,
  onSave,
  isSaving = false,
}: TextNoteModalProps) {
  const [name, setName] = useState("")
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!material
  const contentSize = new Blob([content]).size
  const isOverLimit = contentSize > MAX_TEXT_NOTE_SIZE

  // Reset form when modal opens/closes or material changes
  useEffect(() => {
    if (open) {
      if (material) {
        setName(material.name)
        setContent(material.text_content || "")
      } else {
        setName("")
        setContent("")
      }
      setError(null)
    }
  }, [open, material])

  // Handle save
  const handleSave = async () => {
    // Validate
    if (!name.trim()) {
      setError("Title is required")
      return
    }
    // Strip HTML tags for content validation
    const textContent = content.replace(/<[^>]*>/g, "").trim()
    if (!textContent) {
      setError("Content is required")
      return
    }
    if (isOverLimit) {
      setError(`Content exceeds ${MAX_TEXT_NOTE_SIZE / 1024}KB limit`)
      return
    }

    setError(null)

    try {
      if (isEditing) {
        await onSave({
          name: name.trim(),
          content: content,
        } as TextNoteUpdate)
      } else {
        await onSave({
          name: name.trim(),
          content: content,
        } as TextNoteCreate)
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note")
    }
  }

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false)
  }

  // Format size display
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Text Note" : "Create Text Note"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your text note below."
              : "Create a new text note with a title and formatted content."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="note-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="note-title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a title for your note"
              maxLength={255}
              disabled={isSaving}
            />
          </div>

          {/* Content Field with Rich Text Editor */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <Label>
                Content <span className="text-red-500">*</span>
              </Label>
              <span
                className={`text-xs ${isOverLimit ? "text-red-500" : "text-muted-foreground"}`}
              >
                {formatSize(contentSize)} / {MAX_TEXT_NOTE_SIZE / 1024} KB
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Start writing your note..."
                disabled={isSaving}
                className="h-full"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isOverLimit}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

TextNoteModal.displayName = "TextNoteModal"
