/**
 * AddMaterialButton Component
 * Story 21.3: Upload Materials in Resources Context
 *
 * Button component that opens upload dialog for adding materials
 * directly from the Resources section.
 */

import { Plus } from "lucide-react"
import { useState } from "react"
import { UploadMaterialDialog } from "@/components/materials/UploadMaterialDialog"
import { Button } from "@/components/ui/button"
import type { Material } from "@/types/material"

export interface AddMaterialButtonProps {
  bookId?: string | number
  assignmentId?: string
  onUploadComplete?: (material: Material) => void
}

export function AddMaterialButton({
  bookId,
  assignmentId,
  onUploadComplete,
}: AddMaterialButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleUploadComplete = (material: Material) => {
    setDialogOpen(false)
    onUploadComplete?.(material)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Material
      </Button>

      <UploadMaterialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUploadComplete={handleUploadComplete}
        context={{
          bookId: bookId ? String(bookId) : undefined,
          assignmentId,
        }}
      />
    </>
  )
}

AddMaterialButton.displayName = "AddMaterialButton"
