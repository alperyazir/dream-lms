/**
 * MaterialUpload Component
 * Story 27.15: Teacher Materials Processing
 *
 * Combined PDF upload with drag-and-drop and text paste input for AI processing.
 * Shows upload progress and text extraction results.
 */

import {
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
  Type,
  Upload,
  X,
} from "lucide-react"
import type React from "react"
import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { TeacherMaterialUploadResponse } from "@/types/teacher-material"
import { MAX_PDF_SIZE, MAX_TEXT_INPUT_SIZE } from "@/types/teacher-material"

// =============================================================================
// Types
// =============================================================================

interface MaterialUploadProps {
  /** Callback for PDF upload */
  onUploadPdf: (
    file: File,
    name: string,
    description?: string,
    onProgress?: (progress: number) => void,
  ) => Promise<TeacherMaterialUploadResponse>
  /** Callback for text material creation */
  onCreateTextMaterial: (
    name: string,
    text: string,
    description?: string,
  ) => Promise<TeacherMaterialUploadResponse>
  /** Whether component is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

interface UploadState {
  status: "idle" | "uploading" | "processing" | "success" | "error"
  progress: number
  error?: string
  result?: TeacherMaterialUploadResponse
}

// =============================================================================
// Component
// =============================================================================

export function MaterialUpload({
  onUploadPdf,
  onCreateTextMaterial,
  disabled = false,
  className,
}: MaterialUploadProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<"pdf" | "text">("pdf")

  // PDF upload state
  const [isDragging, setIsDragging] = useState(false)
  const [pdfName, setPdfName] = useState("")
  const [pdfDescription, setPdfDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pdfUploadState, setPdfUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Text input state
  const [textName, setTextName] = useState("")
  const [textContent, setTextContent] = useState("")
  const [textDescription, setTextDescription] = useState("")
  const [textUploadState, setTextUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  })

  // =============================================================================
  // PDF Upload Handlers
  // =============================================================================

  const validatePdfFile = useCallback((file: File): string | null => {
    if (file.type !== "application/pdf" && file.type !== "application/x-pdf") {
      return "Only PDF files are supported for text extraction"
    }
    if (file.size > MAX_PDF_SIZE) {
      return `File size exceeds maximum of ${MAX_PDF_SIZE / (1024 * 1024)}MB`
    }
    return null
  }, [])

  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validatePdfFile(file)
      if (error) {
        setPdfUploadState({ status: "error", progress: 0, error })
        return
      }
      setSelectedFile(file)
      // Auto-fill name from filename if empty
      if (!pdfName) {
        const nameWithoutExt = file.name.replace(/\.pdf$/i, "")
        setPdfName(nameWithoutExt)
      }
      setPdfUploadState({ status: "idle", progress: 0 })
    },
    [pdfName, validatePdfFile],
  )

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragging(true)
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [disabled, handleFileSelect],
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files[0])
      }
      // Reset input to allow re-selecting same file
      e.target.value = ""
    },
    [handleFileSelect],
  )

  const handlePdfUpload = useCallback(async () => {
    if (!selectedFile || !pdfName.trim()) return

    setPdfUploadState({ status: "uploading", progress: 0 })

    try {
      const result = await onUploadPdf(
        selectedFile,
        pdfName.trim(),
        pdfDescription.trim() || undefined,
        (progress) => {
          setPdfUploadState((prev) => ({
            ...prev,
            progress,
            status: progress < 100 ? "uploading" : "processing",
          }))
        },
      )

      setPdfUploadState({ status: "success", progress: 100, result })
      // Reset form
      setSelectedFile(null)
      setPdfName("")
      setPdfDescription("")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed"
      setPdfUploadState({ status: "error", progress: 0, error: errorMessage })
    }
  }, [selectedFile, pdfName, pdfDescription, onUploadPdf])

  const clearPdfState = useCallback(() => {
    setSelectedFile(null)
    setPdfName("")
    setPdfDescription("")
    setPdfUploadState({ status: "idle", progress: 0 })
  }, [])

  // =============================================================================
  // Text Input Handlers
  // =============================================================================

  const handleTextSubmit = useCallback(async () => {
    if (!textName.trim() || !textContent.trim()) return

    // Validate text size
    if (new Blob([textContent]).size > MAX_TEXT_INPUT_SIZE) {
      setTextUploadState({
        status: "error",
        progress: 0,
        error: `Text exceeds maximum size of ${MAX_TEXT_INPUT_SIZE / 1024}KB`,
      })
      return
    }

    setTextUploadState({ status: "processing", progress: 50 })

    try {
      const result = await onCreateTextMaterial(
        textName.trim(),
        textContent,
        textDescription.trim() || undefined,
      )

      setTextUploadState({ status: "success", progress: 100, result })
      // Reset form
      setTextName("")
      setTextContent("")
      setTextDescription("")
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create material"
      setTextUploadState({ status: "error", progress: 0, error: errorMessage })
    }
  }, [textName, textContent, textDescription, onCreateTextMaterial])

  const clearTextState = useCallback(() => {
    setTextName("")
    setTextContent("")
    setTextDescription("")
    setTextUploadState({ status: "idle", progress: 0 })
  }, [])

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const renderExtractionResult = (result: TeacherMaterialUploadResponse) => {
    const extraction = result.extraction
    if (!extraction) return null

    return (
      <Card className="mt-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-green-800 dark:text-green-200">
                Text Extraction Complete
              </h4>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300 space-y-1">
                <p>
                  <strong>Material:</strong> {result.material.name}
                </p>
                <p>
                  <strong>Word Count:</strong>{" "}
                  {extraction.word_count.toLocaleString()} words
                </p>
                {extraction.language && (
                  <p>
                    <strong>Language:</strong>{" "}
                    {extraction.language.toUpperCase()}
                  </p>
                )}
              </div>
              {extraction.extracted_text && (
                <div className="mt-3">
                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                    Preview (first 300 characters):
                  </p>
                  <div className="p-2 bg-white dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 max-h-24 overflow-y-auto">
                    {extraction.extracted_text.slice(0, 300)}
                    {extraction.extracted_text.length > 300 && "..."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderError = (error: string, onDismiss: () => void) => (
    <Card className="mt-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-red-600 hover:text-red-700"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  )

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "pdf" | "text")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pdf" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Upload PDF
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Paste Text
          </TabsTrigger>
        </TabsList>

        {/* PDF Upload Tab */}
        <TabsContent value="pdf" className="mt-4 space-y-4">
          {/* Dropzone */}
          <Card
            className={cn(
              "border-2 border-dashed transition-colors",
              disabled
                ? "cursor-not-allowed opacity-60 border-gray-300 dark:border-gray-700"
                : isDragging
                  ? "cursor-pointer border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                  : "cursor-pointer border-gray-300 dark:border-gray-700 hover:border-teal-400",
            )}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <CardContent className="py-8">
              <div className="text-center">
                {selectedFile ? (
                  <>
                    <FileText className="h-12 w-12 mx-auto mb-3 text-teal-600" />
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                      }}
                    >
                      Choose different file
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload
                      className={cn(
                        "h-12 w-12 mx-auto mb-3",
                        isDragging ? "text-teal-600" : "text-gray-400",
                      )}
                    />
                    <p className="font-medium text-gray-900 dark:text-white">
                      {isDragging ? "Drop PDF here" : "Drag and drop PDF here"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Max {MAX_PDF_SIZE / (1024 * 1024)}MB
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInputChange}
            className="sr-only"
            disabled={disabled}
          />

          {/* Name and Description */}
          {selectedFile && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="pdf-name">Material Name *</Label>
                <Input
                  id="pdf-name"
                  value={pdfName}
                  onChange={(e) => setPdfName(e.target.value)}
                  placeholder="Enter a name for this material"
                  maxLength={255}
                  disabled={disabled || pdfUploadState.status === "uploading"}
                />
              </div>
              <div>
                <Label htmlFor="pdf-description">Description (optional)</Label>
                <Textarea
                  id="pdf-description"
                  value={pdfDescription}
                  onChange={(e) => setPdfDescription(e.target.value)}
                  placeholder="Add a description..."
                  maxLength={1000}
                  rows={2}
                  disabled={disabled || pdfUploadState.status === "uploading"}
                />
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {(pdfUploadState.status === "uploading" ||
            pdfUploadState.status === "processing") && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {pdfUploadState.status === "uploading"
                      ? "Uploading..."
                      : "Extracting text..."}
                  </p>
                  <Progress
                    value={pdfUploadState.progress}
                    className="h-2 mt-1"
                  />
                </div>
                <span className="text-sm text-gray-500">
                  {pdfUploadState.progress}%
                </span>
              </div>
            </Card>
          )}

          {/* Success Result */}
          {pdfUploadState.status === "success" &&
            pdfUploadState.result &&
            renderExtractionResult(pdfUploadState.result)}

          {/* Error */}
          {pdfUploadState.status === "error" &&
            pdfUploadState.error &&
            renderError(pdfUploadState.error, clearPdfState)}

          {/* Upload Button */}
          {selectedFile && pdfUploadState.status === "idle" && (
            <Button
              onClick={handlePdfUpload}
              disabled={!pdfName.trim() || disabled}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload and Extract Text
            </Button>
          )}
        </TabsContent>

        {/* Text Input Tab */}
        <TabsContent value="text" className="mt-4 space-y-4">
          <div>
            <Label htmlFor="text-name">Material Name *</Label>
            <Input
              id="text-name"
              value={textName}
              onChange={(e) => setTextName(e.target.value)}
              placeholder="Enter a name for this material"
              maxLength={255}
              disabled={disabled || textUploadState.status === "processing"}
            />
          </div>

          <div>
            <Label htmlFor="text-content">Text Content *</Label>
            <Textarea
              id="text-content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste your text content here. This can be from a document, article, lesson material, etc."
              rows={10}
              disabled={disabled || textUploadState.status === "processing"}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {textContent.length > 0 && (
                <>
                  {textContent.split(/\s+/).filter(Boolean).length} words |{" "}
                  {new Blob([textContent]).size.toLocaleString()} /{" "}
                  {(MAX_TEXT_INPUT_SIZE / 1024).toFixed(0)}KB
                </>
              )}
            </p>
          </div>

          <div>
            <Label htmlFor="text-description">Description (optional)</Label>
            <Textarea
              id="text-description"
              value={textDescription}
              onChange={(e) => setTextDescription(e.target.value)}
              placeholder="Add a description..."
              maxLength={1000}
              rows={2}
              disabled={disabled || textUploadState.status === "processing"}
            />
          </div>

          {/* Processing */}
          {textUploadState.status === "processing" && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Processing text...</p>
                  <Progress
                    value={textUploadState.progress}
                    className="h-2 mt-1"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Success Result */}
          {textUploadState.status === "success" &&
            textUploadState.result &&
            renderExtractionResult(textUploadState.result)}

          {/* Error */}
          {textUploadState.status === "error" &&
            textUploadState.error &&
            renderError(textUploadState.error, clearTextState)}

          {/* Submit Button */}
          {textUploadState.status !== "success" && (
            <Button
              onClick={handleTextSubmit}
              disabled={
                !textName.trim() ||
                !textContent.trim() ||
                disabled ||
                textUploadState.status === "processing"
              }
              className="w-full"
            >
              {textUploadState.status === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Type className="h-4 w-4 mr-2" />
                  Create Text Material
                </>
              )}
            </Button>
          )}

          {/* Create Another */}
          {textUploadState.status === "success" && (
            <Button
              variant="outline"
              onClick={clearTextState}
              className="w-full"
            >
              Create Another Material
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

MaterialUpload.displayName = "MaterialUpload"
