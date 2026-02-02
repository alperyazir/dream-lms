import { lazy, Suspense } from "react"
import type { FlowbookViewerProps } from "@/types/flowbook"

// Lazy load the FlowbookViewer for code splitting
const LazyFlowbookViewer = lazy(() =>
  import("./FlowbookViewer").then((module) => ({
    default: module.FlowbookViewer,
  })),
)

// Loading fallback component
function FlowbookViewerLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-500" />
        <span className="text-sm text-slate-400">Loading viewer...</span>
      </div>
    </div>
  )
}

// Wrapped component with Suspense
export function FlowbookViewer(props: FlowbookViewerProps) {
  return (
    <Suspense fallback={<FlowbookViewerLoading />}>
      <LazyFlowbookViewer {...props} />
    </Suspense>
  )
}

// Re-export types
export type {
  ActivityReference,
  ActivityType,
  AudioReference,
  BookConfig,
  FlowbookViewerProps,
  Module,
  Page,
  VideoReference,
} from "@/types/flowbook"

// Re-export stores for advanced usage
export {
  useFlowbookAudioStore,
  useFlowbookBookStore,
  useFlowbookUIStore,
} from "./stores"
