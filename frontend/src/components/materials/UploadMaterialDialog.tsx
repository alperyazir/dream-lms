/**
 * UploadMaterialDialog Component
 * Story 21.3: Upload Materials in Resources Context
 *
 * Reusable upload dialog that wraps MaterialUploadZone.
 * Supports context (bookId, assignmentId) for tracking where materials are uploaded from.
 */

import { Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"
import { useMaterialsPage } from "@/hooks/useMaterials"
import type { Material } from "@/types/material"
import { MaterialUploadZone } from "./MaterialUploadZone"

export interface UploadMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete?: (material: Material) => void
  context?: {
    bookId?: string
    assignmentId?: string
  }
}

export function UploadMaterialDialog({
  open,
  onOpenChange,
  onUploadComplete,
  context: _context,
}: UploadMaterialDialogProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { uploadFile, quota, isUploading } = useMaterialsPage()

  const handleUpload = async (
    file: File,
    onProgress: (progress: number) => void,
  ) => {
    try {
      const response = await uploadFile({ file, onProgress })
      showSuccessToast(`${file.name} uploaded successfully`)

      // Call completion handler if provided
      if (onUploadComplete && response) {
        onUploadComplete(response.material)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed"
      showErrorToast(message)
      throw err
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Material
          </DialogTitle>
        </DialogHeader>
        <MaterialUploadZone
          onUpload={handleUpload}
          quota={quota}
          disabled={isUploading}
        />
      </DialogContent>
    </Dialog>
  )
}

UploadMaterialDialog.displayName = "UploadMaterialDialog"
