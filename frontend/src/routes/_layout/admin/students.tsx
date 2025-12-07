import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  Check,
  Copy,
  Edit,
  Eye,
  EyeOff,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  Mail,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react"
import { useState } from "react"
import {
  AdminService,
  type StudentCreateAPI,
  type StudentPublic,
  type StudentUpdate,
} from "@/client"
import { ImportStudentsDialog } from "@/components/Admin/ImportStudentsDialog"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { generateUsername } from "@/utils/usernameGenerator"

export const Route = createFileRoute("/_layout/admin/students")({
  component: () => (
    <ErrorBoundary>
      <AdminStudents />
    </ErrorBoundary>
  ),
})

function AdminStudents() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentPublic | null>(
    null,
  )
  const [studentToDelete, setStudentToDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false)
  const [isPasswordResultDialogOpen, setIsPasswordResultDialogOpen] =
    useState(false)
  const [studentToResetPassword, setStudentToResetPassword] = useState<{
    userId: string
    userName: string
  } | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  )
  const [newStudent, setNewStudent] = useState<StudentCreateAPI>({
    username: "",
    user_email: "",
    full_name: "",
    grade_level: undefined,
    parent_email: undefined,
  })
  const [editStudent, setEditStudent] = useState<StudentUpdate>({
    user_email: "",
    user_username: "",
    user_full_name: "",
    grade_level: "",
    parent_email: "",
  })

  // Track which passwords are revealed (Eye icon state)
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, boolean>
  >({})

  // Fetch students from API
  const {
    data: students = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => AdminService.listStudents(),
  })

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: (data: StudentCreateAPI) =>
      AdminService.createStudent({ requestBody: data }),
    onSuccess: (_response) => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
      setIsAddDialogOpen(false)
      setNewStudent({
        username: "",
        user_email: "",
        full_name: "",
        grade_level: undefined,
        parent_email: undefined,
      })

      showSuccessToast(
        "Student created successfully! Password visible in table.",
      )
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to create student. Please try again.",
      )
    },
  })

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: ({
      studentId,
      data,
    }: {
      studentId: string
      data: StudentUpdate
    }) => AdminService.updateStudent({ studentId, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
      setIsEditDialogOpen(false)
      setSelectedStudent(null)
      showSuccessToast("Student updated successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to update student. Please try again.",
      )
    },
  })

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: string) =>
      AdminService.deleteStudent({ studentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
      showSuccessToast("Student deleted successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to delete student. Please try again.",
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
      queryClient.invalidateQueries({ queryKey: ["students"] })
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to reset password. Please try again.",
      )
    },
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      AdminService.bulkDeleteStudents({ requestBody: { ids } }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
      setSelectedStudentIds(new Set())
      setIsBulkDeleteDialogOpen(false)
      if (response.deleted_count > 0) {
        showSuccessToast(
          `Successfully deleted ${response.deleted_count} student(s)`,
        )
      }
      if (response.failed_count > 0) {
        showErrorToast(`Failed to delete ${response.failed_count} student(s)`)
      }
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to delete students. Please try again.",
      )
    },
  })

  const handleAddStudent = () => {
    if (
      !newStudent.username ||
      !newStudent.user_email ||
      !newStudent.full_name
    ) {
      showErrorToast("Please fill in all required fields")
      return
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(newStudent.username)) {
      showErrorToast(
        "Username must be 3-50 characters, alphanumeric, underscore, hyphen, or dot",
      )
      return
    }

    createStudentMutation.mutate(newStudent)
  }

  const handleEditStudent = (student: StudentPublic) => {
    setSelectedStudent(student)
    setEditStudent({
      user_email: student.user_email || "",
      user_username: student.user_username || "",
      user_full_name: student.user_full_name || "",
      grade_level: student.grade_level || "",
      parent_email: student.parent_email || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateStudent = () => {
    if (!selectedStudent) return
    updateStudentMutation.mutate({
      studentId: selectedStudent.id,
      data: editStudent,
    })
  }

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    setStudentToDelete({ id: studentId, name: studentName })
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteStudent = () => {
    if (studentToDelete) {
      deleteStudentMutation.mutate(studentToDelete.id)
      setStudentToDelete(null)
    }
  }

  // Password reset handlers [Story 9.2]
  const handleResetPassword = (userId: string, userName: string) => {
    setStudentToResetPassword({ userId, userName })
    setIsResetPasswordDialogOpen(true)
  }

  const confirmResetPassword = () => {
    if (studentToResetPassword) {
      resetPasswordMutation.mutate(studentToResetPassword.userId)
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
    setStudentToResetPassword(null)
    setPasswordCopied(false)
  }

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)))
    } else {
      setSelectedStudentIds(new Set())
    }
  }

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudentIds)
    if (checked) {
      newSelected.add(studentId)
    } else {
      newSelected.delete(studentId)
    }
    setSelectedStudentIds(newSelected)
  }

  const handleBulkDelete = () => {
    if (selectedStudentIds.size > 0) {
      setIsBulkDeleteDialogOpen(true)
    }
  }

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedStudentIds))
  }

  const filteredStudents = students.filter(
    (student) =>
      student.user_full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      student.user_username
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      student.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.grade_level?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.parent_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.created_by_teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (error) {
    return (
      <div className="max-w-full p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
          Error loading students. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Students</h1>
          <p className="text-muted-foreground">Manage students in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            className="border-teal-200 hover:border-teal-300 hover:bg-teal-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Import Students
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name, username, email, grade, parent email, or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedStudentIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
              {selectedStudentIds.size} student(s) selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStudentIds(new Set())}
              className="text-teal-600 hover:text-teal-700 hover:bg-teal-100 dark:hover:bg-teal-800"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Students Table */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-teal-500" />
            All Students ({filteredStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No students found matching your search"
                : "No students yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredStudents.length > 0 &&
                        selectedStudentIds.size === filteredStudents.length
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Parent Email</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow
                    key={student.id}
                    className={
                      selectedStudentIds.has(student.id)
                        ? "bg-teal-50 dark:bg-teal-900/20"
                        : ""
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedStudentIds.has(student.id)}
                        onCheckedChange={(checked) =>
                          handleSelectStudent(student.id, checked as boolean)
                        }
                        aria-label={`Select ${student.user_full_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-teal-500" />
                        {student.user_full_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {student.user_username || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="text-sm">{student.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {student.grade_level || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {student.parent_email || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {student.created_by_teacher_name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(student.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </TableCell>
                    <TableCell>
                      {(student as any).user_initial_password ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {revealedPasswords[student.user_id]
                              ? (student as any).user_initial_password
                              : "••••••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setRevealedPasswords((prev) => ({
                                ...prev,
                                [student.user_id]: !prev[student.user_id],
                              }))
                            }
                            className="h-7 w-7 p-0"
                          >
                            {revealedPasswords[student.user_id] ? (
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
                              student.user_id,
                              student.user_full_name || "Student",
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
                          onClick={() => handleEditStudent(student)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteStudent(
                              student.id,
                              student.user_full_name,
                            )
                          }
                          disabled={deleteStudentMutation.isPending}
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

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Create a new student in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="student-full-name">Full Name *</Label>
              <Input
                id="student-full-name"
                placeholder="e.g., John Doe"
                value={newStudent.full_name}
                onChange={(e) => {
                  const fullName = e.target.value
                  // Auto-generate username with Turkish character support
                  const generatedUsername = generateUsername(fullName)

                  setNewStudent({
                    ...newStudent,
                    full_name: fullName,
                    username: generatedUsername,
                  })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-username">Username *</Label>
              <Input
                id="student-username"
                placeholder="e.g., johndoe"
                value={newStudent.username}
                onChange={(e) =>
                  setNewStudent({
                    ...newStudent,
                    username: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from full name (editable)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-email">Email *</Label>
              <Input
                id="student-email"
                type="email"
                placeholder="e.g., student@email.com"
                value={newStudent.user_email || ""}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, user_email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade-level">Grade Level</Label>
              <Input
                id="grade-level"
                placeholder="e.g., 10th Grade"
                value={newStudent.grade_level || ""}
                onChange={(e) =>
                  setNewStudent({
                    ...newStudent,
                    grade_level: e.target.value || undefined,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-email">Parent Email</Label>
              <Input
                id="parent-email"
                type="email"
                placeholder="e.g., parent@email.com"
                value={newStudent.parent_email || ""}
                onChange={(e) =>
                  setNewStudent({
                    ...newStudent,
                    parent_email: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={createStudentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={createStudentMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {createStudentMutation.isPending
                ? "Creating..."
                : "Create Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Full Name *</Label>
              <Input
                id="edit-full-name"
                placeholder="e.g., John Doe"
                value={editStudent.user_full_name || ""}
                onChange={(e) =>
                  setEditStudent({
                    ...editStudent,
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
                value={editStudent.user_username || ""}
                onChange={(e) =>
                  setEditStudent({
                    ...editStudent,
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
                placeholder="e.g., student@email.com"
                value={editStudent.user_email || ""}
                onChange={(e) =>
                  setEditStudent({
                    ...editStudent,
                    user_email: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-grade">Grade Level</Label>
              <Input
                id="edit-grade"
                placeholder="e.g., 10th Grade"
                value={editStudent.grade_level || ""}
                onChange={(e) =>
                  setEditStudent({
                    ...editStudent,
                    grade_level: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent-email">Parent Email</Label>
              <Input
                id="edit-parent-email"
                type="email"
                placeholder="e.g., parent@email.com"
                value={editStudent.parent_email || ""}
                onChange={(e) =>
                  setEditStudent({
                    ...editStudent,
                    parent_email: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateStudentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStudent}
              disabled={updateStudentMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {updateStudentMutation.isPending
                ? "Updating..."
                : "Update Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteStudent}
        title="Delete Student"
        description={`Are you sure you want to delete "${studentToDelete?.name}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteStudentMutation.isPending}
      />

      {/* Reset Password Confirmation Dialog [Story 9.2] */}
      <ConfirmDialog
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
        onConfirm={confirmResetPassword}
        title="Reset Password"
        description={`Are you sure you want to reset the password for "${studentToResetPassword?.userName}"? A new password will be generated and the user will be notified.`}
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
              The password for {studentToResetPassword?.userName} has been
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

      {/* Import Students Dialog [Story 9.9] */}
      <ImportStudentsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["students"] })
        }}
        isAdmin={true}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Students"
        description={`Are you sure you want to delete ${selectedStudentIds.size} selected student(s)? This action cannot be undone and will remove all associated data.`}
        confirmText={`Delete ${selectedStudentIds.size} Student(s)`}
        cancelText="Cancel"
        variant="danger"
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  )
}
