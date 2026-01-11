/**
 * My Materials Page
 * Story 27.16: DreamAI Sidebar Section
 *
 * Page for managing uploaded materials for AI processing.
 * Reuses functionality from teacher/ai-materials.tsx.
 */

import { createFileRoute } from "@tanstack/react-router"
import { FileText, Plus, RefreshCw, Sparkles } from "lucide-react"
import { useCallback, useState } from "react"
import {
  GeneratedContentLibrary,
  MaterialLibrary,
  MaterialUpload,
} from "@/components/teacher-materials"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useCustomToast from "@/hooks/useCustomToast"
import { materialsApi } from "@/services/materialsApi"
import { teacherMaterialsApi } from "@/services/teacherMaterialsApi"
import type { TeacherMaterial } from "@/types/teacher-material"

export const Route = createFileRoute("/_layout/dreamai/materials")({
  component: MyMaterialsPage,
})

function MyMaterialsPage() {
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // State
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [materials, setMaterials] = useState<TeacherMaterial[]>([])
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true)
  const [materialsError, setMaterialsError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"materials" | "generated">(
    "materials",
  )

  // Load materials
  const loadMaterials = useCallback(async () => {
    try {
      setIsLoadingMaterials(true)
      setMaterialsError(null)
      const response = await teacherMaterialsApi.listProcessableMaterials()
      setMaterials(response.materials)
    } catch (err) {
      console.error("Failed to load materials:", err)
      setMaterialsError("Failed to load materials")
    } finally {
      setIsLoadingMaterials(false)
    }
  }, [])

  // Load on mount
  useState(() => {
    loadMaterials()
  })

  // Handle PDF upload
  const handleUploadPdf = useCallback(
    async (
      file: File,
      name: string,
      description?: string,
      onProgress?: (progress: number) => void,
    ) => {
      const result = await teacherMaterialsApi.uploadPdfForAI(
        file,
        name,
        description,
        onProgress,
      )
      showSuccessToast(`"${name}" uploaded and processed successfully`)
      loadMaterials()
      return result
    },
    [showSuccessToast, loadMaterials],
  )

  // Handle text material creation
  const handleCreateTextMaterial = useCallback(
    async (name: string, text: string, description?: string) => {
      const result = await teacherMaterialsApi.createTextMaterial({
        name,
        text,
        description,
      })
      showSuccessToast(`"${name}" created successfully`)
      loadMaterials()
      return result
    },
    [showSuccessToast, loadMaterials],
  )

  // Handle material deletion
  const handleDeleteMaterial = useCallback(
    async (materialId: string) => {
      try {
        await materialsApi.deleteMaterial(materialId)
        showSuccessToast("Material deleted successfully")
        loadMaterials()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete"
        showErrorToast(message)
        throw err
      }
    },
    [showSuccessToast, showErrorToast, loadMaterials],
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              My Materials
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload PDFs or paste text for AI content generation
            </p>
          </div>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Material
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "materials" | "generated")}
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Source Materials
          </TabsTrigger>
          <TabsTrigger value="generated" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generated Content
          </TabsTrigger>
        </TabsList>

        {/* Materials Tab */}
        <TabsContent value="materials" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Materials for AI Processing
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMaterials}
                disabled={isLoadingMaterials}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoadingMaterials ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <MaterialLibrary
                materials={materials}
                isLoading={isLoadingMaterials}
                error={materialsError}
                onDelete={handleDeleteMaterial}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generated Content Tab */}
        <TabsContent value="generated" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <GeneratedContentLibrary />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Material
            </DialogTitle>
          </DialogHeader>
          <MaterialUpload
            onUploadPdf={handleUploadPdf}
            onCreateTextMaterial={handleCreateTextMaterial}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
