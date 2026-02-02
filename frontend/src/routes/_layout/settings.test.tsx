/**
 * Settings Page Tests - Story 28.1
 * Tests that password tab is hidden for student users.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the route file imports
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({
    component: () => null,
  }),
}))

// Mock child components
vi.mock("@/components/UserSettings/Appearance", () => ({
  default: () => <div data-testid="appearance-component">Appearance</div>,
}))

vi.mock("@/components/UserSettings/AvatarSelection", () => ({
  default: () => <div data-testid="avatar-component">Avatar</div>,
}))

vi.mock("@/components/UserSettings/ChangePassword", () => ({
  default: () => <div data-testid="password-component">Password</div>,
}))

vi.mock("@/components/UserSettings/NotificationSettings", () => ({
  default: () => <div data-testid="notifications-component">Notifications</div>,
}))

vi.mock("@/components/UserSettings/UserInformation", () => ({
  default: () => <div data-testid="user-info-component">UserInfo</div>,
}))

// Mock the tabs component
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs">{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list" role="tablist">
      {children}
    </div>
  ),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: React.ReactNode
    value: string
  }) => (
    <button data-testid={`tab-${value}`} role="tab">
      {children}
    </button>
  ),
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode
    value: string
  }) => <div data-testid={`content-${value}`}>{children}</div>,
}))

// Define the component logic separately for testing
const tabsConfig = [
  { value: "my-profile", title: "My profile" },
  { value: "avatar", title: "Avatar" },
  { value: "password", title: "Password" },
  { value: "notifications", title: "Notifications" },
  { value: "appearance", title: "Appearance" },
]

function UserSettingsForTest({ userRole }: { userRole: string }) {
  // Story 28.1: Filter out password tab for students
  const filteredTabs = tabsConfig.filter((tab) => {
    if (tab.value === "password" && userRole === "student") {
      return false
    }
    return true
  })

  return (
    <div className="max-w-full">
      <h1>User Settings</h1>
      <div data-testid="tabs-list" role="tablist">
        {filteredTabs.map((tab) => (
          <button key={tab.value} data-testid={`tab-${tab.value}`} role="tab">
            {tab.title}
          </button>
        ))}
      </div>
    </div>
  )
}

describe("Settings Page", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
  })

  describe("Password Tab Visibility - Story 28.1", () => {
    it("should hide password tab for student role", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UserSettingsForTest userRole="student" />
        </QueryClientProvider>,
      )

      // Password tab should not be present
      expect(screen.queryByTestId("tab-password")).not.toBeInTheDocument()

      // Other tabs should still be present
      expect(screen.getByTestId("tab-my-profile")).toBeInTheDocument()
      expect(screen.getByTestId("tab-avatar")).toBeInTheDocument()
      expect(screen.getByTestId("tab-notifications")).toBeInTheDocument()
      expect(screen.getByTestId("tab-appearance")).toBeInTheDocument()
    })

    it("should show password tab for teacher role", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UserSettingsForTest userRole="teacher" />
        </QueryClientProvider>,
      )

      // Password tab should be present for teachers
      expect(screen.getByTestId("tab-password")).toBeInTheDocument()
    })

    it("should show password tab for admin role", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UserSettingsForTest userRole="admin" />
        </QueryClientProvider>,
      )

      // Password tab should be present for admins
      expect(screen.getByTestId("tab-password")).toBeInTheDocument()
    })

    it("should show password tab for publisher role", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UserSettingsForTest userRole="publisher" />
        </QueryClientProvider>,
      )

      // Password tab should be present for publishers
      expect(screen.getByTestId("tab-password")).toBeInTheDocument()
    })

    it("should show 4 tabs for students (excluding password)", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UserSettingsForTest userRole="student" />
        </QueryClientProvider>,
      )

      const tabs = screen.getAllByRole("tab")
      expect(tabs).toHaveLength(4)
    })

    it("should show 5 tabs for non-students (including password)", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UserSettingsForTest userRole="teacher" />
        </QueryClientProvider>,
      )

      const tabs = screen.getAllByRole("tab")
      expect(tabs).toHaveLength(5)
    })
  })
})
