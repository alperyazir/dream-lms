/**
 * Step Select Activities Component - Story 9.5 (Updated)
 *
 * Tabbed content selection with two top-level tabs:
 * - Book Activities: Existing ActivitySelectionTabs (page/module/individual picker)
 * - AI Content: DCS AI content for the selected book
 *
 * Only one type can be selected per assignment. Switching tabs clears the other selection.
 *
 * Story 9.x: Added Time Planning mode support
 */

import { BookOpen, Search, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBookContent } from "@/hooks/useContentLibrary"
import {
  ACTIVITY_TYPE_CONFIG,
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "@/lib/activityTypeConfig"
import type { DateActivityGroup } from "@/types/assignment"
import type { Book } from "@/types/book"
import type { BookContentItem } from "@/types/content-library"
import type { ContentItem } from "@/types/content-library"
import { ActivitySelectionTabs } from "./ActivitySelectionTabs"
import { StepPreviewAIContent } from "./StepPreviewAIContent"

const AI_ACTIVITY_TYPES = Object.entries(ACTIVITY_TYPE_CONFIG)
  .filter(([, config]) => config.isAI)
  .map(([key, config]) => ({ value: key, label: config.label }))

/** Convert BookContentItem to ContentItem for downstream compatibility */
function toContentItem(item: BookContentItem): ContentItem {
  return {
    id: item.content_id,
    activity_type: item.activity_type,
    title: item.title,
    source_type: "book",
    book_id: item.book_id,
    book_title: null,
    material_id: null,
    material_name: null,
    item_count: item.item_count,
    created_at: "",
    updated_at: null,
    used_in_assignments: 0,
    is_shared: true,
    created_by: {
      id: item.created_by_id || "",
      name: item.created_by_name || "Unknown",
    },
  }
}

interface StepSelectActivitiesProps {
  bookId: string | number
  book: Book
  selectedActivityIds: string[]
  onActivityIdsChange: (activityIds: string[]) => void
  // AI Content props
  selectedContent: ContentItem | null
  onContentSelect: (content: ContentItem | null) => void
  // Time Planning mode props
  timePlanningEnabled?: boolean
  onTimePlanningChange?: (enabled: boolean) => void
  dateGroups?: DateActivityGroup[]
  onDateGroupsChange?: (groups: DateActivityGroup[]) => void
}

export function StepSelectActivities({
  bookId,
  book,
  selectedActivityIds,
  onActivityIdsChange,
  selectedContent,
  onContentSelect,
  timePlanningEnabled = false,
  onTimePlanningChange,
  dateGroups = [],
  onDateGroupsChange,
}: StepSelectActivitiesProps) {
  // Determine active tab from current selections
  const initialTab = selectedContent ? "ai_content" : "book_activities"
  const [activeTab, setActiveTab] = useState(initialTab)

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "book_activities") {
      // Clear AI content selection
      onContentSelect(null)
    } else {
      // Clear book activity selections
      onActivityIdsChange([])
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid w-full grid-cols-2 mb-4 shrink-0">
          <TabsTrigger
            value="book_activities"
            className="flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Book Activities
          </TabsTrigger>
          <TabsTrigger value="ai_content" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Content
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="book_activities"
          className="flex-1 min-h-0 flex flex-col mt-0 data-[state=inactive]:hidden"
        >
          <ActivitySelectionTabs
            bookId={bookId}
            book={book}
            selectedActivityIds={selectedActivityIds}
            onActivityIdsChange={onActivityIdsChange}
            timePlanningEnabled={timePlanningEnabled}
            onTimePlanningChange={onTimePlanningChange}
            dateGroups={dateGroups}
            onDateGroupsChange={onDateGroupsChange}
          />
        </TabsContent>

        <TabsContent
          value="ai_content"
          className="flex-1 min-h-0 flex flex-col mt-0 data-[state=inactive]:hidden"
        >
          <AIContentTab
            bookId={Number(bookId)}
            selectedContent={selectedContent}
            onContentSelect={onContentSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** AI Content tab: lists DCS AI content for the selected book */
function AIContentTab({
  bookId,
  selectedContent,
  onContentSelect,
}: {
  bookId: number
  selectedContent: ContentItem | null
  onContentSelect: (content: ContentItem | null) => void
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all")

  const { data, isLoading } = useBookContent(bookId, {
    activity_type:
      activityTypeFilter !== "all" ? activityTypeFilter : undefined,
    page_size: 100,
  })

  const contentItems = useMemo(() => {
    const items = (data?.items ?? []).map(toContentItem)
    if (!searchTerm) return items
    const term = searchTerm.toLowerCase()
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.activity_type.toLowerCase().includes(term),
    )
  }, [data?.items, searchTerm])

  // Show content preview (Back button in wizard clears selection)
  if (selectedContent) {
    return (
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-4xl mx-auto">
        <StepPreviewAIContent content={selectedContent} bookId={bookId} />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4 w-full max-w-4xl mx-auto">
      {/* Filters row */}
      <div className="flex gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search AI content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Activity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {AI_ACTIVITY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : contentItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No AI content found for this book</p>
          <p className="text-sm mt-1">
            Generate content from the DreamAI section first
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
          {contentItems.map((content) => {
            const config = getActivityTypeConfig(content.activity_type)
            const colorClasses = getActivityTypeColorClasses(config.color)
            const IconComponent = config.icon

            return (
              <div
                key={content.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => onContentSelect(content)}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses.bg}`}
                >
                  <IconComponent
                    className={`w-5 h-5 ${colorClasses.text}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground truncate">
                    {content.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {config.label}
                  </p>
                </div>
                {content.item_count > 0 && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {content.item_count}{" "}
                      {content.item_count === 1 ? "item" : "items"}
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
