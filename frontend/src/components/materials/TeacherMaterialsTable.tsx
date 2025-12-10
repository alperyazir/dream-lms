/**
 * TeacherMaterialsTable Component
 * Story 13.2: Frontend My Materials Management
 *
 * Displays materials in a table with filtering, sorting, and pagination.
 */

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react"
import React, { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Material, MaterialType } from "@/types/material"
import { MATERIAL_TYPE_LABELS } from "@/types/material"
import { MaterialTypeIcon } from "./MaterialTypeIcon"

interface TeacherMaterialsTableProps {
  materials: Material[]
  isLoading?: boolean
  itemsPerPage?: number
  onPreview?: (material: Material) => void
  onDownload?: (material: Material) => void
  onRename?: (material: Material) => void
  onEdit?: (material: Material) => void
  onDelete?: (material: Material) => void
}

type SortBy = "date" | "name"
type SortOrder = "asc" | "desc"

/**
 * Format bytes to human-readable string
 */
function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "-"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format date to readable string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * TeacherMaterialsTable displays materials with actions
 */
export function TeacherMaterialsTable({
  materials,
  isLoading = false,
  itemsPerPage = 15,
  onPreview,
  onDownload,
  onRename,
  onEdit,
  onDelete,
}: TeacherMaterialsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortBy>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [typeFilter, setTypeFilter] = useState<MaterialType | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Filter materials by type and search query
  const filteredMaterials = useMemo(() => {
    let filtered = materials

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((m) => m.type === typeFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(query) ||
        m.original_filename?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [materials, typeFilter, searchQuery])

  // Sort materials
  const sortedMaterials = useMemo(() => {
    const sorted = [...filteredMaterials].sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      }
      const comparison = a.name.localeCompare(b.name)
      return sortOrder === "asc" ? comparison : -comparison
    })
    return sorted
  }, [filteredMaterials, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(sortedMaterials.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMaterials = sortedMaterials.slice(startIndex, endIndex)

  // Reset to first page when filter or search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter, searchQuery])

  // Handle sort toggle
  const handleSortChange = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(newSortBy)
      setSortOrder(newSortBy === "date" ? "desc" : "asc")
    }
  }

  // Can download check
  const canDownload = (material: Material): boolean => {
    return !["url", "text_note"].includes(material.type)
  }

  // Can edit check (only text notes)
  const canEdit = (material: Material): boolean => {
    return material.type === "text_note"
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="h-12 bg-gray-100 dark:bg-gray-800" />
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search, Filters, and Sort Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials..."
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Filter:
          </span>
          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(value as MaterialType | "all")
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(
                Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[]
              ).map((type) => (
                <SelectItem key={type} value={type}>
                  {MATERIAL_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Sort by:
          </span>
          <Button
            variant={sortBy === "date" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortChange("date")}
            className={cn(sortBy === "date" && "bg-teal-600 hover:bg-teal-700")}
          >
            Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
          <Button
            variant={sortBy === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortChange("name")}
            className={cn(sortBy === "name" && "bg-teal-600 hover:bg-teal-700")}
          >
            Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[100px]">Size</TableHead>
                <TableHead className="w-[140px]">Date Added</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMaterials.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-lg font-medium">No materials found</p>
                      <p className="text-sm">
                        {searchQuery
                          ? `No materials matching "${searchQuery}". Try a different search.`
                          : typeFilter !== "all"
                            ? `No ${MATERIAL_TYPE_LABELS[typeFilter as MaterialType].toLowerCase()}s yet. Try a different filter.`
                            : "Upload files, create notes, or add links to get started."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell>
                      <MaterialTypeIcon type={material.type} />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="max-w-[300px] truncate" title={material.name}>
                        {material.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {formatFileSize(material.file_size)}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {formatDate(material.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider delayDuration={300}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Preview */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => onPreview?.(material)}
                                aria-label="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview</TooltipContent>
                          </Tooltip>

                          {/* Download (only for file-based materials) */}
                          {canDownload(material) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => onDownload?.(material)}
                                  aria-label="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Edit (only for text notes) */}
                          {canEdit(material) ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => onEdit?.(material)}
                                  aria-label="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                          ) : (
                            /* Rename (for non-editable materials) */
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => onRename?.(material)}
                                  aria-label="Rename"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Rename</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Delete */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                onClick={() => onDelete?.(material)}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedMaterials.length)}{" "}
            of {sortedMaterials.length} materials
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

TeacherMaterialsTable.displayName = "TeacherMaterialsTable"
