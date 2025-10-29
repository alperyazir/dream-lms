import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { mockBooks, mockActivities, type Activity } from "@/lib/mockData"
import { AssignmentWizard } from "@/components/assignments/AssignmentWizard"

export const Route = createFileRoute("/_layout/teacher/books/$bookId")({
  component: BookDetailPage,
})

function BookDetailPage() {
  return (
    <ErrorBoundary>
      <BookDetailContent />
    </ErrorBoundary>
  )
}

function BookDetailContent() {
  const { bookId } = Route.useParams()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  // Find the book
  const book = mockBooks.find((b) => b.id === bookId)

  // Find activities for this book
  const activities = mockActivities.filter((a) => a.bookId === bookId)

  if (!book) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="shadow-neuro p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Book Not Found</h2>
          <p className="text-muted-foreground">
            The book you're looking for doesn't exist.
          </p>
        </Card>
      </div>
    )
  }

  const handleAssignClick = (activity: Activity) => {
    setSelectedActivity(activity)
    setWizardOpen(true)
  }

  const handleWizardClose = () => {
    setWizardOpen(false)
    setSelectedActivity(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Book Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-4"
          aria-label="Go back to book catalog"
        >
          ← Back to Books
        </Button>

        <Card className="shadow-neuro">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Book Cover */}
              <div className="md:col-span-1">
                <img
                  src={book.coverUrl}
                  alt={`${book.title} cover`}
                  className="w-full h-auto object-cover rounded-lg shadow-md"
                />
              </div>

              {/* Book Info */}
              <div className="md:col-span-2">
                <h1 className="text-3xl font-bold mb-4">{book.title}</h1>

                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Badge variant="secondary" className="bg-teal-100 text-teal-800">
                    Grade {book.grade}
                  </Badge>
                  <Badge variant="outline">
                    {book.activityCount} {book.activityCount === 1 ? "activity" : "activities"}
                  </Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-semibold text-muted-foreground">Publisher:</span>{" "}
                    <span>{book.publisher}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Description:</span>{" "}
                    <p className="mt-1">{book.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Activities</h2>

        {activities.length === 0 ? (
          <Card className="shadow-neuro p-8 text-center">
            <p className="text-muted-foreground">No activities available for this book.</p>
          </Card>
        ) : (
          <Card className="shadow-neuro">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Activity Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.order_index}</TableCell>
                      <TableCell className="font-medium">{activity.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {activity.activityType.replace(/([A-Z])/g, " $1").trim()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {activity.duration_minutes ? `${activity.duration_minutes} min` : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleAssignClick(activity)}
                          className="bg-teal-600 hover:bg-teal-700"
                          aria-label={`Assign ${activity.title}`}
                        >
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assignment Wizard Dialog */}
      {selectedActivity && (
        <AssignmentWizard
          open={wizardOpen}
          onClose={handleWizardClose}
          activity={selectedActivity}
          book={book}
        />
      )}
    </div>
  )
}
