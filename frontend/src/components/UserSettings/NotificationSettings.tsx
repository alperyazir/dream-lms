/**
 * Notification Settings Component
 * Story 6.8: Notification Preferences & Settings
 *
 * Allows users to:
 * - Toggle individual notification types on/off
 * - Set a temporary global mute (1-24 hours)
 * - View role-specific notification preferences
 */

import { Bell, BellOff, Clock, Loader2, Mail } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useNotificationSettings } from "@/hooks/useNotifications"
import type {
  NotificationPreference,
  NotificationType,
} from "@/types/notification"

/**
 * Preference toggle row component
 */
function PreferenceToggle({
  preference,
  onToggle,
  isUpdating,
  disabled,
}: {
  preference: NotificationPreference
  onToggle: (type: NotificationType, enabled: boolean) => void
  isUpdating: boolean
  disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
      <div className="flex-1 pr-4">
        <Label
          htmlFor={`pref-${preference.notification_type}`}
          className="text-sm font-medium cursor-pointer"
        >
          {preference.label}
        </Label>
        <p className="text-sm text-muted-foreground mt-0.5">
          {preference.description}
        </p>
      </div>
      <Switch
        id={`pref-${preference.notification_type}`}
        checked={preference.enabled}
        onCheckedChange={(checked) =>
          onToggle(preference.notification_type, checked)
        }
        disabled={disabled || isUpdating}
      />
    </div>
  )
}

/**
 * Global mute section component
 */
function GlobalMuteSection({
  isMuted,
  muteStatus,
  onSetMute,
  onCancelMute,
  isSettingMute,
  isCancellingMute,
}: {
  isMuted: boolean
  muteStatus: { muted_until: string; remaining_hours: number } | null
  onSetMute: (hours: number) => Promise<void>
  onCancelMute: () => Promise<void>
  isSettingMute: boolean
  isCancellingMute: boolean
}) {
  const [selectedHours, setSelectedHours] = useState("1")

  const handleSetMute = async () => {
    await onSetMute(parseInt(selectedHours, 10))
  }

  if (isMuted && muteStatus) {
    const remainingHours = Math.ceil(muteStatus.remaining_hours)
    const mutedUntil = new Date(muteStatus.muted_until).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })

    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/10">
            <BellOff className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Notifications are muted</p>
            <p className="text-sm text-muted-foreground">
              Until {mutedUntil} (~{remainingHours} hour
              {remainingHours !== 1 ? "s" : ""} remaining)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelMute}
            disabled={isCancellingMute}
          >
            {isCancellingMute ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Unmute"
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-muted/30 border border-border/50 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-muted">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Mute all notifications</p>
          <p className="text-sm text-muted-foreground">
            Temporarily silence all notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedHours} onValueChange={setSelectedHours}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="2">2 hours</SelectItem>
              <SelectItem value="4">4 hours</SelectItem>
              <SelectItem value="8">8 hours</SelectItem>
              <SelectItem value="24">24 hours</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSetMute}
            disabled={isSettingMute}
          >
            {isSettingMute ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Mute"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Email notifications section component (AC12)
 * Displays disabled email toggles with "Coming soon" badge
 */
function EmailNotificationsSection() {
  const emailPreferences = [
    {
      id: "email-assignments",
      label: "Assignment Updates",
      description: "Email when assignments are created or due",
    },
    {
      id: "email-feedback",
      label: "Feedback Notifications",
      description: "Email when you receive feedback",
    },
    {
      id: "email-messages",
      label: "Direct Messages",
      description: "Email when you receive new messages",
    },
  ]

  return (
    <div className="mt-8 pt-6 border-t border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-muted-foreground">
          Email Notifications
        </h4>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Coming soon
        </span>
      </div>
      <div className="opacity-50">
        {emailPreferences.map((pref) => (
          <div
            key={pref.id}
            className="flex items-center justify-between py-4 border-b border-border/50 last:border-0"
          >
            <div className="flex-1 pr-4">
              <Label
                htmlFor={pref.id}
                className="text-sm font-medium cursor-not-allowed"
              >
                {pref.label}
              </Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pref.description}
              </p>
            </div>
            <Switch id={pref.id} checked={false} disabled />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3 italic">
        Email notifications will be available in a future update.
      </p>
    </div>
  )
}

/**
 * Main notification settings component
 */
const NotificationSettings = () => {
  const {
    preferences,
    isLoadingPreferences,
    preferencesError,
    isMuted,
    muteStatus,
    onTogglePreference,
    onSetMute,
    onCancelMute,
    isUpdatingPreference,
    isSettingMute,
    isCancellingMute,
  } = useNotificationSettings()

  if (isLoadingPreferences) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">Manage how you receive notifications</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (preferencesError) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">Manage how you receive notifications</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load notification preferences. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">Manage how you receive notifications</p>
      </div>

      <GlobalMuteSection
        isMuted={isMuted}
        muteStatus={muteStatus}
        onSetMute={onSetMute}
        onCancelMute={onCancelMute}
        isSettingMute={isSettingMute}
        isCancellingMute={isCancellingMute}
      />

      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">In-App Notifications</h4>
        </div>
        <div className={isMuted ? "opacity-50" : ""}>
          {preferences.map((pref) => (
            <PreferenceToggle
              key={pref.notification_type}
              preference={pref}
              onToggle={onTogglePreference}
              isUpdating={isUpdatingPreference}
              disabled={isMuted}
            />
          ))}
        </div>
        {isMuted && (
          <p className="text-xs text-muted-foreground mt-3 italic">
            Individual preferences are disabled while notifications are muted.
          </p>
        )}
      </div>

      <EmailNotificationsSection />
    </div>
  )
}

export default NotificationSettings
