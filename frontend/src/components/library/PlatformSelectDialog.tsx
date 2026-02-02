/**
 * Platform Select Dialog Component
 * Story 29.3: Book Preview and Download Actions
 *
 * Dialog for selecting platform when downloading a book bundle.
 */

import { AlertCircle, Apple, Download, Loader2, Monitor } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { booksApi, type Platform } from "@/services/booksApi"

interface PlatformOption {
  id: Platform
  label: string
  description: string
  icon: React.ReactNode
}

const platformOptions: PlatformOption[] = [
  {
    id: "mac",
    label: "macOS",
    description: "For macOS 10.13 or later",
    icon: <Apple className="h-6 w-6" />,
  },
  {
    id: "win",
    label: "Windows",
    description: "For Windows 10/11",
    icon: <Monitor className="h-6 w-6" />,
  },
  {
    id: "win7-8",
    label: "Windows 7/8",
    description: "For legacy Windows versions",
    icon: <Monitor className="h-6 w-6" />,
  },
  {
    id: "linux",
    label: "Linux",
    description: "For Linux distributions",
    icon: <Monitor className="h-6 w-6" />,
  },
]

interface PlatformSelectDialogProps {
  bookId: number
  bookTitle: string
  isOpen: boolean
  onClose: () => void
}

export function PlatformSelectDialog({
  bookId,
  bookTitle,
  isOpen,
  onClose,
}: PlatformSelectDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePlatformSelect = async (platform: Platform) => {
    setSelectedPlatform(platform)
    setIsLoading(true)
    setError(null)

    try {
      const response = await booksApi.requestBookBundle(bookId, platform)

      // Redirect to download URL - browser handles the download
      window.location.href = response.download_url
      onClose()
    } catch (err) {
      console.error("Failed to request bundle:", err)
      setError("Failed to generate download link. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setSelectedPlatform(null)
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Book
          </DialogTitle>
          <DialogDescription>
            Select a platform to download "{bookTitle}" as a standalone application.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedPlatform && handlePlatformSelect(selectedPlatform)}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3 py-4">
          {platformOptions.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              className={`h-auto flex-col gap-2 p-4 hover:border-primary hover:bg-primary/5 ${
                selectedPlatform === option.id && isLoading
                  ? "border-primary bg-primary/5"
                  : ""
              }`}
              onClick={() => handlePlatformSelect(option.id)}
              disabled={isLoading}
            >
              {isLoading && selectedPlatform === option.id ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                option.icon
              )}
              <div className="text-center">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
            </Button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          The download will start automatically after selecting a platform.
        </div>
      </DialogContent>
    </Dialog>
  )
}
