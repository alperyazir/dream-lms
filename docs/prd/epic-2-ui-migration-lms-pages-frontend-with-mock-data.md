# Epic 2: UI Migration & LMS Pages (Frontend with Mock Data)

**Status:** ⏸️ BLOCKED by Epic 1 (needs schema) | **Estimated Effort:** 4-5 weeks

**Epic Goal:**

Transform the template's Chakra UI frontend into a polished Shadcn UI + Tailwind application with neumorphic design. Build ALL LMS pages (4 role dashboards, books, assignments, activity players, analytics, messaging, materials) using **mock/dummy data only**. Extend template's navbar and sidebar for 4 distinct roles. By the end of this epic, we have a fully functional, beautiful frontend demo that can be shown to stakeholders without needing any backend beyond login.

**What Template Already Provides (We Modify):**
- ✅ Login page (restyle with Shadcn, keep auth logic)
- ✅ Protected routes system (keep as-is)
- ✅ Navbar + Sidebar layout (restyle, extend for 4 roles)
- ✅ Admin user table page (restyle, extend for publishers/schools/teachers/students)
- ✅ Settings page (restyle)
- ✅ TanStack Router file-based routing (keep)
- ✅ TanStack Query setup (keep, use for mock data hooks)

**What We Build (All with Mock Data):**
- ✅ Remove Chakra UI, install Shadcn + Tailwind
- ✅ Design system tokens (colors, neumorphic shadows, typography)
- ✅ 4 role-specific dashboards (admin/publisher/teacher/student)
- ✅ Book catalog page + book detail
- ✅ Assignment creation wizard (multi-step form)
- ✅ Assignment list + assignment detail
- ✅ Class management pages
- ✅ 6 activity player components (drag-drop, matching, etc.)
- ✅ Analytics dashboards (charts with mock data)
- ✅ Messaging inbox + conversation view
- ✅ Materials library (upload UI + file list)
- ✅ Notification system
- ✅ Dark mode support

**Key Principle:** Build UI first, connect APIs later (Epics 3-6)

## Story 2.1: Remove Chakra UI & Install Shadcn + Design System

As a **developer**,
I want **to replace Chakra UI with Shadcn UI + Tailwind and configure the neumorphic design system**,
so that **we have a clean foundation for Dream LMS's unique visual aesthetic**.

### Acceptance Criteria:

1. Remove Chakra UI: `npm uninstall @chakra-ui/react @emotion/react @emotion/styled`
2. Install Shadcn: `npx shadcn-ui@latest init` with Tailwind + TypeScript
3. Configure `tailwind.config.ts` with Dream LMS color palette (Teal 500: #14B8A6, Cyan 500: #06B6D4, full scale)
4. Add neumorphic shadow utilities to Tailwind config (neuro-sm, neuro, neuro-lg)
5. Install core Shadcn components (20+): button, card, input, select, table, dialog, sheet, dropdown-menu, toast, form, etc.
6. Create design system file `src/lib/design-tokens.ts` with colors, spacing, typography
7. Configure dark mode with `next-themes` (already in template)
8. Update global CSS with Inter font, gradient backgrounds
9. All components work in light + dark mode
10. Document component usage in `/docs/components.md`

## Story 2.2: Migrate Existing Pages (Login, Navbar, Sidebar, Admin)

As a **developer**,
I want **to migrate template's existing pages from Chakra to Shadcn**,
so that **we maintain all functionality while adopting the new design system**.

### Acceptance Criteria:

1. **Login page** (`src/routes/login.tsx`): Replace Chakra components with Shadcn Button, Input, Card
2. **Navbar** (`src/components/Common/Navbar.tsx`): Replace with Shadcn DropdownMenu, Avatar, theme toggle
3. **Sidebar** (`src/components/Common/Sidebar.tsx`): Redesign with neumorphic styling, role-based menus
4. **Admin page** (`src/routes/_layout/admin.tsx`): Replace Chakra Table with Shadcn Table + TanStack Table
5. **Settings page** (`src/routes/_layout/settings.tsx`): Replace forms with Shadcn Form + React Hook Form
6. Remove all `<Box>`, `<Flex>`, `<Stack>` → replace with Tailwind classes
7. Replace `useToast()` → Shadcn `toast()` + `<Toaster />`
8. All pages responsive and accessible
9. Dark mode works on all pages
10. Authentication logic unchanged (keep TanStack Query hooks)

## Story 2.3: Build 4 Role-Specific Dashboards (Mock Data)

As a **user**,
I want **a role-specific dashboard showing relevant information for my role**,
so that **I see only what's relevant to me**.

### Acceptance Criteria:

**Mock data in `src/lib/mockData.ts`**

1. **Admin Dashboard** (`src/routes/_layout/admin/dashboard.tsx`):
   - System stats cards: Total users (432), Active schools (12), Total assignments (1,245)
   - Recent activity feed (mock data)
   - Quick actions: Add publisher, Add school
   - Charts: User growth (Recharts line chart), Activity by type (bar chart)
2. **Publisher Dashboard** (`src/routes/_layout/publisher/dashboard.tsx`):
   - My schools (5 schools with mock data)
   - My books (8 books with mock covers)
   - Teachers created (23)
   - Quick actions: Create teacher, Assign book
3. **Teacher Dashboard** (`src/routes/_layout/teacher/dashboard.tsx`):
   - My classes (3 classes with student counts)
   - Recent assignments (5 with completion rates)
   - Upcoming deadlines
   - Quick actions: Create assignment, Create class
   - Charts: Class performance, Assignment completion trend
4. **Student Dashboard** (`src/routes/_layout/student/dashboard.tsx`):
   - Assignments due (4 cards with countdown timers)
   - Progress chart (mock score history)
   - Recent feedback
   - Achievements/badges (mock)
5. All dashboards use neumorphic cards with gradients
6. All use mock data (no API calls)
7. Responsive design

## Story 2.4: Build Books & Assignments Pages (Mock Data)

As a **teacher/student**,
I want **to browse books and manage assignments**,
so that **I can assign work and see what's due**.

### Acceptance Criteria:

**Mock data includes 12 books, 20 activities, 15 assignments**

1. **Book Catalog** (`src/routes/_layout/teacher/books/index.tsx`):
   - Grid view of books with cover images
   - Search + filter by publisher, activity type
   - "View Activities" button → book detail page
2. **Book Detail** (`src/routes/_layout/teacher/books/$bookId.tsx`):
   - Book info + activities list
   - "Assign" button → opens assignment wizard
3. **Assignment Creation Wizard** (multi-step dialog):
   - Step 1: Review activity
   - Step 2: Select students/classes
   - Step 3: Configure (due date, time limit, instructions)
   - Step 4: Review + Create
   - Stores to mock assignment list (no API)
4. **Teacher Assignment List** (`src/routes/_layout/teacher/assignments/index.tsx`):
   - Table with: Name, Book, Due date, Completion rate, Actions
   - Filter by status, sort by due date
   - "View Details" → assignment detail
5. **Assignment Detail** (`src/routes/_layout/teacher/assignments/$assignmentId.tsx`):
   - Assignment info
   - Student completion table (mock scores)
6. **Student Assignment View** (`src/routes/_layout/student/assignments/index.tsx`):
   - Tabs: To Do, Completed, Past Due
   - Assignment cards with status badges
   - "Start Assignment" → activity player

## Story 2.5: Build 6 Activity Player Components (Mock Data)

As a **student**,
I want **to complete interactive activities**,
so that **I can do my homework and see my score**.

### Acceptance Criteria:

**All activity players use mock config data (no API calls)**

1. **DragDropPicturePlayer** (`src/components/ActivityPlayers/DragDropPicturePlayer.tsx`):
   - Background image, draggable words, drop zones
   - Client-side scoring on submit
   - Mock score display
2. **MatchTheWordsPlayer**: Two columns, drag to match pairs
3. **MultipleChoicePlayer**: Question + 4 options, radio select
4. **TrueFalsePlayer** (CirclePlayer): Mark statements as true/false by circling
5. **MarkWithXPlayer**: Mark incorrect items with X
6. **PuzzleFindWordsPlayer**: Word search grid
7. All players:
   - Timer (if time limit set in mock assignment)
   - Submit button → show mock score
   - "Back to Assignments" button
   - Responsive design
   - Accessibility (keyboard navigation)
8. See `front-end-spec.md` Section 4 for detailed player specs

## Story 2.6: Build Analytics, Messaging, Materials Pages (Mock Data)

As a **teacher**,
I want **analytics dashboards, messaging, and materials management**,
so that **I can monitor performance and communicate with students**.

### Acceptance Criteria:

1. **Analytics Dashboard** (`src/routes/_layout/teacher/analytics/index.tsx`):
   - Recharts: Student performance over time, activity type breakdown, error patterns
   - Filter by date range, class, student
   - Export button (mock download)
2. **Student Analytics Detail** (`src/routes/_layout/teacher/analytics/$studentId.tsx`):
   - Individual student progress chart
   - Activity history table
   - Strengths/weaknesses summary
3. **Messaging Inbox** (`src/routes/_layout/messaging/index.tsx`):
   - Message list (mock conversations)
   - Unread count badge
   - Search messages
4. **Conversation View** (`src/routes/_layout/messaging/$conversationId.tsx`):
   - Message thread (mock messages)
   - Send message form (stores locally, no API)
5. **Materials Library** (`src/routes/_layout/teacher/materials/index.tsx`):
   - File upload dropzone (stores to mock list)
   - File list table (name, type, size, actions)
   - Share with class/student (mock)
6. All use mock data, responsive, accessible

**Epic 2 Complete:** Fully functional frontend demo with polished UI, ready for backend integration in Epics 3-6

---
