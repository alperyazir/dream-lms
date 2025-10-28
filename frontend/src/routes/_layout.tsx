import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { UsersService } from "@/client"
import Navbar from "@/components/Common/Navbar"
import Sidebar from "@/components/Common/Sidebar"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async ({ context }) => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }

    // Load current user if not already in cache
    // @ts-expect-error - queryClient exists in context but TypeScript doesn't recognize it
    const currentUser = await context.queryClient.ensureQueryData({
      queryKey: ["currentUser"],
      queryFn: UsersService.readUserMe,
    })

    return { currentUser }
  },
})

function Layout() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout
