import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { GraduationCap, Mail, Plus, User } from "lucide-react"
import { useState } from "react"
import { PublishersService, type TeacherCreateAPI } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/publisher/teachers")({
  component: () => (
    <ErrorBoundary>
      <PublisherTeachersPage />
    </ErrorBoundary>
  ),
})

function PublisherTeachersPage() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newTeacher, setNewTeacher] = useState<TeacherCreateAPI>({
    username: "",
    user_email: "",
    full_name: "",
    school_id: "",
    subject_specialization: "",
  })

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

  // Create teacher mutation
  const createTeacherMutation = useMutation({
    mutationFn: (data: TeacherCreateAPI) =>
      PublishersService.createTeacher({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publisherTeachers"] })
      queryClient.invalidateQueries({ queryKey: ["publisherStats"] })
      setIsAddDialogOpen(false)
      setNewTeacher({
        username: "",
        user_email: "",
        full_name: "",
        school_id: "",
        subject_specialization: "",
      })
      showSuccessToast("Teacher created successfully!")
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
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(newTeacher.username)) {
      showErrorToast(
        "Username must be 3-50 characters, alphanumeric, underscore, or hyphen",
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Teacher Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>Create a new teacher account</DialogDescription>
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
                  // Auto-generate username from full name
                  const generatedUsername = fullName
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9_-]/g, "")
                    .slice(0, 50)

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
