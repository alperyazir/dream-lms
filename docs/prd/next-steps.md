# Next Steps

## UX Expert Prompt

Sally, our UX Expert, please review this PRD and create a comprehensive front-end specification document that will guide our React 
implementation. Focus on:

1. **Component Architecture**: Based on the 13 core screens identified (Login, Admin Dashboard, Publisher Dashboard, Teacher Dashboard, Teacher 
Class Management, Teacher Assignment Creator, Teacher Analytics View, Teacher Messaging Center, Student Dashboard, Student Activity Player,
Student Progress View, Notification Center, Materials Library), design a component hierarchy and reusable component library using Shadcn UI and
Radix UI primitives.

2. **Interactive Activity Players**: Design detailed UI specifications for all five activity types (drag-and-drop, word matching, 
multiple-choice, true/false, word search) ensuring they are:
   - Accessible (WCAG AA compliant)
   - Mobile-responsive with proper touch interactions
   - Visually consistent across all types
   - Include clear progress indicators and feedback mechanisms

3. **Data Visualization Design**: Specify chart types, color schemes, and interaction patterns for all analytics screens using Recharts. Ensure 
charts are readable, meaningful, and encourage positive action.

4. **Assignment Creation Flow**: Design the multi-step dialog interface that guides teachers through book/activity selection, recipient 
selection, and configuration. Make this intuitive for non-technical users.

5. **Notification UX**: Design the notification bell dropdown, notification panel, and notification preferences interface to be unobtrusive yet 
effective.

6. **Bulk Import Experience**: Design the Excel upload interface with drag-and-drop, validation error display, and success confirmation that 
clearly communicates what happened.

7. **Responsive Breakpoints**: Define specific breakpoint behavior for desktop (1024px+), tablet (768px-1023px), and mobile (320px-767px) for all
 key screens.

8. **Design System Documentation**: Create a style guide covering: color palette, typography scale, spacing system, component states (hover, 
active, disabled, error), icon usage, and animation principles.

Please reference the FlowBook screenshots (when provided) to maintain visual consistency with the existing ecosystem. Deliver a front-end 
specification document (`docs/front-end-spec.md`) that developers can follow to build the React application.

---

## Architect Prompt

Winston, our System Architect, please review this PRD and create a comprehensive technical architecture document that will guide implementation. 
Focus on:

1. **System Architecture Diagram**: Create a high-level architecture showing: React frontend, FastAPI backend, PostgreSQL database, Dream Central
 Storage integration, and deployment on single VPS with Docker.

2. **Database Schema Design**: Design complete ERD (Entity-Relationship Diagram) including all tables mentioned in the epics:
   - User management: User, Publisher, School, Teacher, Student
   - Content: Book, BookAccess, Activity
   - Classes: Class, ClassStudent
   - Assignments: Assignment, AssignmentStudent
   - Communication: Message, Notification, NotificationPreference, Feedback
   - Materials: Material, MaterialAssignment
   - Include indexes, foreign keys, constraints, and data types

3. **API Architecture**: Design RESTful API structure with:
   - Authentication/authorization strategy (JWT implementation details)
   - API versioning approach
   - Rate limiting strategy
   - Error handling and response formats
   - OpenAPI/Swagger documentation plan

4. **Dream Central Storage Integration**: Specify:
   - API client architecture with retry logic and caching
   - File upload/download flow for teacher materials
   - Config.json parsing strategy for activities
   - Error handling when Dream Central Storage is unavailable
   - Request the specific endpoint documentation needed

5. **Frontend Architecture**: Design React application structure:
   - Folder structure (components, pages, hooks, services, utils)
   - State management approach (TanStack Query + Zustand)
   - Routing strategy with role-based access control
   - Form validation architecture (React Hook Form + Zod)
   - API client service layer

6. **Activity Player Architecture**: Design the activity rendering engine that:
   - Parses config.json for each activity type
   - Handles progress persistence (save/resume)
   - Calculates scores
   - Manages timer and auto-submit
   - Consider creating an activity player framework that can be extended for new activity types

7. **Analytics Engine**: Design the backend analytics calculation system:
   - Aggregation query patterns
   - Caching strategy for expensive calculations
   - Report generation architecture (synchronous vs. async)
   - Pattern detection algorithm for error insights

8. **Deployment Architecture**: Specify Docker Compose configuration:
   - Nginx reverse proxy configuration
   - Gunicorn + Uvicorn worker setup
   - PostgreSQL with persistent volumes
   - Redis for caching (optional but recommended)
   - Environment variable management
   - SSL/TLS setup with Let's Encrypt
   - Backup strategy

9. **Security Architecture**: Detail:
   - JWT token structure and validation
   - Password hashing strategy
   - Role-based access control implementation
   - CSRF protection
   - XSS prevention
   - SQL injection prevention
   - Rate limiting per endpoint
   - Data encryption at rest and in transit

10. **Testing Strategy**: Define:
    - Backend test structure (pytest fixtures, test database)
    - Frontend test structure (Vitest, React Testing Library)
    - Integration test approach
    - CI/CD pipeline with automated testing
    - Test data seeding strategy

11. **Scalability Considerations**: Document:
    - Current MVP limitations (100 concurrent users, single VPS)
    - Bottlenecks to monitor
    - Migration path to Phase 2 (managed database)
    - Migration path to Phase 3 (load balancer + multiple servers)
    - Database query optimization recommendations

12. **Monitoring & Logging**: Specify:
    - Structured logging format
    - Log aggregation strategy
    - Application performance monitoring (APM) recommendations
    - Key metrics to track
    - Alerting thresholds

Please deliver a comprehensive architecture document (`docs/architecture.md`) that covers all technical decisions, includes diagrams (use Mermaid
 or ASCII art), and provides clear implementation guidance for the development team.

**Important**: Request any clarifications about Dream Central Storage API capabilities, as integration details are critical to system design.

