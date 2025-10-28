/**
 * Mock Data for Role-Specific Dashboards
 * Story 2.3: Build 4 Role-Specific Dashboards (Mock Data)
 */

// ============================================================================
// DATE HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a date relative to today
 * @param daysOffset - Number of days from today (negative for past, positive for future)
 * @returns ISO date string
 */
function getRelativeDate(daysOffset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString().split("T")[0]
}

/**
 * Generate a datetime relative to now
 * @param daysOffset - Number of days from now
 * @param hours - Hour of day (0-23)
 * @param minutes - Minute of hour (0-59)
 * @returns ISO datetime string
 */
function getRelativeDateTime(
  daysOffset: number,
  hours: number = 23,
  minutes: number = 59,
): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  date.setHours(hours, minutes, 59, 0)
  return date.toISOString()
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SystemStats {
  totalUsers: number
  totalPublishers: number
  totalTeachers: number
  totalStudents: number
  activeSchools: number
  totalBooks: number
  totalAssignments: number
}

export interface ActivityFeedItem {
  id: string
  user: string
  avatar: string
  action: string
  timestamp: string
}

export interface ChartDataPoint {
  name: string
  value: number
}

export interface School {
  id: string
  name: string
  location: string
  teacherCount: number
  studentCount: number
}

export interface Publisher {
  id: string
  name: string
  email: string
  booksPublished: number
  schoolsServed: number
  joinedDate: string
}

export interface Teacher {
  id: string
  name: string
  email: string
  school: string
  classCount: number
  studentCount: number
}

export interface Book {
  id: string
  title: string
  coverUrl: string
  activityCount: number
  grade: string
}

export interface ClassData {
  id: string
  name: string
  subject: string
  studentCount: number
  averageScore: number
}

export interface Assignment {
  id: string
  name: string
  className: string
  dueDate: string
  completionRate: number
  status: "completed" | "in-progress" | "upcoming"
}

export interface Deadline {
  id: string
  assignmentName: string
  className: string
  dueDate: string
}

export interface AssignmentDue {
  id: string
  name: string
  subject: string
  dueDate: string
  status: "due-today" | "due-week" | "upcoming"
}

export interface ScoreHistory {
  assignmentName: string
  score: number
  date: string
}

export interface Feedback {
  id: string
  assignmentName: string
  teacherName: string
  comment: string
  score: number
  date: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earnedDate: string
}

// ============================================================================
// ADMIN DASHBOARD DATA
// ============================================================================

