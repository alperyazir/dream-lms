/**
 * TeacherMaterialPicker Component
 * Story 13.3: Assignment Integration - Attach Teacher Materials
 *
 * Modal component for selecting teacher materials to attach to assignments.
 * Shows a searchable, filterable list of the teacher's materials.
 */

import { useState, useMemo } from "react"
import { Check, FolderOpen, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMaterials } from "@/hooks/useMaterials"
import type { Material, MaterialType } from "@/types/material"
import { MaterialTypeIcon, getMaterialTypeLabel } from "./MaterialTypeIcon"

interface TeacherMaterialPickerProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void
  /** Currently selected material IDs */
  selectedIds: string[]
  /** Callback when materials are selected */
  onSelect: (materials: Material[]) => void
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * TeacherMaterialPicker - Modal for selecting materials to attach to assignments
 */
export function TeacherMaterialPicker({
  open,
  onOpenChange,
  selectedIds,
  onSelect,
}: TeacherMaterialPickerProps) {
  // Local state for selections before confirming
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set(selectedIds))
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<MaterialType | "all">("all")

  // Fetch teacher's materials
  const { data, isLoading, error } = useMaterials()
  const materials = data?.materials ?? []

  // Filter materials based on search and type
  const filteredMaterials = useMemo(() => {
    return materials.filter((mat) => {
      // Type filter
      if (typeFilter !== "all" && mat.type !== typeFilter) {
        return false
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          mat.name.toLowerCase().includes(query) ||
          (mat.original_filename?.toLowerCase().includes(query) ?? false)
        )
      }
      return true
    })
  }, [materials, searchQuery, typeFilter])

  // Reset pending selections when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setPendingIds(new Set(selectedIds))
      setSearchQuery("")
      setTypeFilter("all")
    }
    onOpenChange(open)
  }

  // Toggle material selection
  const toggleSelection = (materialId: string) => {
    const newSet = new Set(pendingIds)
    if (newSet.has(materialId)) {
      newSet.delete(materialId)
    } else {
      newSet.add(materialId)
    }
    setPendingIds(newSet)
  }

  // Confirm selection
  const handleConfirm = () => {
    const selectedMaterials = materials.filter((mat) => pendingIds.has(mat.id))
    onSelect(selectedMaterials)
    onOpenChange(false)
  }

  // Get count of pending selections
  const pendingCount = pendingIds.size

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-teal-600" />
            Select Materials
          </DialogTitle>
          <DialogDescription>
            Choose materials from your library to attach to this assignment.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as MaterialType | "all")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="url">URLs</SelectItem>
              <SelectItem value="text_note">Text Notes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Materials List */}
        <ScrollArea className="h-[350px] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading materials...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-destructive">
              Failed to load materials
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {materials.length === 0
                  ? "No materials in your library yet"
                  : "No materials match your search"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredMaterials.map((material) => {
                const isSelected = pendingIds.has(material.id)
                return (
                  <button
                    key={material.id}
                    onClick={() => toggleSelection(material.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "bg-teal-50 border border-teal-200 dark:bg-teal-950 dark:border-teal-800"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    {/* Selection indicator */}
                    <div
                      className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>

                    {/* Material icon */}
                    <div className="flex-shrink-0 p-2 rounded-md bg-muted">
                      <MaterialTypeIcon type={material.type} size="md" />
                    </div>

                    {/* Material info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {material.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getMaterialTypeLabel(material.type)}</span>
                        {material.file_size && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(material.file_size)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {pendingCount > 0 ? (
              <Badge variant="secondary">{pendingCount} selected</Badge>
            ) : (
              "No materials selected"
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={pendingCount === 0}>
              <Plus className="h-4 w-4 mr-1" />
              Add Selected
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

TeacherMaterialPicker.displayName = "TeacherMaterialPicker"

export default TeacherMaterialPicker
