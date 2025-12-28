/**
 * SidebarItems Tests - Story 21.4
 * Verify Insights link has been removed
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import SidebarItems from "./SidebarItems"

// Mock router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/teacher" }),
}))

// Mock icons
vi.mock("react-icons/fi", () => ({
  FiBarChart2: () => <span>FiBarChart2</span>,
  FiBook: () => <span>FiBook</span>,
  FiBriefcase: () => <span>FiBriefcase</span>,
  FiCalendar: () => <span>FiCalendar</span>,
  FiClipboard: () => <span>FiClipboard</span>,
  FiFolder: () => <span>FiFolder</span>,
  FiHome: () => <span>FiHome</span>,
  FiSettings: () => <span>FiSettings</span>,
  FiShield: () => <span>FiShield</span>,
  FiTrendingUp: () => <span>FiTrendingUp</span>,
  FiUsers: () => <span>FiUsers</span>,
}))

// Mock publisher logo
vi.mock("@/components/ui/publisher-logo", () => ({
  PublisherLogo: () => <div>Logo</div>,
}))

// Mock services
vi.mock("@/services/assignmentsApi", () => ({
  getStudentAssignments: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/services/publishersApi", () => ({
  getMyProfile: vi.fn().mockResolvedValue({}),
}))

const _createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("SidebarItems - Insights Removal", () => {
  it("teacher navigation does not show Insights link", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    // Set teacher user in query cache
    queryClient.setQueryData(["currentUser"], {
      id: "1",
      email: "teacher@test.com",
      role: "teacher",
      full_name: "Test Teacher",
    })

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    // Verify Insights link is NOT present
    expect(screen.queryByText("Insights")).not.toBeInTheDocument()
  })

  it("teacher navigation includes expected items", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    // Set teacher user in query cache
    queryClient.setQueryData(["currentUser"], {
      id: "1",
      email: "teacher@test.com",
      role: "teacher",
      full_name: "Test Teacher",
    })

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    // Verify core navigation items exist
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Library")).toBeInTheDocument()
    expect(screen.getByText("Assignments")).toBeInTheDocument()
    expect(screen.getByText("Students")).toBeInTheDocument()
    expect(screen.getByText("Reports")).toBeInTheDocument()

    // Verify Insights is NOT in the list
    expect(screen.queryByText("Insights")).not.toBeInTheDocument()
  })
})
