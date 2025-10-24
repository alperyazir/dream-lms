/**
 * Admin dashboard page
 */
import { DashboardStats } from "../../features/admin/components/DashboardStats";

export function AdminDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Overview of system-wide statistics and management
        </p>
      </div>

      <DashboardStats />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <a
              href="/admin/publishers"
              className="block px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-blue-900">
                Manage Publishers
              </span>
              <p className="text-sm text-blue-700 mt-1">
                Create, edit, and manage content publishers
              </p>
            </a>
            <a
              href="/admin/schools"
              className="block px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-green-900">Manage Schools</span>
              <p className="text-sm text-green-700 mt-1">
                View and manage educational institutions
              </p>
            </a>
            <a
              href="/admin/teachers"
              className="block px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-purple-900">View Teachers</span>
              <p className="text-sm text-purple-700 mt-1">
                Browse teacher accounts and assignments
              </p>
            </a>
            <a
              href="/admin/students"
              className="block px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-orange-900">View Students</span>
              <p className="text-sm text-orange-700 mt-1">
                Browse student accounts and enrollments
              </p>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <p className="text-gray-500 text-sm">
            Activity tracking coming soon. This section will display recent
            admin actions and system events.
          </p>
        </div>
      </div>
    </div>
  );
}
