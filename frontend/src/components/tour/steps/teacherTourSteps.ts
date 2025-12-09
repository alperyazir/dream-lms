/**
 * Teacher Tour Step Definitions
 * 7 steps guiding teachers through Dream LMS key features
 */

import type { TourStep } from "@/types/tour"

export const teacherTourSteps: TourStep[] = [
  {
    target: "body",
    title: "Welcome to Dream LMS!",
    content:
      "Let's take a quick tour to help you get started with managing your classes and assignments.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-dashboard"]',
    title: "Your Dashboard",
    content:
      "This is your home base. View an overview of your classes, upcoming assignments, and recent student activity.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-library"]',
    title: "Book Library",
    content:
      "Browse and preview books from your publisher. Find activities to assign to your students.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-assignments"]',
    title: "Assignments",
    content:
      "Create and manage assignments for your students. Track due dates, completion status, and grades.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-insights"]',
    title: "Student Insights",
    content:
      "View detailed analytics on student progress. Identify who needs help and celebrate achievements.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="navbar-messages"]',
    title: "Messages",
    content:
      "Communicate with your students directly. Send announcements or respond to questions.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tour="user-menu"]',
    title: "Your Profile & Settings",
    content:
      "Click here to access your profile, settings, and notification preferences. You're all set to start teaching!",
    placement: "bottom",
    disableBeacon: true,
  },
]
