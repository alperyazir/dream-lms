import { createFileRoute } from "@tanstack/react-router"
import { ClipboardList, Plus, Search } from "lucide-react"
import { useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import { mockAssignments } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/teacher/assignments")({
  component: () => (
    <ErrorBoundary>
      <TeacherAssignmentsPage />
    </ErrorBoundary>
  ),
})

function TeacherAssignmentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { showSuccessToast } = useCustomToast()

  const handleCreateAssignment = () => {
    showSuccessToast("Create Assignment feature coming soon!")
  }

  const filteredAssignments = mockAssignments.filter(
    (assignment) =>
      assignment.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.instructions?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Assignments</h1>
        <p className="text-muted-foreground">
          Create and manage assignments for your classes
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search assignments by name or instructions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Button
          onClick={handleCreateAssignment}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.map((assignment) => (
          <Card
            key={assignment.id}
            className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-neuro-sm flex-shrink-0">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {assignment.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {assignment.instructions}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Due Date:</span>
                      <span className="font-medium">
                        {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    {assignment.time_limit_minutes && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Time Limit:
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700"
                        >
                          {assignment.time_limit_minutes} min
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Completion:</span>
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        {assignment.completionRate}%
                      </Badge>
                    </div>
                  </div>
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
