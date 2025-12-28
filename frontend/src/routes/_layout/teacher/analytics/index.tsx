import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/teacher/analytics/")({
  beforeLoad: () => {
    // Redirect to students page as the dummy analytics has been removed
    throw redirect({
      to: "/teacher/students",
      replace: true,
    })
  },
})
