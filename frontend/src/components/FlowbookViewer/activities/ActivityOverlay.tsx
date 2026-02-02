import { Loader2 } from "lucide-react"
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import type { ActivityReference, ActivityType } from "@/types/flowbook"
import { useFlowbookBookStore, useFlowbookUIStore } from "../stores"
import { getSpreadPages } from "../utils"
import { ActivityToolbar } from "./ActivityToolbar"
import { CircleMark } from "./players/CircleMark"
import { DragDropPicture } from "./players/DragDropPicture"
import { DragDropPictureGroup } from "./players/DragDropPictureGroup"
import { FillBlanks } from "./players/FillBlanks"
import { FillPicture } from "./players/FillPicture"
import { MatchTheWords } from "./players/MatchTheWords"
import { WordSearch } from "./players/WordSearch"

interface ActivityOverlayProps {
  activityId: string
}

const ACTIVITY_PLAYERS: Record<
  ActivityType,
  React.ComponentType<{ activity: ActivityReference }>
> = {
  matchTheWords: MatchTheWords,
  dragDropPicture: DragDropPicture,
  dragDropPictureGroup: DragDropPictureGroup,
  fillPicture: FillPicture,
  circleMark: CircleMark,
  fillBlanks: FillBlanks,
  wordSearch: WordSearch,
}

const DEFAULT_HEADER = "Complete the activity"

function findActivityInPage(
  page:
    | {
        activities?: ActivityReference[]
        sections?: { activities?: ActivityReference[] }[]
      }
    | undefined,
  activityId: string,
): ActivityReference | undefined {
  if (!page) return undefined

  const pageActivity = page.activities?.find((a) => a.id === activityId)
  if (pageActivity) return pageActivity

  if (page.sections) {
    for (const section of page.sections) {
      const sectionActivity = section.activities?.find(
        (a) => a.id === activityId,
      )
      if (sectionActivity) return sectionActivity
    }
  }

  return undefined
}

export function ActivityOverlay({ activityId }: ActivityOverlayProps) {
  const { closeActivity, viewMode } = useFlowbookUIStore()
  const { config, currentPageIndex } = useFlowbookBookStore()

  const spreadPages = config
    ? getSpreadPages(currentPageIndex, config.pages.length, viewMode)
    : []

  let activity: ActivityReference | undefined
  for (const pageIdx of spreadPages) {
    const page = config?.pages[pageIdx]
    activity = findActivityInPage(page, activityId)
    if (activity) break
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeActivity()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [closeActivity])

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  if (!activity) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
        <div className="text-center text-white">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin" />
          <p>Activity not found</p>
          <button
            onClick={closeActivity}
            className="mt-4 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const ActivityPlayer = ACTIVITY_PLAYERS[activity.type]
  const activityConfig = activity.config as {
    title?: string
    headerText?: string
    instructions?: string
  }

  const headerText =
    activityConfig.headerText || activityConfig.instructions || DEFAULT_HEADER

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in duration-200"
        onClick={closeActivity}
      />

      {/* Dialog Container */}
      <div
        className={cn(
          "relative flex w-full h-full max-w-6xl max-h-[90vh] m-4",
          "rounded-xl overflow-hidden shadow-2xl",
          "animate-in slide-in-from-bottom-4 duration-300",
        )}
      >
        {/* Activity Toolbar */}
        <ActivityToolbar activity={activity} />

        {/* Main Content */}
        <div className="flex flex-1 flex-col bg-white">
          {/* Header */}
          <header className="flex items-center justify-center border-b px-4 py-4">
            <p className="text-lg font-medium text-slate-700 text-center">
              {headerText}
            </p>
          </header>

          {/* Activity Content */}
          <main className="flex-1 overflow-auto p-4">
            {ActivityPlayer ? (
              <ActivityPlayer activity={activity} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-slate-500">
                  Unknown activity type: {activity.type}
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
