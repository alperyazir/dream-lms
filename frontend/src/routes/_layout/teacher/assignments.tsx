import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/teacher/assignments")({
  component: AssignmentsLayout,
})

function AssignmentsLayout() {
  return <Outlet />
}
