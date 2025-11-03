import React, { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, File, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface UploadedFile {
  file: File
  progress: number
  id: string
}

export interface FileUploadDropzoneProps {
  onFilesUploaded: (files: File[]) => void
  maxFileSize?: number // in bytes
  acceptedFileTypes?: string[]
}

/**
 * File Upload Dropzone Component
 * Drag-and-drop file upload with validation and progress indication
 */
export const FileUploadDropzone = React.memo(
  ({
    onFilesUploaded,
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    acceptedFileTypes = ["image/*", "application/pdf", "video/*"],
  }: FileUploadDropzoneProps) => {
    const [isDragging, setIsDragging] = useState(false)
    const [uploadingFiles, setUploadingFiles] = useState<UploadedFile[]>([])
    const [errors, setErrors] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Validate file
    const validateFile = (file: File): string | null => {
      // Check file size
      if (file.size > maxFileSize) {
        return `${file.name}: File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`
      }

      // Check file type
      const fileType = file.type
      const isValidType = acceptedFileTypes.some((type) => {
        if (type.endsWith("/*")) {
          const typePrefix = type.split("/")[0]
          return fileType.startsWith(`${typePrefix}/`)
        }
        return fileType === type
      })

      if (!isValidType) {
        return `${file.name}: File type not supported`
      }

      return null
    }

    // Handle file upload (mock instant upload)
    const handleFiles = async (files: FileList | null) => {
      if (!files || files.length === 0) return

      const fileArray = Array.from(files)
      const validationErrors: string[] = []
      const validFiles: File[] = []

      // Validate files
      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          validationErrors.push(error)
        } else {
          validFiles.push(file)
        }
      }

      setErrors(validationErrors)

      if (validFiles.length === 0) return

      // Add files to uploading state with initial progress
      const uploadingFileObjects: UploadedFile[] = validFiles.map(
        (file) => ({
          file,
          progress: 0,
          id: `${file.name}-${Date.now()}`,
        }),
      )

      setUploadingFiles((prev) => [...prev, ...uploadingFileObjects])

      // Simulate upload progress (mock instant upload)
      for (const uploadingFile of uploadingFileObjects) {
        // Simulate progress in steps
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise((resolve) => setTimeout(resolve, 50))
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id ? { ...f, progress } : f,
            ),
          )
        }
      }

      // Notify parent component
      onFilesUploaded(validFiles)

      // Clear uploading files after a short delay
      setTimeout(() => {
        setUploadingFiles([])
      }, 1000)
    }

    // Drag event handlers
    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      handleFiles(files)
    }

    // Click to upload
    const handleClick = () => {
      fileInputRef.current?.click()
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      // Reset input
      e.target.value = ""
    }

    // Remove error
    const removeError = (index: number) => {
      setErrors((prev) => prev.filter((_, i) => i !== index))
    }

    return (
      <div className="space-y-4">
        {/* Dropzone */}
        <Card
          className={cn(
            "border-2 border-dashed transition-colors cursor-pointer",
            isDragging
              ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
              : "border-gray-300 dark:border-gray-700 hover:border-teal-400",
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
                  : "Drag and drop files here"}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                or click to browse
              </p>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Supported: Images, PDFs, Videos (Max{" "}
                {Math.round(maxFileSize / (1024 * 1024))}MB per file)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFileTypes.join(",")}
          onChange={handleFileInputChange}
          className="sr-only"
          aria-label="File upload input"
        />

        {/* Uploading Files Progress */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            {uploadingFiles.map((uploadingFile) => (
              <Card key={uploadingFile.id} className="p-3">
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-teal-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {uploadingFile.file.name}
                    </p>
                    <Progress
                      value={uploadingFile.progress}
                      className="h-2 mt-1"
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {uploadingFile.progress}%
                  </span>
                </div>
              </Card>
            ))}
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
  },
)

FileUploadDropzone.displayName = "FileUploadDropzone"
