import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { ApiError, OpenAPI, type UserPublic } from "./client"
import { CustomProvider } from "./components/ui/provider"
import { routeTree } from "./routeTree.gen"
import "./index.css"

OpenAPI.BASE = import.meta.env.VITE_API_URL
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || ""
}

// Create queryClient first
const queryClient = new QueryClient()

const handleApiError = (error: Error) => {
  // Handle auth errors (401, 403) and missing user errors (404)
  // 404 can happen when a user's token is valid but the user was deleted from the database
  if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
    localStorage.removeItem("access_token")
    // Clear query cache to remove stale user data
    queryClient.clear()
    window.location.href = "/login"
  }
}

// Configure error handlers
queryClient.setDefaultOptions({
  queries: {
    retry: (failureCount, error) => {
      // Don't retry on auth errors or missing user errors
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        return false
      }
      return failureCount < 3
    },
  },
})

// Set up error handlers for query and mutation caches
queryClient.getQueryCache().config.onError = handleApiError
queryClient.getMutationCache().config.onError = handleApiError

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
  interface RouterContext {
    queryClient: typeof queryClient
    currentUser?: UserPublic
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </CustomProvider>
  </StrictMode>,
)
