import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/publisher")({
  component: () => <Outlet />,
  beforeLoad: async ({ context }) => {
    const currentUser = context.currentUser

    if (!currentUser || currentUser.role !== "publisher") {
      throw redirect({
        to: "/",
      })
    }
  },
})
