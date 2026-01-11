/**
 * Question Generator Route - DEPRECATED
 *
 * Redirects to the Content Library page where generation is now available via dialog.
 */

import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/dreamai/generator")({
  component: GeneratorRedirect,
})

function GeneratorRedirect() {
  return <Navigate to="/dreamai/library" replace />
}
