import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  Check,
  Copy,
  Edit,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react"
import { useState } from "react"
import {
  AdminService,
  type TeacherCreateAPI,
  type TeacherPublic,
  type TeacherUpdate,
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
import { generateUsername } from "@/utils/usernameGenerator"

export const Route = createFileRoute("/_layout/admin/teachers")({
  component: () => (
    <ErrorBoundary>
      <AdminTeachers />
    </ErrorBoundary>
  ),
})

function AdminTeachers() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherPublic | null>(
    null,
  )
  const [teacherToDelete, setTeacherToDelete] = useState<{
    id: string
    userName: string
  } | null>(null)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false)
  const [isPasswordResultDialogOpen, setIsPasswordResultDialogOpen] =
    useState(false)
  const [teacherToResetPassword, setTeacherToResetPassword] = useState<{
    userId: string
    userName: string
  } | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [newTeacher, setNewTeacher] = useState<TeacherCreateAPI>({
    username: "",
    user_email: "",
    full_name: "",
    school_id: "",
    subject_specialization: "",
  })
  const [editTeacher, setEditTeacher] = useState<TeacherUpdate>({
    school_id: undefined,
    subject_specialization: "",
    user_email: "",
    user_username: "",
    user_full_name: "",
  })

  // Track which passwords are revealed (Eye icon state)
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, boolean>
  >({})

  // Fetch teachers from API
  const {
    data: teachers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => AdminService.listTeachers(),
  })

  // Fetch schools for dropdown
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => AdminService.listSchools(),
  })

  // Create teacher mutation
  const createTeacherMutation = useMutation({
    mutationFn: (data: TeacherCreateAPI) =>
      AdminService.createTeacher({ requestBody: data }),
    onSuccess: (_response) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
      setIsAddDialogOpen(false)
      setNewTeacher({
        username: "",
        user_email: "",
        full_name: "",
        school_id: "",
        subject_specialization: "",
      })

      showSuccessToast(
        "Teacher created successfully! Password visible in table.",
      )
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to create teacher. Please try again.",
      )
    },
  })

  // Update teacher mutation
  const updateTeacherMutation = useMutation({
    mutationFn: ({
      teacherId,
      data,
    }: {
      teacherId: string
      data: TeacherUpdate
    }) => AdminService.updateTeacher({ teacherId, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
      setIsEditDialogOpen(false)
      setSelectedTeacher(null)
      showSuccessToast("Teacher updated successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to update teacher. Please try again.",
      )
    },
  })

  // Delete teacher mutation
  const deleteTeacherMutation = useMutation({
    mutationFn: (teacherId: string) =>
      AdminService.deleteTeacher({ teacherId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
      showSuccessToast("Teacher deleted successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to delete teacher. Please try again.",
      )
    },
  })

  // Reset password mutation [Story 9.2]
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => AdminService.resetUserPassword({ userId }),
    onSuccess: (response) => {
      setNewPassword(response.new_password)
      setIsResetPasswordDialogOpen(false)
      setIsPasswordResultDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to reset password. Please try again.",
      )
    },
  })

  const handleAddTeacher = () => {
    if (
      !newTeacher.username ||
      !newTeacher.user_email ||
      !newTeacher.full_name ||
      !newTeacher.school_id
    ) {
      showErrorToast("Please fill in all required fields")
      return
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(newTeacher.username)) {
      showErrorToast(
        "Username must be 3-50 characters, alphanumeric, underscore, hyphen, or dot",
      )
      return
    }

    createTeacherMutation.mutate(newTeacher)
  }

  const handleEditTeacher = (teacher: TeacherPublic) => {
    setSelectedTeacher(teacher)
    setEditTeacher({
      school_id: teacher.school_id,
      subject_specialization: teacher.subject_specialization || "",
      user_email: teacher.user_email,
      user_username: teacher.user_username || "",
      user_full_name: teacher.user_full_name,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateTeacher = () => {
    if (!selectedTeacher) return
    if (
      !editTeacher.user_email ||
      !editTeacher.user_full_name ||
      !editTeacher.school_id
    ) {
      showErrorToast("Please fill in all required fields")
      return
    }
    updateTeacherMutation.mutate({
      teacherId: selectedTeacher.id,
      data: editTeacher,
    })
  }

  const handleDeleteTeacher = (teacherId: string, userName: string) => {
    setTeacherToDelete({ id: teacherId, userName })
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteTeacher = () => {
    if (teacherToDelete) {
      deleteTeacherMutation.mutate(teacherToDelete.id)
      setTeacherToDelete(null)
    }
  }

  // Password reset handlers [Story 9.2]
  const handleResetPassword = (userId: string, userName: string) => {
    setTeacherToResetPassword({ userId, userName })
    setIsResetPasswordDialogOpen(true)
  }

  const confirmResetPassword = () => {
    if (teacherToResetPassword) {
      resetPasswordMutation.mutate(teacherToResetPassword.userId)
    }
  }

  const handleCopyPassword = async () => {
    if (newPassword) {
      await navigator.clipboard.writeText(newPassword)
      setPasswordCopied(true)
      setTimeout(() => setPasswordCopied(false), 2000)
    }
  }

  const closePasswordResultDialog = () => {
    setIsPasswordResultDialogOpen(false)
    setNewPassword(null)
    setTeacherToResetPassword(null)
    setPasswordCopied(false)
  }

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.subject_specialization
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      teacher.user_full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      teacher.user_username
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      teacher.user_email?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Get school name by id
  const getSchoolName = (schoolId: string) => {
    const school = schools.find((s) => s.id === schoolId)
    return school?.name || "Unknown"
  }

  if (error) {
    return (
      <div className="max-w-full p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
          Error loading teachers. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Teachers</h1>
          <p className="text-muted-foreground">Manage teachers in the system</p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Teacher
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers by name, username, email or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Teachers Table */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-500" />
            All Teachers ({filteredTeachers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading teachers...
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No teachers found matching your search"
                : "No teachers yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Subject Specialization</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      {teacher.user_full_name || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {teacher.user_username || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="text-sm">
                          {teacher.user_email || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getSchoolName(teacher.school_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {teacher.subject_specialization || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(teacher.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </TableCell>
                    <TableCell>
                      {(teacher as any).user_initial_password ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {revealedPasswords[teacher.user_id]
                              ? (teacher as any).user_initial_password
                              : "••••••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setRevealedPasswords((prev) => ({
                                ...prev,
                                [teacher.user_id]: !prev[teacher.user_id],
                              }))
                            }
                            className="h-7 w-7 p-0"
                          >
                            {revealedPasswords[teacher.user_id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          N/A
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleResetPassword(
                              teacher.user_id,
                              teacher.user_full_name || "Teacher",
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
                          onClick={() => handleEditTeacher(teacher)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteTeacher(
                              teacher.id,
                              teacher.user_full_name || "Teacher",
                            )
                          }
                          disabled={deleteTeacherMutation.isPending}
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

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>
              Update the teacher information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Full Name *</Label>
              <Input
                id="edit-full-name"
                placeholder="e.g., John Doe"
                value={editTeacher.user_full_name || ""}
                onChange={(e) =>
                  setEditTeacher({
                    ...editTeacher,
                    user_full_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username *</Label>
              <Input
                id="edit-username"
                placeholder="e.g., johndoe"
                value={editTeacher.user_username || ""}
                onChange={(e) =>
                  setEditTeacher({
                    ...editTeacher,
                    user_username: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                3-50 characters, alphanumeric, underscore, hyphen, or dot
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="e.g., teacher@school.com"
                value={editTeacher.user_email || ""}
                onChange={(e) =>
                  setEditTeacher({ ...editTeacher, user_email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school">School *</Label>
              <Select
                value={editTeacher.school_id || ""}
                onValueChange={(value) =>
                  setEditTeacher({ ...editTeacher, school_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Subject Specialization</Label>
              <Input
                id="edit-subject"
                placeholder="e.g., Mathematics"
                value={editTeacher.subject_specialization || ""}
                onChange={(e) =>
                  setEditTeacher({
                    ...editTeacher,
                    subject_specialization: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateTeacherMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTeacher}
              disabled={
                updateTeacherMutation.isPending ||
                !editTeacher.user_full_name ||
                !editTeacher.user_email ||
                !editTeacher.school_id
              }
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {updateTeacherMutation.isPending
                ? "Updating..."
                : "Update Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Teacher Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>Create a new teacher account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name *</Label>
              <Input
                id="full-name"
                placeholder="e.g., John Doe"
                value={newTeacher.full_name}
                onChange={(e) => {
                  const fullName = e.target.value
                  // Auto-generate username with Turkish character support
                  const generatedUsername = generateUsername(fullName)

                  setNewTeacher({
                    ...newTeacher,
                    full_name: fullName,
                    username: generatedUsername,
                  })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="e.g., johndoe"
                value={newTeacher.username}
                onChange={(e) =>
                  setNewTeacher({
                    ...newTeacher,
                    username: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from full name (editable)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., teacher@school.com"
                value={newTeacher.user_email}
                onChange={(e) =>
                  setNewTeacher({ ...newTeacher, user_email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school">School *</Label>
              <Select
                value={newTeacher.school_id}
                onValueChange={(value) =>
                  setNewTeacher({ ...newTeacher, school_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Specialization</Label>
              <Input
                id="subject"
                placeholder="e.g., Mathematics"
                value={newTeacher.subject_specialization || ""}
                onChange={(e) =>
                  setNewTeacher({
                    ...newTeacher,
                    subject_specialization: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={createTeacherMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTeacher}
              disabled={
                createTeacherMutation.isPending ||
                !newTeacher.full_name ||
                !newTeacher.username ||
                !newTeacher.user_email ||
                !newTeacher.school_id
              }
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {createTeacherMutation.isPending
                ? "Creating..."
                : "Create Teacher"}
            </Button>
          </DialogFooter>
          {!newTeacher.school_id &&
            newTeacher.full_name &&
            newTeacher.username &&
            newTeacher.user_email && (
              <p className="text-sm text-red-500 -mt-2">
                Please select a school to continue
              </p>
            )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteTeacher}
        title="Delete Teacher"
        description={`Are you sure you want to delete teacher "${teacherToDelete?.userName}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteTeacherMutation.isPending}
      />

      {/* Reset Password Confirmation Dialog [Story 9.2] */}
      <ConfirmDialog
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
        onConfirm={confirmResetPassword}
        title="Reset Password"
        description={`Are you sure you want to reset the password for "${teacherToResetPassword?.userName}"? A new password will be generated and the user will be notified.`}
        confirmText="Reset Password"
        cancelText="Cancel"
        variant="warning"
        isLoading={resetPasswordMutation.isPending}
      />

      {/* New Password Display Dialog [Story 9.2] */}
      <Dialog
        open={isPasswordResultDialogOpen}
        onOpenChange={closePasswordResultDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-green-500" />
              Password Reset Successful
            </DialogTitle>
            <DialogDescription>
              The password for {teacherToResetPassword?.userName} has been
              reset. Please share this password securely with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm text-muted-foreground mb-2 block">
              New Password
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm select-all">
                {newPassword}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPassword}
                className="flex items-center gap-1"
              >
                {passwordCopied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This password is displayed only once. Make sure to copy it before
              closing this dialog.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={closePasswordResultDialog}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
