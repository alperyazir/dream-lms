import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  Check,
  Copy,
  Edit,
  KeyRound,
  Mail,
  Plus,
  Search,
  Shield,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import {
  type SupervisorCreateAPI,
  type SupervisorPublic,
  SupervisorsService,
  type SupervisorUpdate,
  type UserPublic,
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
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"
import { generateUsername } from "@/utils/usernameGenerator"

export const Route = createFileRoute("/_layout/admin/supervisors")({
  component: () => (
    <ErrorBoundary>
      <AdminSupervisors />
    </ErrorBoundary>
  ),
})

function AdminSupervisors() {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const isAdmin = currentUser?.role === "admin"

  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSupervisor, setSelectedSupervisor] =
    useState<SupervisorPublic | null>(null)
  const [supervisorToDelete, setSupervisorToDelete] = useState<{
    id: string
    userName: string
  } | null>(null)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false)
  const [isPasswordResultDialogOpen, setIsPasswordResultDialogOpen] =
    useState(false)
  const [supervisorToResetPassword, setSupervisorToResetPassword] = useState<{
    id: string
    userName: string
  } | null>(null)
  const [resetResult, setResetResult] = useState<{
    passwordEmailed: boolean
    temporaryPassword: string | null
    message: string
  } | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [newSupervisor, setNewSupervisor] = useState<SupervisorCreateAPI>({
    username: "",
    user_email: "",
    full_name: "",
  })
  const [editSupervisor, setEditSupervisor] = useState<SupervisorUpdate>({
    full_name: "",
    email: "",
    username: "",
    is_active: true,
  })

  // Fetch supervisors from API
  const {
    data: supervisors = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["supervisors"],
    queryFn: () => SupervisorsService.listSupervisors(),
  })

  // Create supervisor mutation (Admin only)
  const createSupervisorMutation = useMutation({
    mutationFn: (data: SupervisorCreateAPI) =>
      SupervisorsService.createSupervisor({ requestBody: data }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["supervisors"] })
      setIsAddDialogOpen(false)
      setNewSupervisor({
        username: "",
        user_email: "",
        full_name: "",
      })

      if (response.password_emailed) {
        showSuccessToast("Supervisor created. Password sent to their email.")
      } else if (response.temporary_password) {
        // Show one-time password dialog
        setResetResult({
          passwordEmailed: false,
          temporaryPassword: response.temporary_password,
          message: "Supervisor created successfully",
        })
        setIsPasswordResultDialogOpen(true)
      } else {
        showSuccessToast(response.message || "Supervisor created successfully!")
      }
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to create supervisor. Please try again.",
      )
    },
  })

  // Update supervisor mutation (Admin only)
  const updateSupervisorMutation = useMutation({
    mutationFn: ({
      supervisorId,
      data,
    }: {
      supervisorId: string
      data: SupervisorUpdate
    }) =>
      SupervisorsService.updateSupervisor({ supervisorId, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisors"] })
      setIsEditDialogOpen(false)
      setSelectedSupervisor(null)
      showSuccessToast("Supervisor updated successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to update supervisor. Please try again.",
      )
    },
  })

  // Delete supervisor mutation (Admin only)
  const deleteSupervisorMutation = useMutation({
    mutationFn: (supervisorId: string) =>
      SupervisorsService.deleteSupervisor({ supervisorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisors"] })
      setIsDeleteDialogOpen(false)
      setSupervisorToDelete(null)
      showSuccessToast("Supervisor deleted successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to delete supervisor. Please try again.",
      )
    },
  })

  // Reset password mutation (Admin only)
  const resetPasswordMutation = useMutation({
    mutationFn: (supervisorId: string) =>
      SupervisorsService.resetSupervisorPassword({ supervisorId }),
    onSuccess: (response) => {
      setResetResult({
        passwordEmailed: response.password_emailed,
        temporaryPassword: response.temporary_password ?? null,
        message: response.message,
      })
      setIsResetPasswordDialogOpen(false)
      setIsPasswordResultDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ["supervisors"] })
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to reset password. Please try again.",
      )
    },
  })

  const handleAddSupervisor = () => {
    if (!newSupervisor.username || !newSupervisor.full_name) {
      showErrorToast(
        "Please fill in all required fields (Username and Full Name)",
      )
      return
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(newSupervisor.username)) {
      showErrorToast(
        "Username must be 3-50 characters, alphanumeric, underscore, hyphen, or dot",
      )
      return
    }

    createSupervisorMutation.mutate(newSupervisor)
  }

  const handleEditSupervisor = (supervisor: SupervisorPublic) => {
    setSelectedSupervisor(supervisor)
    setEditSupervisor({
      full_name: supervisor.full_name || "",
      email: supervisor.email || "",
      username: supervisor.username || "",
      is_active: supervisor.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateSupervisor = () => {
    if (!selectedSupervisor) return
    if (!editSupervisor.full_name || !editSupervisor.username) {
      showErrorToast("Please fill in all required fields")
      return
    }
    updateSupervisorMutation.mutate({
      supervisorId: selectedSupervisor.id,
      data: editSupervisor,
    })
  }

  const handleDeleteSupervisor = (supervisorId: string, userName: string) => {
    setSupervisorToDelete({ id: supervisorId, userName })
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteSupervisor = () => {
    if (supervisorToDelete) {
      deleteSupervisorMutation.mutate(supervisorToDelete.id)
    }
  }

  // Password reset handlers
  const handleResetPassword = (supervisorId: string, userName: string) => {
    setSupervisorToResetPassword({ id: supervisorId, userName })
    setIsResetPasswordDialogOpen(true)
  }

  const confirmResetPassword = () => {
    if (supervisorToResetPassword) {
      resetPasswordMutation.mutate(supervisorToResetPassword.id)
    }
  }

  const handleCopyPassword = async () => {
    if (resetResult?.temporaryPassword) {
      await navigator.clipboard.writeText(resetResult.temporaryPassword)
      setPasswordCopied(true)
      showSuccessToast("Password copied to clipboard")
      setTimeout(() => setPasswordCopied(false), 2000)
    }
  }

  const closePasswordResultDialog = () => {
    setIsPasswordResultDialogOpen(false)
    setResetResult(null)
    setSupervisorToResetPassword(null)
    setPasswordCopied(false)
  }

  const filteredSupervisors = supervisors.filter(
    (supervisor) =>
      supervisor.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supervisor.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supervisor.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (error) {
    return (
      <div className="max-w-full p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
          Error loading supervisors. Please try again later.
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
            Supervisors
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Manage supervisor accounts in the system"
              : "View supervisor accounts in the system"}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supervisor
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search supervisors by name, username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Supervisors Table */}
      <Card className="shadow-neuro border-orange-100 dark:border-orange-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            All Supervisors ({filteredSupervisors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading supervisors...
            </div>
          ) : filteredSupervisors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No supervisors found matching your search"
                : "No supervisors yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSupervisors.map((supervisor) => (
                  <TableRow key={supervisor.id}>
                    <TableCell className="font-medium">
                      {supervisor.full_name || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {supervisor.username || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="text-sm">
                          {supervisor.email || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={supervisor.is_active ? "default" : "secondary"}
                        className={
                          supervisor.is_active
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                        }
                      >
                        {supervisor.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {supervisor.created_at
                        ? new Date(supervisor.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                        : "N/A"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleResetPassword(
                                supervisor.id,
                                supervisor.full_name || "Supervisor",
                              )
                            }
                            disabled={resetPasswordMutation.isPending}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSupervisor(supervisor)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteSupervisor(
                                supervisor.id,
                                supervisor.full_name || "Supervisor",
                              )
                            }
                            disabled={deleteSupervisorMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Supervisor Dialog (Admin only) */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supervisor</DialogTitle>
            <DialogDescription>
              Create a new supervisor account. A temporary password will be
              generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">
                Full Name{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="full-name"
                placeholder="e.g., John Doe"
                value={newSupervisor.full_name}
                onChange={(e) => {
                  const fullName = e.target.value
                  const generatedUsername = generateUsername(fullName)
                  setNewSupervisor({
                    ...newSupervisor,
                    full_name: fullName,
                    username: generatedUsername,
                  })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">
                Username{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="username"
                placeholder="e.g., johndoe"
                value={newSupervisor.username}
                onChange={(e) =>
                  setNewSupervisor({
                    ...newSupervisor,
                    username: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                3-50 characters, letters, numbers, underscore, hyphen, or dot
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., john@example.com"
                value={newSupervisor.user_email || ""}
                onChange={(e) =>
                  setNewSupervisor({
                    ...newSupervisor,
                    user_email: e.target.value || null,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                If provided, welcome email with password will be sent
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={createSupervisorMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSupervisor}
              disabled={createSupervisorMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
            >
              {createSupervisorMutation.isPending
                ? "Creating..."
                : "Create Supervisor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Supervisor Dialog (Admin only) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Supervisor</DialogTitle>
            <DialogDescription>
              Update the supervisor information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">
                Full Name{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="edit-full-name"
                placeholder="e.g., John Doe"
                value={editSupervisor.full_name || ""}
                onChange={(e) =>
                  setEditSupervisor({
                    ...editSupervisor,
                    full_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">
                Username{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="edit-username"
                placeholder="e.g., johndoe"
                value={editSupervisor.username || ""}
                onChange={(e) =>
                  setEditSupervisor({
                    ...editSupervisor,
                    username: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="e.g., john@example.com"
                value={editSupervisor.email || ""}
                onChange={(e) =>
                  setEditSupervisor({
                    ...editSupervisor,
                    email: e.target.value || null,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Active Status</Label>
              <Switch
                id="edit-active"
                checked={editSupervisor.is_active ?? true}
                onCheckedChange={(checked) =>
                  setEditSupervisor({
                    ...editSupervisor,
                    is_active: checked,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateSupervisorMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSupervisor}
              disabled={updateSupervisorMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
            >
              {updateSupervisorMutation.isPending
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteSupervisor}
        title="Delete Supervisor"
        description={`Are you sure you want to delete supervisor "${supervisorToDelete?.userName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteSupervisorMutation.isPending}
      />

      {/* Reset Password Confirmation Dialog */}
      <ConfirmDialog
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
        onConfirm={confirmResetPassword}
        title="Reset Password"
        description={`Reset password for "${supervisorToResetPassword?.userName}"? They will need to change it on next login.`}
        confirmText="Reset Password"
        cancelText="Cancel"
        variant="warning"
        isLoading={resetPasswordMutation.isPending}
      />

      {/* Password Result Dialog */}
      <Dialog
        open={isPasswordResultDialogOpen}
        onOpenChange={closePasswordResultDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              {resetResult?.message || "Password Reset Complete"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {resetResult?.passwordEmailed ? (
              <p className="text-muted-foreground">
                The new password has been sent to the supervisor's email
                address.
              </p>
            ) : resetResult?.temporaryPassword ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Save this password now - it won't be shown again:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-3 rounded font-mono text-sm">
                    {resetResult.temporaryPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="shrink-0"
                  >
                    {passwordCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The supervisor will be required to change this password on
                  their next login.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">{resetResult?.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={closePasswordResultDialog}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
