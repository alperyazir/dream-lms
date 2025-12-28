import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Book, Building2, Check } from "lucide-react"
import { useState } from "react"
import { PublishersService, type SchoolCreateByPublisher } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { SchoolCard } from "@/components/schools/SchoolCard"
import { SchoolDetailsDialog } from "@/components/schools/SchoolDetailsDialog"
import { SchoolListView } from "@/components/schools/SchoolListView"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { ViewModeToggle } from "@/components/ui/view-mode-toggle"
import useCustomToast from "@/hooks/useCustomToast"
import { useViewPreference } from "@/hooks/useViewPreference"
import { createBulkBookAssignments } from "@/services/bookAssignmentsApi"
import { booksApi } from "@/services/booksApi"

export const Route = createFileRoute("/_layout/publisher/schools")({
  component: () => (
    <ErrorBoundary>
      <PublisherSchoolsPage />
    </ErrorBoundary>
  ),
})

function PublisherSchoolsPage() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [viewMode, setViewMode] = useViewPreference("publisherSchools", "grid")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newSchool, setNewSchool] = useState<SchoolCreateByPublisher>({
    name: "",
    address: "",
    contact_info: "",
  })
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>([])
  const [selectedSchool, setSelectedSchool] = useState<any>(null)

  // Fetch schools from API
  const {
    data: schools = [],
    isLoading,
    error,
  } = useQuery({
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

  // Create school mutation
  const createSchoolMutation = useMutation({
    mutationFn: async (data: SchoolCreateByPublisher) => {
      // Create the school first
      const school = await PublishersService.createMySchool({
        requestBody: data,
      })

      // If books were selected, assign them to the new school
      if (selectedBookIds.length > 0) {
        await Promise.all(
          selectedBookIds.map((bookId) =>
            createBulkBookAssignments({
              book_id: bookId,
              school_id: school.id,
              assign_to_all_teachers: true,
            }),
          ),
        )
      }

      return school
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publisherSchools"] })
      queryClient.invalidateQueries({ queryKey: ["publisherStats"] })
      queryClient.invalidateQueries({ queryKey: ["bookAssignments"] })
      setIsAddDialogOpen(false)
      setNewSchool({
        name: "",
        address: "",
        contact_info: "",
      })
      setSelectedBookIds([])
      const bookCount = selectedBookIds.length
      showSuccessToast(
        bookCount > 0
          ? `School created with ${bookCount} book${bookCount > 1 ? "s" : ""} assigned!`
          : "School created successfully!",
      )
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create school. Please try again."

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

  const handleAddSchool = () => {
    if (!newSchool.name) {
      showErrorToast("Please enter a school name")
      return
    }

    createSchoolMutation.mutate(newSchool)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Schools</h1>
        <p className="text-muted-foreground">
          Schools managed by your organization
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex justify-between items-center mb-6">
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Add School
        </Button>
      </div>

      {/* Loading/Error States */}
      {error ? (
        <div className="text-center py-12 text-red-500">
          Error loading schools. Please try again later.
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading schools...
        </div>
      ) : schools.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground mb-2">No schools yet</p>
          <p className="text-sm text-muted-foreground">
            Schools will appear here once they are created
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* Schools Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <SchoolCard
              key={school.id}
              school={school}
              onViewDetails={() => setSelectedSchool(school)}
            />
          ))}
        </div>
      ) : (
        /* Schools List */
        <SchoolListView schools={schools} onViewDetails={setSelectedSchool} />
      )}

      {/* Add School Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setSelectedBookIds([])
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New School</DialogTitle>
            <DialogDescription>
              Create a new school and optionally assign books
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">
                School Name{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="school-name"
                placeholder="e.g., Central High School"
                value={newSchool.name}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="e.g., 123 Main St, City, State"
                value={newSchool.address || ""}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-info">Contact Information</Label>
              <Input
                id="contact-info"
                placeholder="e.g., +1 (555) 123-4567"
                value={newSchool.contact_info || ""}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, contact_info: e.target.value })
                }
              />
            </div>

            {/* Book Assignment Section */}
            {books.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Book className="h-4 w-4" />
                    Assign Books
                  </Label>
                  {selectedBookIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedBookIds.length} selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  All teachers in this school will have access to selected books
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
              disabled={createSchoolMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSchool}
              disabled={createSchoolMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {createSchoolMutation.isPending ? "Creating..." : "Create School"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* School Details Dialog */}
      {selectedSchool && (
        <SchoolDetailsDialog
          open={!!selectedSchool}
          onOpenChange={(open) => !open && setSelectedSchool(null)}
          school={selectedSchool}
        />
      )}
    </div>
  )
}
