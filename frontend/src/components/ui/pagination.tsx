"use client"

import * as React from "react"
import {
  HiChevronLeft,
  HiChevronRight,
  HiMiniEllipsisHorizontal,
} from "react-icons/hi2"
import { Button, type ButtonProps } from "./button"

export interface PaginationRootProps {
  count: number
  pageSize?: number
  page?: number
  onPageChange?: (page: number) => void
  children?: React.ReactNode
  className?: string
}

interface PaginationContextValue {
  page: number
  totalPages: number
  nextPage: number | null
  previousPage: number | null
  setPage: (page: number) => void
  pages: Array<{ type: "page" | "ellipsis"; value: number }>
  count: number
  pageRange: { start: number; end: number }
}

const PaginationContext = React.createContext<PaginationContextValue | null>(
  null
)

const usePaginationContext = () => {
  const context = React.useContext(PaginationContext)
  if (!context) {
    throw new Error("Pagination components must be used within PaginationRoot")
  }
  return context
}

export const PaginationRoot = React.forwardRef<
  HTMLDivElement,
  PaginationRootProps
>(function PaginationRoot(
  { count, pageSize = 10, page = 1, onPageChange, children, className },
  ref
) {
  const totalPages = Math.ceil(count / pageSize)
  const [currentPage, setCurrentPage] = React.useState(page)

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    onPageChange?.(newPage)
  }

  const pages = React.useMemo(() => {
    const items: Array<{ type: "page" | "ellipsis"; value: number }> = []
    for (let i = 1; i <= totalPages; i++) {
      items.push({ type: "page", value: i })
    }
    return items
  }, [totalPages])

  const value: PaginationContextValue = {
    page: currentPage,
    totalPages,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    previousPage: currentPage > 1 ? currentPage - 1 : null,
    setPage: handlePageChange,
    pages,
    count,
    pageRange: {
      start: (currentPage - 1) * pageSize,
      end: currentPage * pageSize,
    },
  }

  return (
    <PaginationContext.Provider value={value}>
      <div
        ref={ref}
        className={`flex items-center gap-2 ${className || ""}`}
      >
        {children}
      </div>
    </PaginationContext.Provider>
  )
})

export const PaginationPrevTrigger = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(function PaginationPrevTrigger(props, ref) {
  const { previousPage, setPage } = usePaginationContext()

  return (
    <Button
      ref={ref}
      variant="outline"
      size="icon"
      disabled={previousPage === null}
      onClick={() => previousPage && setPage(previousPage)}
      {...props}
    >
      <HiChevronLeft />
    </Button>
  )
})

export const PaginationNextTrigger = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(function PaginationNextTrigger(props, ref) {
  const { nextPage, setPage } = usePaginationContext()

  return (
    <Button
      ref={ref}
      variant="outline"
      size="icon"
      disabled={nextPage === null}
      onClick={() => nextPage && setPage(nextPage)}
      {...props}
    >
      <HiChevronRight />
    </Button>
  )
})

export const PaginationItem = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { value: number }
>(function PaginationItem({ value, ...props }, ref) {
  const { page, setPage } = usePaginationContext()
  const isCurrent = page === value

  return (
    <Button
      ref={ref}
      variant={isCurrent ? "default" : "outline"}
      size="sm"
      onClick={() => setPage(value)}
      {...props}
    >
      {value}
    </Button>
  )
})

export const PaginationEllipsis = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function PaginationEllipsis(props, ref) {
  return (
    <div ref={ref} className="flex items-center justify-center" {...props}>
      <HiMiniEllipsisHorizontal className="h-5 w-5" />
    </div>
  )
})

export const PaginationItems = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const { pages } = usePaginationContext()

  return (
    <div className="flex items-center gap-1" {...props}>
      {pages.map((page, index) =>
        page.type === "ellipsis" ? (
          <PaginationEllipsis key={index} />
        ) : (
          <PaginationItem key={index} value={page.value} />
        )
      )}
    </div>
  )
}

export const PaginationPageText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { format?: "short" | "compact" | "long" }
>(function PaginationPageText({ format = "compact", ...props }, ref) {
  const { page, totalPages } = usePaginationContext()

  const content = format === "short"
    ? `${page} / ${totalPages}`
    : `${page} of ${totalPages}`

  return (
    <p ref={ref} className="text-sm font-medium" {...props}>
      {content}
    </p>
  )
})

// Additional exports for compatibility
export const PaginationContent = PaginationItems
export const PaginationLink = PaginationItem
export const PaginationPrevious = PaginationPrevTrigger
export const PaginationNext = PaginationNextTrigger

// Compound component export
export const Pagination = {
  Root: PaginationRoot,
  PrevTrigger: PaginationPrevTrigger,
  NextTrigger: PaginationNextTrigger,
  Item: PaginationItem,
  Items: PaginationItems,
  Ellipsis: PaginationEllipsis,
  PageText: PaginationPageText,
}
