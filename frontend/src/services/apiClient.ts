/**
 * Shared API Client Factory
 *
 * Creates a pre-configured axios instance with:
 * - Automatic token injection from OpenAPI config
 * - 401 response interceptor that clears auth and redirects to login
 *
 * All service files should use createApiClient() instead of axios.create()
 * to ensure consistent auth error handling across the app.
 */

import axios from "axios";
import { OpenAPI } from "../client";

export function createApiClient() {
  const client = axios.create({
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor: inject base URL and auth token
  client.interceptors.request.use(async (config) => {
    if (!config.baseURL) {
      config.baseURL = OpenAPI.BASE;
    }

    const token = OpenAPI.TOKEN;
    if (token) {
      const tokenValue =
        typeof token === "function"
          ? await token({
              method: (config.method || "GET") as
                | "GET"
                | "POST"
                | "PUT"
                | "DELETE"
                | "PATCH"
                | "OPTIONS"
                | "HEAD",
              url: config.url || "",
            })
          : token;
      if (tokenValue) {
        config.headers.Authorization = `Bearer ${tokenValue}`;
      }
    }
    return config;
  });

  // Response interceptor: handle 401 (expired JWT) by redirecting to login
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error.response?.status === 401 &&
        !error.config?.url?.includes("/login/access-token")
      ) {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("must_change_password");
        sessionStorage.removeItem("user_role");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    },
  );

  return client;
}
