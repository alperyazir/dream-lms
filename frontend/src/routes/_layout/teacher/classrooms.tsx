import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Edit, Plus, TrendingUp, UserPlus, Users } from "lucide-react"
import { useState } from "react"
import { TeachersService, type ClassCreateByTeacher, type ClassPublic, type ClassUpdate } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/teacher/classrooms")({
  component: () => (
    <ErrorBoundary>
      <TeacherClassroomsPage />
    </ErrorBoundary>
  ),
})

function TeacherClassroomsPage() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast} = useCustomToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isManageStudentsDialogOpen, setIsManageStudentsDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassPublic | null>(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  const [newClass, setNewClass] = useState<ClassCreateByTeacher>({
    name: "",
    grade_level: "",
    subject: "",
    academic_year: "",
    is_active: true,
  })

  const [editClass, setEditClass] = useState<ClassUpdate>({
    name: "",
    grade_level: "",
    subject: "",
    academic_year: "",
    is_active: true,
  })

  // Fetch classes from API
  const { data: classes = [], isLoading, error } = useQuery({
    queryKey: ["teacherClasses"],
    queryFn: () => TeachersService.listMyClasses(),
  })

  // Fetch all students
  const { data: allStudents = [] } = useQuery({
    queryKey: ["teacherStudents"],
    queryFn: () => TeachersService.listMyStudents(),
  })

  // Fetch students in selected class
  const { data: classStudents = [] } = useQuery({
    queryKey: ["classStudents", selectedClass?.id],
    queryFn: () => selectedClass ? TeachersService.getClassStudents({ classId: selectedClass.id }) : Promise.resolve([]),
    enabled: !!selectedClass && isManageStudentsDialogOpen,
  })

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: (data: ClassCreateByTeacher) =>
      TeachersService.createClass({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      setIsCreateDialogOpen(false)
      setNewClass({
        name: "",
        grade_level: "",
        subject: "",
        academic_year: "",
        is_active: true,
      })
      showSuccessToast("Class created successfully!")
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create class. Please try again."

      if (error.body?.detail) {
        if (typeof error.body.detail === 'string') {
          errorMessage = error.body.detail
        } else if (Array.isArray(error.body.detail)) {
          errorMessage = error.body.detail.map((err: any) => err.msg).join(", ")
        }
      }

      showErrorToast(errorMessage)
    },
  })

  const handleCreateClass = () => {
    if (!newClass.name) {
      showErrorToast("Please enter a class name")
      return
    }

    createClassMutation.mutate(newClass)
  }

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: ({ classId, data }: { classId: string, data: ClassUpdate }) =>
      TeachersService.updateClass({ classId, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      setIsEditDialogOpen(false)
      setSelectedClass(null)
      showSuccessToast("Class updated successfully!")
    },
    onError: (error: any) => {
      let errorMessage = "Failed to update class. Please try again."
      if (error.body?.detail) {
        if (typeof error.body.detail === 'string') {
          errorMessage = error.body.detail
        } else if (Array.isArray(error.body.detail)) {
          errorMessage = error.body.detail.map((err: any) => err.msg).join(", ")
        }
      }
      showErrorToast(errorMessage)
    },
  })

  // Add students to class mutation
  const addStudentsMutation = useMutation({
    mutationFn: ({ classId, studentIds }: { classId: string, studentIds: string[] }) =>
      TeachersService.addStudentsToClass({ classId, requestBody: studentIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classStudents", selectedClass?.id] })
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      setIsManageStudentsDialogOpen(false)
      setSelectedClass(null)
      setSelectedStudentIds([])
      showSuccessToast("Students added to class successfully!")
    },
    onError: (error: any) => {
      let errorMessage = "Failed to add students. Please try again."
      if (error.body?.detail) {
        if (typeof error.body.detail === 'string') {
          errorMessage = error.body.detail
        } else if (Array.isArray(error.body.detail)) {
          errorMessage = error.body.detail.map((err: any) => err.msg).join(", ")
        }
      }
      showErrorToast(errorMessage)
    },
  })

  // Remove student from class mutation
  const removeStudentMutation = useMutation({
    mutationFn: ({ classId, studentId }: { classId: string, studentId: string }) =>
      TeachersService.removeStudentFromClass({ classId, studentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classStudents", selectedClass?.id] })
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      showSuccessToast("Student removed from class!")
    },
    onError: (error: any) => {
      showErrorToast("Failed to remove student. Please try again.")
    },
  })

  const handleEditClass = (classItem: ClassPublic) => {
    setSelectedClass(classItem)
    setEditClass({
      name: classItem.name,
      grade_level: classItem.grade_level,
      subject: classItem.subject,
      academic_year: classItem.academic_year,
      is_active: classItem.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateClass = () => {
    if (!selectedClass || !editClass.name) {
      showErrorToast("Please enter a class name")
      return
    }

    updateClassMutation.mutate({
      classId: selectedClass.id,
      data: editClass,
    })
  }

  const handleManageStudents = (classItem: ClassPublic) => {
    setSelectedClass(classItem)
    setIsManageStudentsDialogOpen(true)
  }

  const handleAddStudents = () => {
    if (!selectedClass || selectedStudentIds.length === 0) {
      showErrorToast("Please select at least one student")
      return
    }

    addStudentsMutation.mutate({
      classId: selectedClass.id,
      studentIds: selectedStudentIds,
    })
  }

  const handleRemoveStudent = (studentId: string) => {
    if (!selectedClass) return

    removeStudentMutation.mutate({
      classId: selectedClass.id,
      studentId,
    })
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  // Get students not in class for selection
  const availableStudents = allStudents.filter(
    student => !classStudents.some(cs => cs.id === student.id)
  )

  const filteredClasses = classes.filter(
    (classItem) =>
      classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classItem.subject?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Classrooms</h1>
        <p className="text-muted-foreground">
          Manage your classes and monitor student performance
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search classes by name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Class
        </Button>
      </div>

      {/* Loading/Error States */}
      {error ? (
        <div className="text-center py-12 text-red-500">
          Error loading classes. Please try again later.
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading classes...
        </div>
      ) : filteredClasses.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground mb-2">No classes yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first class to get started
          </p>
        </div>
      ) : (
        /* Classes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((classItem) => (
            <Card
              key={classItem.id}
              className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {classItem.name}
                    </h3>
                    {classItem.subject && (
                      <Badge
                        variant="outline"
                        className="bg-teal-50 text-teal-700 text-xs"
                      >
                        {classItem.subject}
                      </Badge>
                    )}
                  </div>
                  <TrendingUp className="w-8 h-8 text-teal-500" />
                </div>

                <div className="space-y-3">
                  {classItem.grade_level && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Grade Level:</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {classItem.grade_level}
                      </Badge>
                    </div>
                  )}
                  {classItem.academic_year && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Academic Year:</span>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        {classItem.academic_year}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant="outline"
                      className={
                        classItem.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-50 text-gray-700"
                      }
                    >
                      {classItem.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditClass(classItem)}
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleManageStudents(classItem)}
                    className="flex-1 bg-teal-500 hover:bg-teal-600"
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Students
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Class Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Set up a new class for your students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Class Name *</Label>
              <Input
                id="class-name"
                placeholder="e.g., Math 101"
                value={newClass.name}
                onChange={(e) =>
                  setNewClass({ ...newClass, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Mathematics"
                value={newClass.subject || ""}
                onChange={(e) =>
                  setNewClass({ ...newClass, subject: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade-level">Grade Level</Label>
              <Input
                id="grade-level"
                placeholder="e.g., 5"
                value={newClass.grade_level || ""}
                onChange={(e) =>
                  setNewClass({ ...newClass, grade_level: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="academic-year">Academic Year</Label>
              <Input
                id="academic-year"
                placeholder="e.g., 2024-2025"
                value={newClass.academic_year || ""}
                onChange={(e) =>
                  setNewClass({ ...newClass, academic_year: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createClassMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateClass}
              disabled={createClassMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {createClassMutation.isPending
                ? "Creating..."
                : "Create Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update class information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-class-name">Class Name *</Label>
              <Input
                id="edit-class-name"
                placeholder="e.g., Math 101"
                value={editClass.name}
                onChange={(e) =>
                  setEditClass({ ...editClass, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                placeholder="e.g., Mathematics"
                value={editClass.subject || ""}
                onChange={(e) =>
                  setEditClass({ ...editClass, subject: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-grade-level">Grade Level</Label>
              <Input
                id="edit-grade-level"
                placeholder="e.g., 5"
                value={editClass.grade_level || ""}
                onChange={(e) =>
                  setEditClass({ ...editClass, grade_level: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-academic-year">Academic Year</Label>
              <Input
                id="edit-academic-year"
                placeholder="e.g., 2024-2025"
                value={editClass.academic_year || ""}
                onChange={(e) =>
                  setEditClass({ ...editClass, academic_year: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is-active"
                checked={editClass.is_active}
                onCheckedChange={(checked) =>
                  setEditClass({ ...editClass, is_active: checked === true })
                }
              />
              <Label
                htmlFor="edit-is-active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateClassMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateClass}
              disabled={updateClassMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {updateClassMutation.isPending
                ? "Updating..."
                : "Update Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Students Dialog */}
      <Dialog open={isManageStudentsDialogOpen} onOpenChange={setIsManageStudentsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Students - {selectedClass?.name}</DialogTitle>
            <DialogDescription>
              Add or remove students from this class
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Enrolled Students Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Enrolled Students ({classStudents.length})
              </h3>
              {classStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students enrolled yet</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {classStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{student.user_full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.user_email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveStudent(student.id)}
                        disabled={removeStudentMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Students Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Add Students ({availableStudents.length} available)
              </h3>
              {availableStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All students are already enrolled
                </p>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {availableStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted rounded"
                      >
                        <Checkbox
                          id={`student-${student.id}`}
                          checked={selectedStudentIds.includes(student.id)}
                          onCheckedChange={() => toggleStudentSelection(student.id)}
                        />
                        <Label
                          htmlFor={`student-${student.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div>
                            <p className="font-medium">{student.user_full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.user_email}
                            </p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>

                  {selectedStudentIds.length > 0 && (
                    <div className="mt-3 flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                      <span className="text-sm font-medium">
                        {selectedStudentIds.length} student(s) selected
                      </span>
                      <Button
                        size="sm"
                        onClick={handleAddStudents}
                        disabled={addStudentsMutation.isPending}
                        className="bg-teal-500 hover:bg-teal-600"
                      >
                        {addStudentsMutation.isPending
                          ? "Adding..."
                          : "Add Selected"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsManageStudentsDialogOpen(false)
                setSelectedStudentIds([])
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
