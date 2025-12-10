/**
 * MaterialUploadZone Component
 * Story 13.2: Frontend My Materials Management
 *
 * Drag-and-drop file upload with validation and progress tracking.
 */

import { Upload, X } from "lucide-react"
import React, { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { StorageQuota, UploadingFile } from "@/types/material"
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  getMaterialType,
  validateFile,
} from "@/types/material"
import { MaterialTypeIcon } from "./MaterialTypeIcon"

interface MaterialUploadZoneProps {
  onUpload: (
    file: File,
    onProgress: (progress: number) => void,
  ) => Promise<void>
  quota: StorageQuota | null
  disabled?: boolean
  className?: string
}

/**
 * MaterialUploadZone provides drag-drop and click-to-upload functionality
 */
export function MaterialUploadZone({
  onUpload,
  quota,
  disabled = false,
  className,
}: MaterialUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isDisabled = disabled || (quota?.is_full ?? false)

  // Handle file selection
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (isDisabled) return

      const fileArray = Array.from(files)
      const validationErrors: string[] = []
      const validFiles: File[] = []

      // Validate files
      for (const file of fileArray) {
        const validation = validateFile(file)
        if (!validation.valid) {
          validationErrors.push(`${file.name}: ${validation.error}`)
        } else {
          validFiles.push(file)
        }
      }

      // Check quota for total size
      if (quota && validFiles.length > 0) {
        const totalSize = validFiles.reduce((sum, f) => sum + f.size, 0)
        const availableSpace = quota.quota_bytes - quota.used_bytes
        if (totalSize > availableSpace) {
          validationErrors.push(
            `Not enough storage space. ${formatBytes(totalSize)} needed, ${formatBytes(availableSpace)} available.`,
          )
          // Clear valid files since we can't upload them
          validFiles.length = 0
        }
      }

      setErrors((prev) => [...prev, ...validationErrors])

      if (validFiles.length === 0) return

      // Create upload entries
      const newUploading: UploadingFile[] = validFiles.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        progress: 0,
        status: "pending" as const,
      }))

      setUploadingFiles((prev) => [...prev, ...newUploading])

      // Upload files sequentially
      for (const uploading of newUploading) {
        try {
          // Mark as uploading
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploading.id ? { ...f, status: "uploading" } : f,
            ),
          )

          await onUpload(uploading.file, (progress) => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploading.id ? { ...f, progress } : f,
              ),
            )
          })

          // Mark as complete
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploading.id
                ? { ...f, status: "complete", progress: 100 }
                : f,
            ),
          )
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Upload failed"
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploading.id
                ? { ...f, status: "error", error: errorMessage }
                : f,
            ),
          )
        }
      }

      // Clear completed files after a delay
      setTimeout(() => {
        setUploadingFiles((prev) =>
          prev.filter((f) => f.status !== "complete"),
        )
      }, 2000)
    },
    [isDisabled, onUpload, quota],
  )

  // Drag event handlers
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isDisabled) setIsDragging(true)
    },
    [isDisabled],
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

      if (!isDisabled) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [isDisabled, handleFiles],
  )

  // Click to upload
  const handleClick = useCallback(() => {
    if (!isDisabled) {
      fileInputRef.current?.click()
    }
  }, [isDisabled])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files)
      }
      // Reset input
      e.target.value = ""
    },
    [handleFiles],
  )

  // Remove error
  const removeError = useCallback((index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Remove uploading file
  const removeUploadingFile = useCallback((id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // Build accept string
  const acceptString = Object.keys(ALLOWED_EXTENSIONS)
    .map((ext) => `.${ext}`)
    .join(",")

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropzone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors",
          isDisabled
            ? "cursor-not-allowed opacity-60 border-gray-300 dark:border-gray-700"
            : isDragging
              ? "cursor-pointer border-teal-500 bg-teal-50 dark:bg-teal-900/20"
              : "cursor-pointer border-gray-300 dark:border-gray-700 hover:border-teal-400",
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CardContent className="py-12">
          <div className="text-center">
            <Upload
              className={cn(
                "h-12 w-12 mx-auto mb-4",
                isDragging ? "text-teal-600" : "text-gray-400",
              )}
            />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {isDragging
                ? "Drop files here"
                : isDisabled
                  ? "Storage full"
                  : "Drag and drop files here"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {isDisabled ? "Delete files to free up space" : "or click to browse"}
            </p>
            {!isDisabled && (
              <Button
                type="button"
                variant="outline"
                className="border-teal-600 text-teal-600 hover:bg-teal-50"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClick()
                }}
              >
                Select Files
              </Button>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Supported: PDF, DOCX, TXT, Images, Audio, Video (Max{" "}
              {MAX_FILE_SIZE / (1024 * 1024)}MB per file)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptString}
        onChange={handleFileInputChange}
        className="sr-only"
        aria-label="File upload input"
        disabled={isDisabled}
      />

      {/* Uploading Files Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadingFile) => {
            const materialType = getMaterialType(uploadingFile.file)
            return (
              <Card key={uploadingFile.id} className="p-3">
                <div className="flex items-center gap-3">
                  {materialType && (
                    <MaterialTypeIcon type={materialType} size="md" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {uploadingFile.file.name}
                    </p>
                    {uploadingFile.status === "error" ? (
                      <p className="text-xs text-red-500 mt-1">
                        {uploadingFile.error}
                      </p>
                    ) : uploadingFile.status === "complete" ? (
                      <p className="text-xs text-green-500 mt-1">Complete</p>
                    ) : (
                      <Progress
                        value={uploadingFile.progress}
                        className="h-2 mt-1"
                      />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {uploadingFile.status === "complete"
                      ? "✓"
                      : uploadingFile.status === "error"
                        ? "✗"
                        : `${uploadingFile.progress}%`}
                  </span>
                  {(uploadingFile.status === "error" ||
                    uploadingFile.status === "complete") && (
                    <button
                      type="button"
                      onClick={() => removeUploadingFile(uploadingFile.id)}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <Card
              key={index}
              className="p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-red-600 dark:text-red-400 flex-1">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => removeError(index)}
                  className="text-red-600 hover:text-red-700 flex-shrink-0"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

MaterialUploadZone.displayName = "MaterialUploadZone"
