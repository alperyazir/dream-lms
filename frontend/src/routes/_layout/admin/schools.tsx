import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Edit, MapPin, Plus, School, Search, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import {
  AdminService,
  type SchoolCreate,
  type SchoolPublic,
  type SchoolUpdate,
} from "@/client"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/admin/schools")({
  component: () => (
    <ErrorBoundary>
      <AdminSchools />
    </ErrorBoundary>
  ),
})

function AdminSchools() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<SchoolPublic | null>(
    null,
  )
  const [schoolToDelete, setSchoolToDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [newSchool, setNewSchool] = useState<SchoolCreate>({
    name: "",
    address: "",
    contact_info: "",
    publisher_id: "",
  })
  const [editSchool, setEditSchool] = useState<SchoolUpdate>({
    name: "",
    address: "",
    contact_info: "",
    publisher_id: "",
  })

  // Fetch schools from API
  const {
    data: schools = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["schools"],
    queryFn: () => AdminService.listSchools(),
  })

  // Fetch publishers for dropdown
  const { data: allPublishers = [] } = useQuery({
    queryKey: ["publishers"],
    queryFn: () => AdminService.listPublishers(),
  })

  // Deduplicate publishers by name (keep first occurrence)
  const publishers = useMemo(() => {
    const seen = new Set<string>()
    return allPublishers.filter((publisher) => {
      if (seen.has(publisher.name)) {
        return false
      }
      seen.add(publisher.name)
      return true
    })
  }, [allPublishers])

  // Create school mutation
  const createSchoolMutation = useMutation({
    mutationFn: (data: SchoolCreate) =>
      AdminService.createSchool({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] })
      setIsAddDialogOpen(false)
      setNewSchool({
        name: "",
        address: "",
        contact_info: "",
        publisher_id: "",
      })
      showSuccessToast("School created successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to create school. Please try again.",
      )
    },
  })

  // Update school mutation
  const updateSchoolMutation = useMutation({
    mutationFn: ({
      schoolId,
      data,
    }: {
      schoolId: string
      data: SchoolUpdate
    }) => AdminService.updateSchool({ schoolId, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] })
      setIsEditDialogOpen(false)
      setSelectedSchool(null)
      showSuccessToast("School updated successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to update school. Please try again.",
      )
    },
  })

  // Delete school mutation
  const deleteSchoolMutation = useMutation({
    mutationFn: (schoolId: string) => AdminService.deleteSchool({ schoolId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] })
      showSuccessToast("School deleted successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to delete school. Please try again.",
      )
    },
  })

  const handleAddSchool = () => {
    if (!newSchool.name || !newSchool.publisher_id) {
      showErrorToast("Please fill in all required fields")
      return
    }
    createSchoolMutation.mutate(newSchool)
  }

  const handleEditSchool = (school: SchoolPublic) => {
    setSelectedSchool(school)
    setEditSchool({
      name: school.name,
      address: school.address || "",
      contact_info: school.contact_info || "",
      publisher_id: school.publisher_id,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateSchool = () => {
    if (!selectedSchool) return
    if (!editSchool.name || !editSchool.publisher_id) {
      showErrorToast("Please fill in all required fields")
      return
    }
    updateSchoolMutation.mutate({
      schoolId: selectedSchool.id,
      data: editSchool,
    })
  }

  const handleDeleteSchool = (schoolId: string, schoolName: string) => {
    setSchoolToDelete({ id: schoolId, name: schoolName })
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteSchool = () => {
    if (schoolToDelete) {
      deleteSchoolMutation.mutate(schoolToDelete.id)
      setSchoolToDelete(null)
    }
  }

  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.address?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Get publisher name by id
  const getPublisherName = (publisherId: string) => {
    const publisher = publishers.find((p) => p.id === publisherId)
    return publisher?.name || "Unknown"
  }

  if (error) {
    return (
      <div className="max-w-full p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
          Error loading schools. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Schools</h1>
          <p className="text-muted-foreground">Manage schools in the system</p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add School
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search schools by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Schools Table */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <School className="w-5 h-5 text-teal-500" />
            All Schools ({filteredSchools.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading schools...
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No schools found matching your search"
                : "No schools yet. Add your first school!"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="text-sm">
                          {school.address || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {school.contact_info || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">
                        {getPublisherName(school.publisher_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(school.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSchool(school)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteSchool(school.id, school.name)
                          }
                          disabled={deleteSchoolMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add School Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New School</DialogTitle>
            <DialogDescription>
              Create a new school in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name *</Label>
              <Input
                id="school-name"
                placeholder="e.g., Lincoln High School"
                value={newSchool.name}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher *</Label>
              <Select
                value={newSchool.publisher_id}
                onValueChange={(value) =>
                  setNewSchool({ ...newSchool, publisher_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a publisher" />
                </SelectTrigger>
                <SelectContent>
                  {publishers.map((publisher) => (
                    <SelectItem key={publisher.id} value={publisher.id}>
                      {publisher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="contact-info">Contact Info</Label>
              <Input
                id="contact-info"
                placeholder="e.g., phone, email"
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

      {/* Edit School Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
            <DialogDescription>Update the school information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-school-name">School Name *</Label>
              <Input
                id="edit-school-name"
                placeholder="e.g., Lincoln High School"
                value={editSchool.name || ""}
                onChange={(e) =>
                  setEditSchool({ ...editSchool, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-publisher">Publisher *</Label>
              <Select
                value={editSchool.publisher_id || ""}
                onValueChange={(value) =>
                  setEditSchool({ ...editSchool, publisher_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a publisher" />
                </SelectTrigger>
                <SelectContent>
                  {publishers.map((publisher) => (
                    <SelectItem key={publisher.id} value={publisher.id}>
                      {publisher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                placeholder="e.g., 123 Main St, City, State"
                value={editSchool.address || ""}
                onChange={(e) =>
                  setEditSchool({ ...editSchool, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact-info">Contact Info</Label>
              <Input
                id="edit-contact-info"
                placeholder="e.g., phone, email"
                value={editSchool.contact_info || ""}
                onChange={(e) =>
                  setEditSchool({ ...editSchool, contact_info: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateSchoolMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSchool}
              disabled={updateSchoolMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {updateSchoolMutation.isPending ? "Updating..." : "Update School"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteSchool}
        title="Delete School"
        description={`Are you sure you want to delete "${schoolToDelete?.name}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteSchoolMutation.isPending}
      />
    </div>
  )
}
