/**
 * Activity Player Layout Component
 * Story 4.1: Activity Player Framework & Layout
 *
 * Main layout wrapper for activity player with header, content, and footer
 */

import type { ActivityStartResponse } from "../../types/assignment"
import { Card } from "../ui/card"
import { ActivityPlayerFooter } from "./ActivityPlayerFooter"
import { ActivityPlayerHeader } from "./ActivityPlayerHeader"

interface ActivityPlayerLayoutProps {
  activity: ActivityStartResponse
  onSubmit: () => void
  onExit: () => void
  onTimeExpired: () => void
  submitDisabled?: boolean
}

export function ActivityPlayerLayout({
  activity,
  onSubmit,
  onExit,
  onTimeExpired,
  submitDisabled = true,
}: ActivityPlayerLayoutProps) {
  return (
    <div className="flex h-screen min-w-[768px] flex-col">
      {/* Header */}
      <ActivityPlayerHeader activity={activity} onTimeExpired={onTimeExpired} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-muted/20 p-6">
        <Card className="mx-auto max-w-4xl p-8">
          {/* Placeholder for activity-specific content */}
          <div className="text-center">
            <h2 className="mb-4 text-xl font-semibold text-muted-foreground">
              Activity Player Content
            </h2>
            <p className="mb-4 text-muted-foreground">
              Activity-specific content will be implemented in Stories 4.2-4.6
            </p>
            <div className="mt-6 space-y-2 rounded-lg border bg-muted/50 p-4 text-left text-sm">
              <p>
                <strong>Activity Type:</strong> {activity.activity_type}
              </p>
              <p>
                <strong>Activity Title:</strong> {activity.activity_title}
              </p>
              <p>
                <strong>Status:</strong> {activity.current_status}
              </p>
              {activity.instructions && (
                <p>
                  <strong>Instructions:</strong> {activity.instructions}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <ActivityPlayerFooter
        onSubmit={onSubmit}
        onExit={onExit}
        submitDisabled={submitDisabled}
        saveDisabled={true}
        hasUnsavedChanges={false}
      />
    </div>
  )
}
