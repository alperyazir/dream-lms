import { createFileRoute } from "@tanstack/react-router"
import { ClipboardList, Search } from "lucide-react"
import { useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { studentDashboardData } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/student/assignments")({
  component: () => (
    <ErrorBoundary>
      <StudentAssignmentsPage />
    </ErrorBoundary>
  ),
})

function StudentAssignmentsPage() {
  const { assignmentsDue } = studentDashboardData
  const [searchQuery, setSearchQuery] = useState("")

  const filteredAssignments = assignmentsDue.filter(
    (assignment) =>
      assignment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.subject.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-blue-50 text-blue-700"
      case "in-progress":
        return "bg-yellow-50 text-yellow-700"
      case "completed":
        return "bg-green-50 text-green-700"
      case "overdue":
        return "bg-red-50 text-red-700"
      default:
        return "bg-gray-50 text-gray-700"
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Assignments</h1>
        <p className="text-muted-foreground">
          View and complete your assignments
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search assignments by name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {/* Assignments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAssignments.map((assignment) => (
          <Card
            key={assignment.id}
            className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-shadow cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-neuro-sm flex-shrink-0">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <Badge
                  variant="outline"
                  className={getStatusColor(assignment.status)}
                >
                  {assignment.status}
                </Badge>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                {assignment.name}
              </h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subject:</span>
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 text-xs"
                  >
                    {assignment.subject}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium text-xs">
                    {assignment.dueDate}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground">No assignments found</p>
        </div>
      )}
    </div>
  )
}
