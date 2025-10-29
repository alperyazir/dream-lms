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
  publisher: string
  publisherId: string
  coverUrl: string
  description: string
  grade: string // e.g., "K", "1", "2-3", "4-5", "6-8"
  activityCount: number
  created_at: string
}

export interface Activity {
  id: string
  bookId: string
  dream_activity_id: string
  title: string
  activityType:
    | "dragdroppicture"
    | "dragdroppicturegroup"
    | "matchTheWords"
    | "circle"
    | "markwithx"
    | "puzzleFindWords"
  order_index: number
  duration_minutes?: number
}

export interface AssignmentFull {
  id: string
  teacherId: string
  activityId: string
  bookId: string
  name: string
  instructions: string
  due_date: string // ISO datetime
  time_limit_minutes?: number
  created_at: string
  completionRate: number // 0-100 percentage
}

export interface AssignmentStudent {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  status: "not_started" | "in_progress" | "completed"
  score?: number // 0-100 percentage
  started_at?: string
  completed_at?: string
  time_spent_minutes?: number
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
      publisher: "EduPress Publishing",
      publisherId: "1",
      coverUrl: "https://picsum.photos/seed/book1/200/300",
      description: "Master grammar fundamentals with engaging activities",
      activityCount: 24,
      grade: "6-8",
      created_at: getRelativeDate(-120),
    },
    {
      id: "2",
      title: "Math Adventures",
      publisher: "Learning Materials Inc",
      publisherId: "2",
      coverUrl: "https://picsum.photos/seed/book2/200/300",
      description: "Make math fun with interactive problem-solving exercises",
      activityCount: 32,
      grade: "5-7",
      created_at: getRelativeDate(-95),
    },
    {
      id: "3",
      title: "Science Explorers",
      publisher: "Academic Publishers Co",
      publisherId: "3",
      coverUrl: "https://picsum.photos/seed/book3/200/300",
      description: "Discover the wonders of science through hands-on activities",
      activityCount: 28,
      grade: "7-9",
      created_at: getRelativeDate(-80),
    },
    {
      id: "4",
      title: "Reading Comprehension Pro",
      publisher: "SchoolBooks Plus",
      publisherId: "4",
      coverUrl: "https://picsum.photos/seed/book4/200/300",
      description: "Build strong reading skills with engaging passages",
      activityCount: 36,
      grade: "4-6",
      created_at: getRelativeDate(-65),
    },
    {
      id: "5",
      title: "History Through Time",
      publisher: "NextGen Education",
      publisherId: "5",
      coverUrl: "https://picsum.photos/seed/book5/200/300",
      description: "Journey through history with interactive timelines",
      activityCount: 22,
      grade: "8-10",
      created_at: getRelativeDate(-50),
    },
    {
      id: "6",
      title: "Creative Writing Workshop",
      publisher: "Future Learning Press",
      publisherId: "6",
      coverUrl: "https://picsum.photos/seed/book6/200/300",
      description: "Unleash creativity with guided writing exercises",
      activityCount: 18,
      grade: "6-8",
      created_at: getRelativeDate(-35),
    },
    {
      id: "7",
      title: "Physics Fundamentals",
      publisher: "EduPress Publishing",
      publisherId: "1",
      coverUrl: "https://picsum.photos/seed/book7/200/300",
      description: "Explore the laws of physics with practical experiments",
      activityCount: 26,
      grade: "9-11",
      created_at: getRelativeDate(-20),
    },
    {
      id: "8",
      title: "Spanish for Beginners",
      publisher: "Learning Materials Inc",
      publisherId: "2",
      coverUrl: "https://picsum.photos/seed/book8/200/300",
      description: "Learn Spanish through immersive activities",
      activityCount: 30,
      grade: "6-9",
      created_at: getRelativeDate(-10),
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

// ============================================================================
// BOOKS & ASSIGNMENTS DATA (Story 2.4)
// ============================================================================

/**
 * Mock Books - 12 books across different grades and publishers
 */
export const mockBooks: Book[] = [
  {
    id: "1",
    title: "Grammar Essentials",
    publisher: "EduPress Publishing",
    publisherId: "1",
    coverUrl: "https://picsum.photos/seed/book1/200/300",
    description: "Master grammar fundamentals with engaging activities",
    activityCount: 2,
    grade: "6-8",
    created_at: getRelativeDate(-120),
  },
  {
    id: "2",
    title: "Math Adventures",
    publisher: "Learning Materials Inc",
    publisherId: "2",
    coverUrl: "https://picsum.photos/seed/book2/200/300",
    description: "Make math fun with interactive problem-solving exercises",
    activityCount: 2,
    grade: "5-7",
    created_at: getRelativeDate(-95),
  },
  {
    id: "3",
    title: "Science Explorers",
    publisher: "Academic Publishers Co",
    publisherId: "3",
    coverUrl: "https://picsum.photos/seed/book3/200/300",
    description: "Discover the wonders of science through hands-on activities",
    activityCount: 2,
    grade: "7-9",
    created_at: getRelativeDate(-80),
  },
  {
    id: "4",
    title: "Reading Comprehension Pro",
    publisher: "SchoolBooks Plus",
    publisherId: "4",
    coverUrl: "https://picsum.photos/seed/book4/200/300",
    description: "Build strong reading skills with engaging passages",
    activityCount: 2,
    grade: "4-6",
    created_at: getRelativeDate(-65),
  },
  {
    id: "5",
    title: "History Through Time",
    publisher: "NextGen Education",
    publisherId: "5",
    coverUrl: "https://picsum.photos/seed/book5/200/300",
    description: "Journey through history with interactive timelines",
    activityCount: 2,
    grade: "8-10",
    created_at: getRelativeDate(-50),
  },
  {
    id: "6",
    title: "Creative Writing Workshop",
    publisher: "Future Learning Press",
    publisherId: "6",
    coverUrl: "https://picsum.photos/seed/book6/200/300",
    description: "Unleash creativity with guided writing exercises",
    activityCount: 2,
    grade: "6-8",
    created_at: getRelativeDate(-35),
  },
  {
    id: "7",
    title: "Physics Fundamentals",
    publisher: "EduPress Publishing",
    publisherId: "1",
    coverUrl: "https://picsum.photos/seed/book7/200/300",
    description: "Explore the laws of physics with practical experiments",
    activityCount: 2,
    grade: "9-11",
    created_at: getRelativeDate(-20),
  },
  {
    id: "8",
    title: "Spanish for Beginners",
    publisher: "Learning Materials Inc",
    publisherId: "2",
    coverUrl: "https://picsum.photos/seed/book8/200/300",
    description: "Learn Spanish through immersive activities",
    activityCount: 2,
    grade: "6-9",
    created_at: getRelativeDate(-10),
  },
  {
    id: "9",
    title: "Kindergarten Basics",
    publisher: "Academic Publishers Co",
    publisherId: "3",
    coverUrl: "https://picsum.photos/seed/book9/200/300",
    description: "Essential skills for young learners",
    activityCount: 2,
    grade: "K",
    created_at: getRelativeDate(-150),
  },
  {
    id: "10",
    title: "First Grade Fun",
    publisher: "SchoolBooks Plus",
    publisherId: "4",
    coverUrl: "https://picsum.photos/seed/book10/200/300",
    description: "Engaging activities for first graders",
    activityCount: 2,
    grade: "1",
    created_at: getRelativeDate(-140),
  },
  {
    id: "11",
    title: "Second Grade Skills",
    publisher: "NextGen Education",
    publisherId: "5",
    coverUrl: "https://picsum.photos/seed/book11/200/300",
    description: "Build foundation skills with fun exercises",
    activityCount: 2,
    grade: "2-3",
    created_at: getRelativeDate(-130),
  },
  {
    id: "12",
    title: "Third Grade Mastery",
    publisher: "Future Learning Press",
    publisherId: "6",
    coverUrl: "https://picsum.photos/seed/book12/200/300",
    description: "Master key concepts for third grade success",
    activityCount: 2,
    grade: "2-3",
    created_at: getRelativeDate(-110),
  },
]

/**
 * Mock Activities - 20 activities across all 6 activity types
 */
export const mockActivities: Activity[] = [
  // Book 1 - Grammar Essentials
  {
    id: "1",
    bookId: "1",
    dream_activity_id: "act_grammar_001",
    title: "Parts of Speech Matching",
    activityType: "matchTheWords",
    order_index: 1,
    duration_minutes: 15,
  },
  {
    id: "2",
    bookId: "1",
    dream_activity_id: "act_grammar_002",
    title: "Grammar Circle Exercise",
    activityType: "circle",
    order_index: 2,
    duration_minutes: 20,
  },
  // Book 2 - Math Adventures
  {
    id: "3",
    bookId: "2",
    dream_activity_id: "act_math_001",
    title: "Number Drag and Drop",
    activityType: "dragdroppicture",
    order_index: 1,
    duration_minutes: 25,
  },
  {
    id: "4",
    bookId: "2",
    dream_activity_id: "act_math_002",
    title: "Shape Sorting Groups",
    activityType: "dragdroppicturegroup",
    order_index: 2,
    duration_minutes: 30,
  },
  // Book 3 - Science Explorers
  {
    id: "5",
    bookId: "3",
    dream_activity_id: "act_science_001",
    title: "Mark the Correct Answer",
    activityType: "markwithx",
    order_index: 1,
    duration_minutes: 15,
  },
  {
    id: "6",
    bookId: "3",
    dream_activity_id: "act_science_002",
    title: "Science Word Search",
    activityType: "puzzleFindWords",
    order_index: 2,
    duration_minutes: 20,
  },
  // Book 4 - Reading Comprehension Pro
  {
    id: "7",
    bookId: "4",
    dream_activity_id: "act_reading_001",
    title: "Story Element Matching",
    activityType: "matchTheWords",
    order_index: 1,
    duration_minutes: 20,
  },
  {
    id: "8",
    bookId: "4",
    dream_activity_id: "act_reading_002",
    title: "Character Drag Drop",
    activityType: "dragdroppicture",
    order_index: 2,
    duration_minutes: 25,
  },
  // Book 5 - History Through Time
  {
    id: "9",
    bookId: "5",
    dream_activity_id: "act_history_001",
    title: "Timeline Circle Events",
    activityType: "circle",
    order_index: 1,
    duration_minutes: 18,
  },
  {
    id: "10",
    bookId: "5",
    dream_activity_id: "act_history_002",
    title: "Historical Figures Match",
    activityType: "matchTheWords",
    order_index: 2,
    duration_minutes: 22,
  },
  // Book 6 - Creative Writing Workshop
  {
    id: "11",
    bookId: "6",
    dream_activity_id: "act_writing_001",
    title: "Story Elements Sorting",
    activityType: "dragdroppicturegroup",
    order_index: 1,
    duration_minutes: 28,
  },
  {
    id: "12",
    bookId: "6",
    dream_activity_id: "act_writing_002",
    title: "Vocabulary Word Search",
    activityType: "puzzleFindWords",
    order_index: 2,
    duration_minutes: 20,
  },
  // Book 7 - Physics Fundamentals
  {
    id: "13",
    bookId: "7",
    dream_activity_id: "act_physics_001",
    title: "Force and Motion Mark",
    activityType: "markwithx",
    order_index: 1,
    duration_minutes: 25,
  },
  {
    id: "14",
    bookId: "7",
    dream_activity_id: "act_physics_002",
    title: "Physics Terms Circle",
    activityType: "circle",
    order_index: 2,
    duration_minutes: 20,
  },
  // Book 8 - Spanish for Beginners
  {
    id: "15",
    bookId: "8",
    dream_activity_id: "act_spanish_001",
    title: "Spanish Vocabulary Match",
    activityType: "matchTheWords",
    order_index: 1,
    duration_minutes: 18,
  },
  {
    id: "16",
    bookId: "8",
    dream_activity_id: "act_spanish_002",
    title: "Spanish Words Puzzle",
    activityType: "puzzleFindWords",
    order_index: 2,
    duration_minutes: 22,
  },
  // Book 9 - Kindergarten Basics
  {
    id: "17",
    bookId: "9",
    dream_activity_id: "act_kinder_001",
    title: "Letter Drag and Drop",
    activityType: "dragdroppicture",
    order_index: 1,
    duration_minutes: 10,
  },
  {
    id: "18",
    bookId: "9",
    dream_activity_id: "act_kinder_002",
    title: "Color Sorting Groups",
    activityType: "dragdroppicturegroup",
    order_index: 2,
    duration_minutes: 15,
  },
  // Book 10 - First Grade Fun
  {
    id: "19",
    bookId: "10",
    dream_activity_id: "act_first_001",
    title: "Sight Words Match",
    activityType: "matchTheWords",
    order_index: 1,
    duration_minutes: 12,
  },
  {
    id: "20",
    bookId: "10",
    dream_activity_id: "act_first_002",
    title: "Number Circle Practice",
    activityType: "circle",
    order_index: 2,
    duration_minutes: 15,
  },
]

/**
 * Mock Students - For assignment wizard selection
 */
export const mockStudents = [
  { id: "1", name: "Alex Johnson", email: "alex.j@school.edu" },
  { id: "2", name: "Maria Garcia", email: "maria.g@school.edu" },
  { id: "3", name: "James Wilson", email: "james.w@school.edu" },
  { id: "4", name: "Emily Chen", email: "emily.c@school.edu" },
  { id: "5", name: "Michael Brown", email: "michael.b@school.edu" },
  { id: "6", name: "Sarah Davis", email: "sarah.d@school.edu" },
  { id: "7", name: "David Martinez", email: "david.m@school.edu" },
  { id: "8", name: "Lisa Anderson", email: "lisa.a@school.edu" },
  { id: "9", name: "Robert Taylor", email: "robert.t@school.edu" },
  { id: "10", name: "Jennifer Lee", email: "jennifer.l@school.edu" },
]

/**
 * Mock Classes - For assignment wizard selection
 */
export const mockClasses = [
  { id: "1", name: "Math 101", studentCount: 28 },
  { id: "2", name: "Science Advanced", studentCount: 24 },
  { id: "3", name: "English Literature", studentCount: 30 },
]

/**
 * Mock Assignments - 15 assignments with varied statuses
 */
export const mockAssignments: AssignmentFull[] = [
  {
    id: "1",
    teacherId: "1",
    activityId: "1",
    bookId: "1",
    name: "Grammar Parts of Speech",
    instructions: "Complete the matching exercise for all parts of speech",
    due_date: getRelativeDateTime(7),
    time_limit_minutes: 30,
    created_at: getRelativeDate(-2),
    completionRate: 75,
  },
  {
    id: "2",
    teacherId: "1",
    activityId: "3",
    bookId: "2",
    name: "Math Number Practice",
    instructions: "Drag and drop numbers to the correct positions",
    due_date: getRelativeDateTime(5),
    time_limit_minutes: 45,
    created_at: getRelativeDate(-1),
    completionRate: 60,
  },
  {
    id: "3",
    teacherId: "1",
    activityId: "5",
    bookId: "3",
    name: "Science Quiz Week 4",
    instructions: "Mark the correct answers for all science questions",
    due_date: getRelativeDateTime(10),
    time_limit_minutes: 40,
    created_at: getRelativeDate(-5),
    completionRate: 45,
  },
  {
    id: "4",
    teacherId: "1",
    activityId: "7",
    bookId: "4",
    name: "Reading Story Elements",
    instructions: "Match each story element to its example",
    due_date: getRelativeDateTime(14),
    time_limit_minutes: 35,
    created_at: getRelativeDate(-3),
    completionRate: 30,
  },
  {
    id: "5",
    teacherId: "1",
    activityId: "9",
    bookId: "5",
    name: "History Timeline Activity",
    instructions: "Circle all events that occurred in the 18th century",
    due_date: getRelativeDateTime(21),
    time_limit_minutes: 50,
    created_at: getRelativeDate(-7),
    completionRate: 15,
  },
  {
    id: "6",
    teacherId: "1",
    activityId: "2",
    bookId: "1",
    name: "Grammar Circle Exercise",
    instructions: "Complete the grammar circle exercise",
    due_date: getRelativeDateTime(-2),
    time_limit_minutes: 30,
    created_at: getRelativeDate(-10),
    completionRate: 100,
  },
  {
    id: "7",
    teacherId: "1",
    activityId: "4",
    bookId: "2",
    name: "Shape Sorting Assignment",
    instructions: "Sort shapes into the correct groups",
    due_date: getRelativeDateTime(-5),
    time_limit_minutes: 40,
    created_at: getRelativeDate(-15),
    completionRate: 100,
  },
  {
    id: "8",
    teacherId: "1",
    activityId: "6",
    bookId: "3",
    name: "Science Word Search",
    instructions: "Find all science vocabulary words",
    due_date: getRelativeDateTime(-8),
    time_limit_minutes: 35,
    created_at: getRelativeDate(-20),
    completionRate: 100,
  },
  {
    id: "9",
    teacherId: "1",
    activityId: "11",
    bookId: "6",
    name: "Creative Writing Elements",
    instructions: "Sort story elements into their categories",
    due_date: getRelativeDateTime(3),
    time_limit_minutes: 45,
    created_at: getRelativeDate(-1),
    completionRate: 80,
  },
  {
    id: "10",
    teacherId: "1",
    activityId: "13",
    bookId: "7",
    name: "Physics Force Quiz",
    instructions: "Mark the correct answers about force and motion",
    due_date: getRelativeDateTime(6),
    time_limit_minutes: 50,
    created_at: getRelativeDate(-4),
    completionRate: 65,
  },
  {
    id: "11",
    teacherId: "1",
    activityId: "15",
    bookId: "8",
    name: "Spanish Vocabulary Test",
    instructions: "Match Spanish words with their English translations",
    due_date: getRelativeDateTime(8),
    time_limit_minutes: 30,
    created_at: getRelativeDate(-2),
    completionRate: 55,
  },
  {
    id: "12",
    teacherId: "1",
    activityId: "17",
    bookId: "9",
    name: "Letter Recognition",
    instructions: "Drag letters to the correct positions",
    due_date: getRelativeDateTime(2),
    time_limit_minutes: 20,
    created_at: getRelativeDate(-1),
    completionRate: 85,
  },
  {
    id: "13",
    teacherId: "1",
    activityId: "19",
    bookId: "10",
    name: "Sight Words Practice",
    instructions: "Match sight words to their pictures",
    due_date: getRelativeDateTime(4),
    time_limit_minutes: 25,
    created_at: getRelativeDate(-3),
    completionRate: 70,
  },
  {
    id: "14",
    teacherId: "1",
    activityId: "10",
    bookId: "5",
    name: "Historical Figures Match",
    instructions: "Match historical figures to their achievements",
    due_date: getRelativeDateTime(12),
    time_limit_minutes: 40,
    created_at: getRelativeDate(-6),
    completionRate: 40,
  },
  {
    id: "15",
    teacherId: "1",
    activityId: "12",
    bookId: "6",
    name: "Vocabulary Word Search",
    instructions: "Find all vocabulary words in the puzzle",
    due_date: getRelativeDateTime(15),
    time_limit_minutes: 35,
    created_at: getRelativeDate(-8),
    completionRate: 25,
  },
]

/**
 * Mock Assignment Students - Student progress on assignments
 */
export const mockAssignmentStudents: AssignmentStudent[] = [
  // Assignment 1 - 75% completion (7.5/10 students)
  {
    id: "1",
    assignmentId: "1",
    studentId: "1",
    studentName: "Alex Johnson",
    status: "completed",
    score: 92,
    started_at: getRelativeDateTime(-1, 14, 30),
    completed_at: getRelativeDateTime(-1, 15, 0),
    time_spent_minutes: 28,
  },
  {
    id: "2",
    assignmentId: "1",
    studentId: "2",
    studentName: "Maria Garcia",
    status: "completed",
    score: 88,
    started_at: getRelativeDateTime(-1, 15, 0),
    completed_at: getRelativeDateTime(-1, 15, 25),
    time_spent_minutes: 25,
  },
  {
    id: "3",
    assignmentId: "1",
    studentId: "3",
    studentName: "James Wilson",
    status: "completed",
    score: 95,
    started_at: getRelativeDateTime(-1, 16, 0),
    completed_at: getRelativeDateTime(-1, 16, 22),
    time_spent_minutes: 22,
  },
  {
    id: "4",
    assignmentId: "1",
    studentId: "4",
    studentName: "Emily Chen",
    status: "in_progress",
    started_at: getRelativeDateTime(0, 10, 0),
  },
  {
    id: "5",
    assignmentId: "1",
    studentId: "5",
    studentName: "Michael Brown",
    status: "completed",
    score: 85,
    started_at: getRelativeDateTime(-1, 17, 0),
    completed_at: getRelativeDateTime(-1, 17, 30),
    time_spent_minutes: 30,
  },
  {
    id: "6",
    assignmentId: "1",
    studentId: "6",
    studentName: "Sarah Davis",
    status: "completed",
    score: 90,
    started_at: getRelativeDateTime(-1, 18, 0),
    completed_at: getRelativeDateTime(-1, 18, 27),
    time_spent_minutes: 27,
  },
  {
    id: "7",
    assignmentId: "1",
    studentId: "7",
    studentName: "David Martinez",
    status: "completed",
    score: 78,
    started_at: getRelativeDateTime(-1, 19, 0),
    completed_at: getRelativeDateTime(-1, 19, 29),
    time_spent_minutes: 29,
  },
  {
    id: "8",
    assignmentId: "1",
    studentId: "8",
    studentName: "Lisa Anderson",
    status: "not_started",
  },
  {
    id: "9",
    assignmentId: "1",
    studentId: "9",
    studentName: "Robert Taylor",
    status: "completed",
    score: 82,
    started_at: getRelativeDateTime(-1, 20, 0),
    completed_at: getRelativeDateTime(-1, 20, 26),
    time_spent_minutes: 26,
  },
  {
    id: "10",
    assignmentId: "1",
    studentId: "10",
    studentName: "Jennifer Lee",
    status: "not_started",
  },
  // Assignment 12 - 85% completion (for student dashboard tests)
  {
    id: "121",
    assignmentId: "12",
    studentId: "1",
    studentName: "Alex Johnson",
    status: "not_started",
  },
  {
    id: "122",
    assignmentId: "12",
    studentId: "2",
    studentName: "Maria Garcia",
    status: "in_progress",
    started_at: getRelativeDateTime(0, 9, 0),
  },
  // Assignment 6 - Past due, completed
  {
    id: "61",
    assignmentId: "6",
    studentId: "1",
    studentName: "Alex Johnson",
    status: "completed",
    score: 94,
    started_at: getRelativeDateTime(-3, 14, 0),
    completed_at: getRelativeDateTime(-3, 14, 28),
    time_spent_minutes: 28,
  },
]
