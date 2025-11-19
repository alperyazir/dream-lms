import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, School, Users } from "lucide-react"
import { PublishersService } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { StatCard } from "@/components/dashboard/StatCard"

export const Route = createFileRoute("/_layout/publisher/dashboard")({
  component: () => (
    <ErrorBoundary>
      <PublisherDashboard />
    </ErrorBoundary>
  ),
})

function PublisherDashboard() {
  // Fetch real stats from API
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["publisherStats"],
    queryFn: () => PublishersService.getMyStats(),
    staleTime: 30000, // Cache for 30 seconds
  })

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Publisher Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your organization's schools, books, and teachers
        </p>
      </div>

      {/* Stats Cards */}
      {error ? (
        <div className="text-center py-8 text-red-500">
          Error loading statistics. Please try again later.
        </div>
      ) : isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading statistics...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={<School className="w-6 h-6" />}
            label="Total Schools"
            value={stats?.active_schools || 0}
          />
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Total Books"
            value={0}
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Teachers Created"
            value={stats?.total_teachers || 0}
          />
        </div>
      )}
    </div>
  )
}
