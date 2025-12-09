/**
 * Publisher Tour Step Definitions
 * 5 steps guiding publishers through Dream LMS key features
 */

import type { TourStep } from "@/types/tour"

export const publisherTourSteps: TourStep[] = [
  {
    target: "body",
    title: "Welcome to Dream LMS!",
    content:
      "Let's take a quick tour to help you get started with managing your educational content.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-dashboard"]',
    title: "Your Dashboard",
    content:
      "This is your command center. View adoption metrics, active schools, and content performance.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-library"]',
    title: "Book Library",
    content:
      "Manage your books and educational content. Upload new materials and organize your catalog.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-schools"]',
    title: "Schools",
    content:
      "View and manage schools using your content. Assign books to schools and track adoption.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-teachers"]',
    title: "Teachers",
    content:
      "See which teachers are using your materials. Monitor engagement and provide support. You're all set!",
    placement: "right",
    disableBeacon: true,
  },
]