export const adminDashboardData = {
  stats: {
    totalUsers: 432,
    totalPublishers: 8,
    totalTeachers: 54,
    totalStudents: 356,
    activeSchools: 12,
    totalBooks: 87,
    totalAssignments: 1245,
  } as SystemStats,

  schools: [
    {
      id: "1",
      name: "Lincoln High School",
      location: "San Francisco, CA",
      teacherCount: 12,
      studentCount: 89,
    },
    {
      id: "2",
      name: "Washington Middle School",
      location: "Oakland, CA",
      teacherCount: 8,
      studentCount: 67,
    },
    {
      id: "3",
      name: "Roosevelt Elementary",
      location: "Berkeley, CA",
      teacherCount: 10,
      studentCount: 78,
    },
    {
      id: "4",
      name: "Jefferson Academy",
      location: "San Jose, CA",
      teacherCount: 9,
      studentCount: 54,
    },
    {
      id: "5",
      name: "Madison Prep School",
      location: "Palo Alto, CA",
      teacherCount: 7,
      studentCount: 45,
    },
    {
      id: "6",
      name: "Kennedy Charter School",
      location: "Fremont, CA",
      teacherCount: 8,
      studentCount: 23,
    },
  ] as School[],

  publishers: [
    {
      id: "1",
      name: "EduPress Publishing",
      email: "contact@edupress.com",
      booksPublished: 24,
      schoolsServed: 8,
      joinedDate: getRelativeDate(-320), // ~10.5 months ago
    },
    {
      id: "2",
      name: "Learning Materials Inc",
      email: "info@learningmaterials.com",
      booksPublished: 18,
      schoolsServed: 6,
      joinedDate: getRelativeDate(-250), // ~8 months ago
    },
    {
      id: "3",
      name: "Academic Publishers Co",
      email: "hello@academicpub.com",
      booksPublished: 15,
      schoolsServed: 5,
      joinedDate: getRelativeDate(-200), // ~6.5 months ago
    },
    {
      id: "4",
      name: "SchoolBooks Plus",
      email: "support@schoolbooksplus.com",
      booksPublished: 12,
      schoolsServed: 4,
      joinedDate: getRelativeDate(-160), // ~5 months ago
    },
    {
      id: "5",
      name: "NextGen Education",
      email: "contact@nextgenedu.com",
      booksPublished: 10,
      schoolsServed: 3,
      joinedDate: getRelativeDate(-90), // ~3 months ago
    },
    {
      id: "6",
      name: "Future Learning Press",
      email: "info@futurelearning.com",
      booksPublished: 8,
      schoolsServed: 2,
      joinedDate: getRelativeDate(-45), // ~1.5 months ago
    },
  ] as Publisher[],

  teachers: [
    {
      id: "1",
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@lincoln.edu",
      school: "Lincoln High School",
      classCount: 3,
      studentCount: 84,
    },
    {
      id: "2",
      name: "Michael Chen",
      email: "michael.chen@washington.edu",
      school: "Washington Middle School",
      classCount: 4,
      studentCount: 96,
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      email: "emily.rodriguez@roosevelt.edu",
      school: "Roosevelt Elementary",
      classCount: 2,
      studentCount: 56,
    },
    {
      id: "4",
      name: "David Kim",
      email: "david.kim@jefferson.edu",
      school: "Jefferson Academy",
      classCount: 3,
      studentCount: 72,
    },
    {
      id: "5",
      name: "Lisa Thompson",
      email: "lisa.thompson@madison.edu",
      school: "Madison Prep School",
      classCount: 2,
      studentCount: 48,
    },
  ] as Teacher[],

  activityFeed: [
    {
      id: "1",
      user: "Sarah Johnson",
      avatar: "SJ",
      action: "created a new assignment in Math 101",
      timestamp: "5 minutes ago",
    },
    {
      id: "2",
      user: "Michael Chen",
      avatar: "MC",
      action: "added 24 students to Science Advanced",
      timestamp: "12 minutes ago",
    },
    {
      id: "3",
      user: "Emily Rodriguez",
      avatar: "ER",
      action: 'published new book "Grammar Essentials"',
      timestamp: "1 hour ago",
    },
    {
      id: "4",
      user: "David Kim",
      avatar: "DK",
      action: "completed assignment with 95% score",
      timestamp: "2 hours ago",
    },
    {
      id: "5",
      user: "Lisa Thompson",
      avatar: "LT",
      action: 'created a new school "Lincoln High"',
      timestamp: "3 hours ago",
    },
    {
      id: "6",
      user: "James Wilson",
      avatar: "JW",
      action: "updated teacher permissions",
      timestamp: "4 hours ago",
    },
    {
      id: "7",
      user: "Anna Martinez",
      avatar: "AM",
      action: "assigned book to 3 classes",
      timestamp: "5 hours ago",
    },
  ] as ActivityFeedItem[],

  userGrowth: [
    { name: "May", value: 245 },
    { name: "Jun", value: 289 },
    { name: "Jul", value: 324 },
    { name: "Aug", value: 367 },
    { name: "Sep", value: 398 },
    { name: "Oct", value: 432 },
  ] as ChartDataPoint[],

  activityByType: [
    { name: "Assignments", value: 1245 },
    { name: "Students", value: 356 },
    { name: "Teachers", value: 54 },
    { name: "Books", value: 87 },
    { name: "Classes", value: 42 },
    { name: "Schools", value: 12 },
  ] as ChartDataPoint[],
}

// ============================================================================
// PUBLISHER DASHBOARD DATA
// ============================================================================

