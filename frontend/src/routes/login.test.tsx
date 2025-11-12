import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { Route } from "./login"

// Mock modules
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: any) => ({
    ...options,
    useRouter: () => ({}),
  }),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  redirect: vi.fn(),
}))

vi.mock("@/hooks/useAuth", () => ({
  default: () => ({
    loginMutation: {
      mutateAsync: vi.fn(),
    },
    resetError: vi.fn(),
  }),
  isLoggedIn: () => false,
}))

vi.mock("@/client", () => ({
  OpenAPI: {
    BASE: "http://localhost:8000",
  },
}))

// Note: The actual fetch URL in the component is ${OpenAPI.BASE}/api/v1/dev/quick-login-users

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe("Login - Dynamic Quick Login", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  const renderLogin = (Component: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    )
  }

  it("renders buttons for existing users dynamically", async () => {
    // Mock API response with users
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        admin: [{ username: "admin", email: "admin@example.com" }],
        publisher: [{ username: "pub1", email: "pub1@example.com" }],
        teacher: [
          { username: "teacher1", email: "teacher1@example.com" },
          { username: "teacher2", email: "teacher2@example.com" },
        ],
        student: [{ username: "student1", email: "student1@example.com" }],
      }),
    })

    renderLogin(Route.component)

    // Wait for buttons to appear
    await waitFor(() => {
      expect(screen.getByText(/admin/i)).toBeInTheDocument()
    })

    // Check that buttons are rendered with usernames
    expect(screen.getByTitle("admin@example.com")).toBeInTheDocument()
    expect(screen.getByTitle("pub1@example.com")).toBeInTheDocument()
    expect(screen.getByTitle("teacher1@example.com")).toBeInTheDocument()
    expect(screen.getByTitle("teacher2@example.com")).toBeInTheDocument()
    expect(screen.getByTitle("student1@example.com")).toBeInTheDocument()
  })

  it("hides roles with no users", async () => {
    // Mock API response with only admin
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        admin: [{ username: "admin", email: "admin@example.com" }],
        publisher: [],
        teacher: [],
        student: [],
      }),
    })

    renderLogin(Route.component)

    // Wait for admin button to appear
    await waitFor(() => {
      expect(screen.getByText(/admin/i)).toBeInTheDocument()
    })

    // Check that only admin button is present
    const buttons = screen.getAllByRole("button")
    const quickLoginButtons = buttons.filter((button) =>
      button.textContent?.match(/👑|📚|🍎|🎓/)
    )
    expect(quickLoginButtons.length).toBe(1) // Only admin
  })

  it("shows error message when API fails", async () => {
    // Mock API failure
    mockFetch.mockRejectedValueOnce(new Error("API Error"))

    renderLogin(Route.component)

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText("Quick login unavailable")).toBeInTheDocument()
    })
  })

  it("shows error message when API returns non-OK response", async () => {
    // Mock API non-OK response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    })

    renderLogin(Route.component)

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText("Quick login unavailable")).toBeInTheDocument()
    })
  })

  it("limits to 2 buttons per role in UI", async () => {
    // Mock API response with multiple teachers (more than 2)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        admin: [],
        publisher: [],
        teacher: [
          { username: "teacher1", email: "teacher1@example.com" },
          { username: "teacher2", email: "teacher2@example.com" },
          { username: "teacher3", email: "teacher3@example.com" },
          { username: "teacher4", email: "teacher4@example.com" },
        ],
        student: [],
      }),
    })

    renderLogin(Route.component)

    // Wait for buttons to appear
    await waitFor(() => {
      expect(screen.getByTitle("teacher1@example.com")).toBeInTheDocument()
    })

    // Check that only 2 teacher buttons are rendered
    expect(screen.getByTitle("teacher1@example.com")).toBeInTheDocument()
    expect(screen.getByTitle("teacher2@example.com")).toBeInTheDocument()
    expect(screen.queryByTitle("teacher3@example.com")).not.toBeInTheDocument()
    expect(screen.queryByTitle("teacher4@example.com")).not.toBeInTheDocument()
  })

  it("displays email in title attribute for tooltip", async () => {
    // Mock API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        admin: [{ username: "admin", email: "admin@example.com" }],
        publisher: [],
        teacher: [],
        student: [],
      }),
    })

    renderLogin(Route.component)

    // Wait for admin button to appear
    await waitFor(() => {
      expect(screen.getByText(/admin/i)).toBeInTheDocument()
    })

    // Check that email is in title attribute
    const adminButton = screen.getByTitle("admin@example.com")
    expect(adminButton).toHaveAttribute("title", "admin@example.com")
  })
})
