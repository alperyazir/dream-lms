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

// ============================================================================
// ACTIVITY CONFIG TYPE DEFINITIONS (Story 2.5)
// Story 10.2: Added AudioExtra for audio support
// ============================================================================

/**
 * Audio extra configuration for activities with audio content
 * Story 10.2: Frontend Audio Player Component
 */
export interface AudioExtra {
  path: string
}

export interface Coordinates {
  x: number
  y: number
  w: number
  h: number
}

export interface DragDropAnswer {
  no: number
  coords: Coordinates
  text: string
}

export interface DragDropPictureActivity {
  id: string
  bookId: string
  type: "dragdroppicture"
  section_path: string // Background image URL
  words: string[] // Draggable word bank
  answer: DragDropAnswer[] // Correct placements
  audio_extra?: AudioExtra // Story 10.2: Optional audio content
}

export interface DragDropGroupAnswer {
  no: number
  coords: Coordinates
  group: string[] // Multiple correct answers for this drop zone (category)
}

export interface DragDropPictureGroupActivity {
  id: string
  bookId: string
  type: "dragdroppicturegroup"
  section_path: string // Background image URL
  words: string[] // Draggable word bank
  answer: DragDropGroupAnswer[] // Drop zones with multiple correct answers
  audio_extra?: AudioExtra // Story 10.2: Optional audio content
}

export interface MatchWord {
  word: string
}

export interface MatchSentence {
  sentence: string
  word: string // Correct matching term
  image_path?: string // Optional image for the sentence
}

export interface MatchTheWordsActivity {
  id: string
  bookId: string
  type: "matchTheWords"
  headerText: string
  match_words: MatchWord[]
  sentences: MatchSentence[]
  audio_extra?: AudioExtra // Story 10.2: Optional audio content
}

export interface CircleAnswer {
  coords: Coordinates
  isCorrect: boolean
}

export interface CircleActivity {
  id: string
  bookId: string
  type: "circle" | "markwithx"
  circleCount?: number // Max selections per group (-1 = multi-select, 0 or undefined = 2/true-false, >0 = specific count)
  section_path: string // Background image
  answer: CircleAnswer[]
  audio_extra?: AudioExtra // Story 10.2: Optional audio content
}

export interface PuzzleFindWordsActivity {
  id: string
  bookId: string
  type: "puzzleFindWords"
  headerText: string
  words: string[] // Words to find in grid
  audio_extra?: AudioExtra // Story 10.2: Optional audio content
}

export type ActivityConfig =
  | DragDropPictureActivity
  | DragDropPictureGroupActivity
  | MatchTheWordsActivity
  | CircleActivity
  | PuzzleFindWordsActivity

// ============================================================================

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
// ANALYTICS, MESSAGING, MATERIALS TYPE DEFINITIONS (Story 2.6)
// ============================================================================

export interface AnalyticsDataPoint {
  id: string
  date: string // ISO 8601 date
  student_id: string
  activity_type:
    | "dragdroppicture"
    | "dragdroppicturegroup"
    | "matchTheWords"
    | "circle"
    | "markwithx"
    | "puzzleFindWords"
  score: number // 0-100
  time_spent_minutes: number
  assignment_id: string
}

export interface StudentAnalytics {
  student_id: string
  student_name: string
  avg_score: number
  completed_count: number
  strengths: string[] // Activity types with high scores
  weaknesses: string[] // Activity types needing improvement
  recent_scores: number[] // Last 10 scores for trend analysis
}

export interface Message {
  id: string
  from_id: string
  from_name: string
  to_id: string
  to_name: string
  subject: string
  body: string
  timestamp: string // ISO 8601
  read: boolean
}

export interface Conversation {
  id: string
  participant_id: string
  participant_name: string
  participant_avatar: string
  messages: Message[]
  unread_count: number
  last_message_preview: string
  last_message_timestamp: string
}

export interface Material {
  id: string
  name: string
  type: "pdf" | "image" | "video"
  size: number // in bytes
  uploaded_at: string // ISO 8601
  shared_with: string[] // Array of class IDs or student IDs
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
      description:
        "Discover the wonders of science through hands-on activities",
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
  assignmentsDue: [] as AssignmentDue[],

  scoreHistory: [] as ScoreHistory[],

  recentFeedback: [] as Feedback[],

  achievements: [] as Achievement[],

  stats: {
    averageScore: 0,
    completedAssignments: 0,
    upcomingAssignments: 0,
  },
}

// ============================================================================
// BOOKS & ASSIGNMENTS DATA (Story 2.4)
// ============================================================================

/**
 * Mock Books - 12 books across different grades and publishers
 */
export const mockBooks: Book[] = []

/**
 * Mock Activities - 20 activities across all 6 activity types
 */
export const mockActivities: Activity[] = []

/*
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
*/

/**
 * Mock Activity Configs - Detailed configuration for interactive activities (Story 2.5)
 */
export const mockActivityConfigs: ActivityConfig[] = []

