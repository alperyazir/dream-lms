/**
 * Teacher Materials Page
 * Story 13.2: Frontend My Materials Management
 *
 * Main page for teachers to manage their supplementary materials.
 */

import { createFileRoute } from "@tanstack/react-router"
import { Link, Plus, StickyNote, Upload } from "lucide-react"
import { useState } from "react"
import { DeleteMaterialDialog } from "@/components/materials/DeleteMaterialDialog"
import { MaterialPreviewModal } from "@/components/materials/MaterialPreviewModal"
import { MaterialUploadZone } from "@/components/materials/MaterialUploadZone"
import { RenameDialog } from "@/components/materials/RenameDialog"
import { StorageQuotaBar } from "@/components/materials/StorageQuotaBar"
import { TeacherMaterialsTable } from "@/components/materials/TeacherMaterialsTable"
import { TextNoteModal } from "@/components/materials/TextNoteModal"
import { UrlLinkModal } from "@/components/materials/UrlLinkModal"
import { Button } from "@/components/ui/button"
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
import useCustomToast from "@/hooks/useCustomToast"
import { useMaterialsPage } from "@/hooks/useMaterials"
import { getDownloadUrl } from "@/services/materialsApi"
import type { Material, TextNoteCreate, TextNoteUpdate, UrlLinkCreate } from "@/types/material"

export const Route = createFileRoute("/_layout/teacher/materials/")({
  component: TeacherMaterialsPage,
})

function TeacherMaterialsPage() {
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // Get materials data and actions from hook
  const {
    materials,
    quota,
    isLoading,
    error,
    uploadFile,
    isUploading,
    createTextNote,
    updateTextNote,
    isCreatingNote,
    createUrlLink,
    isCreatingUrl,
    renameMaterial,
    isRenaming,
    deleteMaterial,
    isDeleting,
  } = useMaterialsPage()

  // Modal states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [textNoteModalOpen, setTextNoteModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Material | null>(null)
  const [urlLinkModalOpen, setUrlLinkModalOpen] = useState(false)
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [renamingMaterial, setRenamingMaterial] = useState<Material | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Handle file upload
  const handleUpload = async (file: File, onProgress: (progress: number) => void) => {
    try {
      await uploadFile({ file, onProgress })
      showSuccessToast(`${file.name} uploaded successfully`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed"
      showErrorToast(message)
      throw err
    }
  }

  // Handle text note save
  const handleSaveTextNote = async (data: TextNoteCreate | TextNoteUpdate) => {
    try {
      if (editingNote) {
        await updateTextNote(editingNote.id, data as TextNoteUpdate)
        showSuccessToast("Note updated successfully")
      } else {
        await createTextNote(data as TextNoteCreate)
        showSuccessToast("Note created successfully")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save note"
      showErrorToast(message)
      throw err
    }
  }

  // Handle URL link save
  const handleSaveUrlLink = async (data: UrlLinkCreate) => {
    try {
      await createUrlLink(data)
      showSuccessToast("Link saved successfully")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save link"
      showErrorToast(message)
      throw err
    }
  }

  // Handle rename
  const handleRename = async (newName: string) => {
    if (!renamingMaterial) return
    try {
      await renameMaterial(renamingMaterial.id, newName)
      showSuccessToast("Material renamed successfully")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to rename"
      showErrorToast(message)
      throw err
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deletingMaterial) return
    try {
      await deleteMaterial(deletingMaterial.id)
      showSuccessToast("Material deleted successfully")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete"
      showErrorToast(message)
      throw err
    }
  }

  // Handle preview
  const handlePreview = (material: Material) => {
    setPreviewMaterial(material)
    setPreviewModalOpen(true)
  }

  // Handle download
  const handleDownload = (material: Material) => {
    const downloadUrl = getDownloadUrl(material.id)
    // Create a temporary link to trigger download
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = material.original_filename || material.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle edit (for text notes)
  const handleEdit = (material: Material) => {
    setEditingNote(material)
    setTextNoteModalOpen(true)
  }

  // Handle rename click
  const handleRenameClick = (material: Material) => {
    setRenamingMaterial(material)
    setRenameDialogOpen(true)
  }

  // Handle delete click
  const handleDeleteClick = (material: Material) => {
    setDeletingMaterial(material)
    setDeleteDialogOpen(true)
  }

  // Handle create note button
  const handleCreateNote = () => {
    setEditingNote(null)
    setTextNoteModalOpen(true)
  }

  // Handle error display
  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="border border-red-200 dark:border-red-800 rounded-lg bg-white dark:bg-gray-900">
          <div className="py-8 text-center">
            <p className="text-red-500">
              Failed to load materials. Please try again later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Page Header with Add Material Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Materials
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload and manage your supplementary teaching materials
          </p>
        </div>

        {/* Add Material Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateNote}>
              <StickyNote className="h-4 w-4 mr-2" />
              Create Text Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setUrlLinkModalOpen(true)}>
              <Link className="h-4 w-4 mr-2" />
              Add URL Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Storage Quota - Compact */}
      <StorageQuotaBar quota={quota} />

      {/* Materials Table - Main Content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            Your Materials ({materials.length})
          </h2>
        </div>
        <div className="p-4">
          <TeacherMaterialsTable
            materials={materials}
            isLoading={isLoading}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onEdit={handleEdit}
            onRename={handleRenameClick}
            onDelete={handleDeleteClick}
          />
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Materials
            </DialogTitle>
          </DialogHeader>
          <MaterialUploadZone
            onUpload={handleUpload}
            quota={quota}
            disabled={isUploading}
          />
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <TextNoteModal
        open={textNoteModalOpen}
        onOpenChange={(open) => {
          setTextNoteModalOpen(open)
          if (!open) setEditingNote(null)
        }}
        material={editingNote}
        onSave={handleSaveTextNote}
        isSaving={isCreatingNote}
      />

      <UrlLinkModal
        open={urlLinkModalOpen}
        onOpenChange={setUrlLinkModalOpen}
        onSave={handleSaveUrlLink}
        isSaving={isCreatingUrl}
      />

      <MaterialPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        material={previewMaterial}
      />

      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open)
          if (!open) setRenamingMaterial(null)
        }}
        material={renamingMaterial}
        onRename={handleRename}
        isRenaming={isRenaming}
      />

      <DeleteMaterialDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setDeletingMaterial(null)
        }}
        material={deletingMaterial}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}
