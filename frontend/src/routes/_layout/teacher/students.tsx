import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  BarChart3,
  Edit,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import {
  type StudentCreateAPI,
  type StudentPublic,
  type StudentUpdate,
  TeachersService,
} from "@/client"
import { ImportStudentsDialog } from "@/components/Admin/ImportStudentsDialog"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { StudentPasswordModal } from "@/components/student/StudentPasswordModal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

export const Route = createFileRoute("/_layout/teacher/students")({
  component: () => (
    <ErrorBoundary>
      <TeacherStudentsPage />
    </ErrorBoundary>
  ),
})

function TeacherStudentsPage() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentPublic | null>(
    null,
  )
  const [studentClassrooms, setStudentClassrooms] = useState<string[]>([])
  const [newStudent, setNewStudent] = useState<StudentCreateAPI>({
    username: "",
    user_email: "",
    full_name: "",
    grade_level: undefined,
    parent_email: undefined,
    password: undefined,
  })
  // Story 28.1: Password management state
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  // Story 28.1: Password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [selectedStudentForPassword, setSelectedStudentForPassword] = useState<{
    id: string
    name: string
  } | null>(null)
  const [editStudent, setEditStudent] = useState<StudentUpdate>({
    user_email: undefined,
    user_username: undefined,
    user_full_name: undefined,
    grade_level: undefined,
    parent_email: undefined,
  })
  const [studentClassroomsMap, setStudentClassroomsMap] = useState<
    Record<string, string[]>
  >({})
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  )

  // Fetch students from API
  const {
    data: students = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["teacherStudents"],
    queryFn: () => TeachersService.listMyStudents(),
  })

  // Fetch classes for classroom dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ["teacherClasses"],
    queryFn: () => TeachersService.listMyClasses(),
  })

  // Fetch classroom information for all students
  useEffect(() => {
    const fetchStudentClassrooms = async () => {
      if (students.length === 0 || classes.length === 0) return

      const classroomsMap: Record<string, string[]> = {}

      for (const classroom of classes) {
        try {
          const classStudents = await TeachersService.getClassStudents({
            classId: classroom.id,
          })
          for (const student of classStudents) {
            if (!classroomsMap[student.id]) {
              classroomsMap[student.id] = []
            }
            classroomsMap[student.id].push(classroom.name)
          }
        } catch (error) {
          console.error(
            `Failed to fetch students for classroom ${classroom.name}:`,
            error,
          )
        }
      }

      setStudentClassroomsMap(classroomsMap)
    }

    fetchStudentClassrooms()
  }, [students, classes])

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: (data: StudentCreateAPI) => {
      // Convert empty email to undefined so backend treats it as optional
      const payload = {
        ...data,
        user_email: data.user_email?.trim() || undefined,
      }
      return TeachersService.createStudent({ requestBody: payload })
    },
    onSuccess: async (createdStudent) => {
      console.log("Created student:", createdStudent)
      console.log("Selected classroom IDs:", selectedClassroomIds)

      // If classrooms were selected, add the student to them
      if (selectedClassroomIds.length > 0) {
        try {
          // The student ID is in role_record.id
          const studentId = createdStudent.role_record.id

          // Add student to each selected classroom
          for (const classId of selectedClassroomIds) {
            await TeachersService.addStudentsToClass({
              classId: classId,
              requestBody: [studentId],
            })
            queryClient.invalidateQueries({
              queryKey: ["classStudents", classId],
            })
          }

          const message = `Student created and added to ${selectedClassroomIds.length} classroom(s) successfully!`
          queryClient.invalidateQueries({ queryKey: ["teacherStudents"] })
          queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
          setIsAddDialogOpen(false)
          setNewStudent({
            username: "",
            user_email: "",
            full_name: "",
            grade_level: undefined,
            parent_email: undefined,
            password: undefined,
          })
          setSelectedClassroomIds([])
          // Story 28.1: Reset password state
          setAutoGeneratePassword(true)
          setShowPassword(false)
          showSuccessToast(message)
        } catch (error: any) {
          console.error("Failed to add student to classrooms:", error)
          console.error("Error details:", error.body || error.message)
          queryClient.invalidateQueries({ queryKey: ["teacherStudents"] })
          setIsAddDialogOpen(false)
          setNewStudent({
            username: "",
            user_email: "",
            full_name: "",
            grade_level: undefined,
            parent_email: undefined,
            password: undefined,
          })
          setSelectedClassroomIds([])
          // Story 28.1: Reset password state
          setAutoGeneratePassword(true)
          setShowPassword(false)

          let errorMsg =
            "Student created but failed to add to some classrooms. You can add them later."
          if (error.body?.detail) {
            errorMsg = `Student created. Error adding to classrooms: ${error.body.detail}`
          }
          showErrorToast(errorMsg)
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["teacherStudents"] })
        queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
        setIsAddDialogOpen(false)
        setNewStudent({
          username: "",
          user_email: "",
          full_name: "",
          grade_level: undefined,
          parent_email: undefined,
        })
        setSelectedClassroomIds([])
        showSuccessToast("Student created successfully!")
      }
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create student. Please try again."

      if (error.body?.detail) {
        if (typeof error.body.detail === "string") {
          errorMessage = error.body.detail
        } else if (Array.isArray(error.body.detail)) {
          errorMessage = error.body.detail.map((err: any) => err.msg).join(", ")
        }
      }

      showErrorToast(errorMessage)
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
    }) => TeachersService.updateStudent({ studentId, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherStudents"] })
      setIsEditDialogOpen(false)
      setSelectedStudent(null)
      showSuccessToast("Student updated successfully!")
    },
    onError: (error: any) => {
      let errorMessage = "Failed to update student. Please try again."
      if (error.body?.detail) {
        if (typeof error.body.detail === "string") {
          errorMessage = error.body.detail
        } else if (Array.isArray(error.body.detail)) {
          errorMessage = error.body.detail.map((err: any) => err.msg).join(", ")
        }
      }
      showErrorToast(errorMessage)
    },
  })

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: string) =>
      TeachersService.deleteStudent({ studentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherStudents"] })
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      setIsDeleteDialogOpen(false)
      setSelectedStudent(null)
      showSuccessToast("Student deleted successfully!")
    },
    onError: (_error: any) => {
      showErrorToast("Failed to delete student. Please try again.")
    },
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      TeachersService.bulkDeleteStudents({ requestBody: { ids } }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["teacherStudents"] })
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
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
    if (!newStudent.username || !newStudent.full_name) {
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

    // Story 28.1: Validate password if not auto-generating
    if (!autoGeneratePassword && newStudent.password) {
      if (newStudent.password.length < 1) {
        showErrorToast("Password is required")
        return
      }
      if (newStudent.password.length > 50) {
        showErrorToast("Password must be 50 characters or less")
        return
      }
    }

    createStudentMutation.mutate(newStudent)
  }

  const handleEditStudent = async (student: StudentPublic) => {
    setSelectedStudent(student)
    setEditStudent({
      user_email: student.user_email,
      user_username: student.user_username,
      user_full_name: student.user_full_name,
      grade_level: student.grade_level,
      parent_email: student.parent_email,
    })

    // Get classrooms from the map
    setStudentClassrooms(studentClassroomsMap[student.id] || [])
    setIsEditDialogOpen(true)
  }

  const handleUpdateStudent = () => {
    if (!selectedStudent) return

    updateStudentMutation.mutate({
      studentId: selectedStudent.id,
      data: editStudent,
    })
  }

  const handleDeleteClick = (student: StudentPublic) => {
    setSelectedStudent(student)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!selectedStudent) return
    deleteStudentMutation.mutate(selectedStudent.id)
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
      student.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.user_username?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Students</h1>
        <p className="text-muted-foreground">
          View and manage students in your classes
        </p>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search students by name, email, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
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

      {/* Bulk Action Bar */}
      {selectedStudentIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg mb-4">
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

      {/* Loading/Error States */}
      {error ? (
        <div className="text-center py-12 text-red-500">
          Error loading students. Please try again later.
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading students...
        </div>
      ) : filteredStudents.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground mb-2">No students yet</p>
          <p className="text-sm text-muted-foreground">
            Students you create will appear here
          </p>
        </div>
      ) : (
        /* Students Table */
        <div className="border rounded-lg shadow-neuro">
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
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Classrooms</TableHead>
                <TableHead>Parent Email</TableHead>
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
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-xs">
                        {student.user_full_name?.charAt(0).toUpperCase()}
                      </div>
                      {student.user_full_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      @{student.user_username}
                    </span>
                  </TableCell>
                  <TableCell>{student.user_email}</TableCell>
                  <TableCell>
                    {student.grade_level ? (
                      <Badge
                        variant="outline"
                        className="bg-teal-50 text-teal-700"
                      >
                        Grade {student.grade_level}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {studentClassroomsMap[student.id] &&
                    studentClassroomsMap[student.id].length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {studentClassroomsMap[student.id].map(
                          (classroom, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-blue-50 text-blue-700 text-xs"
                            >
                              {classroom}
                            </Badge>
                          ),
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        None
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.parent_email || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to="/teacher/analytics/$studentId"
                        params={{ studentId: student.id }}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                        >
                          <BarChart3 className="w-3 h-3 mr-1" />
                          Analytics
                        </Button>
                      </Link>
                      {/* Story 28.1: View/Set Password button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedStudentForPassword({
                            id: student.id,
                            name: student.user_full_name || "Student",
                          })
                          setIsPasswordModalOpen(true)
                        }}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <KeyRound className="w-3 h-3 mr-1" />
                        Password
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditStudent(student)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteClick(student)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Create a new student account</DialogDescription>
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
              <Label htmlFor="username">
                Username{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="username"
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
              <Label htmlFor="email">
                Email{" "}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., student@school.com"
                value={newStudent.user_email || ""}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, user_email: e.target.value })
                }
              />
            </div>
            {/* Story 28.1: Password field with auto-generate option */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="student-password">Password</Label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={autoGeneratePassword}
                    onCheckedChange={(checked) => {
                      setAutoGeneratePassword(checked === true)
                      if (checked) {
                        setNewStudent({ ...newStudent, password: undefined })
                      }
                    }}
                  />
                  Auto-generate
                </label>
              </div>
              <div className="relative">
                <Input
                  id="student-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={autoGeneratePassword ? "Will be auto-generated" : "Enter password"}
                  value={newStudent.password || ""}
                  disabled={autoGeneratePassword}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, password: e.target.value || undefined })
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={autoGeneratePassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {autoGeneratePassword
                  ? "A secure password will be generated automatically"
                  : "Any password length allowed"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade Level</Label>
              <Input
                id="grade"
                placeholder="e.g., 5"
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
            <div className="space-y-2">
              <Label>Classrooms</Label>
              {classes.length > 0 ? (
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {classes.map((classroom) => (
                    <div
                      key={classroom.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`create-class-${classroom.id}`}
                        checked={selectedClassroomIds.includes(classroom.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedClassroomIds([
                              ...selectedClassroomIds,
                              classroom.id,
                            ])
                          } else {
                            setSelectedClassroomIds(
                              selectedClassroomIds.filter(
                                (id) => id !== classroom.id,
                              ),
                            )
                          }
                        }}
                      />
                      <Label
                        htmlFor={`create-class-${classroom.id}`}
                        className="cursor-pointer flex-1"
                      >
                        {classroom.name}
                        {classroom.subject && ` - ${classroom.subject}`}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No classrooms available
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Select one or more classrooms, or leave unselected to assign
                later
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false)
                setSelectedClassroomIds([])
              }}
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
              Update student information for {selectedStudent?.user_full_name}
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
                value={editStudent.user_full_name || ""}
                onChange={(e) =>
                  setEditStudent({
                    ...editStudent,
                    user_full_name: e.target.value || undefined,
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
                value={editStudent.user_username || ""}
                onChange={(e) =>
                  setEditStudent({
                    ...editStudent,
                    user_username: e.target.value || undefined,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                3-50 characters, alphanumeric, underscore, hyphen, or dot
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">
                Email{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="e.g., student@school.com"
                value={editStudent.user_email || ""}
                onChange={(e) =>
                  setEditStudent({
                    ...editStudent,
                    user_email: e.target.value || undefined,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Enrolled Classrooms</Label>
              {studentClassrooms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {studentClassrooms.map((classroom, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-teal-50 text-teal-700"
                    >
                      {classroom}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not enrolled in any classroom
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Manage classroom enrollment from the Classrooms page
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-grade">Grade Level</Label>
              <Input
                id="edit-grade"
                placeholder="e.g., 5"
                value={editStudent.grade_level || ""}
                onChange={(e) =>
                  setEditStudent({
                    ...editStudent,
                    grade_level: e.target.value || undefined,
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
                    parent_email: e.target.value || undefined,
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
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the student{" "}
              <strong>{selectedStudent?.user_full_name}</strong> and remove them
              from all classrooms. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStudentMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteStudentMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteStudentMutation.isPending
                ? "Deleting..."
                : "Delete Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Students Dialog [Story 9.9] */}
      <ImportStudentsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["teacherStudents"] })
        }}
        isAdmin={false}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Students</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedStudentIds.size} selected
              student(s)? This action cannot be undone and will remove them from
              all classrooms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteMutation.isPending
                ? "Deleting..."
                : `Delete ${selectedStudentIds.size} Student(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Story 28.1: Student Password Modal */}
      {selectedStudentForPassword && (
        <StudentPasswordModal
          studentId={selectedStudentForPassword.id}
          studentName={selectedStudentForPassword.name}
          isOpen={isPasswordModalOpen}
          onClose={() => {
            setIsPasswordModalOpen(false)
            setSelectedStudentForPassword(null)
          }}
        />
      )}
    </div>
  )
}
