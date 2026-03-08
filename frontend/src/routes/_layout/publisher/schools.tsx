import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle, Building2 } from "lucide-react"
import { useState } from "react"
import { FiTrendingUp } from "react-icons/fi"
import { PublishersService, type SchoolCreateByPublisher } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { SchoolCard } from "@/components/schools/SchoolCard"
import { SchoolDetailsDialog } from "@/components/schools/SchoolDetailsDialog"
import { SchoolListView } from "@/components/schools/SchoolListView"
import { Button } from "@/components/ui/button"
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
import { ViewModeToggle } from "@/components/ui/view-mode-toggle"
import useCustomToast from "@/hooks/useCustomToast"
import { useViewPreference } from "@/hooks/useViewPreference"

export const Route = createFileRoute("/_layout/publisher/schools")({
  component: () => (
    <ErrorBoundary>
      <PublisherSchoolsPage />
    </ErrorBoundary>
  ),
})

function PublisherSchoolsPage() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [viewMode, setViewMode] = useViewPreference("publisherSchools", "grid")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newSchool, setNewSchool] = useState<SchoolCreateByPublisher>({
    name: "",
    address: "",
    contact_info: "",
  })
  const [selectedSchool, setSelectedSchool] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [schoolToDelete, setSchoolToDelete] = useState<{
    id: string
    name: string
  } | null>(null)

  // Fetch schools from API
  const {
    data: schools = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["publisherSchools"],
    queryFn: () => PublishersService.listMySchools(),
  })

  // Create school mutation
  const createSchoolMutation = useMutation({
    mutationFn: async (data: SchoolCreateByPublisher) => {
      return await PublishersService.createMySchool({
        requestBody: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publisherSchools"] })
      queryClient.invalidateQueries({ queryKey: ["publisherStats"] })
      setIsAddDialogOpen(false)
      setNewSchool({
        name: "",
        address: "",
        contact_info: "",
      })
      showSuccessToast("School created successfully!")
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create school. Please try again."

      if (error.body?.detail) {
        if (typeof error.body.detail === "string") {
          errorMessage = error.body.detail
        } else if (Array.isArray(error.body.detail)) {
          // Handle validation errors
          errorMessage = error.body.detail.map((err: any) => err.msg).join(", ")
        }
      }

      showErrorToast(errorMessage)
    },
  })

  // Delete school mutation
  const deleteSchoolMutation = useMutation({
    mutationFn: async (schoolId: string) => {
      await PublishersService.deleteMySchool({ schoolId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publisherSchools"] })
      queryClient.invalidateQueries({ queryKey: ["publisherStats"] })
      setDeleteDialogOpen(false)
      setSchoolToDelete(null)
      showSuccessToast("School deleted successfully!")
    },
    onError: (error: any) => {
      let errorMessage = "Failed to delete school. Please try again."
      if (error.body?.detail) {
        errorMessage =
          typeof error.body.detail === "string"
            ? error.body.detail
            : "Failed to delete school"
      }
      showErrorToast(errorMessage)
    },
  })

  const handleDeleteClick = (school: { id: string; name: string }) => {
    setSchoolToDelete(school)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (schoolToDelete) {
      deleteSchoolMutation.mutate(schoolToDelete.id)
    }
  }

  const handleAddSchool = () => {
    if (!newSchool.name) {
      showErrorToast("Please enter a school name")
      return
    }

    createSchoolMutation.mutate(newSchool)
  }

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        icon={FiTrendingUp}
        title="My Schools"
        description="Schools managed by your organization"
      >
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Add School
        </Button>
      </PageHeader>

      {/* Loading/Error States */}
      {error ? (
        <div className="text-center py-12 text-red-500">
          Error loading schools. Please try again later.
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading schools...
        </div>
      ) : schools.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground mb-2">No schools yet</p>
          <p className="text-sm text-muted-foreground">
            Schools will appear here once they are created
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* Schools Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <SchoolCard
              key={school.id}
              school={school}
              onViewDetails={() => setSelectedSchool(school)}
              onDelete={() => handleDeleteClick(school)}
            />
          ))}
        </div>
      ) : (
        /* Schools List */
        <SchoolListView
          schools={schools}
          onViewDetails={setSelectedSchool}
          onDelete={(school) => handleDeleteClick(school)}
        />
      )}

      {/* Add School Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New School</DialogTitle>
            <DialogDescription>
              Create a new school for your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">
                School Name{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="school-name"
                placeholder="e.g., Central High School"
                value={newSchool.name}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="e.g., 123 Main St, City, State"
                value={newSchool.address || ""}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-info">Contact Information</Label>
              <Input
                id="contact-info"
                placeholder="e.g., +1 (555) 123-4567"
                value={newSchool.contact_info || ""}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, contact_info: e.target.value })
                }
              />
            </div>

          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={createSchoolMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSchool}
              disabled={createSchoolMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {createSchoolMutation.isPending ? "Creating..." : "Create School"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete School
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{schoolToDelete?.name}</strong>? This action cannot be
              undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteSchoolMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteSchoolMutation.isPending}
            >
              {deleteSchoolMutation.isPending ? "Deleting..." : "Delete School"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* School Details Dialog */}
      {selectedSchool && (
        <SchoolDetailsDialog
          open={!!selectedSchool}
          onOpenChange={(open) => !open && setSelectedSchool(null)}
          school={selectedSchool}
        />
      )}
    </PageContainer>
  )
}
