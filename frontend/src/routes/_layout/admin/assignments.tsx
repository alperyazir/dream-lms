import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { Calendar, ClipboardList, Search, User } from "lucide-react"
import { useState } from "react"
import { OpenAPI } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
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

export const Route = createFileRoute("/_layout/admin/assignments")({
  component: () => (
    <ErrorBoundary>
      <AdminAssignments />
    </ErrorBoundary>
  ),
})

// Create axios instance for API calls
const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token interceptor
apiClient.interceptors.request.use(async (config) => {
  if (!config.baseURL) {
    config.baseURL = OpenAPI.BASE
  }
  const token = OpenAPI.TOKEN
  if (token) {
    const tokenValue = typeof token === "function" ? await token({ method: (config.method || "GET") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD", url: config.url || "" }) : token
    if (tokenValue) {
      config.headers.Authorization = `Bearer ${tokenValue}`
    }
  }
  return config
})

function AdminAssignments() {
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch all assignments from API (admin endpoint)
  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ["adminAssignments"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/assignments/admin/all")
      return response.data
    },
  })

  const filteredAssignments = assignments.filter(
    (assignment: any) =>
      assignment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.book_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (error) {
    return (
      <div className="max-w-full p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
          Error loading assignments. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Assignments
          </h1>
          <p className="text-muted-foreground">
            View all assignments across the system
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by assignment, book, or teacher..."
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
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading assignments...
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No assignments found matching your search"
                : "No assignments yet"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment Name</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Time Limit</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment: any) => {
                  const completionRate = assignment.total_students > 0
                    ? Math.round((assignment.completed / assignment.total_students) * 100)
                    : 0

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignment.book_title}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="text-sm">
                            {assignment.teacher_name || "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {assignment.total_students}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={completionRate >= 80 ? "default" : "outline"}
                          className={completionRate >= 80 ? "bg-green-500" : ""}
                        >
                          {completionRate}%
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
                        {assignment.due_date
                          ? new Date(assignment.due_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "No due date"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(assignment.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
