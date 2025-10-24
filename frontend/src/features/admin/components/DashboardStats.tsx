/**
 * Dashboard statistics component for admin
 */
import { StatCard } from "../../../components/common/StatCard";
import { useDashboardStats } from "../hooks/useDashboardStats";

export function DashboardStats() {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading dashboard statistics. Please try again.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Publishers"
        value={stats?.total_publishers ?? 0}
        icon="🏢"
        isLoading={isLoading}
      />
      <StatCard
        title="Total Schools"
        value={stats?.total_schools ?? 0}
        icon="🏫"
        isLoading={isLoading}
      />
      <StatCard
        title="Total Teachers"
        value={stats?.total_teachers ?? 0}
        icon="👨‍🏫"
        isLoading={isLoading}
      />
      <StatCard
        title="Total Students"
        value={stats?.total_students ?? 0}
        icon="👨‍🎓"
        isLoading={isLoading}
      />
    </div>
  );
}