/*
  // DragDropPicture Activity 1 - Parts of Speech
  {
    id: "config_1",
    bookId: "1",
    type: "dragdroppicture",
    section_path:
      "https://via.placeholder.com/1200x800/e0f2fe/0891b2?text=Parts+of+Speech+Exercise",
    words: ["noun", "verb", "adjective", "adverb", "pronoun"],
    answer: [
      { no: 1, coords: { x: 150, y: 200, w: 120, h: 50 }, text: "noun" },
      { no: 2, coords: { x: 450, y: 200, w: 120, h: 50 }, text: "verb" },
      { no: 3, coords: { x: 750, y: 200, w: 120, h: 50 }, text: "adjective" },
      { no: 4, coords: { x: 300, y: 450, w: 120, h: 50 }, text: "adverb" },
      { no: 5, coords: { x: 600, y: 450, w: 120, h: 50 }, text: "pronoun" },
    ],
  },
  // DragDropPicture Activity 2 - Math Equations
  {
    id: "config_2",
    bookId: "2",
    type: "dragdroppicture",
    section_path:
      "https://via.placeholder.com/1200x800/fef3c7/f59e0b?text=Complete+the+Equations",
    words: ["5", "10", "15", "20"],
    answer: [
      { no: 1, coords: { x: 200, y: 250, w: 80, h: 50 }, text: "5" },
      { no: 2, coords: { x: 500, y: 250, w: 80, h: 50 }, text: "10" },
      { no: 3, coords: { x: 200, y: 450, w: 80, h: 50 }, text: "15" },
      { no: 4, coords: { x: 500, y: 450, w: 80, h: 50 }, text: "20" },
    ],
  },
  // MatchTheWords Activity 1 - Vocabulary
  {
    id: "config_3",
    bookId: "1",
    type: "matchTheWords",
    headerText: "Match each word with its definition",
    match_words: [
      { word: "Abundant" },
      { word: "Benevolent" },
      { word: "Diligent" },
      { word: "Eloquent" },
    ],
    sentences: [
      { sentence: "Existing in large quantities", word: "Abundant" },
      { sentence: "Well-meaning and kindly", word: "Benevolent" },
      { sentence: "Showing care in one's work", word: "Diligent" },
      { sentence: "Fluent and persuasive in speaking", word: "Eloquent" },
    ],
  },
  // MatchTheWords Activity 2 - Science Terms
  {
    id: "config_4",
    bookId: "5",
    type: "matchTheWords",
    headerText: "Match the scientific term with its description",
    match_words: [
      { word: "Photosynthesis" },
      { word: "Evaporation" },
      { word: "Condensation" },
      { word: "Precipitation" },
    ],
    sentences: [
      {
        sentence: "Process by which plants make food using sunlight",
        word: "Photosynthesis",
      },
      { sentence: "Water changing from liquid to gas", word: "Evaporation" },
      { sentence: "Water vapor changing to liquid", word: "Condensation" },
      {
        sentence: "Water falling from clouds as rain or snow",
        word: "Precipitation",
      },
    ],
  },
  // Circle Activity 1 - True/False (circleCount: 2)
  {
    id: "config_5",
    bookId: "1",
    type: "circle",
    circleCount: 2,
    section_path:
      "https://via.placeholder.com/1200x800/dbeafe/3b82f6?text=Circle+the+Correct+Statements",
    answer: [
      { coords: { x: 100, y: 150, w: 500, h: 60 }, isCorrect: true },
      { coords: { x: 100, y: 250, w: 500, h: 60 }, isCorrect: false },
      { coords: { x: 100, y: 350, w: 500, h: 60 }, isCorrect: true },
      { coords: { x: 100, y: 450, w: 500, h: 60 }, isCorrect: false },
    ],
  },
  // Circle Activity 2 - Multiple Choice (circleCount: 3)
  {
    id: "config_6",
    bookId: "2",
    type: "circle",
    circleCount: 3,
    section_path:
      "https://via.placeholder.com/1200x800/fce7f3/ec4899?text=Select+All+Prime+Numbers",
    answer: [
      { coords: { x: 150, y: 200, w: 100, h: 80 }, isCorrect: true }, // 2
      { coords: { x: 350, y: 200, w: 100, h: 80 }, isCorrect: true }, // 3
      { coords: { x: 550, y: 200, w: 100, h: 80 }, isCorrect: false }, // 4
      { coords: { x: 750, y: 200, w: 100, h: 80 }, isCorrect: true }, // 5
      { coords: { x: 350, y: 350, w: 100, h: 80 }, isCorrect: false }, // 6
      { coords: { x: 550, y: 350, w: 100, h: 80 }, isCorrect: false }, // 8
    ],
  },
  // MarkWithX Activity - Incorrect Grammar
  {
    id: "config_7",
    bookId: "1",
    type: "markwithx",
    circleCount: 3,
    section_path:
      "https://via.placeholder.com/1200x800/fee2e2/ef4444?text=Mark+Grammatical+Errors",
    answer: [
      { coords: { x: 100, y: 150, w: 450, h: 50 }, isCorrect: false },
      { coords: { x: 100, y: 250, w: 450, h: 50 }, isCorrect: true }, // Error
      { coords: { x: 100, y: 350, w: 450, h: 50 }, isCorrect: true }, // Error
      { coords: { x: 100, y: 450, w: 450, h: 50 }, isCorrect: false },
      { coords: { x: 100, y: 550, w: 450, h: 50 }, isCorrect: true }, // Error
    ],
  },
  // PuzzleFindWords Activity 1 - Animals
  {
    id: "config_8",
    bookId: "5",
    type: "puzzleFindWords",
    headerText: "Find all the animal names hidden in the grid",
    words: [
      "LION",
      "TIGER",
      "BEAR",
      "WOLF",
      "EAGLE",
      "SHARK",
      "DOLPHIN",
      "ZEBRA",
    ],
  },
  // PuzzleFindWords Activity 2 - Countries
  {
    id: "config_9",
    bookId: "8",
    type: "puzzleFindWords",
    headerText: "Find all the country names in the puzzle",
    words: ["FRANCE", "SPAIN", "ITALY", "BRAZIL", "CANADA", "JAPAN", "EGYPT"],
  },
*/

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
export const mockAssignments: AssignmentFull[] = []

