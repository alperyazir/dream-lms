/**
 * Page Browser Component - Story 8.2
 *
 * Displays book pages in a grid with:
 * - Module tabs/filter at top
 * - Page thumbnail grid
 * - Multi-select support
 * - Mobile responsive (horizontal scroll on small screens)
 */

import { useQuery } from "@tanstack/react-query"
import { BookOpen } from "lucide-react"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { booksApi } from "@/services/booksApi"
import type { PageInfo } from "@/types/book"
import { PageThumbnail } from "./PageThumbnail"

interface PageBrowserProps {
  bookId: string
  selectedPages: Map<string, PageInfo> // Key: "moduleName:pageNumber"
  onTogglePage: (moduleName: string, page: PageInfo) => void
}

/**
 * Generate a unique key for a page across modules
 */
export function getPageKey(moduleName: string, pageNumber: number): string {
  return `${moduleName}:${pageNumber}`
}

export function PageBrowser({
  bookId,
  selectedPages,
  onTogglePage,
}: PageBrowserProps) {
  const [activeModule, setActiveModule] = useState<string>("")

  // Fetch book pages
  const {
    data: pagesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["book-pages", bookId],
    queryFn: () => booksApi.getBookPages(bookId),
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  })

  // Set default active module when data loads
  if (pagesData?.modules && pagesData.modules.length > 0 && !activeModule) {
    setActiveModule(pagesData.modules[0].name)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>Failed to load pages. Please try again.</p>
      </div>
    )
  }

  if (!pagesData || pagesData.modules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No pages with activities found in this book.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Module Tabs */}
      <Tabs
        value={activeModule}
        onValueChange={setActiveModule}
        className="w-full"
      >
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground">
            {pagesData.modules.map((module) => (
              <TabsTrigger
                key={module.name}
                value={module.name}
                className="whitespace-nowrap"
              >
                {module.name}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({module.pages.length})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Page Grid for Each Module */}
        {pagesData.modules.map((module) => (
          <TabsContent key={module.name} value={module.name} className="mt-4">
            <PageGrid
              moduleName={module.name}
              pages={module.pages}
              selectedPages={selectedPages}
              onTogglePage={onTogglePage}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

interface PageGridProps {
  moduleName: string
  pages: PageInfo[]
  selectedPages: Map<string, PageInfo>
  onTogglePage: (moduleName: string, page: PageInfo) => void
}

function PageGrid({
  moduleName,
  pages,
  selectedPages,
  onTogglePage,
}: PageGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
      {pages.map((page) => {
        const pageKey = getPageKey(moduleName, page.page_number)
        const isSelected = selectedPages.has(pageKey)

        return (
          <PageThumbnail
            key={pageKey}
            thumbnailUrl={page.thumbnail_url}
            pageNumber={page.page_number}
            activityCount={page.activity_count}
            isSelected={isSelected}
            onClick={() => onTogglePage(moduleName, page)}
          />
        )
      })}
    </div>
  )
}
