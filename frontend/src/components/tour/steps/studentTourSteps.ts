/**
 * Student Tour Step Definitions
 * 5 steps guiding students through Dream LMS key features
 */

import type { TourStep } from "@/types/tour"

export const studentTourSteps: TourStep[] = [
  {
    target: "body",
    title: "Welcome to Dream LMS!",
    content:
      "Let's take a quick tour to help you get started with your learning journey.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-dashboard"]',
    title: "Your Dashboard",
    content:
      "This is your home page. See your upcoming assignments and recent activity at a glance.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-assignments"]',
    title: "Your Assignments",
    content:
      "View and complete assignments from your teachers. You'll see due dates and your progress here.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-progress"]',
    title: "Track Your Progress",
    content:
      "Monitor your learning journey. See completed activities, scores, and achievements.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="navbar-messages"]',
    title: "Messages",
    content:
      "Communicate with your teachers. Ask questions or get feedback on your work. You're ready to start learning!",
    placement: "bottom",
    disableBeacon: true,
  },
]