/*
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
*/

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

// ============================================================================
// ANALYTICS, MESSAGING, MATERIALS MOCK DATA (Story 2.6)
// ============================================================================

/**
 * Mock Analytics Data Points - 60+ data points covering last 30 days
 */
export const mockAnalyticsData: AnalyticsDataPoint[] = [
  // Student 1 - Alex Johnson (High performer)
  {
    id: "a1",
    date: getRelativeDate(-29),
    student_id: "1",
    activity_type: "dragdroppicture",
    score: 88,
    time_spent_minutes: 22,
    assignment_id: "1",
  },
  {
    id: "a2",
    date: getRelativeDate(-27),
    student_id: "1",
    activity_type: "matchTheWords",
    score: 92,
    time_spent_minutes: 18,
    assignment_id: "2",
  },
  {
    id: "a3",
    date: getRelativeDate(-25),
    student_id: "1",
    activity_type: "circle",
    score: 95,
    time_spent_minutes: 15,
    assignment_id: "3",
  },
  {
    id: "a4",
    date: getRelativeDate(-22),
    student_id: "1",
    activity_type: "puzzleFindWords",
    score: 90,
    time_spent_minutes: 20,
    assignment_id: "4",
  },
  {
    id: "a5",
    date: getRelativeDate(-20),
    student_id: "1",
    activity_type: "dragdroppicturegroup",
    score: 93,
    time_spent_minutes: 25,
    assignment_id: "5",
  },
  {
    id: "a6",
    date: getRelativeDate(-18),
    student_id: "1",
    activity_type: "markwithx",
    score: 87,
    time_spent_minutes: 17,
    assignment_id: "6",
  },
  {
    id: "a7",
    date: getRelativeDate(-15),
    student_id: "1",
    activity_type: "dragdroppicture",
    score: 91,
    time_spent_minutes: 21,
    assignment_id: "7",
  },
  {
    id: "a8",
    date: getRelativeDate(-12),
    student_id: "1",
    activity_type: "matchTheWords",
    score: 94,
    time_spent_minutes: 19,
    assignment_id: "8",
  },
  {
    id: "a9",
    date: getRelativeDate(-10),
    student_id: "1",
    activity_type: "circle",
    score: 96,
    time_spent_minutes: 14,
    assignment_id: "9",
  },
  {
    id: "a10",
    date: getRelativeDate(-7),
    student_id: "1",
    activity_type: "puzzleFindWords",
    score: 89,
    time_spent_minutes: 23,
    assignment_id: "10",
  },

  // Student 2 - Maria Garcia (Average performer)
  {
    id: "a11",
    date: getRelativeDate(-28),
    student_id: "2",
    activity_type: "matchTheWords",
    score: 78,
    time_spent_minutes: 25,
    assignment_id: "1",
  },
  {
    id: "a12",
    date: getRelativeDate(-26),
    student_id: "2",
    activity_type: "dragdroppicture",
    score: 82,
    time_spent_minutes: 28,
    assignment_id: "2",
  },
  {
    id: "a13",
    date: getRelativeDate(-24),
    student_id: "2",
    activity_type: "circle",
    score: 75,
    time_spent_minutes: 22,
    assignment_id: "3",
  },
  {
    id: "a14",
    date: getRelativeDate(-21),
    student_id: "2",
    activity_type: "markwithx",
    score: 80,
    time_spent_minutes: 24,
    assignment_id: "4",
  },
  {
    id: "a15",
    date: getRelativeDate(-19),
    student_id: "2",
    activity_type: "puzzleFindWords",
    score: 83,
    time_spent_minutes: 26,
    assignment_id: "5",
  },
  {
    id: "a16",
    date: getRelativeDate(-17),
    student_id: "2",
    activity_type: "dragdroppicturegroup",
    score: 79,
    time_spent_minutes: 30,
    assignment_id: "6",
  },
  {
    id: "a17",
    date: getRelativeDate(-14),
    student_id: "2",
    activity_type: "matchTheWords",
    score: 81,
    time_spent_minutes: 23,
    assignment_id: "7",
  },
  {
    id: "a18",
    date: getRelativeDate(-11),
    student_id: "2",
    activity_type: "dragdroppicture",
    score: 84,
    time_spent_minutes: 27,
    assignment_id: "8",
  },
  {
    id: "a19",
    date: getRelativeDate(-9),
    student_id: "2",
    activity_type: "circle",
    score: 77,
    time_spent_minutes: 21,
    assignment_id: "9",
  },
  {
    id: "a20",
    date: getRelativeDate(-6),
    student_id: "2",
    activity_type: "puzzleFindWords",
    score: 85,
    time_spent_minutes: 25,
    assignment_id: "10",
  },

  // Student 3 - James Wilson (Excellent performer)
  {
    id: "a21",
    date: getRelativeDate(-29),
    student_id: "3",
    activity_type: "circle",
    score: 97,
    time_spent_minutes: 12,
    assignment_id: "1",
  },
  {
    id: "a22",
    date: getRelativeDate(-27),
    student_id: "3",
    activity_type: "dragdroppicture",
    score: 95,
    time_spent_minutes: 15,
    assignment_id: "2",
  },
  {
    id: "a23",
    date: getRelativeDate(-25),
    student_id: "3",
    activity_type: "matchTheWords",
    score: 98,
    time_spent_minutes: 14,
    assignment_id: "3",
  },
  {
    id: "a24",
    date: getRelativeDate(-22),
    student_id: "3",
    activity_type: "puzzleFindWords",
    score: 96,
    time_spent_minutes: 16,
    assignment_id: "4",
  },
  {
    id: "a25",
    date: getRelativeDate(-20),
    student_id: "3",
    activity_type: "markwithx",
    score: 94,
    time_spent_minutes: 13,
    assignment_id: "5",
  },
  {
    id: "a26",
    date: getRelativeDate(-18),
    student_id: "3",
    activity_type: "dragdroppicturegroup",
    score: 99,
    time_spent_minutes: 18,
    assignment_id: "6",
  },
  {
    id: "a27",
    date: getRelativeDate(-15),
    student_id: "3",
    activity_type: "circle",
    score: 97,
    time_spent_minutes: 11,
    assignment_id: "7",
  },
  {
    id: "a28",
    date: getRelativeDate(-12),
    student_id: "3",
    activity_type: "dragdroppicture",
    score: 95,
    time_spent_minutes: 14,
    assignment_id: "8",
  },
  {
    id: "a29",
    date: getRelativeDate(-10),
    student_id: "3",
    activity_type: "matchTheWords",
    score: 98,
    time_spent_minutes: 15,
    assignment_id: "9",
  },
  {
    id: "a30",
    date: getRelativeDate(-7),
    student_id: "3",
    activity_type: "puzzleFindWords",
    score: 100,
    time_spent_minutes: 17,
    assignment_id: "10",
  },

  // Student 4 - Emily Chen (Struggling with puzzles)
  {
    id: "a31",
    date: getRelativeDate(-28),
    student_id: "4",
    activity_type: "dragdroppicture",
    score: 72,
    time_spent_minutes: 30,
    assignment_id: "1",
  },
  {
    id: "a32",
    date: getRelativeDate(-26),
    student_id: "4",
    activity_type: "matchTheWords",
    score: 76,
    time_spent_minutes: 28,
    assignment_id: "2",
  },
  {
    id: "a33",
    date: getRelativeDate(-24),
    student_id: "4",
    activity_type: "puzzleFindWords",
    score: 58,
    time_spent_minutes: 35,
    assignment_id: "3",
  },
  {
    id: "a34",
    date: getRelativeDate(-21),
    student_id: "4",
    activity_type: "circle",
    score: 74,
    time_spent_minutes: 26,
    assignment_id: "4",
  },
  {
    id: "a35",
    date: getRelativeDate(-19),
    student_id: "4",
    activity_type: "markwithx",
    score: 70,
    time_spent_minutes: 29,
    assignment_id: "5",
  },
  {
    id: "a36",
    date: getRelativeDate(-17),
    student_id: "4",
    activity_type: "puzzleFindWords",
    score: 62,
    time_spent_minutes: 38,
    assignment_id: "6",
  },
  {
    id: "a37",
    date: getRelativeDate(-14),
    student_id: "4",
    activity_type: "dragdroppicturegroup",
    score: 75,
    time_spent_minutes: 32,
    assignment_id: "7",
  },
  {
    id: "a38",
    date: getRelativeDate(-11),
    student_id: "4",
    activity_type: "matchTheWords",
    score: 78,
    time_spent_minutes: 27,
    assignment_id: "8",
  },
  {
    id: "a39",
    date: getRelativeDate(-9),
    student_id: "4",
    activity_type: "puzzleFindWords",
    score: 65,
    time_spent_minutes: 36,
    assignment_id: "9",
  },
  {
    id: "a40",
    date: getRelativeDate(-6),
    student_id: "4",
    activity_type: "circle",
    score: 73,
    time_spent_minutes: 25,
    assignment_id: "10",
  },

  // Student 5 - Michael Brown (Consistent mid-range)
  {
    id: "a41",
    date: getRelativeDate(-29),
    student_id: "5",
    activity_type: "matchTheWords",
    score: 85,
    time_spent_minutes: 20,
    assignment_id: "1",
  },
  {
    id: "a42",
    date: getRelativeDate(-27),
    student_id: "5",
    activity_type: "dragdroppicture",
    score: 83,
    time_spent_minutes: 24,
    assignment_id: "2",
  },
  {
    id: "a43",
    date: getRelativeDate(-25),
    student_id: "5",
    activity_type: "circle",
    score: 86,
    time_spent_minutes: 19,
    assignment_id: "3",
  },
  {
    id: "a44",
    date: getRelativeDate(-22),
    student_id: "5",
    activity_type: "puzzleFindWords",
    score: 84,
    time_spent_minutes: 22,
    assignment_id: "4",
  },
  {
    id: "a45",
    date: getRelativeDate(-20),
    student_id: "5",
    activity_type: "markwithx",
    score: 82,
    time_spent_minutes: 23,
    assignment_id: "5",
  },
  {
    id: "a46",
    date: getRelativeDate(-18),
    student_id: "5",
    activity_type: "dragdroppicturegroup",
    score: 85,
    time_spent_minutes: 26,
    assignment_id: "6",
  },
  {
    id: "a47",
    date: getRelativeDate(-15),
    student_id: "5",
    activity_type: "matchTheWords",
    score: 87,
    time_spent_minutes: 21,
    assignment_id: "7",
  },
  {
    id: "a48",
    date: getRelativeDate(-12),
    student_id: "5",
    activity_type: "dragdroppicture",
    score: 84,
    time_spent_minutes: 23,
    assignment_id: "8",
  },
  {
    id: "a49",
    date: getRelativeDate(-10),
    student_id: "5",
    activity_type: "circle",
    score: 86,
    time_spent_minutes: 20,
    assignment_id: "9",
  },
  {
    id: "a50",
    date: getRelativeDate(-7),
    student_id: "5",
    activity_type: "puzzleFindWords",
    score: 85,
    time_spent_minutes: 24,
    assignment_id: "10",
  },

  // Additional data points for more students (6-8)
  {
    id: "a51",
    date: getRelativeDate(-28),
    student_id: "6",
    activity_type: "dragdroppicture",
    score: 90,
    time_spent_minutes: 21,
    assignment_id: "1",
  },
  {
    id: "a52",
    date: getRelativeDate(-25),
    student_id: "6",
    activity_type: "matchTheWords",
    score: 88,
    time_spent_minutes: 19,
    assignment_id: "2",
  },
  {
    id: "a53",
    date: getRelativeDate(-20),
    student_id: "6",
    activity_type: "circle",
    score: 92,
    time_spent_minutes: 17,
    assignment_id: "3",
  },
  {
    id: "a54",
    date: getRelativeDate(-15),
    student_id: "6",
    activity_type: "puzzleFindWords",
    score: 87,
    time_spent_minutes: 22,
    assignment_id: "4",
  },
  {
    id: "a55",
    date: getRelativeDate(-10),
    student_id: "6",
    activity_type: "markwithx",
    score: 89,
    time_spent_minutes: 20,
    assignment_id: "5",
  },

  {
    id: "a56",
    date: getRelativeDate(-27),
    student_id: "7",
    activity_type: "matchTheWords",
    score: 68,
    time_spent_minutes: 32,
    assignment_id: "1",
  },
  {
    id: "a57",
    date: getRelativeDate(-24),
    student_id: "7",
    activity_type: "dragdroppicture",
    score: 71,
    time_spent_minutes: 29,
    assignment_id: "2",
  },
  {
    id: "a58",
    date: getRelativeDate(-19),
    student_id: "7",
    activity_type: "circle",
    score: 69,
    time_spent_minutes: 27,
    assignment_id: "3",
  },
  {
    id: "a59",
    date: getRelativeDate(-14),
    student_id: "7",
    activity_type: "puzzleFindWords",
    score: 73,
    time_spent_minutes: 31,
    assignment_id: "4",
  },
  {
    id: "a60",
    date: getRelativeDate(-9),
    student_id: "7",
    activity_type: "markwithx",
    score: 70,
    time_spent_minutes: 28,
    assignment_id: "5",
  },

  {
    id: "a61",
    date: getRelativeDate(-26),
    student_id: "8",
    activity_type: "dragdroppicture",
    score: 91,
    time_spent_minutes: 18,
    assignment_id: "1",
  },
  {
    id: "a62",
    date: getRelativeDate(-23),
    student_id: "8",
    activity_type: "matchTheWords",
    score: 93,
    time_spent_minutes: 16,
    assignment_id: "2",
  },
  {
    id: "a63",
    date: getRelativeDate(-18),
    student_id: "8",
    activity_type: "circle",
    score: 89,
    time_spent_minutes: 20,
    assignment_id: "3",
  },
  {
    id: "a64",
    date: getRelativeDate(-13),
    student_id: "8",
    activity_type: "puzzleFindWords",
    score: 92,
    time_spent_minutes: 19,
    assignment_id: "4",
  },
  {
    id: "a65",
    date: getRelativeDate(-8),
    student_id: "8",
    activity_type: "markwithx",
    score: 90,
    time_spent_minutes: 17,
    assignment_id: "5",
  },
]

