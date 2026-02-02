/**
 * Activity Selection Tabs Component - Story 9.5
 *
 * Tabbed activity selection UI with three selection methods:
 * - Individual: Click activities one at a time (existing behavior)
 * - By Page: Click pages to select all activities on that page
 * - By Module: Click modules to select all activities in that module
 *
 * Includes a summary panel showing all selected activities.
 *
 * Story 9.x: Time Planning mode - group activities by date
 */

import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  CalendarDays,
  FileText,
  Grid3X3,
  Layers,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { getBookStructure } from "@/services/booksApi"
import type { DateActivityGroup } from "@/types/assignment"
import type { ActivityMarker, Book, ModuleWithActivities } from "@/types/book"
import { ACTIVITY_TYPE_CONFIG } from "@/types/book"
import { ModuleSelectionList } from "./ModuleSelectionList"
import { PageSelectionGrid } from "./PageSelectionGrid"
import { PageViewer } from "./PageViewer"

interface ActivitySelectionTabsProps {
  bookId: string | number
  book: Book
  selectedActivityIds: string[]
  onActivityIdsChange: (activityIds: string[]) => void
  // Time Planning mode props
  timePlanningEnabled?: boolean
  onTimePlanningChange?: (enabled: boolean) => void
  dateGroups?: DateActivityGroup[]
  onDateGroupsChange?: (groups: DateActivityGroup[]) => void
}

// Store activity data for display in summary
export interface SelectedActivityInfo {
  id: string
  title: string | null
  activityType: string
  source: "individual" | "page" | "module"
  sourceLabel: string // e.g., "Page 5" or "Module 1"
}

