/**
 * Step 2: Select Recipients - Story 3.7
 *
 * Allows teacher to select recipients via classes or individual students
 */

import { useQuery } from "@tanstack/react-query"
import { Search, Users, User as UserIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { teachersApi } from "@/services/teachersApi"
import type { AssignmentFormData } from "@/types/assignment"

interface StepSelectRecipientsProps {
  formData: AssignmentFormData
  onFormDataChange: (data: Partial<AssignmentFormData>) => void
}

export function StepSelectRecipients({
  formData,
  onFormDataChange,
}: StepSelectRecipientsProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch classes
  const {
    data: classes = [],
    isLoading: classesLoading,
    error: classesError,
  } = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: teachersApi.getMyClasses,
  })

  // Fetch students
  const {
    data: students = [],
    isLoading: studentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: teachersApi.getMyStudents,
  })

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students
    const searchLower = searchTerm.toLowerCase()
    return students.filter(
      (student) =>
        student.user_full_name.toLowerCase().includes(searchLower) ||
        student.user_email.toLowerCase().includes(searchLower) ||
        student.user_username.toLowerCase().includes(searchLower),
    )
  }, [students, searchTerm])

  // Calculate total student count (from selected classes + individual students)
  const totalStudentCount = useMemo(() => {
    // For now, we can't calculate class sizes since the backend doesn't return student_count
    // We'll need to add this to the backend ClassPublic model in a future iteration
    // For MVP, we just show the counts separately
    return {
      fromClasses: formData.class_ids.length,
      fromIndividual: formData.student_ids.length,
    }
  }, [formData.class_ids, formData.student_ids])

  // Handle class selection toggle
  const handleClassToggle = (classId: string) => {
    const newClassIds = formData.class_ids.includes(classId)
      ? formData.class_ids.filter((id) => id !== classId)
      : [...formData.class_ids, classId]
    onFormDataChange({ class_ids: newClassIds })
  }

  // Handle student selection toggle
  const handleStudentToggle = (studentId: string) => {
    const newStudentIds = formData.student_ids.includes(studentId)
      ? formData.student_ids.filter((id) => id !== studentId)
      : [...formData.student_ids, studentId]
    onFormDataChange({ student_ids: newStudentIds })
  }

  // Handle "Select All Classes" toggle
  const handleSelectAllClasses = () => {
    if (formData.class_ids.length === classes.length) {
      // Deselect all
      onFormDataChange({ class_ids: [] })
    } else {
      // Select all
      onFormDataChange({ class_ids: classes.map((c) => c.id) })
    }
  }

  // Handle "Select All Students" toggle
  const handleSelectAllStudents = () => {
    if (formData.student_ids.length === filteredStudents.length) {
      // Deselect all
      onFormDataChange({ student_ids: [] })
    } else {
      // Select all filtered students
      onFormDataChange({ student_ids: filteredStudents.map((s) => s.id) })
    }
  }

  const allClassesSelected =
    classes.length > 0 && formData.class_ids.length === classes.length
  const allStudentsSelected =
    filteredStudents.length > 0 &&
    formData.student_ids.length === filteredStudents.length

  return (
    <div className="space-y-4">
      {/* Selected count badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select Recipients</h3>
        <Badge variant="secondary" className="text-sm">
          {totalStudentCount.fromClasses > 0 &&
            `${totalStudentCount.fromClasses} class${totalStudentCount.fromClasses > 1 ? "es" : ""}`}
          {totalStudentCount.fromClasses > 0 &&
            totalStudentCount.fromIndividual > 0 &&
            " + "}
          {totalStudentCount.fromIndividual > 0 &&
            `${totalStudentCount.fromIndividual} student${totalStudentCount.fromIndividual > 1 ? "s" : ""}`}
          {totalStudentCount.fromClasses === 0 &&
            totalStudentCount.fromIndividual === 0 &&
            "No recipients selected"}
        </Badge>
      </div>

      {/* Tabs for class vs individual selection */}
      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="classes">
            <Users className="w-4 h-4 mr-2" />
            By Class
          </TabsTrigger>
          <TabsTrigger value="students">
            <UserIcon className="w-4 h-4 mr-2" />
            Individual Students
          </TabsTrigger>
        </TabsList>

        {/* By Class Tab */}
        <TabsContent value="classes" className="space-y-4">
          {classesLoading ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Loading classes...
              </CardContent>
            </Card>
          ) : classesError ? (
            <Card>
              <CardContent className="pt-6 text-center text-destructive">
                Failed to load classes. Please try again.
              </CardContent>
            </Card>
          ) : classes.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No classes yet.</p>
                <p className="text-sm">
                  Create classes first to assign by class.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Select All Classes Checkbox */}
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  id="select-all-classes"
                  checked={allClassesSelected}
                  onCheckedChange={handleSelectAllClasses}
                />
                <label
                  htmlFor="select-all-classes"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Select All Classes ({classes.length})
                </label>
              </div>

              {/* Classes List */}
              <div className="space-y-2">
                {classes.map((classItem) => (
                  <Card
                    key={classItem.id}
                    className={`cursor-pointer transition-all ${
                      formData.class_ids.includes(classItem.id)
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-950"
                        : "hover:border-gray-300"
                    }`}
                    onClick={() => handleClassToggle(classItem.id)}
                  >
                    <CardContent className="flex items-center space-x-3 py-3">
                      <Checkbox
                        checked={formData.class_ids.includes(classItem.id)}
                        onCheckedChange={() => handleClassToggle(classItem.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{classItem.name}</p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          {classItem.grade_level && (
                            <span>Grade {classItem.grade_level}</span>
                          )}
                          {classItem.subject && <span>• {classItem.subject}</span>}
                          {classItem.academic_year && (
                            <span>• {classItem.academic_year}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* By Individual Students Tab */}
        <TabsContent value="students" className="space-y-4">
          {studentsLoading ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Loading students...
              </CardContent>
            </Card>
          ) : studentsError ? (
            <Card>
              <CardContent className="pt-6 text-center text-destructive">
                Failed to load students. Please try again.
              </CardContent>
            </Card>
          ) : students.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <UserIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No students yet.</p>
                <p className="text-sm">Create students first to assign to them.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search students by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>

              {/* Select All Students Checkbox */}
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  id="select-all-students"
                  checked={allStudentsSelected}
                  onCheckedChange={handleSelectAllStudents}
                />
                <label
                  htmlFor="select-all-students"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Select All Students (
                  {searchTerm
                    ? `${filteredStudents.length} of ${students.length}`
                    : students.length}
                  )
                </label>
              </div>

              {/* Students List */}
              {filteredStudents.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No students found matching "{searchTerm}"
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <Card
                      key={student.id}
                      className={`cursor-pointer transition-all ${
                        formData.student_ids.includes(student.id)
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-950"
                          : "hover:border-gray-300"
                      }`}
                      onClick={() => handleStudentToggle(student.id)}
                    >
                      <CardContent className="flex items-center space-x-3 py-3">
                        <Checkbox
                          checked={formData.student_ids.includes(student.id)}
                          onCheckedChange={() => handleStudentToggle(student.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{student.user_full_name}</p>
                          <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{student.user_email}</span>
                            {student.grade_level && (
                              <span>• Grade {student.grade_level}</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Help Text */}
      <p className="text-sm text-muted-foreground text-center">
        Select at least one class or student to assign this activity to.
      </p>
    </div>
  )
}