/**
 * Mock Student Analytics - Aggregate performance data for 8 students
 */
export const mockStudentAnalytics: StudentAnalytics[] = [
  {
    student_id: "1",
    student_name: "Alex Johnson",
    avg_score: 91,
    completed_count: 10,
    strengths: ["circle", "matchTheWords", "dragdroppicturegroup"],
    weaknesses: ["markwithx"],
    recent_scores: [88, 92, 95, 90, 93, 87, 91, 94, 96, 89],
  },
  {
    student_id: "2",
    student_name: "Maria Garcia",
    avg_score: 80,
    completed_count: 10,
    strengths: ["puzzleFindWords", "dragdroppicture"],
    weaknesses: ["circle", "matchTheWords"],
    recent_scores: [78, 82, 75, 80, 83, 79, 81, 84, 77, 85],
  },
  {
    student_id: "3",
    student_name: "James Wilson",
    avg_score: 97,
    completed_count: 10,
    strengths: ["matchTheWords", "dragdroppicturegroup", "circle"],
    weaknesses: [],
    recent_scores: [97, 95, 98, 96, 94, 99, 97, 95, 98, 100],
  },
  {
    student_id: "4",
    student_name: "Emily Chen",
    avg_score: 70,
    completed_count: 10,
    strengths: ["matchTheWords", "dragdroppicturegroup"],
    weaknesses: ["puzzleFindWords", "markwithx"],
    recent_scores: [72, 76, 58, 74, 70, 62, 75, 78, 65, 73],
  },
  {
    student_id: "5",
    student_name: "Michael Brown",
    avg_score: 85,
    completed_count: 10,
    strengths: ["matchTheWords", "circle"],
    weaknesses: ["markwithx"],
    recent_scores: [85, 83, 86, 84, 82, 85, 87, 84, 86, 85],
  },
  {
    student_id: "6",
    student_name: "Sarah Davis",
    avg_score: 89,
    completed_count: 5,
    strengths: ["circle", "dragdroppicture"],
    weaknesses: ["puzzleFindWords"],
    recent_scores: [90, 88, 92, 87, 89],
  },
  {
    student_id: "7",
    student_name: "David Martinez",
    avg_score: 70,
    completed_count: 5,
    strengths: ["puzzleFindWords"],
    weaknesses: ["matchTheWords", "circle"],
    recent_scores: [68, 71, 69, 73, 70],
  },
  {
    student_id: "8",
    student_name: "Lisa Anderson",
    avg_score: 91,
    completed_count: 5,
    strengths: ["matchTheWords", "puzzleFindWords"],
    weaknesses: [],
    recent_scores: [91, 93, 89, 92, 90],
  },
]

