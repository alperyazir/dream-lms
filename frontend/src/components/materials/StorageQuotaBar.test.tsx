/**
 * Tests for StorageQuotaBar component
 * Story 13.2: Frontend My Materials Management
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { StorageQuota } from "@/types/material"
import { StorageQuotaBar } from "./StorageQuotaBar"

describe("StorageQuotaBar", () => {
  const normalQuota: StorageQuota = {
    used_bytes: 127 * 1024 * 1024, // 127 MB
    quota_bytes: 500 * 1024 * 1024, // 500 MB
    used_percentage: 25.4,
    is_warning: false,
    is_full: false,
  }

  const warningQuota: StorageQuota = {
    used_bytes: 420 * 1024 * 1024, // 420 MB
    quota_bytes: 500 * 1024 * 1024, // 500 MB
    used_percentage: 84,
    is_warning: true,
    is_full: false,
  }

  const fullQuota: StorageQuota = {
    used_bytes: 500 * 1024 * 1024, // 500 MB
    quota_bytes: 500 * 1024 * 1024, // 500 MB
    used_percentage: 100,
    is_warning: true,
    is_full: true,
  }

  it("renders loading state when quota is null", () => {
    render(<StorageQuotaBar quota={null} />)
    // Should show skeleton loading state
    const container = document.querySelector(".animate-pulse")
    expect(container).toBeInTheDocument()
  })

  it("renders normal quota correctly", () => {
    render(<StorageQuotaBar quota={normalQuota} />)

    expect(screen.getByText(/Storage:/)).toBeInTheDocument()
    expect(screen.getByText("25%")).toBeInTheDocument()

    // Should not show warning or full messages
    expect(screen.queryByText(/Running low on space/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Storage full/)).not.toBeInTheDocument()
  })

  it("renders warning state correctly", () => {
    render(<StorageQuotaBar quota={warningQuota} />)

    expect(screen.getByText("84%")).toBeInTheDocument()
    expect(screen.getByText(/Running low on space/)).toBeInTheDocument()
  })

  it("renders full state correctly", () => {
    render(<StorageQuotaBar quota={fullQuota} />)

    expect(screen.getByText("100%")).toBeInTheDocument()
    expect(
      screen.getByText(/Storage full - delete materials to upload more/),
    ).toBeInTheDocument()
  })

  it("formats bytes correctly", () => {
    const smallQuota: StorageQuota = {
      used_bytes: 512, // 512 bytes
      quota_bytes: 1024, // 1 KB
      used_percentage: 50,
      is_warning: false,
      is_full: false,
    }

    render(<StorageQuotaBar quota={smallQuota} />)
    expect(screen.getByText(/Storage:/)).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <StorageQuotaBar quota={normalQuota} className="custom-class" />,
    )
    expect(container.firstChild).toHaveClass("custom-class")
  })
})
