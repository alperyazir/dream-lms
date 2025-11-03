import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Image,
  Share2,
  Video,
} from "lucide-react"
import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Material } from "@/lib/mockData"

export interface MaterialsTableProps {
  materials: Material[]
  itemsPerPage?: number
  onShare?: (materialId: string) => void
  onDownload?: (materialId: string) => void
}

/**
 * Materials Table Component
 * Displays materials with file info, sharing status, and actions
 */
export const MaterialsTable = React.memo(
  ({
    materials,
    itemsPerPage = 15,
    onShare,
    onDownload,
  }: MaterialsTableProps) => {
    const [currentPage, setCurrentPage] = useState(1)
    const [sortBy, setSortBy] = useState<"date" | "name">("date")

    // Sort materials
    const sortedMaterials = [...materials].sort((a, b) => {
      if (sortBy === "date") {
        return (
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        )
      }
      return a.name.localeCompare(b.name)
    })

    // Pagination
    const totalPages = Math.ceil(sortedMaterials.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentMaterials = sortedMaterials.slice(startIndex, endIndex)

    // Get file type icon
    const getFileTypeIcon = (type: string) => {
      switch (type) {
        case "pdf":
          return <FileText className="h-5 w-5 text-red-500" />
        case "image":
          return <Image className="h-5 w-5 text-blue-500" />
        case "video":
          return <Video className="h-5 w-5 text-purple-500" />
        default:
          return <FileText className="h-5 w-5 text-gray-500" />
      }
    }

    // Format file size
    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    // Format date
    const formatDate = (dateString: string): string => {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    }

    return (
      <div className="space-y-4">
        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Sort by:
          </span>
          <Button
            variant={sortBy === "date" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("date")}
            className={sortBy === "date" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            Date
          </Button>
          <Button
            variant={sortBy === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("name")}
            className={sortBy === "name" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            Name
          </Button>
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
                  <TableHead className="w-[140px]">Uploaded</TableHead>
                  <TableHead className="w-[150px]">Shared With</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      No materials found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>{getFileTypeIcon(material.type)}</TableCell>
                      <TableCell className="font-medium">
                        {material.name}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {formatFileSize(material.size)}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {formatDate(material.uploaded_at)}
                      </TableCell>
                      <TableCell>
                        {material.shared_with.length === 0 ? (
                          <span className="text-gray-500 text-sm">
                            Not shared
                          </span>
                        ) : (
                          <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                            {material.shared_with.length} classes
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onShare?.(material.id)}
                            className="border-teal-600 text-teal-600 hover:bg-teal-50"
                          >
                            <Share2 className="h-4 w-4 mr-1" />
                            Share
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDownload?.(material.id)}
                            aria-label="Download material"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
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
              Showing {startIndex + 1}-
              {Math.min(endIndex, sortedMaterials.length)} of{" "}
              {sortedMaterials.length} materials
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
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
  },
)

MaterialsTable.displayName = "MaterialsTable"
