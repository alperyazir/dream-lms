import { createFileRoute } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter, FolderOpen } from "lucide-react"
import { FileUploadDropzone } from "@/components/materials/FileUploadDropzone"
import { MaterialsTable } from "@/components/materials/MaterialsTable"
import { ShareMaterialDialog } from "@/components/materials/ShareMaterialDialog"
import useCustomToast from "@/hooks/useCustomToast"
import { mockMaterials, type Material } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/teacher/materials/")({
  component: MaterialsLibrary,
})

function MaterialsLibrary() {
  const { showSuccessToast } = useCustomToast()
  const [materials, setMaterials] = useState<Material[]>(mockMaterials)
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all")
  const [sharedFilter, setSharedFilter] = useState<string>("all")
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null,
  )
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  // Filter materials
  const filteredMaterials = useMemo(() => {
    let filtered = [...materials]

    // File type filter
    if (fileTypeFilter !== "all") {
      filtered = filtered.filter((m) => m.type === fileTypeFilter)
    }

    // Shared status filter
    if (sharedFilter === "shared") {
      filtered = filtered.filter((m) => m.shared_with.length > 0)
    } else if (sharedFilter === "not-shared") {
      filtered = filtered.filter((m) => m.shared_with.length === 0)
    }

    return filtered
  }, [materials, fileTypeFilter, sharedFilter])

  // Handle file upload
  const handleFilesUploaded = (files: File[]) => {
    const newMaterials: Material[] = files.map((file) => ({
      id: `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: file.type.startsWith("image/")
        ? "image"
        : file.type === "application/pdf"
          ? "pdf"
          : "video",
      size: file.size,
      uploaded_at: new Date().toISOString(),
      shared_with: [],
    }))

    setMaterials((prev) => [...newMaterials, ...prev])

    // Store to localStorage
    try {
      const existingMaterials = JSON.parse(
        localStorage.getItem("mockMaterials") || "[]",
      )
      localStorage.setItem(
        "mockMaterials",
        JSON.stringify([...newMaterials, ...existingMaterials]),
      )
    } catch (error) {
      console.error("Error saving to localStorage:", error)
    }

    showSuccessToast(`${files.length} file(s) uploaded successfully`)
  }

  // Handle share
  const handleShare = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId)
    if (material) {
      setSelectedMaterial(material)
      setIsShareDialogOpen(true)
    }
  }

  // Handle share submit
  const handleShareSubmit = (
    materialId: string,
    selectedClasses: string[],
  ) => {
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === materialId ? { ...m, shared_with: selectedClasses } : m,
      ),
    )

    // Update localStorage
    try {
      const existingMaterials = JSON.parse(
        localStorage.getItem("mockMaterials") || "[]",
      )
      const updatedMaterials = existingMaterials.map((m: Material) =>
        m.id === materialId ? { ...m, shared_with: selectedClasses } : m,
      )
      localStorage.setItem(
        "mockMaterials",
        JSON.stringify(updatedMaterials),
      )
    } catch (error) {
      console.error("Error updating localStorage:", error)
    }

    showSuccessToast(`Material shared with ${selectedClasses.length} class(es)`)
  }

  // Handle download (mock)
  const handleDownload = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId)
    if (material) {
      showSuccessToast(`Downloading ${material.name}...`)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Materials Library
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Upload and share educational materials with your classes
        </p>
      </div>

      {/* File Upload Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="h-5 w-5" />
            Upload Materials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploadDropzone onFilesUploaded={handleFilesUploaded} />
        </CardContent>
      </Card>

      {/* Filters Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Type Filter */}
            <div className="space-y-2">
              <label
                htmlFor="fileType"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                File Type
              </label>
              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger id="fileType" aria-label="Select file type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shared Status Filter */}
            <div className="space-y-2">
              <label
                htmlFor="sharedStatus"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Shared Status
              </label>
              <Select value={sharedFilter} onValueChange={setSharedFilter}>
                <SelectTrigger
                  id="sharedStatus"
                  aria-label="Select shared status"
                >
                  <SelectValue placeholder="All materials" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="not-shared">Not Shared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">
            Your Materials ({filteredMaterials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialsTable
            materials={filteredMaterials}
            onShare={handleShare}
            onDownload={handleDownload}
          />
        </CardContent>
      </Card>

      {/* Share Dialog */}
      <ShareMaterialDialog
        material={selectedMaterial}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        onShare={handleShareSubmit}
      />
    </div>
  )
}
