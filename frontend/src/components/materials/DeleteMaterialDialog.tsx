/**
 * DeleteMaterialDialog Component
 * Story 13.2: Frontend My Materials Management
 *
 * Confirmation dialog for deleting materials.
 */

import { AlertTriangle, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Material } from "@/types/material"
import { MaterialTypeIcon } from "./MaterialTypeIcon"

interface DeleteMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  onConfirm: () => Promise<void>
  isDeleting?: boolean
}

/**
 * DeleteMaterialDialog shows a confirmation before deleting a material
 */
export function DeleteMaterialDialog({
  open,
  onOpenChange,
  material,
  onConfirm,
  isDeleting = false,
}: DeleteMaterialDialogProps) {
  if (!material) return null

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Material
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete this material?
              </p>

              {/* Material info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <MaterialTypeIcon type={material.type} />
                <span className="font-medium text-foreground truncate">
                  {material.name}
                </span>
              </div>

              <p className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>
                  This action cannot be undone. If this material is attached to
                  any assignments, students will see "Material unavailable" instead.
                </span>
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

DeleteMaterialDialog.displayName = "DeleteMaterialDialog"
