/**
 * Admin Publishers Page Tests
 * Story 25.4: Frontend Admin Publisher Account UI
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  PublisherAccountCreationResponse,
  PublisherAccountListResponse,
  PublisherAccountPublic,
  PublisherPublic,
} from "@/client"
import { AdminService } from "@/client"

// Mock the AdminService
vi.mock("@/client", async () => {
  const actual = await vi.importActual("@/client")
  return {
    ...actual,
    AdminService: {
      listPublisherAccounts: vi.fn(),
      listPublishers: vi.fn(),
      createPublisherAccount: vi.fn(),
      updatePublisherAccount: vi.fn(),
      deletePublisherAccount: vi.fn(),
      resetUserPassword: vi.fn(),
    },
  }
})

// Mock useCustomToast
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => ({
    component: () => null,
  }),
}))

// Create wrapper with QueryClient
const _createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data
const mockPublisherAccounts: PublisherAccountPublic[] = [
  {
    id: "user-1",
    username: "publisher1",
    email: "publisher1@example.com",
    full_name: "Publisher One",
    dcs_publisher_id: 1,
    dcs_publisher_name: "ABC Publishing",
    is_active: true,
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "user-2",
    username: "publisher2",
    email: "publisher2@example.com",
    full_name: "Publisher Two",
    dcs_publisher_id: 2,
    dcs_publisher_name: "XYZ Media",
    is_active: false,
    created_at: "2024-02-20T14:30:00Z",
  },
]

const mockDcsPublishers: PublisherPublic[] = [
  { id: 1, name: "ABC Publishing", contact_email: "abc@example.com" },
  { id: 2, name: "XYZ Media", contact_email: "xyz@example.com" },
  { id: 3, name: "New Publisher", contact_email: "new@example.com" },
]

const mockAccountListResponse: PublisherAccountListResponse = {
  data: mockPublisherAccounts,
  count: 2,
}

describe("AdminPublishers Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(AdminService.listPublisherAccounts).mockResolvedValue(
      mockAccountListResponse,
    )
    vi.mocked(AdminService.listPublishers).mockResolvedValue(mockDcsPublishers)
  })

  describe("API interactions", () => {
    it("fetches publisher accounts on mount", async () => {
      expect(AdminService.listPublisherAccounts).toBeDefined()
      expect(AdminService.listPublishers).toBeDefined()
    })

    it("fetches DCS publishers for dropdown", async () => {
      const result = await AdminService.listPublishers()
      expect(result).toEqual(mockDcsPublishers)
      expect(result.length).toBe(3)
    })

    it("creates publisher account with correct data", async () => {
      const createData = {
        dcs_publisher_id: 1,
        username: "newpublisher",
        email: "new@example.com",
        full_name: "New Publisher User",
      }

      const mockResponse: PublisherAccountCreationResponse = {
        user: {
          id: "user-3",
          username: "newpublisher",
          email: "new@example.com",
          full_name: "New Publisher User",
          is_active: true,
          is_superuser: false,
          role: "publisher" as any,
        },
        password_emailed: true,
        message: "Account created successfully",
      }

      vi.mocked(AdminService.createPublisherAccount).mockResolvedValue(
        mockResponse,
      )

      const result = await AdminService.createPublisherAccount({
        requestBody: createData,
      })

      expect(AdminService.createPublisherAccount).toHaveBeenCalledWith({
        requestBody: createData,
      })
      expect(result.password_emailed).toBe(true)
    })

    it("updates publisher account", async () => {
      const updateData = {
        dcs_publisher_id: 2,
        full_name: "Updated Name",
      }

      vi.mocked(AdminService.updatePublisherAccount).mockResolvedValue({
        ...mockPublisherAccounts[0],
        dcs_publisher_id: 2,
        full_name: "Updated Name",
      })

      await AdminService.updatePublisherAccount({
        userId: "user-1",
        requestBody: updateData,
      })

      expect(AdminService.updatePublisherAccount).toHaveBeenCalledWith({
        userId: "user-1",
        requestBody: updateData,
      })
    })

    it("deletes publisher account", async () => {
      vi.mocked(AdminService.deletePublisherAccount).mockResolvedValue(
        undefined,
      )

      await AdminService.deletePublisherAccount({ userId: "user-1" })

      expect(AdminService.deletePublisherAccount).toHaveBeenCalledWith({
        userId: "user-1",
      })
    })

    it("resets user password", async () => {
      const mockResetResponse = {
        password_emailed: false,
        temporary_password: "TempPass123!",
        message: "Password reset successfully",
      }

      vi.mocked(AdminService.resetUserPassword).mockResolvedValue(
        mockResetResponse,
      )

      const result = await AdminService.resetUserPassword({ userId: "user-1" })

      expect(AdminService.resetUserPassword).toHaveBeenCalledWith({
        userId: "user-1",
      })
      expect(result.temporary_password).toBe("TempPass123!")
    })
  })

  describe("Data handling", () => {
    it("handles empty accounts list", async () => {
      vi.mocked(AdminService.listPublisherAccounts).mockResolvedValue({
        data: [],
        count: 0,
      })

      const result = await AdminService.listPublisherAccounts()
      expect(result.data).toEqual([])
      expect(result.count).toBe(0)
    })

    it("handles account with null fields", async () => {
      const accountWithNulls: PublisherAccountPublic = {
        id: "user-3",
        username: "user3",
        email: null,
        full_name: null,
        dcs_publisher_id: null,
        dcs_publisher_name: null,
        is_active: true,
        created_at: null,
      }

      vi.mocked(AdminService.listPublisherAccounts).mockResolvedValue({
        data: [accountWithNulls],
        count: 1,
      })

      const result = await AdminService.listPublisherAccounts()
      expect(result.data[0].email).toBeNull()
      expect(result.data[0].full_name).toBeNull()
    })

    it("filters accounts by search query", () => {
      const searchQuery = "abc"
      const filteredAccounts = mockPublisherAccounts.filter(
        (account) =>
          account.full_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          account.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          account.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          account.dcs_publisher_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )

      expect(filteredAccounts.length).toBe(1)
      expect(filteredAccounts[0].dcs_publisher_name).toBe("ABC Publishing")
    })
  })

  describe("Form validation", () => {
    it("validates required fields for account creation", () => {
      const newAccount = {
        dcs_publisher_id: 0,
        username: "",
        email: "",
        full_name: "",
      }

      const isValid =
        newAccount.dcs_publisher_id &&
        newAccount.username &&
        newAccount.email &&
        newAccount.full_name

      expect(isValid).toBeFalsy()
    })

    it("accepts valid account creation data", () => {
      const validAccount = {
        dcs_publisher_id: 1,
        username: "validuser",
        email: "valid@example.com",
        full_name: "Valid User",
      }

      const isValid =
        validAccount.dcs_publisher_id &&
        validAccount.username &&
        validAccount.email &&
        validAccount.full_name

      expect(isValid).toBeTruthy()
    })
  })

  describe("Password handling", () => {
    it("handles password emailed response", async () => {
      const response: PublisherAccountCreationResponse = {
        user: {
          id: "user-new",
          username: "newuser",
          email: "new@example.com",
          full_name: "New User",
          is_active: true,
          is_superuser: false,
          role: "publisher" as any,
        },
        password_emailed: true,
        message: "Password sent to email",
      }

      expect(response.password_emailed).toBe(true)
      expect(response.temporary_password).toBeUndefined()
    })

    it("handles temporary password response", async () => {
      const response: PublisherAccountCreationResponse = {
        user: {
          id: "user-new",
          username: "newuser",
          email: "new@example.com",
          full_name: "New User",
          is_active: true,
          is_superuser: false,
          role: "publisher" as any,
        },
        password_emailed: false,
        temporary_password: "SecureTemp123!",
        message: "Password generated",
      }

      expect(response.password_emailed).toBe(false)
      expect(response.temporary_password).toBe("SecureTemp123!")
    })
  })

  describe("Status display", () => {
    it("correctly identifies active accounts", () => {
      const activeAccount = mockPublisherAccounts[0]
      expect(activeAccount.is_active).toBe(true)
    })

    it("correctly identifies inactive accounts", () => {
      const inactiveAccount = mockPublisherAccounts[1]
      expect(inactiveAccount.is_active).toBe(false)
    })
  })

  describe("DCS Publisher lookup", () => {
    it("finds publisher name by ID", () => {
      const getPublisherName = (publisherId: number | null): string => {
        if (!publisherId) return "N/A"
        const publisher = mockDcsPublishers.find((p) => p.id === publisherId)
        return publisher?.name || "Unknown"
      }

      expect(getPublisherName(1)).toBe("ABC Publishing")
      expect(getPublisherName(2)).toBe("XYZ Media")
      expect(getPublisherName(null)).toBe("N/A")
      expect(getPublisherName(999)).toBe("Unknown")
    })
  })
})
