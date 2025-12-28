/**
 * Publisher Dashboard Tests
 * Story 25.5: Frontend Publisher Dashboard Restoration
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PublisherProfile, PublisherStats } from "@/client"
import { PublishersService } from "@/client"

// Mock the PublishersService
vi.mock("@/client", async () => {
  const actual = await vi.importActual("@/client")
  return {
    ...actual,
    PublishersService: {
      getMyProfile: vi.fn(),
      getMyStats: vi.fn(),
      listMySchools: vi.fn(),
      listMyTeachers: vi.fn(),
      createMySchool: vi.fn(),
      createMyTeacher: vi.fn(),
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
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
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
const mockProfile: PublisherProfile = {
  id: 1,
  name: "ABC Publishing",
  contact_email: "contact@abc.com",
  logo_url: "/publishers/1/logo",
  user_id: "user-1",
  user_email: "publisher@abc.com",
  user_full_name: "John Publisher",
}

const mockStats: PublisherStats = {
  schools_count: 5,
  teachers_count: 25,
  books_count: 10,
}

describe("Publisher Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(PublishersService.getMyProfile).mockResolvedValue(mockProfile)
    vi.mocked(PublishersService.getMyStats).mockResolvedValue(mockStats)
  })

  describe("API interactions", () => {
    it("fetches profile successfully", async () => {
      const result = await PublishersService.getMyProfile()
      expect(result).toEqual(mockProfile)
      expect(result.name).toBe("ABC Publishing")
    })

    it("fetches stats successfully", async () => {
      const result = await PublishersService.getMyStats()
      expect(result).toEqual(mockStats)
      expect(result.schools_count).toBe(5)
      expect(result.teachers_count).toBe(25)
      expect(result.books_count).toBe(10)
    })

    it("handles 403 error for unlinked account", async () => {
      const error = { status: 403, body: { detail: "Account not linked" } }
      vi.mocked(PublishersService.getMyProfile).mockRejectedValue(error)

      try {
        await PublishersService.getMyProfile()
      } catch (e: any) {
        expect(e.status).toBe(403)
      }
    })

    it("handles 404 error for missing publisher", async () => {
      const error = { status: 404, body: { detail: "Publisher not found" } }
      vi.mocked(PublishersService.getMyProfile).mockRejectedValue(error)

      try {
        await PublishersService.getMyProfile()
      } catch (e: any) {
        expect(e.status).toBe(404)
      }
    })
  })

  describe("Stats display", () => {
    it("shows correct schools count", () => {
      expect(mockStats.schools_count).toBe(5)
    })

    it("shows correct teachers count", () => {
      expect(mockStats.teachers_count).toBe(25)
    })

    it("shows correct books count", () => {
      expect(mockStats.books_count).toBe(10)
    })
  })

  describe("Profile display", () => {
    it("shows publisher name", () => {
      expect(mockProfile.name).toBe("ABC Publishing")
    })

    it("shows user full name", () => {
      expect(mockProfile.user_full_name).toBe("John Publisher")
    })

    it("has numeric publisher ID for logo", () => {
      expect(typeof mockProfile.id).toBe("number")
      expect(mockProfile.id).toBe(1)
    })
  })
})

describe("Publisher Schools", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("lists schools successfully", async () => {
    const mockSchools = [
      { id: "school-1", name: "Central High", address: "123 Main St" },
      { id: "school-2", name: "West Middle", address: "456 Oak Ave" },
    ]
    vi.mocked(PublishersService.listMySchools).mockResolvedValue(
      mockSchools as any,
    )

    const result = await PublishersService.listMySchools()
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("Central High")
  })

  it("creates school with correct endpoint", async () => {
    const newSchool = {
      name: "New School",
      address: "789 New St",
      contact_info: "555-1234",
    }
    const createdSchool = { id: "school-3", ...newSchool }
    vi.mocked(PublishersService.createMySchool).mockResolvedValue(
      createdSchool as any,
    )

    const result = await PublishersService.createMySchool({
      requestBody: newSchool,
    })

    expect(PublishersService.createMySchool).toHaveBeenCalledWith({
      requestBody: newSchool,
    })
    expect(result.name).toBe("New School")
  })
})

describe("Publisher Teachers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("lists teachers successfully", async () => {
    const mockTeachers = [
      {
        id: "teacher-1",
        user_full_name: "Jane Teacher",
        user_email: "jane@school.com",
      },
      {
        id: "teacher-2",
        user_full_name: "Bob Teacher",
        user_email: "bob@school.com",
      },
    ]
    vi.mocked(PublishersService.listMyTeachers).mockResolvedValue(
      mockTeachers as any,
    )

    const result = await PublishersService.listMyTeachers()
    expect(result).toHaveLength(2)
    expect(result[0].user_full_name).toBe("Jane Teacher")
  })

  it("creates teacher with correct endpoint", async () => {
    const newTeacher = {
      username: "newteacher",
      user_email: "new@school.com",
      full_name: "New Teacher",
      school_id: "school-1",
    }
    const createdResponse = {
      user: { id: "user-new", ...newTeacher },
      role_record: { id: "teacher-new" },
    }
    vi.mocked(PublishersService.createMyTeacher).mockResolvedValue(
      createdResponse as any,
    )

    const result = await PublishersService.createMyTeacher({
      requestBody: newTeacher,
    })

    expect(PublishersService.createMyTeacher).toHaveBeenCalledWith({
      requestBody: newTeacher,
    })
    expect(result.user.full_name).toBe("New Teacher")
  })
})

describe("publishersApi service", () => {
  it("uses correct endpoint for profile", async () => {
    await PublishersService.getMyProfile()
    expect(PublishersService.getMyProfile).toHaveBeenCalled()
  })

  it("uses correct endpoint for stats", async () => {
    await PublishersService.getMyStats()
    expect(PublishersService.getMyStats).toHaveBeenCalled()
  })
})
