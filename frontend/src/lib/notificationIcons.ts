/**
 * Notification Icon Mapping Utility
 * Story 6.1: Notification System Foundation
 *
 * Maps notification types to Lucide React icons and colors.
 */

import type { LucideIcon } from "lucide-react"
import {
  Bell,
  FileText,
  Clock,
  MessageSquare,
  Mail,
  CheckCircle,
  AlertTriangle,
  Share2,
} from "lucide-react"
import type { NotificationType } from "@/types/notification"

/**
 * Icon configuration for a notification type
 */
export interface NotificationIconConfig {
  icon: LucideIcon
  color: string
  bgColor: string
}

/**
 * Mapping of notification types to icon configurations
 */
export const NOTIFICATION_ICON_MAP: Record<NotificationType, NotificationIconConfig> = {
  assignment_created: {
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  deadline_approaching: {
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  feedback_received: {
    icon: MessageSquare,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  message_received: {
    icon: Mail,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  student_completed: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  past_due: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  material_shared: {
    icon: Share2,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  system_announcement: {
    icon: Bell,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
}

/**
 * Get the icon configuration for a notification type
 *
 * @param type - The notification type
 * @returns The icon configuration with icon component and colors
 */
export function getNotificationIconConfig(
  type: NotificationType
): NotificationIconConfig {
  return NOTIFICATION_ICON_MAP[type] ?? NOTIFICATION_ICON_MAP.system_announcement
}

/**
 * Get just the icon component for a notification type
 *
 * @param type - The notification type
 * @returns The Lucide icon component
 */
export function getNotificationIcon(type: NotificationType): LucideIcon {
  return getNotificationIconConfig(type).icon
}

/**
 * Get the icon color class for a notification type
 *
 * @param type - The notification type
 * @returns Tailwind CSS color class
 */
export function getNotificationIconColor(type: NotificationType): string {
  return getNotificationIconConfig(type).color
}

/**
 * Get the background color class for a notification type
 *
 * @param type - The notification type
 * @returns Tailwind CSS background color class
 */
export function getNotificationBgColor(type: NotificationType): string {
  return getNotificationIconConfig(type).bgColor
}