/**
 * Mock Messages - 20+ messages across 5 conversations
 */
const mockMessagesRaw: Message[] = [
  // Conversation 1: Teacher <-> Emily Chen's Parent
  {
    id: "msg1",
    from_id: "teacher1",
    from_name: "Dr. Sarah Johnson",
    to_id: "parent1",
    to_name: "Mrs. Chen",
    subject: "Emily's Progress in Math",
    body: "Hello Mrs. Chen, I wanted to discuss Emily's recent performance in math activities. She's doing well overall but seems to struggle with word puzzles. Would you like to schedule a meeting?",
    timestamp: getRelativeDateTime(-5, 14, 30),
    read: true,
  },
  {
    id: "msg2",
    from_id: "parent1",
    from_name: "Mrs. Chen",
    to_id: "teacher1",
    to_name: "Dr. Sarah Johnson",
    subject: "Re: Emily's Progress in Math",
    body: "Thank you for reaching out! Yes, I've noticed she takes longer on puzzle activities at home too. A meeting would be great. Are afternoons this week convenient for you?",
    timestamp: getRelativeDateTime(-5, 16, 45),
    read: true,
  },
  {
    id: "msg3",
    from_id: "teacher1",
    from_name: "Dr. Sarah Johnson",
    to_id: "parent1",
    to_name: "Mrs. Chen",
    subject: "Re: Emily's Progress in Math",
    body: "Wednesday at 3:30 PM works perfectly. I'll send you a calendar invite. We can discuss strategies to help Emily improve her puzzle-solving skills.",
    timestamp: getRelativeDateTime(-4, 10, 15),
    read: true,
  },
  {
    id: "msg4",
    from_id: "parent1",
    from_name: "Mrs. Chen",
    to_id: "teacher1",
    to_name: "Dr. Sarah Johnson",
    subject: "Re: Emily's Progress in Math",
    body: "Perfect! Looking forward to it. Should I bring Emily or is this parent-teacher only?",
    timestamp: getRelativeDateTime(-4, 11, 20),
    read: false,
  },

  // Conversation 2: Teacher <-> Alex Johnson's Parent
  {
    id: "msg5",
    from_id: "parent2",
    from_name: "Mr. Johnson",
    to_id: "teacher1",
    to_name: "Dr. Sarah Johnson",
    subject: "Thank you!",
    body: "Hi Dr. Johnson, I just wanted to thank you for the extra attention you've been giving Alex. His confidence has really grown this semester!",
    timestamp: getRelativeDateTime(-3, 9, 0),
    read: true,
  },
  {
    id: "msg6",
    from_id: "teacher1",
    from_name: "Dr. Sarah Johnson",
    to_id: "parent2",
    to_name: "Mr. Johnson",
    subject: "Re: Thank you!",
    body: "It's wonderful to hear that! Alex is a pleasure to teach. He's consistently one of the top performers in class and always helps his classmates.",
    timestamp: getRelativeDateTime(-3, 14, 30),
    read: true,
  },

  // Conversation 3: Teacher <-> James Wilson's Parent
  {
    id: "msg7",
    from_id: "teacher1",
    from_name: "Dr. Sarah Johnson",
    to_id: "parent3",
    to_name: "Dr. Wilson",
    subject: "James's Exceptional Performance",
    body: "Good afternoon Dr. Wilson, I wanted to let you know that James scored 100% on his latest assignment! His problem-solving skills are truly impressive.",
    timestamp: getRelativeDateTime(-2, 15, 45),
    read: true,
  },
  {
    id: "msg8",
    from_id: "parent3",
    from_name: "Dr. Wilson",
    to_id: "teacher1",
    to_name: "Dr. Sarah Johnson",
    subject: "Re: James's Exceptional Performance",
    body: "That's fantastic news! We're so proud of him. Thank you for challenging him and keeping him engaged in learning.",
    timestamp: getRelativeDateTime(-2, 18, 20),
    read: true,
  },
  {
    id: "msg9",
    from_id: "teacher1",
    from_name: "Dr. Sarah Johnson",
    to_id: "parent3",
    to_name: "Dr. Wilson",
    subject: "Re: James's Exceptional Performance",
    body: "Of course! I'm also considering recommending him for the advanced math program next year. Would you be interested in discussing this further?",
    timestamp: getRelativeDateTime(-1, 10, 30),
    read: false,
  },

  // Conversation 4: Teacher <-> Maria Garcia's Parent
  {
    id: "msg10",
    from_id: "parent4",
    from_name: "Ms. Garcia",
    to_id: "teacher1",
    to_name: "Dr. Sarah Johnson",
    subject: "Assignment Question",
    body: "Hello Dr. Johnson, Maria is working on the matching words assignment and has a question about the instructions. Can you clarify what 'match by context' means?",
    timestamp: getRelativeDateTime(-1, 19, 15),
    read: true,
  },
  {
    id: "msg11",
    from_id: "teacher1",
    from_name: "Dr. Sarah Johnson",
    to_id: "parent4",
    to_name: "Ms. Garcia",
    subject: "Re: Assignment Question",
    body: "Of course! 'Match by context' means reading the full sentence and finding which word makes the most sense. I'll send Maria a helpful video link tomorrow that explains the strategy.",
    timestamp: getRelativeDateTime(-1, 20, 30),
    read: true,
  },
  {
    id: "msg12",
    from_id: "parent4",
    from_name: "Ms. Garcia",
    to_id: "teacher1",
    to_name: "Dr. Sarah Johnson",
    subject: "Re: Assignment Question",
    body: "Thank you so much! That really helps. Maria is excited to try the video.",
    timestamp: getRelativeDateTime(0, 8, 45),
    read: false,
  },

  // Conversation 5: Teacher <-> School Principal
  {
    id: "msg13",
    from_id: "principal",
    from_name: "Principal Roberts",
    to_id: "teacher1",
    to_name: "Dr. Sarah Johnson",
    subject: "Next Week's Curriculum Meeting",
    body: "Hi Sarah, can you prepare a 5-minute presentation on the Dream LMS platform for next Tuesday's curriculum meeting? The board is interested in our digital learning initiatives.",
    timestamp: getRelativeDateTime(-7, 11, 0),
    read: true,
  },
  {
    id: "msg14",
    from_id: "teacher1",
    from_name: "Dr. Sarah Johnson",
    to_id: "principal",
    to_name: "Principal Roberts",
    subject: "Re: Next Week's Curriculum Meeting",
    body: "Absolutely! I'd be happy to showcase how we're using the platform and share some student success metrics. I'll have the presentation ready by Monday.",
    timestamp: getRelativeDateTime(-7, 13, 30),
    read: true,
  },
  {
    id: "msg15",
    from_id: "principal",
    from_name: "Principal Roberts",
    to_id: "teacher1",
    to_name: "Dr. Sarah Johnson",
    subject: "Re: Next Week's Curriculum Meeting",
    body: "Perfect! Also, bring examples of student work if you can. The board loves seeing real results.",
    timestamp: getRelativeDateTime(-6, 9, 15),
    read: true,
  },
  {
    id: "msg16",
    from_id: "teacher1",
    from_name: "Dr. Sarah Johnson",
    to_id: "principal",
    to_name: "Principal Roberts",
    subject: "Re: Next Week's Curriculum Meeting",
    body: "Will do! I'll include before/after analytics and some anonymized student assignment samples.",
    timestamp: getRelativeDateTime(-6, 10, 45),
    read: false,
  },
]