export function ActivitySelectionTabs({
  bookId,
  book,
  selectedActivityIds,
  onActivityIdsChange,
  timePlanningEnabled = false,
  onTimePlanningChange,
  dateGroups = [],
  onDateGroupsChange,
}: ActivitySelectionTabsProps) {
  // Track selected activities as a Set for O(1) operations
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set(selectedActivityIds),
  )

  // Track activity metadata for summary display
  const [activityInfoMap, setActivityInfoMap] = useState<
    Map<string, SelectedActivityInfo>
  >(new Map())

  // Time Planning mode state
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0)
  const [isAddingDate, setIsAddingDate] = useState(false)

  // Sync internal Set state when prop changes (e.g., when editing existing assignment)
  useEffect(() => {
    const currentIds = Array.from(selectedActivities).sort().join(",")
    const propIds = [...selectedActivityIds].sort().join(",")
    if (currentIds !== propIds) {
      setSelectedActivities(new Set(selectedActivityIds))
    }
  }, [selectedActivityIds, selectedActivities])

  // Fetch book structure for page and module selection
  const { data: bookStructure, isLoading: isStructureLoading } = useQuery({
    queryKey: ["bookStructure", bookId],
    queryFn: () => getBookStructure(bookId),
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Handle individual activity toggle from PageViewer
  const handleActivityToggle = useCallback(
    (activityId: string, activity: ActivityMarker) => {
      setSelectedActivities((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(activityId)) {
          newSet.delete(activityId)
        } else {
          newSet.add(activityId)
        }
        onActivityIdsChange(Array.from(newSet))
        return newSet
      })

      // Store activity info
      setActivityInfoMap((prev) => {
        const newMap = new Map(prev)
        if (!newMap.has(activityId)) {
          newMap.set(activityId, {
            id: activityId,
            title: activity.title,
            activityType: activity.activity_type,
            source: "individual",
            sourceLabel: "Individual",
          })
        }
        return newMap
      })
    },
    [onActivityIdsChange],
  )

  // Handle page selection toggle
  const handlePageToggle = useCallback(
    (pageNumber: number, activityIds: string[], _moduleName: string) => {
      // Time Planning mode - add to current date group
      if (timePlanningEnabled && dateGroups.length > 0 && onDateGroupsChange) {
        const currentGroup = dateGroups[selectedDateIndex]
        if (!currentGroup) return

        // Check if all activities from this page are already in current group
        const isFullySelected = activityIds.every((id) =>
          currentGroup.activityIds.includes(id),
        )

        setSelectedActivities((prevActivities) => {
          const newActivities = new Set(prevActivities)

          if (isFullySelected) {
            // Remove activities from selection and from date group
            for (const id of activityIds) {
              newActivities.delete(id)
            }
            const newGroups = dateGroups.map((group, i) => {
              if (i === selectedDateIndex) {
                return {
                  ...group,
                  activityIds: group.activityIds.filter(
                    (id) => !activityIds.includes(id),
                  ),
                }
              }
              return group
            })
            onDateGroupsChange(newGroups)
          } else {
            // Add activities to selection and to current date group
            for (const id of activityIds) {
              newActivities.add(id)
            }
            // Update activity info
            setActivityInfoMap((prev) => {
              const newMap = new Map(prev)
              for (const id of activityIds) {
                if (!newMap.has(id)) {
                  newMap.set(id, {
                    id,
                    title: null,
                    activityType: "unknown",
                    source: "page",
                    sourceLabel: `Page ${pageNumber}`,
                  })
                }
              }
              return newMap
            })
            // Add to current date group (remove from others first)
            const newGroups = dateGroups.map((group, i) => {
              if (i === selectedDateIndex) {
                const existingIds = new Set(group.activityIds)
                const newIds = activityIds.filter((id) => !existingIds.has(id))
                return {
                  ...group,
                  activityIds: [...group.activityIds, ...newIds],
                }
              }
              // Remove from other groups
              return {
                ...group,
                activityIds: group.activityIds.filter(
                  (id) => !activityIds.includes(id),
                ),
              }
            })
            onDateGroupsChange(newGroups)
          }

          onActivityIdsChange(Array.from(newActivities))
          return newActivities
        })
        return
      }

      // Normal mode
      setSelectedActivities((prevActivities) => {
        const newActivities = new Set(prevActivities)
        // Check if page is fully selected (all activities selected)
        const isFullySelected = activityIds.every((id) =>
          prevActivities.has(id),
        )

        if (isFullySelected) {
          // Deselect: remove activities from this page
          for (const id of activityIds) {
            newActivities.delete(id)
          }
        } else {
          // Select: add activities from this page
          for (const id of activityIds) {
            newActivities.add(id)
          }
          // Update activity info for new selections
          setActivityInfoMap((prev) => {
            const newMap = new Map(prev)
            for (const id of activityIds) {
              if (!newMap.has(id)) {
                newMap.set(id, {
                  id,
                  title: null,
                  activityType: "unknown",
                  source: "page",
                  sourceLabel: `Page ${pageNumber}`,
                })
              }
            }
            return newMap
          })
        }

        onActivityIdsChange(Array.from(newActivities))
        return newActivities
      })
    },
    [
      onActivityIdsChange,
      timePlanningEnabled,
      dateGroups,
      selectedDateIndex,
      onDateGroupsChange,
    ],
  )

  // Handle module selection toggle
  const handleModuleToggle = useCallback(
    (module: ModuleWithActivities) => {
      const activityIds = module.activity_ids

      // Time Planning mode - add to current date group
      if (timePlanningEnabled && dateGroups.length > 0 && onDateGroupsChange) {
        const currentGroup = dateGroups[selectedDateIndex]
        if (!currentGroup) return

        // Check if all activities from this module are already in current group
        const isFullySelected = activityIds.every((id) =>
          currentGroup.activityIds.includes(id),
        )

        setSelectedActivities((prevActivities) => {
          const newActivities = new Set(prevActivities)

          if (isFullySelected) {
            // Remove activities from selection and from date group
            for (const id of activityIds) {
              newActivities.delete(id)
            }
            const newGroups = dateGroups.map((group, i) => {
              if (i === selectedDateIndex) {
                return {
                  ...group,
                  activityIds: group.activityIds.filter(
                    (id) => !activityIds.includes(id),
                  ),
                }
              }
              return group
            })
            onDateGroupsChange(newGroups)
          } else {
            // Add activities to selection and to current date group
            for (const id of activityIds) {
              newActivities.add(id)
            }
            // Update activity info
            setActivityInfoMap((prev) => {
              const newMap = new Map(prev)
              for (const id of activityIds) {
                if (!newMap.has(id)) {
                  newMap.set(id, {
                    id,
                    title: null,
                    activityType: "unknown",
                    source: "module",
                    sourceLabel: module.name,
                  })
                }
              }
              return newMap
            })
            // Add to current date group (remove from others first)
            const newGroups = dateGroups.map((group, i) => {
              if (i === selectedDateIndex) {
                const existingIds = new Set(group.activityIds)
                const newIds = activityIds.filter((id) => !existingIds.has(id))
                return {
                  ...group,
                  activityIds: [...group.activityIds, ...newIds],
                }
              }
              // Remove from other groups
              return {
                ...group,
                activityIds: group.activityIds.filter(
                  (id) => !activityIds.includes(id),
                ),
              }
            })
            onDateGroupsChange(newGroups)
          }

          onActivityIdsChange(Array.from(newActivities))
          return newActivities
        })
        return
      }

      // Normal mode
      setSelectedActivities((prevActivities) => {
        const newActivities = new Set(prevActivities)
        // Check if module is fully selected (all activities selected)
        const isFullySelected = module.activity_ids.every((id) =>
          prevActivities.has(id),
        )

        if (isFullySelected) {
          // Deselect: remove activities from this module
          for (const id of module.activity_ids) {
            newActivities.delete(id)
          }
        } else {
          // Select: add activities from this module
          for (const id of module.activity_ids) {
            newActivities.add(id)
          }
          // Update activity info for new selections
          setActivityInfoMap((prev) => {
            const newMap = new Map(prev)
            for (const id of module.activity_ids) {
              if (!newMap.has(id)) {
                newMap.set(id, {
                  id,
                  title: null,
                  activityType: "unknown",
                  source: "module",
                  sourceLabel: module.name,
                })
              }
            }
            return newMap
          })
        }

        onActivityIdsChange(Array.from(newActivities))
        return newActivities
      })
    },
    [
      onActivityIdsChange,
      timePlanningEnabled,
      dateGroups,
      selectedDateIndex,
      onDateGroupsChange,
    ],
  )

  // Handle remove individual activity from summary
  const handleRemoveActivity = useCallback(
    (activityId: string) => {
      setSelectedActivities((prev) => {
        const newSet = new Set(prev)
        newSet.delete(activityId)
        onActivityIdsChange(Array.from(newSet))
        return newSet
      })
    },
    [onActivityIdsChange],
  )

  // Handle clear all
  const handleClearAll = useCallback(() => {
    setSelectedActivities(new Set())
    onActivityIdsChange([])
    // Also clear date groups in time planning mode
    if (timePlanningEnabled && onDateGroupsChange) {
      onDateGroupsChange([])
    }
  }, [onActivityIdsChange, timePlanningEnabled, onDateGroupsChange])

  // Time Planning handlers
  const handleAddDate = useCallback(
    (date: Date) => {
      if (!onDateGroupsChange) return
      const newGroups = [...dateGroups, { date, activityIds: [] }]
      onDateGroupsChange(newGroups)
      setSelectedDateIndex(newGroups.length - 1)
      setIsAddingDate(false)
    },
    [dateGroups, onDateGroupsChange],
  )

  const handleRemoveDate = useCallback(
    (index: number) => {
      if (!onDateGroupsChange) return
      const removedGroup = dateGroups[index]
      // Remove activities that were in this date group from selection
      if (removedGroup) {
        setSelectedActivities((prev) => {
          const newSet = new Set(prev)
          for (const id of removedGroup.activityIds) {
            newSet.delete(id)
          }
          onActivityIdsChange(Array.from(newSet))
          return newSet
        })
      }
      const newGroups = dateGroups.filter((_, i) => i !== index)
      onDateGroupsChange(newGroups)
      // Adjust selected index if needed
      if (selectedDateIndex >= newGroups.length) {
        setSelectedDateIndex(Math.max(0, newGroups.length - 1))
      }
    },
    [dateGroups, onDateGroupsChange, selectedDateIndex, onActivityIdsChange],
  )

  // In time planning mode, add activities to current date group
  const handleActivityToggleWithPlanning = useCallback(
    (activityId: string, activity: ActivityMarker) => {
      if (!timePlanningEnabled || dateGroups.length === 0) {
        // Normal mode - just toggle
        handleActivityToggle(activityId, activity)
        return
      }

      // Time planning mode - add to current date group
      const currentGroup = dateGroups[selectedDateIndex]
      if (!currentGroup) return

      setSelectedActivities((prev) => {
        const newSet = new Set(prev)
        const isSelected = newSet.has(activityId)

        if (isSelected) {
          // Remove from selection and from date group
          newSet.delete(activityId)
          if (onDateGroupsChange) {
            const newGroups = dateGroups.map((group, i) => {
              if (i === selectedDateIndex) {
                return {
                  ...group,
                  activityIds: group.activityIds.filter(
                    (id) => id !== activityId,
                  ),
                }
              }
              // Also remove from other groups if it exists there
              return {
                ...group,
                activityIds: group.activityIds.filter(
                  (id) => id !== activityId,
                ),
              }
            })
            onDateGroupsChange(newGroups)
          }
        } else {
          // Add to selection and to current date group
          newSet.add(activityId)
          if (onDateGroupsChange) {
            const newGroups = dateGroups.map((group, i) => {
              if (i === selectedDateIndex) {
                // Add to current group (if not already there)
                if (!group.activityIds.includes(activityId)) {
                  return {
                    ...group,
                    activityIds: [...group.activityIds, activityId],
                  }
                }
              } else {
                // Remove from other groups
                return {
                  ...group,
                  activityIds: group.activityIds.filter(
                    (id) => id !== activityId,
                  ),
                }
              }
              return group
            })
            onDateGroupsChange(newGroups)
          }
        }

        onActivityIdsChange(Array.from(newSet))
        return newSet
      })

      // Store activity info
      setActivityInfoMap((prev) => {
        const newMap = new Map(prev)
        if (!newMap.has(activityId)) {
          newMap.set(activityId, {
            id: activityId,
            title: activity.title,
            activityType: activity.activity_type,
            source: "individual",
            sourceLabel: format(currentGroup.date, "MMM dd"),
          })
        }
        return newMap
      })
    },
    [
      timePlanningEnabled,
      dateGroups,
      selectedDateIndex,
      handleActivityToggle,
      onActivityIdsChange,
      onDateGroupsChange,
    ],
  )

  // Group selected activities by source for summary display
  const groupedActivities = useMemo(() => {
    const groups: Record<string, SelectedActivityInfo[]> = {}

    for (const id of selectedActivities) {
      const info = activityInfoMap.get(id) || {
        id,
        title: null,
        activityType: "unknown",
        source: "individual" as const,
        sourceLabel: "Individual",
      }

      const groupKey = info.sourceLabel
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(info)
    }

    return groups
  }, [selectedActivities, activityInfoMap])

  const activityCount = selectedActivities.size

  return (
    <div className="flex flex-col h-full max-h-[min(600px,72vh)] overflow-hidden w-full max-w-full">
      {/* Header with Book Info and Time Planning Toggle - Compact single row */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800/50 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700 shrink-0 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="font-medium text-sm text-foreground truncate">
            {book.title}
          </h4>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {book.publisher_name}
          </Badge>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {book.activity_count} activities
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Time Planning Toggle */}
          {onTimePlanningChange && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                Time Planning
              </span>
              <Switch
                checked={timePlanningEnabled}
                onCheckedChange={onTimePlanningChange}
                className="scale-90"
              />
            </div>
          )}
          {/* Selected Count */}
          {activityCount > 0 && (
            <Badge className="bg-purple-600 text-white text-[10px]">
              {activityCount} selected
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content - Tabs, Date List (when enabled), and Summary */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden h-full">
        {/* Tabs Section */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col h-full">
          <Tabs
            defaultValue="individual"
            className="flex-1 flex flex-col min-h-0 h-full"
          >
            <TabsList className="grid w-full grid-cols-3 shrink-0">
              <TabsTrigger value="individual" className="text-xs gap-1">
                <Grid3X3 className="h-3 w-3" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="by-page" className="text-xs gap-1">
                <FileText className="h-3 w-3" />
                By Page
              </TabsTrigger>
              <TabsTrigger value="by-module" className="text-xs gap-1">
                <Layers className="h-3 w-3" />
                By Module
              </TabsTrigger>
            </TabsList>

            {/* Individual Selection Tab */}
            <TabsContent
              value="individual"
              className="flex-1 min-h-0 overflow-hidden mt-2"
              style={{ height: "calc(100% - 44px)" }}
            >
              <PageViewer
                bookId={bookId}
                selectedActivityIds={selectedActivities}
                onActivityToggle={
                  timePlanningEnabled
                    ? handleActivityToggleWithPlanning
                    : handleActivityToggle
                }
              />
            </TabsContent>

            {/* By Page Selection Tab */}
            <TabsContent
              value="by-page"
              className="flex-1 min-h-0 overflow-hidden mt-2"
              style={{ height: "calc(100% - 44px)" }}
            >
              {isStructureLoading ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Loading pages...
                </div>
              ) : bookStructure ? (
                <PageSelectionGrid
                  modules={bookStructure.modules}
                  selectedActivityIds={selectedActivities}
                  onPageToggle={handlePageToggle}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No pages found
                </div>
              )}
            </TabsContent>

            {/* By Module Selection Tab */}
            <TabsContent
              value="by-module"
              className="flex-1 min-h-0 overflow-hidden mt-2"
              style={{ height: "calc(100% - 44px)" }}
            >
              {isStructureLoading ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Loading modules...
                </div>
              ) : bookStructure ? (
                <ModuleSelectionList
                  modules={bookStructure.modules}
                  selectedActivityIds={selectedActivities}
                  onModuleToggle={handleModuleToggle}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No modules found
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Date List Column - Visible when Time Planning is enabled */}
        {timePlanningEnabled && (
          <div className="w-32 shrink-0 border-l border-gray-200 dark:border-gray-700 pl-2 flex flex-col">
            <h4 className="font-medium text-[10px] text-foreground mb-2">
              Due Dates
            </h4>
            <ScrollArea className="flex-1">
              <div className="space-y-1.5 pr-2">
                {dateGroups.map((group, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-1 p-1.5 rounded-md cursor-pointer transition-colors group",
                      selectedDateIndex === index
                        ? "bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent",
                    )}
                    onClick={() => setSelectedDateIndex(index)}
                  >
                    <CalendarDays
                      className={cn(
                        "h-3 w-3 shrink-0",
                        selectedDateIndex === index
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-[10px] font-medium truncate",
                          selectedDateIndex === index
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-foreground",
                        )}
                      >
                        {format(group.date, "dd MMM yyyy")}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {group.activityIds.length} activities
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveDate(index)
                      }}
                      className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}

                {/* Add Date Button with Calendar Popover */}
                <Popover open={isAddingDate} onOpenChange={setIsAddingDate}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-[10px] border-dashed"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Date
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={undefined}
                      onSelect={(date) => {
                        if (date) handleAddDate(date)
                      }}
                      disabled={(date) => {
                        // Disable dates that are already added
                        return dateGroups.some(
                          (g) =>
                            format(g.date, "yyyy-MM-dd") ===
                            format(date, "yyyy-MM-dd"),
                        )
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </ScrollArea>

            {/* Help text when no dates */}
            {dateGroups.length === 0 && (
              <div className="text-[9px] text-muted-foreground text-center py-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                Add dates to group activities by due date
              </div>
            )}
          </div>
        )}

        {/* Selected Activities Summary Panel */}
        <div className="w-44 shrink-0 border-l border-gray-200 dark:border-gray-700 pl-2 flex flex-col">
          {timePlanningEnabled && dateGroups.length > 0 ? (
            // Time Planning mode: Show only current date's activities
            <>
              <div className="flex items-center justify-between mb-1 shrink-0">
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-[10px] text-blue-600 dark:text-blue-400">
                    {format(
                      dateGroups[selectedDateIndex]?.date || new Date(),
                      "dd MMM yyyy",
                    )}
                  </h4>
                </div>
              </div>
              <div className="text-[9px] text-muted-foreground mb-2">
                {dateGroups[selectedDateIndex]?.activityIds.length || 0}{" "}
                activities
              </div>
              {dateGroups[selectedDateIndex]?.activityIds.length === 0 ? (
                <div className="text-[10px] text-muted-foreground py-4 text-center">
                  Click activities to assign to this date
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="space-y-0.5 pr-2">
                    {dateGroups[selectedDateIndex]?.activityIds.map(
                      (activityId) => {
                        const info = activityInfoMap.get(activityId)
                        const config = info?.activityType
                          ? ACTIVITY_TYPE_CONFIG[
                              info.activityType as keyof typeof ACTIVITY_TYPE_CONFIG
                            ]
                          : null
                        return (
                          <div
                            key={activityId}
                            className="flex items-start gap-1 p-1 rounded group bg-blue-50 dark:bg-blue-900/20"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[9px] font-medium text-foreground truncate">
                                {info?.title || `Activity`}
                              </div>
                              {config && (
                                <Badge
                                  variant={config.badgeVariant || "outline"}
                                  className="text-[8px] px-1 py-0"
                                >
                                  {config.label}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveActivity(activityId)}
                              className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-2 w-2" />
                            </Button>
                          </div>
                        )
                      },
                    )}
                  </div>
                </ScrollArea>
              )}
              {/* Total summary */}
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-[9px] text-muted-foreground">
                Total: {activityCount} activities across {dateGroups.length}{" "}
                dates
              </div>
            </>
          ) : (
            // Normal mode header
            <>
              <div className="flex items-center justify-between mb-1 shrink-0">
                <h4 className="font-medium text-[10px] text-foreground">
                  Selected ({activityCount})
                </h4>
                {activityCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-4 text-[9px] px-1 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-2.5 w-2.5 mr-0.5" />
                    Clear
                  </Button>
                )}
              </div>
              {activityCount === 0 ? (
                <div className="text-[10px] text-muted-foreground py-4 text-center">
                  {timePlanningEnabled
                    ? "Add a date first, then select activities"
                    : "Click activities, pages, or modules to select"}
                </div>
              ) : (
                // Normal mode: Show activities grouped by source
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-2">
                    {Object.entries(groupedActivities).map(
                      ([groupLabel, activities]) => (
                        <div key={groupLabel}>
                          <div className="text-[9px] font-medium text-muted-foreground uppercase mb-1">
                            {groupLabel} ({activities.length})
                          </div>
                          <div className="space-y-0.5">
                            {activities.map((activity) => {
                              const config =
                                ACTIVITY_TYPE_CONFIG[
                                  activity.activityType as keyof typeof ACTIVITY_TYPE_CONFIG
                                ]
                              return (
                                <div
                                  key={activity.id}
                                  className="flex items-start gap-1 p-1 bg-gray-50 dark:bg-neutral-800 rounded group"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[9px] font-medium text-foreground truncate">
                                      {activity.title || `Activity`}
                                    </div>
                                    {config && (
                                      <Badge
                                        variant={
                                          config.badgeVariant || "outline"
                                        }
                                        className="text-[8px] px-1 py-0"
                                      >
                                        {config.label}
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleRemoveActivity(activity.id)
                                    }
                                    className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-2 w-2" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
