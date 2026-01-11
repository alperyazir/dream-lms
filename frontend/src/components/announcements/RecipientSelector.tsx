/**
 * Recipient Selector Component for Announcements
 * Story 26.1: Enhanced recipient selection with individual students, search, and select all
 */

import { useQuery } from "@tanstack/react-query"
import { CheckCircle, Search, User as UserIcon, Users } from "lucide-react"
import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { teachersApi } from "@/services/teachersApi"

interface RecipientSelectorProps {
  selectedClassIds: string[]
  selectedStudentIds: string[]
  onClassIdsChange: (ids: string[]) => void
  onStudentIdsChange: (ids: string[]) => void
  searchTerm: string
  onSearchTermChange: (term: string) => void
}

export function RecipientSelector({
  selectedClassIds,
  selectedStudentIds,
  onClassIdsChange,
  onStudentIdsChange,
  searchTerm,
  onSearchTermChange,
}: RecipientSelectorProps) {
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

  // Fetch students per class to know which students belong to which classroom
  const { data: classStudentsGroups = [] } = useQuery({
    queryKey: ["teacher-class-students", classes.map((c) => c.id)],
    queryFn: () => teachersApi.getStudentsForClasses(classes.map((c) => c.id)),
    enabled: classes.length > 0,
  })

  // Build a map of classId -> studentIds
  const classToStudentsMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const group of classStudentsGroups) {
      map.set(
        group.class_id,
        group.students.map((s) => s.id),
      )
    }
    return map
  }, [classStudentsGroups])

  // Build a reverse map: studentId -> classIds (which classes contain this student)
  const studentToClassesMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const group of classStudentsGroups) {
      for (const student of group.students) {
        const existing = map.get(student.id) || []
        map.set(student.id, [...existing, group.class_id])
      }
    }
    return map
  }, [classStudentsGroups])

  // Get all student IDs that are selected via classroom
  const studentsSelectedViaClass = useMemo(() => {
    const studentIds = new Set<string>()
    for (const classId of selectedClassIds) {
      const classStudents = classToStudentsMap.get(classId) || []
      classStudents.forEach((id) => studentIds.add(id))
    }
    return studentIds
  }, [selectedClassIds, classToStudentsMap])

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return allStudents
    const searchLower = searchTerm.toLowerCase()
    return allStudents.filter(
      (student) =>
        (student.user_full_name?.toLowerCase() || "").includes(searchLower) ||
        (student.user_email?.toLowerCase() || "").includes(searchLower) ||
        (student.user_username?.toLowerCase() || "").includes(searchLower),
    )
  }, [allStudents, searchTerm])

  // Calculate total unique student count (combining class and individual selections)
  const totalStudentCount = useMemo(() => {
    const allSelectedStudents = new Set<string>()

    // Add students from selected classes
    for (const classId of selectedClassIds) {
      const classStudents = classToStudentsMap.get(classId) || []
      classStudents.forEach((id) => allSelectedStudents.add(id))
    }

    // Add individually selected students
    selectedStudentIds.forEach((id) => allSelectedStudents.add(id))

    return allSelectedStudents.size
  }, [selectedClassIds, selectedStudentIds, classToStudentsMap])

  // Handle class selection toggle
  const handleClassToggle = (classId: string) => {
    const classStudents = classToStudentsMap.get(classId) || []

    if (selectedClassIds.includes(classId)) {
      // Deselecting classroom: remove the class
      onClassIdsChange(selectedClassIds.filter((id) => id !== classId))

      // Also remove these students from individual selection if they were auto-added
      const studentsToRemove = new Set(classStudents)
      const newStudentIds = selectedStudentIds.filter(
        (id) => !studentsToRemove.has(id),
      )
      onStudentIdsChange(newStudentIds)
    } else {
      // Selecting classroom: add the class
      onClassIdsChange([...selectedClassIds, classId])

      // Also add these students to individual selection for visibility
      const newStudentIds = [
        ...new Set([...selectedStudentIds, ...classStudents]),
      ]
      onStudentIdsChange(newStudentIds)
    }
  }

  // Handle student selection toggle
  const handleStudentToggle = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      // Deselecting student
      const newStudentIds = selectedStudentIds.filter((id) => id !== studentId)
      onStudentIdsChange(newStudentIds)

      // If this student was selected via a classroom, we need to also deselect that classroom
      const studentClasses = studentToClassesMap.get(studentId) || []
      const classesToDeselect = studentClasses.filter((classId) =>
        selectedClassIds.includes(classId),
      )

      if (classesToDeselect.length > 0) {
        const newClassIds = selectedClassIds.filter(
          (id) => !classesToDeselect.includes(id),
        )
        onClassIdsChange(newClassIds)
      }
    } else {
      // Selecting student
      onStudentIdsChange([...selectedStudentIds, studentId])
    }
  }

  // Handle "Select All Classes" toggle
  const handleSelectAllClasses = () => {
    if (selectedClassIds.length === classes.length) {
      // Deselect all classes and their students
      onClassIdsChange([])
      onStudentIdsChange([])
    } else {
      // Select all classes
      const allClassIds = classes.map((c) => c.id)
      onClassIdsChange(allClassIds)

      // Also select all students from those classes
      const allClassStudents = new Set<string>()
      for (const classId of allClassIds) {
        const classStudents = classToStudentsMap.get(classId) || []
        classStudents.forEach((id) => allClassStudents.add(id))
      }
      onStudentIdsChange([...allClassStudents])
    }
  }

  // Handle "Select All Students" toggle
  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      onStudentIdsChange([])
      onClassIdsChange([]) // Also clear classes since we're deselecting all
    } else {
      onStudentIdsChange(filteredStudents.map((s) => s.id))
    }
  }

  const allClassesSelected =
    classes.length > 0 && selectedClassIds.length === classes.length
  const allStudentsSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.id))

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Recipients</h4>
        <Badge variant="secondary" className="text-sm">
          {totalStudentCount} {totalStudentCount === 1 ? "student" : "students"}
        </Badge>
      </div>

      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="classes">
            <Users className="w-4 h-4 mr-2" />
            By Class
            {selectedClassIds.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {selectedClassIds.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="students">
            <UserIcon className="w-4 h-4 mr-2" />
            Individual Students
            {selectedStudentIds.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {selectedStudentIds.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* By Class Tab */}
        <TabsContent value="classes" className="mt-4">
          <ScrollArea className="h-[300px]">
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
                      Create classes first to send announcements by class.
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
                          selectedClassIds.includes(classItem.id)
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-950"
                            : "hover:border-gray-300"
                        }`}
                        onClick={() => handleClassToggle(classItem.id)}
                      >
                        <CardContent className="flex items-center space-x-3 py-3">
                          <Checkbox
                            checked={selectedClassIds.includes(classItem.id)}
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
        <TabsContent value="students" className="mt-4">
          <ScrollArea className="h-[300px]">
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
                      Create students first to send announcements to them.
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
                      onChange={(e) => onSearchTermChange(e.target.value)}
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
                        const isSelected = selectedStudentIds.includes(
                          student.id,
                        )
                        const isViaClass = studentsSelectedViaClass.has(
                          student.id,
                        )
                        const showSelected = isSelected || isViaClass

                        return (
                          <Card
                            key={student.id}
                            className={`cursor-pointer transition-all ${
                              showSelected
                                ? "border-teal-500 bg-teal-50 dark:bg-teal-950"
                                : "hover:border-gray-300"
                            }`}
                            onClick={() => handleStudentToggle(student.id)}
                          >
                            <CardContent className="flex items-center space-x-3 py-3">
                              <Checkbox
                                checked={showSelected}
                                onCheckedChange={() =>
                                  handleStudentToggle(student.id)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-foreground">
                                    {student.user_full_name ||
                                      student.user_username ||
                                      "Unknown Student"}
                                  </p>
                                  {isViaClass && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-teal-100 dark:bg-teal-900 border-teal-300"
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      via class
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>{student.user_email || ""}</span>
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

      <p className="text-xs text-muted-foreground">
        Select at least one class or student to send this announcement to.
      </p>
    </div>
  )
}
