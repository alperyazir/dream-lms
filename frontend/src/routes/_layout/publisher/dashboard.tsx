import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, School, Users } from "lucide-react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { BookCard } from "@/components/dashboard/BookCard"
import { SchoolCard } from "@/components/dashboard/SchoolCard"
import { StatCard } from "@/components/dashboard/StatCard"
import { publisherDashboardData } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/publisher/dashboard")({
  component: () => (
    <ErrorBoundary>
      <PublisherDashboard />
    </ErrorBoundary>
  ),
})

function PublisherDashboard() {
  const { schools, books, stats } = publisherDashboardData

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Publisher Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your schools, books, and teachers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={<School className="w-6 h-6" />}
          label="Total Schools"
          value={stats.totalSchools}
        />
        <StatCard
          icon={<BookOpen className="w-6 h-6" />}
          label="Total Books"
          value={stats.totalBooks}
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Teachers Created"
          value={stats.teachersCreated}
        />
      </div>

      {/* My Schools Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">My Schools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <SchoolCard
              key={school.id}
              name={school.name}
              location={school.location}
              teacherCount={school.teacherCount}
              studentCount={school.studentCount}
            />
          ))}
        </div>
      </div>

      {/* My Books Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">My Books</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              title={book.title}
              coverUrl={book.coverUrl}
              activityCount={book.activityCount}
              grade={book.grade}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
