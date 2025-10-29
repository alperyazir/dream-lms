import { createFileRoute } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { AssignmentCard } from "@/components/assignments/AssignmentCard"
import {
  mockAssignments,
  mockBooks,
  mockAssignmentStudents,
  type AssignmentFull,
  type AssignmentStudent,
} from "@/lib/mockData"

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

function StudentAssignmentsContent() {
  const [activeTab, setActiveTab] = useState<TabValue>("todo")

  // Mock current student ID (in real app, this would come from auth)
  const currentStudentId = "1"

  // Get student's assignments
  const studentSubmissions = mockAssignmentStudents.filter(
    (s) => s.studentId === currentStudentId,
  )

  // Categorize assignments by tab
  const categorizedAssignments = useMemo(() => {
    const now = new Date()
    const todo: Array<{ assignment: AssignmentFull; submission: AssignmentStudent }> = []
    const completed: Array<{ assignment: AssignmentFull; submission: AssignmentStudent }> = []
    const pastDue: Array<{ assignment: AssignmentFull; submission: AssignmentStudent }> = []

    studentSubmissions.forEach((submission) => {
      const assignment = mockAssignments.find((a) => a.id === submission.assignmentId)
      if (!assignment) return

      const dueDate = new Date(assignment.due_date)
      const isPastDue = dueDate < now

      if (submission.status === "completed") {
        completed.push({ assignment, submission })
      } else if (isPastDue) {
        pastDue.push({ assignment, submission })
      } else {
        todo.push({ assignment, submission })
      }
    })

    // Sort by due date
    const sortByDueDate = (
      a: { assignment: AssignmentFull },
      b: { assignment: AssignmentFull },
    ) => {
      return new Date(a.assignment.due_date).getTime() - new Date(b.assignment.due_date).getTime()
    }

    todo.sort(sortByDueDate)
    pastDue.sort(sortByDueDate)
    completed.sort((a, b) => {
      // Sort completed by completion date (most recent first)
      if (!a.submission.completed_at) return 1
      if (!b.submission.completed_at) return -1
      return (
        new Date(b.submission.completed_at).getTime() -
        new Date(a.submission.completed_at).getTime()
      )
    })

    return { todo, completed, pastDue }
  }, [studentSubmissions])

  const renderAssignmentGrid = (
    items: Array<{ assignment: AssignmentFull; submission: AssignmentStudent }>,
  ) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No assignments found.</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map(({ assignment, submission }) => {
          const book = mockBooks.find((b) => b.id === assignment.bookId)
          if (!book) return null

          return (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              book={book}
              submission={submission}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Assignments</h1>
        <p className="text-muted-foreground">
          Track and complete your assigned work
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6" aria-label="Assignment tabs">
            <button
              onClick={() => setActiveTab("todo")}
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
              onClick={() => setActiveTab("completed")}
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
              onClick={() => setActiveTab("past-due")}
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
        {activeTab === "todo" && renderAssignmentGrid(categorizedAssignments.todo)}
        {activeTab === "completed" && renderAssignmentGrid(categorizedAssignments.completed)}
        {activeTab === "past-due" && renderAssignmentGrid(categorizedAssignments.pastDue)}
      </div>
    </div>
  )
}
