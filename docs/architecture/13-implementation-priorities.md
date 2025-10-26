# 13. Implementation Priorities

**Note:** FastAPI template provides foundation (Docker, auth, basic CRUD). We extend it.

## Epic 1: Extend Template for LMS Domain (Weeks 1-3) - Backend

**What Template Provides:** ✅ Docker, FastAPI, JWT auth, User CRUD, Alembic, pytest

**What We Build:**
1. Remove Items demo feature
2. Add `role` field to User model (enum: admin/publisher/teacher/student)
3. Create 20+ LMS tables: Publishers, Schools, Teachers, Students, Classes, Books, Activities, Assignments, Analytics, Messages, Materials
4. Build role-specific API endpoints (admin creates publishers, publishers create teachers, etc.)
5. Implement bulk import (Excel upload)
6. Extend RBAC with `require_role()` dependency

**Deliverable:** Complete backend schema + APIs ready for frontend

---

## Epic 2: UI Migration & LMS Pages (Weeks 4-8) - Frontend with Mock Data

**What Template Provides:** ✅ Login, navbar, sidebar, admin page (Chakra UI), TanStack Router/Query

**What We Build (All with Mock Data):**
1. **Week 4:** Remove Chakra UI → Install Shadcn + Tailwind + design tokens
2. **Week 5:** Migrate existing pages (login, navbar, sidebar, admin) to Shadcn
3. **Week 6:** Build 4 role dashboards + books/assignments pages (mock data)
4. **Week 7:** Build 6 activity player components (mock data)
5. **Week 8:** Build analytics, messaging, materials pages (mock data)

**Deliverable:** Fully functional frontend demo (no backend integration needed yet)

---

## Epic 3: Books & Assignments Backend + Integration (Weeks 9-11)

**Build:**
1. Dream Central Storage MinIO client integration
2. Book sync API + activity parsing (config.json)
3. Class management API
4. Assignment creation/management API
5. Connect Epic 2's mock-data UIs to real APIs

**Deliverable:** Teachers assign books, students see assignments (players not functional)

---

## Epic 4: Activity Players Backend + Integration (Weeks 12-16)

**Build:**
1. Activity submission API with JSONB response storage
2. Server-side scoring/validation
3. Progress tracking (AssignmentStudent updates)
4. Connect Epic 2's activity player UIs to real APIs
5. Implement all 6 activity types end-to-end

**Deliverable:** Students complete activities, scores recorded, teachers see completion

---

## Epic 5: Analytics Backend + Integration (Weeks 17-18)

**Build:**
1. Analytics calculation engine (aggregate queries)
2. Error pattern analysis
3. Progress tracking API
4. Connect Epic 2's analytics dashboards to real APIs

**Deliverable:** Teachers see performance insights, students see progress charts

---

## Epic 6: Messaging & Materials Backend + Integration (Weeks 19-20)

**Build:**
1. Messaging API (threads, notifications)
2. Materials upload to Dream Central Storage
3. Feedback system API
4. Connect Epic 2's messaging/materials UIs to real APIs

**Deliverable:** Full communication system functional

---

## Total Timeline: ~20 weeks (5 months)

**Key Insight:** Template saves ~4 weeks by providing infrastructure. Epic 2 builds all UI upfront with mock data, then Epics 3-6 just connect APIs (faster integration).

---
