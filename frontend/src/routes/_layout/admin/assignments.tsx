import { createFileRoute } from "@tanstack/react-router"
import { Calendar, ClipboardList, Plus, Search } from "lucide-react"
import { useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { mockAssignments, mockBooks } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/admin/assignments")({
  component: () => (
    <ErrorBoundary>
      <AdminAssignments />
    </ErrorBoundary>
  ),
})

function AdminAssignments() {
  const [searchQuery, setSearchQuery] = useState("")

  const handleAddAssignment = () => {
    toast({
      title: "Add Assignment",
      description: "Assignment creation feature coming soon!",
    })
  }

  const getBookTitle = (bookId: string) => {
    const book = mockBooks.find((b) => b.id === bookId)
    return book?.title || "Unknown Book"
  }

  const filteredAssignments = mockAssignments.filter(
    (assignment) =>
      assignment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getBookTitle(assignment.bookId)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Assignments
          </h1>
          <p className="text-muted-foreground">
            Manage assignments across the system
          </p>
        </div>
        <Button
          onClick={handleAddAssignment}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assignments by name or book..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Assignments Table */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-500" />
            All Assignments ({filteredAssignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment Name</TableHead>
                <TableHead>Book</TableHead>
                <TableHead className="text-center">Completion Rate</TableHead>
                <TableHead className="text-center">Time Limit</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">
                    {assignment.name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getBookTitle(assignment.bookId)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        assignment.completionRate >= 80 ? "default" : "outline"
                      }
                      className={
                        assignment.completionRate >= 80 ? "bg-green-500" : ""
                      }
                    >
                      {assignment.completionRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span className="text-sm">
                        {assignment.time_limit_minutes || "No"} min
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(assignment.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
