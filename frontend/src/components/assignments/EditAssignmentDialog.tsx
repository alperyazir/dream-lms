/**
 * Edit Assignment Dialog Component
 * Story 3.8: Teacher Assignment Management Dashboard
 * Story 13.3: Assignment Integration - Edit Resources Support
 *
 * Allows teachers to edit editable fields of existing assignments:
 * - name, instructions, due_date, time_limit_minutes, resources
 * Immutable fields are displayed as read-only (activity, book, recipients)
 */

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  ChevronDown,
  ChevronUp,
  FileBox,
  FolderOpen,
  Loader2,
  Plus,
  Trash2,
  Video,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  getMaterialTypeLabel,
  MaterialTypeIcon,
} from "@/components/materials/MaterialTypeIcon"
import { TeacherMaterialPicker } from "@/components/materials/TeacherMaterialPicker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { previewAssignment, updateAssignment } from "@/services/assignmentsApi"
import type {
  AdditionalResources,
  AssignmentListItem,
  AssignmentUpdateRequest,
  TeacherMaterialResource,
} from "@/types/assignment"
import type { Material, MaterialType } from "@/types/material"

/**
 * Validation schema for assignment update
 */
const updateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(500, "Name must be 500 characters or less"),
  instructions: z.string().optional(),
  due_date: z.string().optional(),
  time_limit_minutes: z
    .number()
    .int()
    .positive("Time limit must be positive")
    .nullable()
    .optional(),
})

type UpdateFormData = z.infer<typeof updateSchema>

interface EditAssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
  assignment: AssignmentListItem
}

