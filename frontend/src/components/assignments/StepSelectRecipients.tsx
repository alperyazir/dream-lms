/**
 * Step 2: Select Recipients - Story 3.7, 20.5
 *
 * Tab-based selection with student counts and smart student selection
 */

import { useQuery } from "@tanstack/react-query"
import { Search, User as UserIcon, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { teachersApi } from "@/services/teachersApi"
import type { AssignmentFormData } from "@/types/assignment"
import { SelectedRecipientsPanel } from "./SelectedRecipientsPanel"

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

  // Fetch all students
  const {
    data: allStudents = [],
    isLoading: studentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: teachersApi.getMyStudents,
  })

  // Get students in selected classes
  const studentsInSelectedClasses = useMemo(() => {
    // This would ideally come from the backend, but for now we'll just return empty
    // since we don't have class membership data in the frontend
    return new Set<string>()
  }, [])

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return allStudents
    const searchLower = searchTerm.toLowerCase()
    return allStudents.filter(
      (student) =>
        student.user_full_name.toLowerCase().includes(searchLower) ||
        student.user_email.toLowerCase().includes(searchLower) ||
        student.user_username.toLowerCase().includes(searchLower),
    )
  }, [allStudents, searchTerm])

  // Calculate total student count
  const totalStudentCount = useMemo(() => {
    const classStudentCount = classes
      .filter((c) => formData.class_ids.includes(c.id))
      .reduce((acc, cls) => acc + (cls.student_count || 0), 0)
    return {
      fromClasses: classStudentCount,
      fromIndividual: formData.student_ids.length,
      total: classStudentCount + formData.student_ids.length,
    }
  }, [formData.class_ids, formData.student_ids, classes])

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
      onFormDataChange({ class_ids: [] })
    } else {
      onFormDataChange({ class_ids: classes.map((c) => c.id) })
    }
  }

  // Handle "Select All Students" toggle
  const handleSelectAllStudents = () => {
    if (formData.student_ids.length === filteredStudents.length) {
      onFormDataChange({ student_ids: [] })
    } else {
      onFormDataChange({ student_ids: filteredStudents.map((s) => s.id) })
    }
  }

  const allClassesSelected =
    classes.length > 0 && formData.class_ids.length === classes.length
  const allStudentsSelected =
    filteredStudents.length > 0 &&
    formData.student_ids.length === filteredStudents.length

  return (
    <div className="grid grid-cols-[1fr,400px] gap-6 h-full">
      {/* Left: Tabs for selection */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header with count */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-lg font-semibold">Select Recipients</h3>
          <Badge variant="secondary" className="text-sm">
            {totalStudentCount.total}{" "}
            {totalStudentCount.total === 1 ? "student" : "students"}
          </Badge>
        </div>

        <Tabs
          defaultValue="classes"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 shrink-0">
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
          <TabsContent
            value="classes"
            className="flex-1 overflow-hidden mt-2 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
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
                              checked={formData.class_ids.includes(
                                classItem.id,
                              )}
                              onCheckedChange={() =>
                                handleClassToggle(classItem.id)
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-foreground">
                                  {classItem.name}
                                </p>
                                <Badge variant="outline" className="shrink-0">
                                  {classItem.student_count}{" "}
                                  {classItem.student_count === 1
                                    ? "student"
                                    : "students"}
                                </Badge>
                              </div>
                              {(classItem.grade_level ||
                                classItem.subject ||
                                classItem.academic_year) && (
                                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                  {classItem.grade_level && (
                                    <span>Grade {classItem.grade_level}</span>
                                  )}
                                  {classItem.subject && (
                                    <span>• {classItem.subject}</span>
                                  )}
                                  {classItem.academic_year && (
                                    <span>• {classItem.academic_year}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Individual Students Tab */}
          <TabsContent
            value="students"
            className="flex-1 overflow-hidden mt-2 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
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
                ) : allStudents.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      <UserIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No students yet.</p>
                      <p className="text-sm">
                        Create students first to assign to them.
                      </p>
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
                          ? `${filteredStudents.length} of ${allStudents.length}`
                          : allStudents.length}
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
                      <div className="space-y-2">
                        {filteredStudents.map((student) => {
                          const isInSelectedClass =
                            studentsInSelectedClasses.has(student.id)
                          const isIndividuallySelected =
                            formData.student_ids.includes(student.id)

                          return (
                            <Card
                              key={student.id}
                              className={`cursor-pointer transition-all ${
                                isIndividuallySelected
                                  ? "border-teal-500 bg-teal-50 dark:bg-teal-950"
                                  : isInSelectedClass
                                    ? "border-blue-300 bg-blue-50 dark:bg-blue-950 opacity-60"
                                    : "hover:border-gray-300"
                              }`}
                              onClick={() =>
                                !isInSelectedClass &&
                                handleStudentToggle(student.id)
                              }
                            >
                              <CardContent className="flex items-center space-x-3 py-3">
                                <Checkbox
                                  checked={
                                    isIndividuallySelected || isInSelectedClass
                                  }
                                  disabled={isInSelectedClass}
                                  onCheckedChange={() =>
                                    !isInSelectedClass &&
                                    handleStudentToggle(student.id)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-foreground">
                                      {student.user_full_name}
                                    </p>
                                    {isInSelectedClass && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        Via Class
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>{student.user_email}</span>
                                    {student.grade_level && (
                                      <span>• Grade {student.grade_level}</span>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Help Text */}
        <p className="text-sm text-muted-foreground text-center mt-4 shrink-0">
          Select at least one class or student to assign this activity to.
        </p>
      </div>

      {/* Right: Selected Recipients Panel */}
      <SelectedRecipientsPanel
        selectedClassIds={formData.class_ids}
        selectedStudentIds={formData.student_ids}
        classes={classes}
        individualStudents={allStudents.filter((s) =>
          formData.student_ids.includes(s.id),
        )}
        onRemoveClass={(classId) => {
          onFormDataChange({
            class_ids: formData.class_ids.filter((id) => id !== classId),
          })
        }}
        onRemoveStudent={(studentId) => {
          onFormDataChange({
            student_ids: formData.student_ids.filter((id) => id !== studentId),
          })
        }}
      />
    </div>
  )
}
