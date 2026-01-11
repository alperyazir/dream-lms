import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { UsersService } from "@/client"
import Navbar from "@/components/Common/Navbar"
import Sidebar from "@/components/Common/Sidebar"
import { NavigationProvider } from "@/contexts/NavigationContext"
import { getMustChangePassword, isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async ({ context }) => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }

    // Redirect to password change if required
    if (getMustChangePassword()) {
      throw redirect({
        to: "/change-password",
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

function LayoutContent() {
  return (
    <div className="flex flex-col h-screen">
      {/* Navbar */}
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - collapsible */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto relative">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function Layout() {
  return (
    <NavigationProvider>
      <LayoutContent />
    </NavigationProvider>
  )
}