/**
 * Mock Conversations - 5 conversation threads
 */
export const mockConversations: Conversation[] = [
  {
    id: "conv1",
    participant_id: "parent1",
    participant_name: "Mrs. Chen",
    participant_avatar: "MC",
    messages: mockMessagesRaw.filter(
      (m) => m.from_id === "parent1" || m.to_id === "parent1",
    ),
    unread_count: 1,
    last_message_preview:
      "Perfect! Looking forward to it. Should I bring Emily or is this parent-teacher only?",
    last_message_timestamp: getRelativeDateTime(-4, 11, 20),
  },
  {
    id: "conv2",
    participant_id: "parent2",
    participant_name: "Mr. Johnson",
    participant_avatar: "MJ",
    messages: mockMessagesRaw.filter(
      (m) => m.from_id === "parent2" || m.to_id === "parent2",
    ),
    unread_count: 0,
    last_message_preview:
      "It's wonderful to hear that! Alex is a pleasure to teach...",
    last_message_timestamp: getRelativeDateTime(-3, 14, 30),
  },
  {
    id: "conv3",
    participant_id: "parent3",
    participant_name: "Dr. Wilson",
    participant_avatar: "DW",
    messages: mockMessagesRaw.filter(
      (m) => m.from_id === "parent3" || m.to_id === "parent3",
    ),
    unread_count: 1,
    last_message_preview:
      "I'm also considering recommending him for the advanced math program...",
    last_message_timestamp: getRelativeDateTime(-1, 10, 30),
  },
  {
    id: "conv4",
    participant_id: "parent4",
    participant_name: "Ms. Garcia",
    participant_avatar: "MG",
    messages: mockMessagesRaw.filter(
      (m) => m.from_id === "parent4" || m.to_id === "parent4",
    ),
    unread_count: 1,
    last_message_preview:
      "Thank you so much! That really helps. Maria is excited to try the video.",
    last_message_timestamp: getRelativeDateTime(0, 8, 45),
  },
  {
    id: "conv5",
    participant_id: "principal",
    participant_name: "Principal Roberts",
    participant_avatar: "PR",
    messages: mockMessagesRaw.filter(
      (m) => m.from_id === "principal" || m.to_id === "principal",
    ),
    unread_count: 1,
    last_message_preview:
      "Will do! I'll include before/after analytics and some anonymized student...",
    last_message_timestamp: getRelativeDateTime(-6, 10, 45),
  },
]

