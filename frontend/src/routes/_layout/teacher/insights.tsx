/**
 * Teacher Insights Page - DEPRECATED
 * Story 21.4: Remove Insights Section
 *
 * This route has been removed. Redirecting to dashboard.
 */

import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/teacher/insights")({
  beforeLoad: () => {
    // Redirect to teacher dashboard
    throw redirect({
      to: "/teacher",
      replace: true,
    })
  },
})
