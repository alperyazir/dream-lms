/**
 * UrlLinkModal Component
 * Story 13.2: Frontend My Materials Management
 *
 * Modal for creating URL link materials.
 */

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
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
import type { UrlLinkCreate } from "@/types/material"

interface UrlLinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: UrlLinkCreate) => Promise<void>
  isSaving?: boolean
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * UrlLinkModal for creating URL link materials
 */
export function UrlLinkModal({
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}: UrlLinkModalProps) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [urlTouched, setUrlTouched] = useState(false)

  const urlValid = isValidUrl(url)
  const showUrlValidation = urlTouched && url.length > 0

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setName("")
      setUrl("")
      setError(null)
      setUrlTouched(false)
    }
  }, [open])

  // Handle save
  const handleSave = async () => {
    // Validate
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    if (!url.trim()) {
      setError("URL is required")
      return
    }
    if (!urlValid) {
      setError("Please enter a valid URL (starting with http:// or https://)")
      return
    }

    setError(null)

    try {
      await onSave({
        name: name.trim(),
        url: url.trim(),
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link")
    }
  }

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false)
  }

  // Handle URL input blur
  const handleUrlBlur = () => {
    setUrlTouched(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add URL Link</DialogTitle>
          <DialogDescription>
            Save a link to an external resource for easy access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="link-name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="link-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Khan Academy - Fractions Tutorial"
              maxLength={255}
              disabled={isSaving}
            />
          </div>

          {/* URL Field */}
          <div className="space-y-2">
            <Label htmlFor="link-url">
              URL <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="link-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://www.example.com/resource"
                maxLength={2000}
                disabled={isSaving}
                className={
                  showUrlValidation
                    ? urlValid
                      ? "pr-10 border-green-500 focus-visible:ring-green-500"
                      : "pr-10 border-red-500 focus-visible:ring-red-500"
                    : ""
                }
              />
              {showUrlValidation && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {urlValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {showUrlValidation && (
              <p
                className={`text-xs ${urlValid ? "text-green-500" : "text-red-500"}`}
              >
                {urlValid ? "Valid URL" : "URL must start with http:// or https://"}
              </p>
            )}
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
            disabled={isSaving || (showUrlValidation && !urlValid)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

UrlLinkModal.displayName = "UrlLinkModal"
