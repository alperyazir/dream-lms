/**
 * Selected Recipients Panel - Story 20.5
 *
 * Displays selected classes and individual students in a right panel
 * for assignment recipient selection.
 */

import { useQuery } from "@tanstack/react-query"
import { ChevronDown, X } from "lucide-react"
import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { teachersApi } from "@/services/teachersApi"
import type { Class, Student } from "@/types/teacher"

interface SelectedRecipientsPanelProps {
  selectedClassIds: string[]
  selectedStudentIds: string[]
  classes: Class[]
  individualStudents: Student[]
  onRemoveClass: (classId: string) => void
  onRemoveStudent: (studentId: string) => void
}

export function SelectedRecipientsPanel({
  selectedClassIds,
  selectedStudentIds,
  classes,
  individualStudents,
  onRemoveClass,
  onRemoveStudent,
}: SelectedRecipientsPanelProps) {
  const selectedClasses = useMemo(
    () => classes.filter((c) => selectedClassIds.includes(c.id)),
    [classes, selectedClassIds],
  )

  const selectedIndividuals = useMemo(
    () => individualStudents.filter((s) => selectedStudentIds.includes(s.id)),
    [individualStudents, selectedStudentIds],
  )

  // Fetch students for selected classes
  const { data: classStudentsGroups = [] } = useQuery({
    queryKey: ["class-students", selectedClassIds],
    queryFn: () => teachersApi.getStudentsForClasses(selectedClassIds),
    enabled: selectedClassIds.length > 0,
  })

  const totalStudents = useMemo(() => {
    const classStudentCount = classStudentsGroups.reduce(
      (acc, group) => acc + group.students.length,
      0,
    )
    return classStudentCount + selectedIndividuals.length
  }, [classStudentsGroups, selectedIndividuals])

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Selected Recipients</h4>
        <Badge variant="secondary">
          {totalStudents} {totalStudents === 1 ? "student" : "students"}
        </Badge>
      </div>

      {selectedClasses.length === 0 && selectedIndividuals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recipients selected. Select classes or individual students.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Selected Classes */}
          {selectedClasses.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-2">
                Classes
              </h5>
              <div className="space-y-2">
                {selectedClasses.map((cls) => {
                  const classStudents =
                    classStudentsGroups.find((g) => g.class_id === cls.id)
                      ?.students || []

                  return (
                    <Collapsible key={cls.id}>
                      <div className="bg-background rounded border">
                        {/* Class header with remove button */}
                        <div className="flex items-center justify-between p-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{cls.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({classStudents.length}{" "}
                              {classStudents.length === 1
                                ? "student"
                                : "students"}
                              )
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {classStudents.length > 0 && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </CollapsibleTrigger>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveClass(cls.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Expandable student list */}
                        {classStudents.length > 0 && (
                          <CollapsibleContent>
                            <div className="border-t px-2 py-1 space-y-1 max-h-48 overflow-y-auto">
                              {classStudents.map((student) => (
                                <div
                                  key={student.id}
                                  className="text-sm py-1 px-2 rounded hover:bg-muted/50"
                                >
                                  <div className="font-medium">
                                    {student.user_full_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {student.user_email}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        )}
                      </div>
                    </Collapsible>
                  )
                })}
              </div>
            </div>
          )}

          {/* Individual Students */}
          {selectedIndividuals.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-2">
                Individual Students
              </h5>
              <div className="space-y-1">
                {selectedIndividuals.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between bg-background rounded p-2"
                  >
                    <span>{student.user_full_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveStudent(student.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
