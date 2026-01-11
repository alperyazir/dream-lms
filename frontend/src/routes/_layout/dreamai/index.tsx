/**
 * DreamAI Index Route
 *
 * Redirects to the Content Library page.
 */

import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/dreamai/")({
  component: DreamAIIndex,
})

function DreamAIIndex() {
  return <Navigate to="/dreamai/library" replace />
}