export function EditAssignmentDialog({
  isOpen,
  onClose,
  assignment,
}: EditAssignmentDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Resources state
  const [resources, setResources] = useState<AdditionalResources | null>(null)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false)

  // Fetch assignment preview to get current resources
  const { data: previewData, isLoading: isLoadingPreview } = useQuery({
    queryKey: ["assignment-preview", assignment.id],
    queryFn: () => previewAssignment(assignment.id),
    enabled: isOpen,
  })

  // Initialize resources from preview data
  useEffect(() => {
    if (previewData?.resources) {
      // Convert response resources to form resources
      const formResources: AdditionalResources = {
        videos: previewData.resources.videos.map((v) => ({
          type: "video" as const,
          path: v.path,
          name: v.name,
          subtitles_enabled: v.subtitles_enabled,
          has_subtitles: v.has_subtitles,
        })),
        teacher_materials:
          previewData.resources.teacher_materials?.map((m) => ({
            type: "teacher_material" as const,
            material_id: m.material_id,
            name: m.name,
            material_type: m.material_type,
          })) ?? [],
      }
      setResources(formResources)
    } else {
      setResources(null)
    }
  }, [previewData])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: assignment.name,
      instructions: assignment.instructions || "",
      due_date: assignment.due_date ? assignment.due_date.split("T")[0] : "",
      time_limit_minutes: assignment.time_limit_minutes,
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: AssignmentUpdateRequest) =>
      updateAssignment(assignment.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({
        queryKey: ["assignment-preview", assignment.id],
      })
      toast({
        title: "Success",
        description: "Assignment updated successfully!",
      })
      onClose()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error?.response?.data?.detail || "Failed to update assignment",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: UpdateFormData) => {
    // Check if resources have content
    const hasResources =
      (resources?.videos.length ?? 0) > 0 ||
      (resources?.teacher_materials?.length ?? 0) > 0

    // Convert form data to API format
    const updateData: AssignmentUpdateRequest = {
      name: data.name,
      instructions: data.instructions || null,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      time_limit_minutes: data.time_limit_minutes || null,
      resources: hasResources ? resources : null,
    }

    updateMutation.mutate(updateData)
  }

  const handleClose = () => {
    reset()
    setResources(null)
    setResourcesOpen(false)
    onClose()
  }

  /**
   * Remove a video resource
   */
  const handleRemoveVideo = (index: number) => {
    if (!resources) return
    const updatedVideos = [...resources.videos]
    updatedVideos.splice(index, 1)
    setResources({
      ...resources,
      videos: updatedVideos,
    })
  }

  /**
   * Remove a teacher material
   */
  const handleRemoveMaterial = (materialId: string) => {
    if (!resources) return
    const updatedMaterials = (resources.teacher_materials ?? []).filter(
      (m) => m.material_id !== materialId,
    )
    setResources({
      ...resources,
      teacher_materials: updatedMaterials,
    })
  }

  /**
   * Add teacher materials from picker
   */
  const handleAddMaterials = (materials: Material[]) => {
    const newMaterials: TeacherMaterialResource[] = materials.map((mat) => ({
      type: "teacher_material" as const,
      material_id: mat.id,
      name: mat.name,
      material_type: mat.type,
    }))

    // Filter out already added
    const existingIds = new Set(
      (resources?.teacher_materials ?? []).map((m) => m.material_id),
    )
    const uniqueNew = newMaterials.filter(
      (m) => !existingIds.has(m.material_id),
    )

    if (uniqueNew.length === 0) return

    setResources({
      videos: resources?.videos ?? [],
      teacher_materials: [
        ...(resources?.teacher_materials ?? []),
        ...uniqueNew,
      ],
    })
  }

  // Calculate resource counts
  const videoCount = resources?.videos.length ?? 0
  const materialCount = resources?.teacher_materials?.length ?? 0
  const totalResources = videoCount + materialCount
  const selectedMaterialIds = (resources?.teacher_materials ?? []).map(
    (m) => m.material_id,
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>
            Update the assignment details. Activity and recipients cannot be
            changed after creation.
          </DialogDescription>
        </DialogHeader>

        {isLoadingPreview ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading assignment data...
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Assignment Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Assignment Name{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter assignment name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                {...register("instructions")}
                placeholder="Add special instructions for students"
                rows={4}
              />
              {errors.instructions && (
                <p className="text-sm text-red-500">
                  {errors.instructions.message}
                </p>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                {...register("due_date")}
                min={format(new Date(), "yyyy-MM-dd")}
              />
              {errors.due_date && (
                <p className="text-sm text-red-500">
                  {errors.due_date.message}
                </p>
              )}
            </div>

            {/* Time Limit */}
            <div className="space-y-2">
              <Label htmlFor="time_limit_minutes">Time Limit (minutes)</Label>
              <Input
                id="time_limit_minutes"
                type="number"
                {...register("time_limit_minutes", { valueAsNumber: true })}
                placeholder="e.g., 30"
                min="1"
              />
              {errors.time_limit_minutes && (
                <p className="text-sm text-red-500">
                  {errors.time_limit_minutes.message}
                </p>
              )}
            </div>

            {/* Additional Resources - Story 13.3 */}
            <Collapsible open={resourcesOpen} onOpenChange={setResourcesOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-teal-600" />
                    <span className="font-medium">Additional Resources</span>
                    {totalResources > 0 && (
                      <Badge variant="secondary">
                        {totalResources} attached
                      </Badge>
                    )}
                  </div>
                  {resourcesOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-4 rounded-lg border p-4">
                {/* Videos Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Videos</Label>
                    {videoCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {videoCount}
                      </Badge>
                    )}
                  </div>
                  {videoCount > 0 ? (
                    <div className="space-y-2">
                      {resources?.videos.map((video, index) => (
                        <div
                          key={video.path}
                          className="flex items-center justify-between rounded-md border bg-muted/30 p-2"
                        >
                          <span className="text-sm truncate flex-1">
                            {video.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveVideo(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No videos attached. Videos can be added when creating a
                      new assignment.
                    </p>
                  )}
                </div>

                <Separator />

                {/* Teacher Materials Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileBox className="h-4 w-4 text-teal-600" />
                      <Label className="text-sm font-medium">
                        My Materials
                      </Label>
                      {materialCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {materialCount}
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMaterialPickerOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  {materialCount > 0 ? (
                    <div className="space-y-2">
                      {resources?.teacher_materials?.map((material) => (
                        <div
                          key={material.material_id}
                          className="flex items-center justify-between rounded-md border bg-muted/30 p-2"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <MaterialTypeIcon
                              type={material.material_type as MaterialType}
                              size="sm"
                            />
                            <span className="text-sm truncate">
                              {material.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (
                              {getMaterialTypeLabel(
                                material.material_type as MaterialType,
                              )}
                              )
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() =>
                              handleRemoveMaterial(material.material_id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No materials attached. Click "Add" to attach materials
                      from your library.
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Read-only fields */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Read-Only Information
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Book</Label>
                  <p className="text-sm">{assignment.book_title}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Activity
                  </Label>
                  <p className="text-sm">{assignment.activity_title}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Activity Type
                  </Label>
                  <p className="text-sm capitalize">
                    {assignment.activity_type}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Students Assigned
                  </Label>
                  <p className="text-sm">
                    {assignment.total_students} students
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Teacher Material Picker Modal */}
        <TeacherMaterialPicker
          open={materialPickerOpen}
          onOpenChange={setMaterialPickerOpen}
          selectedIds={selectedMaterialIds}
          onSelect={handleAddMaterials}
        />
      </DialogContent>
    </Dialog>
  )
}
