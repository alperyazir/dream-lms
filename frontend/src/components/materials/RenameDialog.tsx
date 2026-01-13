/**
 * RenameDialog Component
 * Story 13.2: Frontend My Materials Management
 *
 * Dialog for renaming materials.
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
import type { Material } from "@/types/material"
import { MaterialTypeIcon } from "./MaterialTypeIcon"

interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  onRename: (newName: string) => Promise<void>
  isRenaming?: boolean
}

/**
 * RenameDialog for renaming materials
 */
export function RenameDialog({
  open,
  onOpenChange,
  material,
  onRename,
  isRenaming = false,
}: RenameDialogProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens/closes or material changes
  useEffect(() => {
    if (open && material) {
      setName(material.name)
      setError(null)
    }
  }, [open, material])

  // Handle save
  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required")
      return
    }

    if (name.trim() === material?.name) {
      // No change, just close
      onOpenChange(false)
      return
    }

    setError(null)

    try {
      await onRename(name.trim())
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename")
    }
  }

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false)
  }

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isRenaming) {
      e.preventDefault()
      handleSave()
    }
  }

  if (!material) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Material</DialogTitle>
          <DialogDescription>
            Enter a new name for this material.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current material info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
            <MaterialTypeIcon type={material.type} />
            <span className="text-sm text-muted-foreground truncate">
              Current: {material.name}
            </span>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="rename-input">
              New Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter new name"
              maxLength={255}
              disabled={isRenaming}
              autoFocus
            />
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
            disabled={isRenaming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isRenaming || !name.trim()}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isRenaming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

RenameDialog.displayName = "RenameDialog"
