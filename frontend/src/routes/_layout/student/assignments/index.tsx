import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { FiClipboard } from "react-icons/fi"
import { StudentAssignmentCard } from "@/components/assignments/AssignmentCard"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { Button } from "@/components/ui/button"
import { getStudentAssignments } from "@/services/assignmentsApi"
import type { StudentAssignmentResponse } from "@/types/assignment"

export const Route = createFileRoute("/_layout/student/assignments/")({
  component: StudentAssignmentsPage,
})

function StudentAssignmentsPage() {
  return (
    <ErrorBoundary>
      <StudentAssignmentsContent />
    </ErrorBoundary>
  )
}

type TabValue = "todo" | "completed" | "past-due"

const PAGE_SIZE = 12

function StudentAssignmentsContent() {
  const [activeTab, setActiveTab] = useState<TabValue>("todo")
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch student's assignments from API
  const {
    data: assignments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["studentAssignments"],
    queryFn: async () => {
      const result = await getStudentAssignments()
      return result
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  })

  // Categorize assignments by tab
  const categorizedAssignments = useMemo(() => {
    const todo: StudentAssignmentResponse[] = []
    const completed: StudentAssignmentResponse[] = []
    const pastDue: StudentAssignmentResponse[] = []

    if (!Array.isArray(assignments)) {
      return { todo, completed, pastDue }
    }

    assignments.forEach((assignment) => {
      if (assignment.status === "completed") {
        completed.push(assignment)
      } else if (assignment.is_past_due) {
        pastDue.push(assignment)
      } else {
        todo.push(assignment)
      }
    })

    // Sort by due date (earliest first), assignments without due dates go to the end
    const sortByDueDate = (
      a: StudentAssignmentResponse,
      b: StudentAssignmentResponse,
    ) => {
      // Assignments without due dates go to the end
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1

      // Sort by due date (earliest first)
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }

    todo.sort(sortByDueDate)
    pastDue.sort(sortByDueDate)
    completed.sort((a, b) => {
      // Sort completed by completion date (most recent first)
      if (!a.completed_at && !b.completed_at) return 0
      if (!a.completed_at) return 1
      if (!b.completed_at) return -1
      return (
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      )
    })

    return { todo, completed, pastDue }
  }, [assignments])

  // Reset page when switching tabs
  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  const renderAssignmentGrid = (
    items: StudentAssignmentResponse[],
    emptyMessage: string,
  ) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">{emptyMessage}</p>
        </div>
      )
    }

    const totalPages = Math.ceil(items.length / PAGE_SIZE)
    const paginatedItems = items.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    )

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
          {paginatedItems.map((assignment) => (
            <StudentAssignmentCard
              key={assignment.assignment_id}
              assignment={assignment}
            />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, items.length)} of{" "}
              {items.length} assignments
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            Loading assignments...
          </p>
        </div>
      </PageContainer>
    )
  }

  // Error state
  if (error) {
    console.error("Error loading assignments:", error)
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-lg text-red-600">
            Failed to load assignments. Please try again.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        icon={FiClipboard}
        title="My Assignments"
        description="Track and complete your assigned work"
      />

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6" aria-label="Assignment tabs">
            <button
              type="button"
              onClick={() => handleTabChange("todo")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "todo"
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={activeTab === "todo" ? "page" : undefined}
            >
              To Do
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-800">
                {categorizedAssignments.todo.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("completed")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "completed"
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={activeTab === "completed" ? "page" : undefined}
            >
              Completed
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-800">
                {categorizedAssignments.completed.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("past-due")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "past-due"
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={activeTab === "past-due" ? "page" : undefined}
            >
              Past Due
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-red-100 text-red-800">
                {categorizedAssignments.pastDue.length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "todo" &&
          renderAssignmentGrid(
            categorizedAssignments.todo,
            "No assignments to do right now. Great job staying on top of your work!",
          )}
        {activeTab === "completed" &&
          renderAssignmentGrid(
            categorizedAssignments.completed,
            "No completed assignments yet. Start working on your assignments to see them here.",
          )}
        {activeTab === "past-due" &&
          renderAssignmentGrid(
            categorizedAssignments.pastDue,
            "No past due assignments. Keep up the good work!",
          )}
      </div>
    </PageContainer>
  )
}
