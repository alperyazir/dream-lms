import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Search, UserCheck, UserMinus } from "lucide-react"
import { useState } from "react"
import { AdminService, PublishersService } from "@/client"
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
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import {
  createBulkBookAssignments,
  deleteBookAssignment,
  getBookAssignments,
} from "@/services/bookAssignmentsApi"
import type { Book } from "@/types/book"

interface QuickAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: Book
  isAdmin?: boolean
}

export function QuickAssignDialog({
  open,
  onOpenChange,
  book,
  isAdmin = false,
}: QuickAssignDialogProps) {
  const [search, setSearch] = useState("")
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  const [pendingUnassignments, setPendingUnassignments] = useState<string[]>([])
  const queryClient = useQueryClient()

  // Fetch available teachers
  const {
    data: teachersData,
    isLoading: loadingTeachers,
    error: teachersError,
  } = useQuery({
    queryKey: ["teachers-for-assignment", isAdmin],
    queryFn: () =>
      isAdmin
        ? AdminService.listTeachers({ limit: 1000 })
        : PublishersService.listMyTeachers(),
    enabled: open,
  })

  // Both APIs return Array<TeacherPublic> directly, not { items: [] }
  const teachers = teachersData || []

  // Fetch current assignments for this book
  const { data: currentAssignments } = useQuery({
    queryKey: ["book-assignments", book.id],
    queryFn: () => getBookAssignments(book.id),
    enabled: open,
    retry: false,
  })

  const assignedTeacherIds = new Set(
    currentAssignments?.map((a) => a.teacher_id) || [],
  )

  // Combined assignment and unassignment mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<any>[] = []

      // Process assignments
      if (selectedTeachers.length > 0) {
        const teachersMap = new Map(teachers.map((t) => [t.id, t]))
        const schoolGroups = new Map<string, string[]>()

        selectedTeachers.forEach((teacherId) => {
          const teacher = teachersMap.get(teacherId)
          if (teacher?.school_id) {
            const existing = schoolGroups.get(teacher.school_id) || []
            schoolGroups.set(teacher.school_id, [...existing, teacherId])
          }
        })

        const assignPromises = Array.from(schoolGroups.entries()).map(
          ([schoolId, ids]) =>
            createBulkBookAssignments({
              book_id: book.id,
              school_id: schoolId,
              teacher_ids: ids,
            }),
        )
        promises.push(...assignPromises)
      }

      // Process unassignments
      if (pendingUnassignments.length > 0) {
        const unassignPromises = pendingUnassignments.map((assignmentId) =>
          deleteBookAssignment(assignmentId),
        )
        promises.push(...unassignPromises)
      }

      await Promise.all(promises)
    },
    onSuccess: () => {
      const assignCount = selectedTeachers.length
      const unassignCount = pendingUnassignments.length
      const messages = []

      if (assignCount > 0) {
        messages.push(`Assigned to ${assignCount} teacher(s)`)
      }
      if (unassignCount > 0) {
        messages.push(`Unassigned from ${unassignCount} teacher(s)`)
      }

      toast({
        title: "Success",
        description: messages.join(", "),
      })
      queryClient.invalidateQueries({ queryKey: ["book-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["books"] })
      setSelectedTeachers([])
      setPendingUnassignments([])
      onOpenChange(false)
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save changes. Please try again.",
        variant: "destructive",
      })
    },
  })

  // Separate assigned and available teachers (excluding pending unassignments)
  const assignedTeachers =
    teachers?.filter((t) => {
      const isAssigned = assignedTeacherIds.has(t.id)
      const isPendingUnassign = pendingUnassignments.some((assignmentId) => {
        const assignment = currentAssignments?.find(
          (a) => a.id === assignmentId,
        )
        return assignment?.teacher_id === t.id
      })
      return isAssigned && !isPendingUnassign
    }) || []

  const availableTeachers =
    teachers?.filter((t) => {
      const isAssigned = assignedTeacherIds.has(t.id)
      const isPendingUnassign = pendingUnassignments.some((assignmentId) => {
        const assignment = currentAssignments?.find(
          (a) => a.id === assignmentId,
        )
        return assignment?.teacher_id === t.id
      })
      return !isAssigned || isPendingUnassign
    }) || []

  // Filter available teachers by search
  const filteredAvailableTeachers = availableTeachers.filter((t) => {
    const searchLower = search.toLowerCase()
    const nameMatch = (t.user_full_name || "")
      .toLowerCase()
      .includes(searchLower)
    const emailMatch = (t.user_email || "").toLowerCase().includes(searchLower)
    return nameMatch || emailMatch
  })

  // Filter assigned teachers by search
  const filteredAssignedTeachers = assignedTeachers.filter((t) => {
    const searchLower = search.toLowerCase()
    const nameMatch = (t.user_full_name || "")
      .toLowerCase()
      .includes(searchLower)
    const emailMatch = (t.user_email || "").toLowerCase().includes(searchLower)
    return nameMatch || emailMatch
  })

  const handleToggleTeacher = (teacherId: string) => {
    setSelectedTeachers((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId],
    )
  }

  const handleUnassign = (assignmentId: string) => {
    setPendingUnassignments((prev) => [...prev, assignmentId])
  }

  const handleSubmit = () => {
    if (selectedTeachers.length === 0 && pendingUnassignments.length === 0) {
      toast({
        title: "No changes",
        description: "Please select teachers to assign or unassign",
        variant: "destructive",
      })
      return
    }
    saveMutation.mutate()
  }

  const hasChanges =
    selectedTeachers.length > 0 || pendingUnassignments.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Book</DialogTitle>
          <DialogDescription>
            Assign "{book.title}" to teachers
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Teacher List */}
        <ScrollArea className="h-[400px] border rounded-md p-2">
          {loadingTeachers ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : teachersError ? (
            <div className="text-center text-destructive py-4">
              <p className="font-medium">Error loading teachers</p>
              <p className="text-sm mt-1">
                {teachersError instanceof Error
                  ? teachersError.message
                  : "Unknown error"}
              </p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              <p>No teachers available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Currently Assigned Teachers */}
              {filteredAssignedTeachers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Currently Assigned ({filteredAssignedTeachers.length})
                  </h4>
                  <div className="space-y-2">
                    {filteredAssignedTeachers.map((teacher) => {
                      const assignment = currentAssignments?.find(
                        (a) => a.teacher_id === teacher.id,
                      )
                      return (
                        <div
                          key={teacher.id}
                          className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                        >
                          <UserCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {teacher.user_full_name || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {teacher.user_email || "No email"}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              assignment && handleUnassign(assignment.id)
                            }
                            className="flex-shrink-0"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Separator */}
              {filteredAssignedTeachers.length > 0 &&
                filteredAvailableTeachers.length > 0 && (
                  <Separator className="my-2" />
                )}

              {/* Available Teachers */}
              {filteredAvailableTeachers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Available Teachers ({filteredAvailableTeachers.length})
                  </h4>
                  <div className="space-y-2">
                    {filteredAvailableTeachers.map((teacher) => {
                      const isSelected = selectedTeachers.includes(teacher.id)

                      return (
                        <label
                          key={teacher.id}
                          className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleToggleTeacher(teacher.id)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {teacher.user_full_name || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {teacher.user_email || "No email"}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* No results */}
              {filteredAssignedTeachers.length === 0 &&
                filteredAvailableTeachers.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    <p>No teachers found</p>
                    <p className="text-sm mt-1">
                      Try adjusting your search filter
                    </p>
                  </div>
                )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              `Submit (${selectedTeachers.length + pendingUnassignments.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
