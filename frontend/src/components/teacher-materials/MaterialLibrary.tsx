/**
 * MaterialLibrary Component
 * Story 27.15: Teacher Materials Processing
 *
 * Displays list of teacher materials with extracted text available for AI processing.
 * Shows word count, language, and allows deletion of unused materials.
 */

import {
  AlertCircle,
  Calendar,
  Eye,
  FileText,
  Hash,
  Languages,
  Loader2,
  MoreVertical,
  Trash2,
} from "lucide-react"
import { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { TeacherMaterial } from "@/types/teacher-material"
import { formatWordCount, getLanguageLabel } from "@/types/teacher-material"

// =============================================================================
// Types
// =============================================================================

interface MaterialLibraryProps {
  /** List of materials to display */
  materials: TeacherMaterial[]
  /** Whether data is loading */
  isLoading?: boolean
  /** Error message */
  error?: string | null
  /** Callback when a material is selected */
  onSelect?: (material: TeacherMaterial) => void
  /** Callback to delete a material */
  onDelete?: (materialId: string) => Promise<void>
  /** ID of currently selected material */
  selectedMaterialId?: string | null
  /** Whether component is in selection mode (for generators) */
  selectionMode?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function MaterialLibrary({
  materials,
  isLoading = false,
  error = null,
  onSelect,
  onDelete,
  selectedMaterialId,
  selectionMode = false,
  className,
}: MaterialLibraryProps) {
  // State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] =
    useState<TeacherMaterial | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewMaterial, setPreviewMaterial] =
    useState<TeacherMaterial | null>(null)

  // Handlers
  const handleDeleteClick = (material: TeacherMaterial) => {
    setMaterialToDelete(material)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!materialToDelete || !onDelete) return

    setIsDeleting(true)
    try {
      await onDelete(materialToDelete.id)
      setDeleteDialogOpen(false)
      setMaterialToDelete(null)
    } catch (err) {
      console.error("Failed to delete material:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePreview = (material: TeacherMaterial) => {
    setPreviewMaterial(material)
    setPreviewDialogOpen(true)
  }

  const handleSelect = (material: TeacherMaterial) => {
    if (onSelect) {
      onSelect(material)
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // =============================================================================
  // Render
  // =============================================================================

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("bg-red-50 dark:bg-red-900/20", className)}>
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (materials.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Materials Yet
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload a PDF or paste text to create materials for AI content
            generation.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
        {materials.map((material) => {
          const isSelected = selectedMaterialId === material.id

          return (
            <Card
              key={material.id}
              className={cn(
                "transition-colors",
                selectionMode && "cursor-pointer hover:border-teal-400",
                isSelected &&
                  "border-teal-500 bg-teal-50/50 dark:bg-teal-900/10",
              )}
              onClick={selectionMode ? () => handleSelect(material) : undefined}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Material Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-teal-600 flex-shrink-0" />
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {material.name}
                      </h4>
                      {material.source_type === "pdf" && (
                        <Badge variant="outline" className="text-xs">
                          PDF
                        </Badge>
                      )}
                    </div>

                    {material.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {material.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {formatWordCount(material.word_count)}
                      </span>
                      {material.language && (
                        <span className="flex items-center gap-1">
                          <Languages className="h-3 w-3" />
                          {getLanguageLabel(material.language)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(material.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!selectionMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePreview(material)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview Text
                        </DropdownMenuItem>
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(material)
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Selection indicator */}
                  {selectionMode && isSelected && (
                    <div className="flex-shrink-0">
                      <div className="h-5 w-5 rounded-full bg-teal-500 flex items-center justify-center">
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{materialToDelete?.name}"? This
              action cannot be undone. Any generated content from this material
              will still be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewMaterial?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {/* Stats */}
            <div className="flex flex-wrap gap-4 text-sm">
              <Badge variant="secondary">
                {formatWordCount(previewMaterial?.word_count ?? null)}
              </Badge>
              {previewMaterial?.language && (
                <Badge variant="secondary">
                  {getLanguageLabel(previewMaterial.language)}
                </Badge>
              )}
              <Badge variant="outline">
                {previewMaterial?.source_type === "pdf"
                  ? "PDF Upload"
                  : "Pasted Text"}
              </Badge>
            </div>

            {/* Text Content */}
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                {previewMaterial?.extracted_text ||
                  "No text content available."}
              </pre>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

MaterialLibrary.displayName = "MaterialLibrary"
