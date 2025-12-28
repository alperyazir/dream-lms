import { createFileRoute, redirect } from "@tanstack/react-router"

import type { UserRole } from "@/client"

// Map role to dashboard route
const roleDashboards: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  supervisor: "/admin/dashboard", // Supervisors use admin dashboard
  publisher: "/publisher/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
}

export const Route = createFileRoute("/_layout/")({
  beforeLoad: ({ context }) => {
    const currentUser = context.currentUser

    // Get user role and dashboard path (default to student if not set)
    const userRole = (currentUser?.role || "student") as UserRole
    const dashboardPath = roleDashboards[userRole]

    // Redirect to role-specific dashboard
    throw redirect({ to: dashboardPath })
  },
})