export const publisherDashboardData = {
  schools: [
    {
      id: "1",
      name: "Lincoln High School",
      location: "San Francisco, CA",
      teacherCount: 12,
      studentCount: 345,
    },
    {
      id: "2",
      name: "Washington Middle School",
      location: "Oakland, CA",
      teacherCount: 8,
      studentCount: 234,
    },
    {
      id: "3",
      name: "Roosevelt Elementary",
      location: "Berkeley, CA",
      teacherCount: 6,
      studentCount: 189,
    },
    {
      id: "4",
      name: "Jefferson Academy",
      location: "San Jose, CA",
      teacherCount: 10,
      studentCount: 289,
    },
    {
      id: "5",
      name: "Madison Prep School",
      location: "Palo Alto, CA",
      teacherCount: 7,
      studentCount: 156,
    },
  ] as School[],

  books: [
    {
      id: "1",
      title: "Grammar Essentials",
      coverUrl: "https://picsum.photos/seed/book1/200/300",
      activityCount: 24,
      grade: "6-8",
    },
    {
      id: "2",
      title: "Math Adventures",
      coverUrl: "https://picsum.photos/seed/book2/200/300",
      activityCount: 32,
      grade: "5-7",
    },
    {
      id: "3",
      title: "Science Explorers",
      coverUrl: "https://picsum.photos/seed/book3/200/300",
      activityCount: 28,
      grade: "7-9",
    },
    {
      id: "4",
      title: "Reading Comprehension Pro",
      coverUrl: "https://picsum.photos/seed/book4/200/300",
      activityCount: 36,
      grade: "4-6",
    },
    {
      id: "5",
      title: "History Through Time",
      coverUrl: "https://picsum.photos/seed/book5/200/300",
      activityCount: 22,
      grade: "8-10",
    },
    {
      id: "6",
      title: "Creative Writing Workshop",
      coverUrl: "https://picsum.photos/seed/book6/200/300",
      activityCount: 18,
      grade: "6-8",
    },
    {
      id: "7",
      title: "Physics Fundamentals",
      coverUrl: "https://picsum.photos/seed/book7/200/300",
      activityCount: 26,
      grade: "9-11",
    },
    {
      id: "8",
      title: "Spanish for Beginners",
      coverUrl: "https://picsum.photos/seed/book8/200/300",
      activityCount: 30,
      grade: "6-9",
    },
  ] as Book[],

  stats: {
    totalSchools: 5,
    totalBooks: 8,
    teachersCreated: 23,
  },
}

// ============================================================================
// TEACHER DASHBOARD DATA
// ============================================================================

export const teacherDashboardData = {
  classes: [
    {
      id: "1",
      name: "Math 101",
      subject: "Mathematics",
      studentCount: 28,
      averageScore: 87,
    },
    {
      id: "2",
      name: "Science Advanced",
      subject: "Science",
      studentCount: 24,
      averageScore: 92,
    },
    {
      id: "3",
      name: "English Literature",
      subject: "English",
      studentCount: 30,
      averageScore: 85,
    },
  ] as ClassData[],

  assignments: [
    {
      id: "1",
      name: "Algebra Quiz #3",
      className: "Math 101",
      dueDate: getRelativeDate(7), // 1 week from now
      completionRate: 89,
      status: "in-progress" as const,
    },
    {
      id: "2",
      name: "Chemistry Lab Report",
      className: "Science Advanced",
      dueDate: getRelativeDate(10), // 10 days from now
      completionRate: 67,
      status: "in-progress" as const,
    },
    {
      id: "3",
      name: "Shakespeare Essay",
      className: "English Literature",
      dueDate: getRelativeDate(12), // 12 days from now
      completionRate: 45,
      status: "upcoming" as const,
    },
    {
      id: "4",
      name: "Geometry Practice",
      className: "Math 101",
      dueDate: getRelativeDate(-3), // 3 days ago
      completionRate: 100,
      status: "completed" as const,
    },
    {
      id: "5",
      name: "Biology Chapter Test",
      className: "Science Advanced",
      dueDate: getRelativeDate(-1), // yesterday
      completionRate: 96,
      status: "completed" as const,
    },
  ] as Assignment[],

  upcomingDeadlines: [
    {
      id: "1",
      assignmentName: "Algebra Quiz #3",
      className: "Math 101",
      dueDate: getRelativeDateTime(7), // 1 week from now
    },
    {
      id: "2",
      assignmentName: "Chemistry Lab Report",
      className: "Science Advanced",
      dueDate: getRelativeDateTime(10), // 10 days from now
    },
    {
      id: "3",
      assignmentName: "Shakespeare Essay",
      className: "English Literature",
      dueDate: getRelativeDateTime(12), // 12 days from now
    },
  ] as Deadline[],

  classPerformance: [
    { name: "Math 101", value: 87 },
    { name: "Science Advanced", value: 92 },
    { name: "English Literature", value: 85 },
  ] as ChartDataPoint[],

  completionTrend: [
    { name: "Week 1", value: 78 },
    { name: "Week 2", value: 82 },
    { name: "Week 3", value: 85 },
    { name: "Week 4", value: 88 },
  ] as ChartDataPoint[],
}