/**
 * Mock Materials - 12 educational materials with various file types
 */
export const mockMaterials: Material[] = [
  {
    id: "mat1",
    name: "Grammar Rules Reference Guide.pdf",
    type: "pdf",
    size: 2458000, // ~2.4 MB
    uploaded_at: getRelativeDateTime(-15, 10, 0),
    shared_with: ["1", "2"], // Math 101, Science Advanced classes
  },
  {
    id: "mat2",
    name: "Math Formulas Cheat Sheet.pdf",
    type: "pdf",
    size: 1250000, // ~1.2 MB
    uploaded_at: getRelativeDateTime(-12, 14, 30),
    shared_with: ["1"], // Math 101 class
  },
  {
    id: "mat3",
    name: "Parts of Speech Poster.png",
    type: "image",
    size: 580000, // ~580 KB
    uploaded_at: getRelativeDateTime(-10, 9, 15),
    shared_with: ["1", "3"], // Math 101, English Literature
  },
  {
    id: "mat4",
    name: "Introduction to Fractions Video.mp4",
    type: "video",
    size: 8500000, // ~8.5 MB
    uploaded_at: getRelativeDateTime(-9, 16, 45),
    shared_with: ["1"], // Math 101 class
  },
  {
    id: "mat5",
    name: "Science Lab Safety Guide.pdf",
    type: "pdf",
    size: 3200000, // ~3.2 MB
    uploaded_at: getRelativeDateTime(-8, 11, 20),
    shared_with: ["2"], // Science Advanced class
  },
  {
    id: "mat6",
    name: "Multiplication Table Chart.png",
    type: "image",
    size: 450000, // ~450 KB
    uploaded_at: getRelativeDateTime(-7, 13, 0),
    shared_with: ["1"], // Math 101 class
  },
  {
    id: "mat7",
    name: "Reading Comprehension Strategies.pdf",
    type: "pdf",
    size: 1850000, // ~1.8 MB
    uploaded_at: getRelativeDateTime(-6, 15, 30),
    shared_with: ["3"], // English Literature class
  },
  {
    id: "mat8",
    name: "Solar System Diagram.png",
    type: "image",
    size: 720000, // ~720 KB
    uploaded_at: getRelativeDateTime(-5, 10, 45),
    shared_with: ["2"], // Science Advanced class
  },
  {
    id: "mat9",
    name: "How to Solve Word Problems.mp4",
    type: "video",
    size: 6400000, // ~6.4 MB
    uploaded_at: getRelativeDateTime(-4, 14, 15),
    shared_with: ["1"], // Math 101 class
  },
  {
    id: "mat10",
    name: "Vocabulary Building Worksheet.pdf",
    type: "pdf",
    size: 980000, // ~980 KB
    uploaded_at: getRelativeDateTime(-3, 9, 30),
    shared_with: ["3"], // English Literature class
  },
  {
    id: "mat11",
    name: "Geometry Shapes Reference.png",
    type: "image",
    size: 520000, // ~520 KB
    uploaded_at: getRelativeDateTime(-2, 11, 0),
    shared_with: ["1"], // Math 101 class
  },
  {
    id: "mat12",
    name: "Phonics Practice Guide.pdf",
    type: "pdf",
    size: 1400000, // ~1.4 MB
    uploaded_at: getRelativeDateTime(-1, 16, 20),
    shared_with: [], // Not shared yet
  },
]
