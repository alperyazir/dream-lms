import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/student")({
  component: () => <Outlet />,
  beforeLoad: async ({ context }) => {
    // @ts-expect-error - currentUser exists in context from parent route
    const currentUser = context.currentUser

    if (!currentUser || currentUser.role !== "student") {
      throw redirect({
        to: "/",
      })
    }
  },
})
