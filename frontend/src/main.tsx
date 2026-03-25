import type { AxiosResponse } from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { ApiError, OpenAPI, type UserPublic } from "./client";
import { CustomProvider } from "./components/ui/provider";
import { routeTree } from "./routeTree.gen";
import "./index.css";

OpenAPI.BASE = import.meta.env.VITE_API_URL;
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || "";
};

// Intercept 401 responses from the generated SDK client to handle expired JWTs
OpenAPI.interceptors.response.use((response: AxiosResponse) => {
  if (
    response.status === 401 &&
    !response.config?.url?.includes("/login/access-token")
  ) {
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("must_change_password");
    sessionStorage.removeItem("user_role");
    window.location.href = "/login";
  }
  return response;
});

// Create queryClient first
const queryClient = new QueryClient();

const handleApiError = (error: Error) => {
  // Handle rate limit errors (429)
  if (error instanceof ApiError && error.status === 429) {
    const retryAfter =
      (error.body as Record<string, unknown>)?.retry_after ?? 60;
    // Show a non-intrusive alert — toast not available outside React tree
    if (!document.querySelector("[data-rate-limit-toast]")) {
      const el = document.createElement("div");
      el.setAttribute("data-rate-limit-toast", "");
      el.style.cssText =
        "position:fixed;top:16px;right:16px;z-index:9999;padding:12px 20px;background:#ef4444;color:#fff;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15)";
      el.textContent = `Too many requests. Please wait ${retryAfter} seconds.`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 5000);
    }
    return;
  }
  // Handle auth errors (401, 403) and missing user errors (404)
  // 404 can happen when a user's token is valid but the user was deleted from the database
  if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
    localStorage.removeItem("access_token");
    // Clear query cache to remove stale user data
    queryClient.clear();
    window.location.href = "/login";
  }
};

// Configure error handlers
queryClient.setDefaultOptions({
  queries: {
    retry: (failureCount, error) => {
      // Don't retry on auth errors, missing user errors, or rate limits
      if (
        error instanceof ApiError &&
        [401, 403, 404, 429].includes(error.status)
      ) {
        return false;
      }
      return failureCount < 3;
    },
  },
});

// Set up error handlers for query and mutation caches
queryClient.getQueryCache().config.onError = handleApiError;
queryClient.getMutationCache().config.onError = handleApiError;

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
  interface RouterContext {
    queryClient: typeof queryClient;
    currentUser?: UserPublic;
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
);
