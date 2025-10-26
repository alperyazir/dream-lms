# Epic List

## Epic 1: Extend Template for LMS Domain (Backend)

**Estimated Effort:** 2-3 weeks | **Status:** 🚀 READY TO START

Extend the template's simple User/Item model to support Dream LMS's 4-role system and complete domain model. Add 20+ tables for Publishers, Schools, Teachers, Students, Classes, Books, Activities, Assignments, Analytics, Messages, and Materials. Remove template's demo "Items" feature.

**What Template Provides:** User model, JWT auth, CRUD endpoints, Alembic migrations, admin page
**What We Build:** Role field + 20+ LMS domain tables + role-specific API endpoints + bulk import

**Deliverable:** Complete backend schema and core APIs ready for frontend integration

---

## Epic 2: UI Migration & LMS Pages (Frontend with Mock Data)

**Estimated Effort:** 4-5 weeks | **Status:** ⏸️ BLOCKED (requires Epic 1 schema)

Replace template's Chakra UI with Shadcn UI + Tailwind (neumorphic design). Build all LMS pages (dashboards, books, assignments, activity players, analytics, messaging) using **mock/dummy data only**. Extend template's navbar/sidebar for 4 roles.

**What Template Provides:** Login page, protected routes, navbar, sidebar, admin dashboard with Chakra UI
**What We Build:** Chakra → Shadcn migration + 4 role dashboards + all LMS pages with mock data

**Deliverable:** Fully functional frontend demo with polished UI (no backend needed yet)

---

## Epic 3: Books & Assignments (Backend + Integration)

**Estimated Effort:** 3-4 weeks | **Status:** ⏸️ BLOCKED (requires Epic 2 UI)

Build backend APIs for Dream Central Storage integration, book catalog sync, class management, and assignment creation. Connect Epic 2's mock-data UIs to real APIs. Students see assignments, teachers create assignments.

**Deliverable:** Teachers can assign books, students see assignments (activity players not functional yet)

---

## Epic 4: Activity Players (Backend + Integration)

**Estimated Effort:** 4-5 weeks | **Status:** ⏸️ BLOCKED (requires Epic 3)

Build backend APIs for activity submission and scoring. Connect Epic 2's activity player UIs to real APIs. Implement 6 activity types (drag-drop, word matching, multiple choice, true/false, circle, word search) with client-side scoring and server-side recording.

**Deliverable:** Students can complete activities, scores are recorded, teachers see completion status

---

## Epic 5: Analytics & Reporting (Backend + Integration)

**Estimated Effort:** 2-3 weeks | **Status:** ⏸️ BLOCKED (requires Epic 4)

Build backend APIs for performance analytics, error pattern analysis, and progress tracking. Connect Epic 2's analytics dashboard UIs to real APIs. Generate teacher insights, student progress charts, class statistics.

**Deliverable:** Teachers see detailed analytics, students see progress charts, admins see system-wide reports

---

## Epic 6: Messaging & Materials (Backend + Integration)

**Estimated Effort:** 2-3 weeks | **Status:** ⏸️ BLOCKED (requires Epic 2)

Build backend APIs for teacher-student messaging, notifications, feedback, and material uploads to Dream Central Storage. Connect Epic 2's messaging/materials UIs to real APIs.

**Deliverable:** Full communication system - messaging, notifications, feedback, file sharing

---
