/**
 * Module Selection List Component - Story 9.5
 *
 * Displays a list of modules for bulk activity selection.
 * Clicking a module toggles all activities in that module.
 */

import { Check, ChevronRight, Layers } from "lucide-react"
import { useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ModuleWithActivities } from "@/types/book"

interface ModuleSelectionListProps {
  modules: ModuleWithActivities[]
  selectedActivityIds: Set<string>
  onModuleToggle: (module: ModuleWithActivities) => void
}

interface ModuleCardProps {
  module: ModuleWithActivities
  selectedCount: number
  isFullySelected: boolean
  isPartiallySelected: boolean
  onToggle: () => void
}

function ModuleCard({
  module,
  selectedCount,
  isFullySelected,
  isPartiallySelected,
  onToggle,
}: ModuleCardProps) {
  const selectionPercentage = (selectedCount / module.activity_count) * 100

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        w-full p-3 rounded-lg border-2 transition-all text-left
        ${
          isFullySelected
            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
            : isPartiallySelected
              ? "border-purple-300 bg-purple-50/50 dark:bg-purple-900/10"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* Selection indicator */}
          <div
            className={`
              w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors
              ${
                isFullySelected
                  ? "bg-purple-500 text-white"
                  : isPartiallySelected
                    ? "bg-purple-200 dark:bg-purple-700/50 text-purple-600 dark:text-purple-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400"
              }
            `}
          >
            {isFullySelected ? (
              <Check className="h-3 w-3" />
            ) : isPartiallySelected ? (
              <div className="w-2 h-0.5 bg-purple-500 rounded" />
            ) : (
              <Layers className="h-3 w-3" />
            )}
          </div>

          <div>
            {/* Module Name */}
            <h4 className="text-sm font-medium text-foreground">
              {module.name}
            </h4>

            {/* Module Stats */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                Pages {module.page_start} - {module.page_end}
              </span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                {module.pages.length} pages
              </Badge>
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                {module.activity_count} activities
              </Badge>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              {selectedCount}/{module.activity_count}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Selection Progress */}
      {isPartiallySelected && (
        <div className="mt-2">
          <Progress value={selectionPercentage} className="h-1" />
        </div>
      )}
    </button>
  )
}

export function ModuleSelectionList({
  modules,
  selectedActivityIds,
  onModuleToggle,
}: ModuleSelectionListProps) {
  // Count selected activities in a module
  const getSelectedCount = useCallback(
    (module: ModuleWithActivities): number => {
      return module.activity_ids.filter((id) => selectedActivityIds.has(id))
        .length
    },
    [selectedActivityIds],
  )

  // Check if a module is fully selected
  const isModuleFullySelected = useCallback(
    (module: ModuleWithActivities): boolean => {
      return module.activity_ids.every((id) => selectedActivityIds.has(id))
    },
    [selectedActivityIds],
  )

  // Check if a module is partially selected
  const isModulePartiallySelected = useCallback(
    (module: ModuleWithActivities): boolean => {
      if (isModuleFullySelected(module)) return false
      return module.activity_ids.some((id) => selectedActivityIds.has(id))
    },
    [selectedActivityIds, isModuleFullySelected],
  )

  // Calculate totals
  const totalActivities = modules.reduce((sum, m) => sum + m.activity_count, 0)
  const totalSelected = Array.from(selectedActivityIds).length

  return (
    <div className="flex flex-col h-full">
      {/* Header with totals */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="text-xs text-muted-foreground">
          {modules.length} modules available
        </span>
        <span className="text-xs font-medium text-foreground">
          {totalSelected} of {totalActivities} activities selected
        </span>
      </div>

      {/* Modules list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {modules.map((module) => {
            const selectedCount = getSelectedCount(module)
            const isFullySelected = isModuleFullySelected(module)
            const isPartiallySelected = isModulePartiallySelected(module)

            return (
              <ModuleCard
                key={module.name}
                module={module}
                selectedCount={selectedCount}
                isFullySelected={isFullySelected}
                isPartiallySelected={isPartiallySelected}
                onToggle={() => onModuleToggle(module)}
              />
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
