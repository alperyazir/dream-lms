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

**Estimated Effort:** 2-3 weeks | **Status:** ✅ DONE

Enable activities to include audio content from book configurations and allow teachers to attach video content to assignments. Media is streamed efficiently from Dream Central Storage with HTTP Range support for seeking.

**What Currently Exists:** Image asset proxy from DCS, activity players for 6 types, no audio/video support
**What We Build:** Streaming media proxy (Range-aware) + Audio player component + Video attachment system

**Stories:**
- 10.1: Backend Streaming Media Proxy with Range Support
- 10.2: Frontend Audio Player Component
- 10.3: Video Attachment to Assignments (Phase 2)

**Deliverable:** Students can play audio instructions with activities, teachers can attach videos to assignments

---

## Epic 11: Secure Password Management & Email Notifications

**Estimated Effort:** 1-2 weeks | **Status:** Planning

Transform user creation from insecure plaintext password display to a secure workflow where temporary passwords are emailed to users, and first-time login forces password change. Admins/Publishers retain ability to reset passwords without seeing actual credentials.

**What Currently Exists:** Admin/Publisher can see `initial_password` field when creating users, security concern
**What We Build:** Remove password visibility + Email temp passwords + Force first-login password change + Secure reset flow

**Stories:**
- 11.1: Backend - Secure Password Infrastructure
- 11.2: Backend - Password Reset Endpoint
- 11.3: Backend - First Login Password Change
- 11.4: Frontend - Remove Password Display & Add Reset Button
- 11.5: Frontend - First Login Password Change Flow

**Deliverable:** Secure user creation with emailed credentials and mandatory first-login password change

---

## Epic 12: User Onboarding Tour

**Estimated Effort:** 1 week | **Status:** Planning

Introduce an interactive onboarding tour that guides new users (Teachers, Students, Publishers) through key UI elements on their first login, with the ability to skip and never show again.

**What Currently Exists:** Users land directly on dashboard with no guidance
**What We Build:** Interactive tour library + Role-specific tour steps + Tour completion tracking + Skip functionality

**Stories:**
- 12.1: Backend - Tour Completion Tracking
- 12.2: Frontend - Tour Library Integration & Infrastructure
- 12.3: Frontend - Role-Specific Tour Content
- 12.4: Frontend - Tour Trigger & Flow Integration

**Deliverable:** Engaging onboarding experience for new Teachers, Students, and Publishers (Admin excluded)

---

## Epic 13: DreamAI - AI-Powered Content Generation

**Estimated Effort:** 4-5 weeks | **Status:** Planning

Enable teachers to generate educational content (questions, activities, vocabulary quizzes) using AI. Integrates with DCS pre-processed book data and supports teacher-uploaded materials. Features a dedicated DreamAI section in the sidebar with abstracted LLM and TTS provider layers for flexibility.

**What Currently Exists:** Manual activity creation, no AI assistance, no vocabulary audio
**What We Build:** AI content generation + TTS audio playback + DreamAI UI + Provider abstraction layers

**Dependencies:** DCS Epic 10 (AI Book Processing Pipeline)

**Stories:**
- 13.1: LLM Provider Abstraction Layer
- 13.2: DeepSeek Provider Integration
- 13.3: Gemini Provider Integration
- 13.4: TTS Provider Abstraction Layer
- 13.5: Edge TTS Provider Integration
- 13.6: Azure TTS Provider (Fallback)
- 13.7: AI Service Integration with DCS
- 13.8: MCQ Generation from Modules
- 13.9: Vocabulary Quiz Generation with Audio
- 13.10: True/False Generation
- 13.11: Fill-in-the-Blank Generation
- 13.12: Teacher Materials Processing
- 13.13: DreamAI Sidebar Section
- 13.14: Question Generator UI
- 13.15: Vocabulary Explorer with Audio Player
- 13.16: Generated Content Review Flow
- 13.17: Content Library UI
- 13.18: AI Usage Dashboard

**Deliverable:** AI-powered content generation with multi-provider support, vocabulary audio, and intuitive teacher UI

---

## Epic 28: Teacher-Controlled Student Password Management

**Estimated Effort:** 2-3 days | **Status:** Draft

Transform student password management from a secure-but-complex model to a teacher-controlled model optimized for K-12 educational environments. Teachers can set, view, and modify student passwords directly, eliminating the support burden of forgotten credentials.

**What Currently Exists:** Hashed passwords (irreversible), auto-generated random passwords, forced password change on first login, students can change own passwords
**What We Build:** Custom password input + Reversible encryption for teacher viewing + Password visibility UI + Remove student password change

**Stories:**
- 28.1: Teacher-Controlled Student Password Management (Backend + Frontend)

**Deliverable:** Teachers can set/view/change student passwords, students have simple memorable credentials, reduced support burden

---

## Epic 29: DCS Library Viewer Integration

**Estimated Effort:** 1-2 weeks | **Status:** Draft

Enable admin, supervisor, publisher, and teacher users to browse DCS book libraries and preview books using an embedded flowbook-online viewer, with the ability to download book bundles. Internal integration of flowbook-online components for seamless UX.

**What Currently Exists:** Book catalog browsing with activity selection, no full book preview capability
**What We Build:** Embedded flowbook-online viewer + Library browser page + Preview/Download actions

**Stories:**
- 29.1: Integrate Flowbook-Online Viewer Components
- 29.2: Create DCS Library Browser Page
- 29.3: Book Preview and Download Actions

**Deliverable:** Privileged users can browse, preview, and download books from DCS libraries within LMS

---
