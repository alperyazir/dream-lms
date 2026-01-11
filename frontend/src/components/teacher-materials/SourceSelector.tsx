/**
 * SourceSelector Component
 * Story 27.15: Teacher Materials Processing
 *
 * Reusable component for selecting content source (Book or Teacher Material)
 * for AI generation forms.
 */

import { AlertCircle, BookOpen, FileText, Loader2, Plus } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { booksApi } from "@/services/booksApi"
import { teacherMaterialsApi } from "@/services/teacherMaterialsApi"
import type { Book, BookStructureResponse } from "@/types/book"
import type { TeacherMaterial } from "@/types/teacher-material"
import { MaterialLibrary } from "./MaterialLibrary"

// =============================================================================
// Types
// =============================================================================

export type SourceType = "book" | "material"

export interface SelectedSource {
  type: SourceType
  // Book source
  bookId?: number
  bookName?: string
  bookStructure?: BookStructureResponse
  // Material source
  materialId?: string
  materialName?: string
  extractedText?: string
  wordCount?: number
  language?: string | null
}

interface SourceSelectorProps {
  /** Currently selected source */
  selectedSource: SelectedSource | null
  /** Callback when source changes */
  onSourceChange: (source: SelectedSource | null) => void
  /** Whether to show book structure selector (for vocab/module-based activities) */
  showBookModules?: boolean
  /** Whether the form is disabled */
  disabled?: boolean
  /** Error message */
  error?: string | null
  /** Callback to open upload dialog */
  onUploadClick?: () => void
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function SourceSelector({
  selectedSource,
  onSourceChange,
  showBookModules = false,
  disabled = false,
  error = null,
  onUploadClick,
  className,
}: SourceSelectorProps) {
  // Active tab
  const [activeTab, setActiveTab] = useState<SourceType>(
    selectedSource?.type || "book",
  )

  // Books data
  const [books, setBooks] = useState<Book[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [bookError, setBookError] = useState<string | null>(null)

  // Book structure (for module selection)
  const [loadingStructure, setLoadingStructure] = useState(false)

  // Materials data
  const [materials, setMaterials] = useState<TeacherMaterial[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [materialsError, setMaterialsError] = useState<string | null>(null)

  // Load books on mount
  useEffect(() => {
    async function loadBooks() {
      try {
        setLoadingBooks(true)
        setBookError(null)
        const response = await booksApi.getBooks({ limit: 100 })
        setBooks(response.items)
      } catch (err) {
        console.error("Failed to load books:", err)
        setBookError("Failed to load books")
      } finally {
        setLoadingBooks(false)
      }
    }
    loadBooks()
  }, [])

  // Load materials on mount
  useEffect(() => {
    async function loadMaterials() {
      try {
        setLoadingMaterials(true)
        setMaterialsError(null)
        const response = await teacherMaterialsApi.listProcessableMaterials()
        setMaterials(response.materials)
      } catch (err) {
        console.error("Failed to load materials:", err)
        setMaterialsError("Failed to load materials")
      } finally {
        setLoadingMaterials(false)
      }
    }
    loadMaterials()
  }, [])

  // Handle tab change
  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as SourceType
      setActiveTab(newTab)
      // Clear selection when switching tabs
      onSourceChange(null)
    },
    [onSourceChange],
  )

  // Handle book selection
  const handleBookSelect = useCallback(
    async (bookIdStr: string) => {
      const bookId = parseInt(bookIdStr, 10)
      const book = books.find((b) => b.id === bookId)
      if (!book) return

      // If we need book structure, load it
      let structure: BookStructureResponse | undefined
      if (showBookModules) {
        try {
          setLoadingStructure(true)
          structure = await booksApi.getBookStructure(bookId)
        } catch (err) {
          console.error("Failed to load book structure:", err)
        } finally {
          setLoadingStructure(false)
        }
      }

      onSourceChange({
        type: "book",
        bookId,
        bookName: book.title,
        bookStructure: structure,
      })
    },
    [books, showBookModules, onSourceChange],
  )

  // Handle material selection
  const handleMaterialSelect = useCallback(
    (material: TeacherMaterial) => {
      onSourceChange({
        type: "material",
        materialId: material.id,
        materialName: material.name,
        extractedText: material.extracted_text || undefined,
        wordCount: material.word_count || undefined,
        language: material.language,
      })
    },
    [onSourceChange],
  )

  // Refresh materials list
  const refreshMaterials = useCallback(async () => {
    try {
      setLoadingMaterials(true)
      const response = await teacherMaterialsApi.listProcessableMaterials()
      setMaterials(response.materials)
    } catch (err) {
      console.error("Failed to refresh materials:", err)
    } finally {
      setLoadingMaterials(false)
    }
  }, [])

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-base font-semibold">Content Source</Label>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="book" disabled={disabled}>
            <BookOpen className="h-4 w-4 mr-2" />
            From Book
          </TabsTrigger>
          <TabsTrigger value="material" disabled={disabled}>
            <FileText className="h-4 w-4 mr-2" />
            My Materials
          </TabsTrigger>
        </TabsList>

        {/* Book Source Tab */}
        <TabsContent value="book" className="mt-4">
          {loadingBooks ? (
            <Card className="p-6">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading books...</span>
              </div>
            </Card>
          ) : bookError ? (
            <Card className="p-4 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>{bookError}</span>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <Select
                value={selectedSource?.bookId?.toString() || ""}
                onValueChange={handleBookSelect}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a book..." />
                </SelectTrigger>
                <SelectContent>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id.toString()}>
                      {book.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Loading structure indicator */}
              {loadingStructure && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading book structure...
                </div>
              )}

              {/* Selected book info */}
              {selectedSource?.type === "book" && selectedSource.bookId && (
                <Card className="p-3 bg-teal-50 dark:bg-teal-900/20 border-teal-200">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
                      {selectedSource.bookName}
                    </span>
                    {selectedSource.bookStructure && (
                      <span className="text-xs text-teal-600 dark:text-teal-400">
                        ({selectedSource.bookStructure.modules.length} modules)
                      </span>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Material Source Tab */}
        <TabsContent value="material" className="mt-4">
          <div className="space-y-4">
            {/* Upload button */}
            {onUploadClick && (
              <Button
                variant="outline"
                onClick={onUploadClick}
                disabled={disabled}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload New Material
              </Button>
            )}

            {/* Materials list */}
            <MaterialLibrary
              materials={materials}
              isLoading={loadingMaterials}
              error={materialsError}
              onSelect={handleMaterialSelect}
              selectedMaterialId={selectedSource?.materialId}
              selectionMode
            />

            {/* Selected material info */}
            {selectedSource?.type === "material" &&
              selectedSource.materialId && (
                <Card className="p-3 bg-teal-50 dark:bg-teal-900/20 border-teal-200">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
                      {selectedSource.materialName}
                    </span>
                    {selectedSource.wordCount && (
                      <span className="text-xs text-teal-600 dark:text-teal-400">
                        ({selectedSource.wordCount.toLocaleString()} words)
                      </span>
                    )}
                  </div>
                </Card>
              )}

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshMaterials}
              disabled={loadingMaterials || disabled}
              className="w-full text-gray-500"
            >
              {loadingMaterials ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Refresh Materials
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

SourceSelector.displayName = "SourceSelector"
