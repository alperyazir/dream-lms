import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Edit, Mail, Plus, Search, Trash2 } from "lucide-react"
import { useState } from "react"
import {
  AdminService,
  type PublisherCreateAPI,
  type PublisherPublic,
  type PublisherUpdate,
} from "@/client"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/admin/publishers")({
  component: () => (
    <ErrorBoundary>
      <AdminPublishers />
    </ErrorBoundary>
  ),
})

function AdminPublishers() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPublisher, setSelectedPublisher] =
    useState<PublisherPublic | null>(null)
  const [publisherToDelete, setPublisherToDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [newPublisher, setNewPublisher] = useState<PublisherCreateAPI>({
    name: "",
    contact_email: "",
    user_email: "",
    full_name: "",
  })
  const [editPublisher, setEditPublisher] = useState<PublisherUpdate>({
    name: "",
    contact_email: "",
    user_email: "",
    user_full_name: "",
  })

  // Fetch publishers from API
  const {
    data: publishers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["publishers"],
    queryFn: () => AdminService.listPublishers(),
  })

  // Create publisher mutation
  const createPublisherMutation = useMutation({
    mutationFn: (data: PublisherCreateAPI) =>
      AdminService.createPublisher({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishers"] })
      setIsAddDialogOpen(false)
      setNewPublisher({
        name: "",
        contact_email: "",
        user_email: "",
        full_name: "",
      })
      showSuccessToast("Publisher created successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to create publisher. Please try again.",
      )
    },
  })

  // Update publisher mutation
  const updatePublisherMutation = useMutation({
    mutationFn: ({
      publisherId,
      data,
    }: {
      publisherId: string
      data: PublisherUpdate
    }) => AdminService.updatePublisher({ publisherId, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishers"] })
      setIsEditDialogOpen(false)
      setSelectedPublisher(null)
      showSuccessToast("Publisher updated successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to update publisher. Please try again.",
      )
    },
  })

  // Delete publisher mutation
  const deletePublisherMutation = useMutation({
    mutationFn: (publisherId: string) =>
      AdminService.deletePublisher({ publisherId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishers"] })
      showSuccessToast("Publisher deleted successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to delete publisher. Please try again.",
      )
    },
  })

  const handleAddPublisher = () => {
    if (
      !newPublisher.name ||
      !newPublisher.contact_email ||
      !newPublisher.user_email ||
      !newPublisher.full_name
    ) {
      showErrorToast("Please fill in all required fields")
      return
    }
    createPublisherMutation.mutate(newPublisher)
  }

  const handleEditPublisher = (publisher: PublisherPublic) => {
    setSelectedPublisher(publisher)
    setEditPublisher({
      name: publisher.name,
      contact_email: publisher.contact_email || "",
      user_email: publisher.user_email,
      user_full_name: publisher.user_full_name,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdatePublisher = () => {
    if (!selectedPublisher) return
    if (
      !editPublisher.name ||
      !editPublisher.contact_email ||
      !editPublisher.user_email ||
      !editPublisher.user_full_name
    ) {
      showErrorToast("Please fill in all required fields")
      return
    }
    updatePublisherMutation.mutate({
      publisherId: selectedPublisher.id,
      data: editPublisher,
    })
  }

  const handleDeletePublisher = (publisherId: string, name: string) => {
    setPublisherToDelete({ id: publisherId, name })
    setIsDeleteDialogOpen(true)
  }

  const confirmDeletePublisher = () => {
    if (publisherToDelete) {
      deletePublisherMutation.mutate(publisherToDelete.id)
      setPublisherToDelete(null)
    }
  }

  const filteredPublishers = publishers.filter(
    (publisher) =>
      publisher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      publisher.contact_email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      publisher.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      publisher.user_full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  )

  if (error) {
    return (
      <div className="max-w-full p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
          Error loading publishers. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Publishers
          </h1>
          <p className="text-muted-foreground">
            Manage content publishers in the system
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Publisher
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search publishers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Publishers Table */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-500" />
            All Publishers ({filteredPublishers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading publishers...
            </div>
          ) : filteredPublishers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No publishers found matching your search"
                : "No publishers yet. Add your first publisher!"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Publisher Name</TableHead>
                  <TableHead>User Full Name</TableHead>
                  <TableHead>User Email</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPublishers.map((publisher) => (
                  <TableRow key={publisher.id}>
                    <TableCell className="font-medium">
                      {publisher.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {publisher.user_full_name || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="text-sm">
                          {publisher.user_email || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {publisher.contact_email || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(publisher.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPublisher(publisher)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeletePublisher(publisher.id, publisher.name)
                          }
                          disabled={deletePublisherMutation.isPending}
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

      {/* Add Publisher Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Publisher</DialogTitle>
            <DialogDescription>
              Create a new publisher account in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="publisher-name">Publisher Name *</Label>
              <Input
                id="publisher-name"
                placeholder="e.g., Oxford University Press"
                value={newPublisher.name}
                onChange={(e) =>
                  setNewPublisher({ ...newPublisher, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name *</Label>
              <Input
                id="full-name"
                placeholder="e.g., John Doe"
                value={newPublisher.full_name}
                onChange={(e) =>
                  setNewPublisher({
                    ...newPublisher,
                    full_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">User Email *</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="user@example.com"
                value={newPublisher.user_email}
                onChange={(e) =>
                  setNewPublisher({
                    ...newPublisher,
                    user_email: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Contact Email *</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="contact@example.com"
                value={newPublisher.contact_email}
                onChange={(e) =>
                  setNewPublisher({
                    ...newPublisher,
                    contact_email: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={createPublisherMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPublisher}
              disabled={createPublisherMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {createPublisherMutation.isPending
                ? "Creating..."
                : "Create Publisher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Publisher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Publisher</DialogTitle>
            <DialogDescription>
              Update the publisher and user information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-publisher-name">Publisher Name *</Label>
              <Input
                id="edit-publisher-name"
                placeholder="e.g., ABC Publishing"
                value={editPublisher.name || ""}
                onChange={(e) =>
                  setEditPublisher({ ...editPublisher, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact-email">Contact Email *</Label>
              <Input
                id="edit-contact-email"
                type="email"
                placeholder="e.g., contact@publisher.com"
                value={editPublisher.contact_email || ""}
                onChange={(e) =>
                  setEditPublisher({
                    ...editPublisher,
                    contact_email: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-full-name">User Full Name *</Label>
              <Input
                id="edit-user-full-name"
                placeholder="e.g., John Doe"
                value={editPublisher.user_full_name || ""}
                onChange={(e) =>
                  setEditPublisher({
                    ...editPublisher,
                    user_full_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">User Email *</Label>
              <Input
                id="edit-user-email"
                type="email"
                placeholder="e.g., user@publisher.com"
                value={editPublisher.user_email || ""}
                onChange={(e) =>
                  setEditPublisher({
                    ...editPublisher,
                    user_email: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updatePublisherMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePublisher}
              disabled={updatePublisherMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {updatePublisherMutation.isPending
                ? "Updating..."
                : "Update Publisher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeletePublisher}
        title="Delete Publisher"
        description={`Are you sure you want to delete "${publisherToDelete?.name}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletePublisherMutation.isPending}
      />
    </div>
  )
}
