import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/admin")({
  component: () => <Outlet />,
  beforeLoad: async ({ context }) => {
    const currentUser = context.currentUser

    // Allow both admin and supervisor roles to access admin routes
    if (
      !currentUser ||
      (currentUser.role !== "admin" && currentUser.role !== "supervisor")
    ) {
      throw redirect({
        to: "/",
      })
    }
  },
})
