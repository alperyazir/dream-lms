import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, School, Users } from "lucide-react"
import { OpenAPI, PublishersService } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { StatCard } from "@/components/dashboard/StatCard"
import { getMyProfile } from "@/services/publishersApi"

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

  // Fetch publisher profile for logo display
  const { data: profile } = useQuery({
    queryKey: ["publisherProfile"],
    queryFn: () => getMyProfile(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Get publisher initials for fallback
  const getPublisherInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header with Logo */}
      <div className="flex items-center gap-6">
        {/* Publisher Logo */}
        {profile && (
          <div className="flex-shrink-0">
            {profile.logo_url ? (
              <img
                src={`${OpenAPI.BASE}${profile.logo_url}`}
                alt={`${profile.name} logo`}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {getPublisherInitials(profile.name)}
              </div>
            )}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {profile?.name || "Publisher Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            Overview of your organization's schools, books, and teachers
          </p>
        </div>
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
