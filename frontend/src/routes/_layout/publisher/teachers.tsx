import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  Book,
  Check,
  GraduationCap,
  Mail,
  MessageSquare,
  Plus,
  User,
} from "lucide-react"
import { useState } from "react"
import { PublishersService, type TeacherCreateAPI } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { createBulkBookAssignments } from "@/services/bookAssignmentsApi"
import { booksApi } from "@/services/booksApi"
import { generateUsername } from "@/utils/usernameGenerator"

export const Route = createFileRoute("/_layout/publisher/teachers")({
  component: () => (
    <ErrorBoundary>
      <PublisherTeachersPage />
    </ErrorBoundary>
  ),
})

function PublisherTeachersPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newTeacher, setNewTeacher] = useState<TeacherCreateAPI>({
    username: "",
    user_email: "",
    full_name: "",
    school_id: "",
    subject_specialization: "",
  })
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([])

  // Fetch teachers from API
  const {
    data: teachers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["publisherTeachers"],
    queryFn: () => PublishersService.listMyTeachers(),
  })

  // Fetch schools for dropdown
  const { data: schools = [] } = useQuery({
    queryKey: ["publisherSchools"],
    queryFn: () => PublishersService.listMySchools(),
  })

  // Fetch books for assignment selection
  const { data: booksData } = useQuery({
    queryKey: ["publisherBooks"],
    queryFn: () => booksApi.getBooks({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  })
  const books = booksData?.items ?? []

  // Create teacher mutation
  const createTeacherMutation = useMutation({
    mutationFn: async (data: TeacherCreateAPI) => {
      // Create the teacher first
      const response = await PublishersService.createTeacher({
        requestBody: data,
      })

      // If books were selected, assign them to the new teacher
      // The role_record contains the teacher record with the ID
      const teacherId = (response.role_record as { id: string }).id
      if (selectedBookIds.length > 0 && teacherId) {
        await Promise.all(
          selectedBookIds.map((bookId) =>
            createBulkBookAssignments({
              book_id: bookId,
              school_id: data.school_id,
              assign_to_all_teachers: false,
              teacher_ids: [teacherId],
            }),
          ),
        )
      }

      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publisherTeachers"] })
      queryClient.invalidateQueries({ queryKey: ["publisherStats"] })
      queryClient.invalidateQueries({ queryKey: ["bookAssignments"] })
      setIsAddDialogOpen(false)
      setNewTeacher({
        username: "",
        user_email: "",
        full_name: "",
        school_id: "",
        subject_specialization: "",
      })
      const bookCount = selectedBookIds.length
      setSelectedBookIds([])
      showSuccessToast(
        bookCount > 0
          ? `Teacher created with ${bookCount} book${bookCount > 1 ? "s" : ""} assigned!`
          : "Teacher created successfully!",
      )
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create teacher. Please try again."

      if (error.body?.detail) {
        if (typeof error.body.detail === "string") {
          errorMessage = error.body.detail
        } else if (Array.isArray(error.body.detail)) {
          // Handle validation errors
          errorMessage = error.body.detail.map((err: any) => err.msg).join(", ")
        }
      }

      showErrorToast(errorMessage)
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Teachers</h1>
        <p className="text-muted-foreground">
          Manage teachers using your published materials
        </p>
      </div>

      {/* Add Button */}
      <div className="flex justify-end mb-6">
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Teacher
        </Button>
      </div>

      {/* Loading/Error States */}
      {error ? (
        <div className="text-center py-12 text-red-500">
          Error loading teachers. Please try again later.
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading teachers...
        </div>
      ) : teachers.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground mb-2">No teachers yet</p>
          <p className="text-sm text-muted-foreground">
            Teachers will appear here once they are created
          </p>
        </div>
      ) : (
        /* Teachers Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <Card
              key={teacher.id}
              className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {teacher.user_full_name}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <Mail className="w-4 h-4 mr-1" />
                      {teacher.user_email}
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      @{teacher.user_username}
                    </div>
                    {teacher.subject_specialization && (
                      <div className="flex items-center text-sm text-teal-600 dark:text-teal-400 mt-2">
                        <GraduationCap className="w-4 h-4 mr-1" />
                        {teacher.subject_specialization}
                      </div>
                    )}
                  </div>
                  <User className="w-8 h-8 text-teal-500" />
                </div>
                {/* Message Button */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20"
                    onClick={() =>
                      navigate({
                        to: "/messaging",
                        search: { user: teacher.user_id } as { user?: string },
                      })
                    }
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Teacher Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setSelectedBookIds([])
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>
              Create a new teacher account and optionally assign books
            </DialogDescription>
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

            {/* Book Assignment Section */}
            {books.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Book className="h-4 w-4" />
                    Assign Books (Optional)
                  </Label>
                  {selectedBookIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedBookIds.length} selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  This teacher will have access to selected books
                </p>
                <ScrollArea className="h-[150px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {books.map((book) => (
                      <label
                        key={book.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          selectedBookIds.includes(book.id)
                            ? "bg-teal-50 dark:bg-teal-900/20"
                            : "hover:bg-muted"
                        }`}
                      >
                        <Checkbox
                          checked={selectedBookIds.includes(book.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBookIds([...selectedBookIds, book.id])
                            } else {
                              setSelectedBookIds(
                                selectedBookIds.filter((id) => id !== book.id),
                              )
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {book.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {book.activity_count} activities
                          </div>
                        </div>
                        {selectedBookIds.includes(book.id) && (
                          <Check className="h-4 w-4 text-teal-600" />
                        )}
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
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
              disabled={createTeacherMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {createTeacherMutation.isPending
                ? "Creating..."
                : "Create Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
