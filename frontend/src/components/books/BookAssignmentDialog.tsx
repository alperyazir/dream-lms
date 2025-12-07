/**
 * Book Assignment Dialog - Story 9.4
 *
 * Dialog for publishers to assign books to schools/teachers.
 * Supports:
 * - Assigning to entire school (all teachers get access)
 * - Assigning to specific teachers within a school
 * - Direct assignment to individual teachers without school selection
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  User,
  Users,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import {
  PublishersService,
  type SchoolPublic,
  type TeacherPublic,
} from "@/client"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import useCustomToast from "@/hooks/useCustomToast"
import {
  type BulkBookAssignmentCreate,
  createBulkBookAssignments,
} from "@/services/bookAssignmentsApi"
import type { Book } from "@/types/book"

interface BookAssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
  book: Book
}

type FilterType = "schools" | "teachers"

export function BookAssignmentDialog({
  isOpen,
  onClose,
  book,
}: BookAssignmentDialogProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // State
  const [filterType, setFilterType] = useState<FilterType>("schools")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null)
  const [selectedWholeSchools, setSelectedWholeSchools] = useState<Set<string>>(
    new Set(),
  )
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([])

  // Fetch schools
  const { data: schools = [], isLoading: schoolsLoading } = useQuery({
    queryKey: ["publisherSchools"],
    queryFn: () => PublishersService.listMySchools(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch all teachers
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["publisherTeachers"],
    queryFn: () => PublishersService.listMyTeachers(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  })

  // Create school lookup map
  const schoolMap = useMemo(() => {
    const map = new Map<string, SchoolPublic>()
    schools.forEach((school) => map.set(school.id, school))
    return map
  }, [schools])

  // Group teachers by school
  const teachersBySchool = useMemo(() => {
    const map = new Map<string, TeacherPublic[]>()
    teachers.forEach((teacher) => {
      const list = map.get(teacher.school_id) || []
      list.push(teacher)
      map.set(teacher.school_id, list)
    })
    return map
  }, [teachers])

  // Filter items based on search query
  const filteredSchools = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return schools
    return schools.filter((school) => school.name.toLowerCase().includes(query))
  }, [schools, searchQuery])

  const filteredTeachers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return teachers
    return teachers.filter(
      (teacher) =>
        teacher.user_full_name?.toLowerCase().includes(query) ||
        teacher.user_email.toLowerCase().includes(query) ||
        teacher.user_username.toLowerCase().includes(query),
    )
  }, [teachers, searchQuery])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setFilterType("schools")
      setSearchQuery("")
      setExpandedSchoolId(null)
      setSelectedWholeSchools(new Set())
      setSelectedTeacherIds([])
    }
  }, [isOpen])

  // Mutation for creating assignments
  const assignMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<unknown>[] = []

      // Handle whole school assignments
      selectedWholeSchools.forEach((schoolId) => {
        const data: BulkBookAssignmentCreate = {
          book_id: book.id,
          school_id: schoolId,
          assign_to_all_teachers: true,
        }
        promises.push(createBulkBookAssignments(data))
      })

      // Handle individual teacher assignments (grouped by school)
      const teachersBySchoolMap = new Map<string, string[]>()
      selectedTeacherIds.forEach((teacherId) => {
        const teacher = teachers.find((t) => t.id === teacherId)
        if (teacher && !selectedWholeSchools.has(teacher.school_id)) {
          const list = teachersBySchoolMap.get(teacher.school_id) || []
          list.push(teacherId)
          teachersBySchoolMap.set(teacher.school_id, list)
        }
      })

      teachersBySchoolMap.forEach((teacherIds, schoolId) => {
        const data: BulkBookAssignmentCreate = {
          book_id: book.id,
          school_id: schoolId,
          assign_to_all_teachers: false,
          teacher_ids: teacherIds,
        }
        promises.push(createBulkBookAssignments(data))
      })

      return Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookAssignments"] })
      const totalSchools = selectedWholeSchools.size
      const totalTeachers = selectedTeacherIds.filter(
        (id) =>
          !selectedWholeSchools.has(
            teachers.find((t) => t.id === id)?.school_id || "",
          ),
      ).length

      if (totalSchools > 0 && totalTeachers > 0) {
        showSuccessToast(
          `"${book.title}" assigned to ${totalSchools} school(s) and ${totalTeachers} teacher(s)`,
        )
      } else if (totalSchools > 0) {
        showSuccessToast(
          `"${book.title}" assigned to ${totalSchools} school(s)`,
        )
      } else {
        showSuccessToast(
          `"${book.title}" assigned to ${totalTeachers} teacher(s)`,
        )
      }
      onClose()
    },
    onError: (error: Error) => {
      showErrorToast(`Assignment failed: ${error.message}`)
    },
  })

  const handleSchoolExpand = (schoolId: string) => {
    setExpandedSchoolId(expandedSchoolId === schoolId ? null : schoolId)
  }

  const handleWholeSchoolToggle = (schoolId: string) => {
    const newSet = new Set(selectedWholeSchools)
    if (newSet.has(schoolId)) {
      newSet.delete(schoolId)
    } else {
      newSet.add(schoolId)
      // Remove individual teacher selections from this school
      const schoolTeacherIds = (teachersBySchool.get(schoolId) || []).map(
        (t) => t.id,
      )
      setSelectedTeacherIds((prev) =>
        prev.filter((id) => !schoolTeacherIds.includes(id)),
      )
    }
    setSelectedWholeSchools(newSet)
  }

  const handleTeacherToggle = (teacherId: string, schoolId: string) => {
    // If whole school is selected, don't allow individual selection
    if (selectedWholeSchools.has(schoolId)) return

    setSelectedTeacherIds((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId],
    )
  }

  const handleRemoveTeacher = (teacherId: string) => {
    setSelectedTeacherIds((prev) => prev.filter((id) => id !== teacherId))
  }

  const handleRemoveSchool = (schoolId: string) => {
    const newSet = new Set(selectedWholeSchools)
    newSet.delete(schoolId)
    setSelectedWholeSchools(newSet)
  }

  const handleSelectAllTeachersInSchool = (schoolId: string) => {
    const schoolTeachers = teachersBySchool.get(schoolId) || []
    const schoolTeacherIds = schoolTeachers.map((t) => t.id)
    const allSelected = schoolTeacherIds.every((id) =>
      selectedTeacherIds.includes(id),
    )

    if (allSelected) {
      setSelectedTeacherIds((prev) =>
        prev.filter((id) => !schoolTeacherIds.includes(id)),
      )
    } else {
      setSelectedTeacherIds((prev) => [
        ...new Set([...prev, ...schoolTeacherIds]),
      ])
    }
  }

  // Calculate if all teachers in a school are selected
  const areAllTeachersSelected = (schoolId: string) => {
    const schoolTeachers = teachersBySchool.get(schoolId) || []
    if (schoolTeachers.length === 0) return false
    return schoolTeachers.every((t) => selectedTeacherIds.includes(t.id))
  }

  const canSubmit =
    selectedWholeSchools.size > 0 || selectedTeacherIds.length > 0

  const isLoading = schoolsLoading || teachersLoading

  // Get school name for a teacher
  const getTeacherSchoolName = (teacher: TeacherPublic): string => {
    const school = schoolMap.get(teacher.school_id)
    return school?.name || "Unknown School"
  }

  // Get selected teachers grouped by school for summary
  const selectedTeachersGrouped = useMemo(() => {
    const groups = new Map<
      string,
      { school: SchoolPublic | null; teachers: TeacherPublic[] }
    >()

    selectedTeacherIds.forEach((teacherId) => {
      const teacher = teachers.find((t) => t.id === teacherId)
      if (teacher && !selectedWholeSchools.has(teacher.school_id)) {
        const school = schoolMap.get(teacher.school_id) || null
        const schoolId = teacher.school_id
        if (!groups.has(schoolId)) {
          groups.set(schoolId, { school, teachers: [] })
        }
        groups.get(schoolId)!.teachers.push(teacher)
      }
    })

    return Array.from(groups.values())
  }, [selectedTeacherIds, teachers, schoolMap, selectedWholeSchools])

  // Check if there's any selection
  const hasSelection =
    selectedWholeSchools.size > 0 || selectedTeacherIds.length > 0

  // Get total counts for summary
  const totalTeachersSelected = selectedTeacherIds.filter(
    (id) =>
      !selectedWholeSchools.has(
        teachers.find((t) => t.id === id)?.school_id || "",
      ),
  ).length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Book</DialogTitle>
          <DialogDescription>
            Assign "{book.title}" to schools or teachers in your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4 py-4">
          {/* Left Side - Selection List */}
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {/* Search and Filters */}
            <div className="space-y-3 mb-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schools or teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2">
                <Button
                  variant={filterType === "schools" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("schools")}
                  className="gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  Schools ({schools.length})
                </Button>
                <Button
                  variant={filterType === "teachers" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("teachers")}
                  className="gap-2"
                >
                  <User className="h-4 w-4" />
                  Teachers ({teachers.length})
                </Button>
              </div>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-2 space-y-1">
                  {/* Schools View */}
                  {filterType === "schools" &&
                    (filteredSchools.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery
                          ? "No schools found."
                          : "No schools available."}
                      </div>
                    ) : (
                      filteredSchools.map((school) => {
                        const isExpanded = expandedSchoolId === school.id
                        const schoolTeachers =
                          teachersBySchool.get(school.id) || []
                        const isWholeSchoolSelected = selectedWholeSchools.has(
                          school.id,
                        )
                        const allTeachersSelected = areAllTeachersSelected(
                          school.id,
                        )

                        return (
                          <div
                            key={school.id}
                            className="border rounded-lg overflow-hidden"
                          >
                            {/* School Header */}
                            <button
                              type="button"
                              onClick={() => handleSchoolExpand(school.id)}
                              className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted ${
                                isExpanded ? "bg-muted/50" : ""
                              }`}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                              )}
                              <Building2 className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {school.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {schoolTeachers.length} teacher(s)
                                </div>
                              </div>
                              {(isWholeSchoolSelected ||
                                allTeachersSelected) && (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="border-t bg-muted/30 p-3 space-y-3">
                                {/* Whole School Option */}
                                <label
                                  className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                                    isWholeSchoolSelected
                                      ? "bg-primary/10 border border-primary"
                                      : "bg-background border hover:bg-muted"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isWholeSchoolSelected}
                                    onCheckedChange={() =>
                                      handleWholeSchoolToggle(school.id)
                                    }
                                  />
                                  <Users className="h-5 w-5 text-muted-foreground" />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      Entire School
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      All {schoolTeachers.length} teachers get
                                      access
                                    </div>
                                  </div>
                                </label>

                                {/* Individual Teachers */}
                                {schoolTeachers.length > 0 &&
                                  !isWholeSchoolSelected && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground uppercase">
                                          Or select teachers
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() =>
                                            handleSelectAllTeachersInSchool(
                                              school.id,
                                            )
                                          }
                                        >
                                          {allTeachersSelected
                                            ? "Deselect All"
                                            : "Select All"}
                                        </Button>
                                      </div>
                                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                        {schoolTeachers.map((teacher) => (
                                          <label
                                            key={teacher.id}
                                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                              selectedTeacherIds.includes(
                                                teacher.id,
                                              )
                                                ? "bg-primary/10"
                                                : "hover:bg-muted"
                                            }`}
                                          >
                                            <Checkbox
                                              checked={selectedTeacherIds.includes(
                                                teacher.id,
                                              )}
                                              onCheckedChange={() =>
                                                handleTeacherToggle(
                                                  teacher.id,
                                                  school.id,
                                                )
                                              }
                                            />
                                            <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-medium truncate">
                                                {teacher.user_full_name ||
                                                  "Unnamed Teacher"}
                                              </div>
                                              <div className="text-xs text-muted-foreground truncate">
                                                {teacher.user_email}
                                              </div>
                                            </div>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                {schoolTeachers.length === 0 && (
                                  <div className="text-center py-4 text-sm text-muted-foreground">
                                    No teachers in this school yet.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ))}

                  {/* Teachers View */}
                  {filterType === "teachers" &&
                    (filteredTeachers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery
                          ? "No teachers found."
                          : "No teachers available."}
                      </div>
                    ) : (
                      filteredTeachers.map((teacher) => {
                        const isSchoolSelected = selectedWholeSchools.has(
                          teacher.school_id,
                        )
                        return (
                          <label
                            key={teacher.id}
                            className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                              selectedTeacherIds.includes(teacher.id) ||
                              isSchoolSelected
                                ? "bg-primary/10"
                                : "hover:bg-muted"
                            } ${isSchoolSelected ? "opacity-50" : ""}`}
                          >
                            <Checkbox
                              checked={
                                selectedTeacherIds.includes(teacher.id) ||
                                isSchoolSelected
                              }
                              disabled={isSchoolSelected}
                              onCheckedChange={() =>
                                handleTeacherToggle(
                                  teacher.id,
                                  teacher.school_id,
                                )
                              }
                            />
                            <User className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {teacher.user_full_name || "Unnamed Teacher"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {teacher.user_email} •{" "}
                                {getTeacherSchoolName(teacher)}
                              </div>
                            </div>
                            {(selectedTeacherIds.includes(teacher.id) ||
                              isSchoolSelected) && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </label>
                        )
                      })
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Right Side - Selection Summary */}
          <div className="w-72 flex-shrink-0 border-l pl-4 flex flex-col">
            <div className="text-sm font-medium mb-3">Selection Summary</div>

            {!hasSelection ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground text-sm">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No selection yet</p>
                  <p className="text-xs mt-1">
                    Select schools or teachers from the list
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-3 pr-2">
                  {/* Whole School Selections */}
                  {Array.from(selectedWholeSchools).map((schoolId) => {
                    const school = schoolMap.get(schoolId)
                    if (!school) return null
                    const teacherCount = (teachersBySchool.get(schoolId) || [])
                      .length
                    return (
                      <div
                        key={schoolId}
                        className="p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">
                                {school.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                All {teacherCount} teachers
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => handleRemoveSchool(schoolId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Individual Teacher Selections (grouped by school) */}
                  {selectedTeachersGrouped.map((group, index) => (
                    <div
                      key={index}
                      className="p-3 bg-muted/50 rounded-lg space-y-2"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">
                          {group.school?.name || "Unknown School"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {group.teachers.map((teacher) => (
                          <div
                            key={teacher.id}
                            className="flex items-center justify-between gap-2 p-2 bg-background rounded-md"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">
                                {teacher.user_full_name || teacher.user_email}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 flex-shrink-0"
                              onClick={() => handleRemoveTeacher(teacher.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Selection count */}
            {hasSelection && (
              <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                {selectedWholeSchools.size > 0 && totalTeachersSelected > 0 ? (
                  <span>
                    {selectedWholeSchools.size} school(s),{" "}
                    {totalTeachersSelected} teacher(s)
                  </span>
                ) : selectedWholeSchools.size > 0 ? (
                  <span>{selectedWholeSchools.size} school(s) selected</span>
                ) : (
                  <span>{totalTeachersSelected} teacher(s) selected</span>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!canSubmit || assignMutation.isPending}
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Book"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
