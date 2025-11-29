/**
 * Assignment Layout Route
 * Parent route that renders child routes (index, play)
 */

import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute(
  "/_layout/student/assignments/$assignmentId",
)({
  component: AssignmentLayout,
})

function AssignmentLayout() {
  return <Outlet />
}
