/**
 * SidebarItems Tests
 * Story 21.4: Verify Insights link has been removed
 * Story 27.16: DreamAI Sidebar Section
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import SidebarItems from "./SidebarItems"

// Mock router - default to teacher path
let mockPathname = "/teacher"
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: mockPathname }),
}))

// Mock icons
vi.mock("react-icons/fi", () => ({
  FiBarChart2: () => <span>FiBarChart2</span>,
  FiBook: () => <span>FiBook</span>,
  FiBookOpen: () => <span>FiBookOpen</span>,
  FiBriefcase: () => <span>FiBriefcase</span>,
  FiCalendar: () => <span>FiCalendar</span>,
  FiChevronDown: () => <span data-testid="chevron-down">▼</span>,
  FiChevronRight: () => <span data-testid="chevron-right">▶</span>,
  FiClipboard: () => <span>FiClipboard</span>,
  FiFolder: () => <span>FiFolder</span>,
  FiHome: () => <span>FiHome</span>,
  FiMessageSquare: () => <span>FiMessageSquare</span>,
  FiSettings: () => <span>FiSettings</span>,
  FiShield: () => <span>FiShield</span>,
  FiTrendingUp: () => <span>FiTrendingUp</span>,
  FiUsers: () => <span>FiUsers</span>,
}))

// Mock lucide icons
vi.mock("lucide-react", () => ({
  Sparkles: () => <span data-testid="sparkles-icon">✨</span>,
  FileQuestion: () => <span>FileQuestion</span>,
  BookText: () => <span>BookText</span>,
  FolderOpen: () => <span>FolderOpen</span>,
  FileText: () => <span>FileText</span>,
  Volume2: () => <span>Volume2</span>,
  Search: () => <span>Search</span>,
  Plus: () => <span>Plus</span>,
  RefreshCw: () => <span>RefreshCw</span>,
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

// Helper to create wrapper with user
const createQueryClientWithUser = (role: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(["currentUser"], {
    id: "1",
    email: `${role}@test.com`,
    role,
    full_name: `Test ${role}`,
  })
  return queryClient
}

describe("SidebarItems - Insights Removal", () => {
  it("teacher navigation does not show Insights link", () => {
    const queryClient = createQueryClientWithUser("teacher")

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    // Verify Insights link is NOT present
    expect(screen.queryByText("Insights")).not.toBeInTheDocument()
  })

  it("teacher navigation includes expected items", () => {
    const queryClient = createQueryClientWithUser("teacher")

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

describe("SidebarItems - DreamAI Section (Story 27.16)", () => {
  beforeEach(() => {
    mockPathname = "/teacher"
  })

  it("renders DreamAI section for teacher users", () => {
    const queryClient = createQueryClientWithUser("teacher")

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    expect(screen.getByText("DreamAI")).toBeInTheDocument()
    expect(screen.getByTestId("sparkles-icon")).toBeInTheDocument()
  })

  it("renders DreamAI section for admin users", () => {
    const queryClient = createQueryClientWithUser("admin")

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    expect(screen.getByText("DreamAI")).toBeInTheDocument()
  })

  it("renders DreamAI section for supervisor users", () => {
    const queryClient = createQueryClientWithUser("supervisor")

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    expect(screen.getByText("DreamAI")).toBeInTheDocument()
  })

  it("does NOT render DreamAI section for student users", () => {
    const queryClient = createQueryClientWithUser("student")

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    expect(screen.queryByText("DreamAI")).not.toBeInTheDocument()
  })

  it("does NOT render DreamAI section for publisher users", () => {
    const queryClient = createQueryClientWithUser("publisher")

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    expect(screen.queryByText("DreamAI")).not.toBeInTheDocument()
  })

  it("expands sub-menu on click", () => {
    const queryClient = createQueryClientWithUser("teacher")

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    // Initially collapsed - sub-items should not be visible
    expect(screen.queryByText("Question Generator")).not.toBeInTheDocument()

    // Click to expand
    const dreamAIButton = screen.getByText("DreamAI")
    fireEvent.click(dreamAIButton)

    // Now sub-items should be visible
    expect(screen.getByText("Question Generator")).toBeInTheDocument()
    expect(screen.getByText("Vocabulary Explorer")).toBeInTheDocument()
    expect(screen.getByText("Content Library")).toBeInTheDocument()
    // My Materials link in DreamAI sub-menu should have /dreamai/materials href
    const allLinks = screen.getAllByRole("link")
    expect(
      allLinks.some((l) => l.getAttribute("href") === "/dreamai/materials"),
    ).toBe(true)
  })

  it("collapses sub-menu on second click", () => {
    const queryClient = createQueryClientWithUser("teacher")

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    const dreamAIButton = screen.getByText("DreamAI")

    // First click - expand
    fireEvent.click(dreamAIButton)
    expect(screen.getByText("Question Generator")).toBeInTheDocument()

    // Second click - collapse
    fireEvent.click(dreamAIButton)
    expect(screen.queryByText("Question Generator")).not.toBeInTheDocument()
  })

  it("navigates to correct routes", () => {
    const queryClient = createQueryClientWithUser("teacher")

    render(
      <QueryClientProvider client={queryClient}>
        <SidebarItems />
      </QueryClientProvider>,
    )

    // Expand DreamAI
    fireEvent.click(screen.getByText("DreamAI"))

    // Check sub-item links
    const generatorLink = screen.getByText("Question Generator").closest("a")
    expect(generatorLink).toHaveAttribute("href", "/dreamai/generator")

    const vocabularyLink = screen.getByText("Vocabulary Explorer").closest("a")
    expect(vocabularyLink).toHaveAttribute("href", "/dreamai/vocabulary")

    const libraryLink = screen.getByText("Content Library").closest("a")
    expect(libraryLink).toHaveAttribute("href", "/dreamai/library")

    // Find My Materials link inside DreamAI sub-menu (has /dreamai/materials href)
    const allLinks = screen.getAllByRole("link")
    const dreamaiMaterialsLink = allLinks.find(
      (link) => link.getAttribute("href") === "/dreamai/materials",
    )
    expect(dreamaiMaterialsLink).toBeDefined()
  })
})
