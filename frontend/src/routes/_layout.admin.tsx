import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/admin")({
  component: () => <Outlet />,
  beforeLoad: async ({ context }) => {
    const currentUser = context.currentUser

    if (!currentUser || currentUser.role !== "admin") {
      throw redirect({
        to: "/",
      })
    }
  },
})
