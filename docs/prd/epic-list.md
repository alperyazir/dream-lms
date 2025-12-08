# Epic List

## Epic 1: Extend Template for LMS Domain (Backend)

**Estimated Effort:** 2-3 weeks | **Status:** ✅ DONE

Extend the template's simple User/Item model to support Dream LMS's 4-role system and complete domain model. Add 20+ tables for Publishers, Schools, Teachers, Students, Classes, Books, Activities, Assignments, Analytics, Messages, and Materials. Remove template's demo "Items" feature.

**What Template Provides:** User model, JWT auth, CRUD endpoints, Alembic migrations, admin page
**What We Build:** Role field + 20+ LMS domain tables + role-specific API endpoints + bulk import

**Deliverable:** Complete backend schema and core APIs ready for frontend integration

---

## Epic 2: UI Migration & LMS Pages (Frontend with Mock Data)

**Estimated Effort:** 4-5 weeks | **Status:** ✅ DONE

Replace template's Chakra UI with Shadcn UI + Tailwind (neumorphic design). Build all LMS pages (dashboards, books, assignments, activity players, analytics, messaging) using **mock/dummy data only**. Extend template's navbar/sidebar for 4 roles.

**What Template Provides:** Login page, protected routes, navbar, sidebar, admin dashboard with Chakra UI
**What We Build:** Chakra → Shadcn migration + 4 role dashboards + all LMS pages with mock data

**Deliverable:** Fully functional frontend demo with polished UI (no backend needed yet)

---

## Epic 3: Books & Assignments (Backend + Integration)

**Estimated Effort:** 3-4 weeks | **Status:** ✅ DONE

Build backend APIs for Dream Central Storage integration, book catalog sync, class management, and assignment creation. Connect Epic 2's mock-data UIs to real APIs. Students see assignments, teachers create assignments.

**Deliverable:** Teachers can assign books, students see assignments (activity players not functional yet)

---

## Epic 4: Activity Players (Backend + Integration)

**Estimated Effort:** 4-5 weeks | **Status:** ✅ DONE

Build backend APIs for activity submission and scoring. Connect Epic 2's activity player UIs to real APIs. Implement 6 activity types (drag-drop, word matching, multiple choice, true/false, circle, word search) with client-side scoring and server-side recording.

**Deliverable:** Students can complete activities, scores are recorded, teachers see completion status

---

## Epic 5: Analytics & Reporting (Backend + Integration)

**Estimated Effort:** 2-3 weeks | **Status:** ✅ DONE

Build backend APIs for performance analytics, error pattern analysis, and progress tracking. Connect Epic 2's analytics dashboard UIs to real APIs. Generate teacher insights, student progress charts, class statistics.

**Deliverable:** Teachers see detailed analytics, students see progress charts, admins see system-wide reports

---

## Epic 6: Messaging & Materials (Backend + Integration)

**Estimated Effort:** 2-3 weeks | **Status:** ✅ DONE

Build backend APIs for teacher-student messaging, notifications, feedback, and material uploads to Dream Central Storage. Connect Epic 2's messaging/materials UIs to real APIs.

**Deliverable:** Full communication system - messaging, notifications, feedback, file sharing

---

## Epic 7: Authentication & User Management Overhaul

**Estimated Effort:** 1-2 weeks | **Status:** ✅ DONE

Transform authentication from open self-registration with email-only login to secure hierarchical user management. Add username field, remove public signup, implement role-based user creation permissions (Admin→All, Publisher→Teacher/Student, Teacher→Student), clean mock data, and update UI/API for username-based operations.

**What Currently Exists:** Email-only login, public signup route, mock data seeding, hardcoded quick test logins
**What We Build:** Username field + username/email login + removed signup + hierarchical permissions + clean database + dynamic test login

**Deliverable:** Production-ready authentication with hierarchical user management and no mock data

---

## Epic 8: Multi-Activity Assignments & Page-Based Selection

**Estimated Effort:** 2-3 weeks | **Status:** ✅ DONE

Enable teachers to assign multiple activities from a book as a single assignment, with an intuitive page-based selection UI. Students can navigate between activities within an assignment, save progress, and submit when all activities are complete.

**What Currently Exists:** Single-activity assignments (1:1 Assignment→Activity relationship), flat activity list selection
**What We Build:** Multi-activity assignments + page-based visual selection UI + student activity navigation + per-activity analytics

**Deliverable:** Teachers assign multiple activities at once by selecting book pages, students complete all activities with shared timer and combined scoring

---

## Epic 9: UX Improvements & Polish

**Estimated Effort:** 4-5 weeks | **Status:** 🚀 READY TO START

Comprehensive UX improvements across all user roles. Includes UI polish (navbar, Turkish character support, avatars), Admin enhancements (password reset, validations, publisher logos), Publisher features (book assignment system, messaging), and Teacher tools (activity selection tabs, calendar scheduling, preview/test mode, bulk student import).

**What Currently Exists:** Working LMS with all core features, but missing polish and advanced workflows
**What We Build:** Book assignment licensing + Calendar scheduling + Activity selection tabs + Test mode + Bulk import + UI polish

**Stories:**
- 9.1: General UI Polish (navbar, Turkish chars, avatars)
- 9.2: Admin User Management Enhancements (password reset, validations, edit users)
- 9.3: Publisher Logo & Profile Enhancements
- 9.4: Book Assignment System (Publisher assigns books to schools/teachers)
- 9.5: Activity Selection Tabs (individual/page/module selection)
- 9.6: Calendar-Based Assignment Scheduling
- 9.7: Teacher Assignment Preview & Test Mode
- 9.8: Teacher UI Enhancements (book covers, zoom, list view, edit assignments)
- 9.9: Bulk Student Import via Excel

**Deliverable:** Polished, production-ready LMS with advanced workflows and improved UX

---

## Epic 10: Audio & Video Media Integration

**Estimated Effort:** 2-3 weeks | **Status:** Planning

Enable activities to include audio content from book configurations and allow teachers to attach video content to assignments. Media is streamed efficiently from Dream Central Storage with HTTP Range support for seeking.

**What Currently Exists:** Image asset proxy from DCS, activity players for 6 types, no audio/video support
**What We Build:** Streaming media proxy (Range-aware) + Audio player component + Video attachment system

**Stories:**
- 10.1: Backend Streaming Media Proxy with Range Support
- 10.2: Frontend Audio Player Component
- 10.3: Video Attachment to Assignments (Phase 2)

**Deliverable:** Students can play audio instructions with activities, teachers can attach videos to assignments

---
