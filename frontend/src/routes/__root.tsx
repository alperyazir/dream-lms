import { createRootRoute, Outlet } from "@tanstack/react-router"

import NotFound from "@/components/Common/NotFound"
import { SoundProvider } from "@/components/providers/SoundProvider"
import { Toaster } from "@/components/ui/toaster"

export const Route = createRootRoute({
  component: () => (
    <SoundProvider>
      <Outlet />
      <Toaster />
    </SoundProvider>
  ),
  notFoundComponent: () => <NotFound />,
})
