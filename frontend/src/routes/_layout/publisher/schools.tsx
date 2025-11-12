import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Building2, MapPin } from "lucide-react"
import { useState } from "react"
import { PublishersService, type SchoolCreateByPublisher } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import useCustomToast from "@/hooks/useCustomToast"

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newSchool, setNewSchool] = useState<SchoolCreateByPublisher>({
    name: "",
    address: "",
    contact_info: "",
  })

  // Fetch schools from API
  const { data: schools = [], isLoading, error } = useQuery({
    queryKey: ["publisherSchools"],
    queryFn: () => PublishersService.listMySchools(),
  })

  // Create school mutation
  const createSchoolMutation = useMutation({
    mutationFn: (data: SchoolCreateByPublisher) =>
      PublishersService.createSchool({ requestBody: data }),
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
        if (typeof error.body.detail === 'string') {
          errorMessage = error.body.detail
        } else if (Array.isArray(error.body.detail)) {
          // Handle validation errors
          errorMessage = error.body.detail.map((err: any) => err.msg).join(", ")
        }
      }

      showErrorToast(errorMessage)
    },
  })

  const handleAddSchool = () => {
    if (!newSchool.name) {
      showErrorToast("Please enter a school name")
      return
    }

    createSchoolMutation.mutate(newSchool)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Schools</h1>
        <p className="text-muted-foreground">
          Schools managed by your organization
        </p>
      </div>

      {/* Add Button */}
      <div className="flex justify-end mb-6">
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Add School
        </Button>
      </div>

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
      ) : (
        /* Schools Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <Card
              key={school.id}
              className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {school.name}
                    </h3>
                    {school.address && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-1" />
                        {school.address}
                      </div>
                    )}
                  </div>
                  <Building2 className="w-8 h-8 text-teal-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add School Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New School</DialogTitle>
            <DialogDescription>
              Create a new school for your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name *</Label>
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
              {createSchoolMutation.isPending
                ? "Creating..."
                : "Create School"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