// ============================================================================
// STUDENT DASHBOARD DATA
// ============================================================================

export const studentDashboardData = {
  assignmentsDue: [
    {
      id: "1",
      name: "Algebra Quiz #3",
      subject: "Mathematics",
      dueDate: getRelativeDateTime(0, 14, 30), // today at 2:30 PM
      status: "due-today" as const,
    },
    {
      id: "2",
      name: "Chemistry Lab Report",
      subject: "Science",
      dueDate: getRelativeDateTime(1), // tomorrow at 11:59 PM
      status: "due-week" as const,
    },
    {
      id: "3",
      name: "Shakespeare Essay",
      subject: "English",
      dueDate: getRelativeDateTime(4), // 4 days from now
      status: "due-week" as const,
    },
    {
      id: "4",
      name: "History Presentation",
      subject: "History",
      dueDate: getRelativeDateTime(10, 10, 0), // 10 days from now at 10:00 AM
      status: "upcoming" as const,
    },
  ] as AssignmentDue[],

  scoreHistory: [
    { assignmentName: "Quiz 1", score: 85, date: getRelativeDate(-23) }, // ~3 weeks ago
    { assignmentName: "Essay 1", score: 88, date: getRelativeDate(-18) },
    { assignmentName: "Lab 1", score: 92, date: getRelativeDate(-13) },
    { assignmentName: "Quiz 2", score: 78, date: getRelativeDate(-10) },
    { assignmentName: "Project", score: 95, date: getRelativeDate(-6) },
    { assignmentName: "Test 1", score: 87, date: getRelativeDate(-3) },
    { assignmentName: "Lab 2", score: 90, date: getRelativeDate(-1) }, // yesterday
  ] as ScoreHistory[],

  recentFeedback: [
    {
      id: "1",
      assignmentName: "Lab 2: Chemical Reactions",
      teacherName: "Dr. Smith",
      comment:
        "Excellent work on the lab report! Your analysis was thorough and well-documented.",
      score: 90,
      date: getRelativeDate(-1), // yesterday
    },
    {
      id: "2",
      assignmentName: "Test 1: World History",
      teacherName: "Ms. Johnson",
      comment:
        "Good understanding of the material. Review your notes on the Renaissance period.",
      score: 87,
      date: getRelativeDate(-3), // 3 days ago
    },
    {
      id: "3",
      assignmentName: "Project: Ecosystem Analysis",
      teacherName: "Dr. Smith",
      comment:
        "Outstanding presentation! Your visual aids were excellent and clearly explained.",
      score: 95,
      date: getRelativeDate(-6), // 6 days ago
    },
  ] as Feedback[],

  achievements: [
    {
      id: "1",
      title: "Perfect Score",
      description: "Achieved 100% on an assignment",
      icon: "🏆",
      earnedDate: getRelativeDate(-13), // ~2 weeks ago
    },
    {
      id: "2",
      title: "Speed Demon",
      description: "Completed 5 assignments ahead of schedule",
      icon: "⚡",
      earnedDate: getRelativeDate(-8),
    },
    {
      id: "3",
      title: "Consistent Performer",
      description: "Maintained 85%+ average for 4 weeks",
      icon: "📈",
      earnedDate: getRelativeDate(-3),
    },
    {
      id: "4",
      title: "Team Player",
      description: "Helped 3 classmates with assignments",
      icon: "🤝",
      earnedDate: getRelativeDate(-10),
    },
    {
      id: "5",
      title: "Early Bird",
      description: "Submitted all assignments before deadline for 2 weeks",
      icon: "🐦",
      earnedDate: getRelativeDate(-16),
    },
    {
      id: "6",
      title: "Science Star",
      description: "Scored 90%+ on all science assignments",
      icon: "🔬",
      earnedDate: getRelativeDate(-1), // yesterday
    },
  ] as Achievement[],

  stats: {
    averageScore: 88,
    completedAssignments: 24,
    upcomingAssignments: 4,
  },
}
