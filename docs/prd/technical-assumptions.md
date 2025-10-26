# Technical Assumptions

## Repository Structure: Monorepo

The project uses a monorepo structure based on the FastAPI Full-Stack Template with clear separation between frontend and backend:

```
dream-lms/
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py              # FastAPI app initialization
│   │   ├── api/                 # API routers
│   │   ├── core/                # Configuration and security
│   │   ├── models/              # SQLModel models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic layer
│   │   └── tests/               # Pytest tests
│   ├── alembic/                 # Database migrations
│   └── Dockerfile
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/          # Shared components (Shadcn UI)
│   │   ├── features/            # Feature modules
│   │   ├── pages/               # Route pages
│   │   ├── services/            # API clients
│   │   └── stores/              # State management
│   └── Dockerfile
├── docker-compose.yml           # Orchestration
├── docs/                        # Project documentation
└── .env                         # Environment variables
```

**Rationale**: The FastAPI template's monorepo structure enables coordinated development, shared tooling, and atomic commits across full-stack features, which is ideal for a small team and MVP development pace. The template provides production-ready organization patterns that accelerate development.

## Service Architecture

**Monolithic Architecture with Service Layer Pattern**

Dream LMS shall be built as a monolithic application with FastAPI backend and React frontend, deployed as Docker containers on a single VPS. The
backend follows a layered architecture:

- **API Layer**: FastAPI routers handling HTTP requests
- **Service Layer**: Business logic and orchestration
- **Data Layer**: SQLModel ORM models and database access
- **Integration Layer**: Dream Central Storage REST API client

**Rationale**: Monolithic architecture reduces operational complexity for MVP deployment on single VPS while maintaining clear code organization
for future microservices extraction if scaling requires it.

## Backend Technology Stack

**Core Framework:**

- **Python 3.11+**: Modern Python with performance improvements
- **FastAPI**: Async web framework with automatic OpenAPI documentation
- **Uvicorn**: ASGI server for running FastAPI
- **Gunicorn**: Production process manager with multiple Uvicorn workers

**Data & Persistence:**

- **PostgreSQL 15+**: Primary relational database
- **SQLModel**: Modern ORM combining SQLAlchemy 2.0 + Pydantic for unified models
- **Alembic**: Database migration management
- **Pydantic**: Data validation and serialization (built into FastAPI and SQLModel)

**Authentication & Security:**

- **JWT (JSON Web Tokens)**: Stateless authentication
- **python-jose**: JWT token generation and validation
- **passlib + bcrypt**: Password hashing
- **python-multipart**: File upload handling for Excel bulk imports

**Integration & External Services:**

- **httpx**: Async HTTP client for Dream Central Storage API integration
- **openpyxl**: Excel file parsing for bulk import functionality
- **MinIO Python SDK**: Direct interaction with Dream Central Storage if needed

**Testing & Quality:**

- **pytest**: Primary testing framework
- **pytest-asyncio**: Async test support
- **httpx**: API integration testing
- **coverage.py**: Code coverage measurement

## Frontend Technology Stack

**Core Framework:**

- **React 18**: UI library with concurrent features
- **Vite**: Build tool and dev server (faster than CRA)
- **TypeScript**: Type safety and better developer experience
- **React Router v6**: Client-side routing

**UI Framework & Styling:**

- **Shadcn UI**: High-quality, accessible React components built on Radix UI
- **Radix UI**: Unstyled, accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library (consistent with Shadcn ecosystem)

**State Management:**

- **TanStack Query (React Query)**: Server state management, caching, and API calls
- **Zustand**: Lightweight client state management for UI state

**Forms & Validation:**

- **React Hook Form**: Performant form handling
- **Zod**: TypeScript-first schema validation (integrates with React Hook Form)

**Data Visualization:**

- **Recharts**: Composable charting library for performance analytics and progress tracking

**Testing:**

- **Vitest**: Fast unit testing (Vite-native)
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking for tests

## Database Design

**PostgreSQL 15+ with SQLModel ORM**

Key database design decisions:

- **Multi-tenancy**: Publisher-based data isolation using foreign keys and query filters
- **Activity Data**: JSON columns for storing flexible activity configurations from Dream Central Storage
- **Audit Trails**: Timestamps (created_at, updated_at) on all entities
- **Soft Deletes**: Logical deletion for critical entities (students, assignments) to preserve historical data

**Performance Considerations:**

- Indexed foreign keys for role-based queries
- Composite indexes on (teacher_id, class_id) for class management queries
- Full-text search indexes for book/activity search

## Dream Central Storage Integration

**REST API Integration via HTTP Client**

Dream LMS shall integrate with Dream Central Storage as the authoritative source for:

- Book catalog and metadata
- Activity definitions (config.json parsing)
- Media assets (images, audio for activities)
- Teacher-uploaded supplementary materials (PDFs, videos)

**Integration Pattern:**

- **Backend Proxy**: FastAPI backend proxies requests to Dream Central Storage (avoids CORS, centralizes auth)
- **Caching Layer**: Redis or in-memory caching for frequently accessed book data
- **Error Handling**: Graceful degradation if Dream Central Storage is temporarily unavailable

**Required from Dream Central Storage:**

- API endpoint documentation
- Authentication mechanism (API keys, OAuth, or existing JWT)
- Rate limits and usage quotas
- Webhook support for content updates (if available)

## Authentication & Authorization

**JWT-Based Authentication**

**Authentication Flow:**

1. User logs in with credentials provided by admin/publisher/teacher (email/password)
2. Backend validates credentials against PostgreSQL user table
3. Backend issues JWT token containing user_id, role, and relevant IDs (publisher_id, teacher_id, etc.)
4. Frontend stores JWT in httpOnly cookie or localStorage
5. Frontend includes JWT in Authorization header for all API requests
6. Backend middleware validates JWT and extracts user context for authorization

**Authorization Strategy:**

- **Role-Based Access Control (RBAC)**: Four roles with hierarchical permissions
- **Resource-Based Authorization**: Publishers see only their books, teachers see only their classes
- **FastAPI Dependencies**: Reusable dependency functions for role/permission checking

**Token Management:**

- Access tokens: 1-hour expiration
- Refresh tokens: 7-day expiration for seamless re-authentication
- Token revocation: Blacklist in Redis for logout functionality

**Account Creation Chain:**

- No public registration endpoint
- Admin creates Publisher accounts manually
- Publishers create Teacher accounts
- Teachers create Student accounts (individual or bulk)
- All accounts receive auto-generated temporary passwords

## File Storage Strategy

**Dream Central Storage (MinIO-backed) for All File Assets**

All file uploads shall be stored in Dream Central Storage:

- **Teacher-uploaded materials**: PDFs, videos, web links
- **Excel bulk import files**: Temporary storage for processing, then deleted
- **User profile images**: Optional avatar uploads (future enhancement)

**Upload Flow:**

1. Frontend uploads file to FastAPI backend
2. Backend validates file (type, size, virus scan if applicable)
3. Backend uploads to Dream Central Storage via REST API
4. Backend stores file reference (URL/key) in PostgreSQL
5. Frontend retrieves files via signed URLs from Dream Central Storage

**Storage Quotas:**

- Per-teacher material storage limit (e.g., 500 MB)
- Maximum file size per upload (e.g., 50 MB)
- Configurable via admin settings

## Deployment Architecture

**Single VPS Deployment with Docker**

**MVP Deployment (Single VPS):**

```
VPS (Ubuntu 22.04 LTS)
├── Docker Compose Stack
│   ├── Traefik (reverse proxy, auto-HTTPS with Let's Encrypt)
│   ├── Frontend Container (React build, served via Traefik)
│   ├── Backend Container (FastAPI with Gunicorn + Uvicorn workers)
│   ├── PostgreSQL (persistent volume)
│   └── Redis (caching, optional)
└── Docker Volumes (database, letsencrypt certificates)
```

**Scaling Strategy (Future):**

- **Phase 2**: Separate database to managed PostgreSQL (e.g., AWS RDS, DigitalOcean Managed DB)
- **Phase 3**: Load balancer + multiple app servers
- **Phase 4**: Kubernetes orchestration for auto-scaling

**CI/CD Pipeline:**

- GitHub Actions for automated testing and Docker image builds
- Docker Registry (Docker Hub or private) for image storage
- SSH deployment to VPS or Docker Swarm for orchestration

**Backup Strategy:**

- Daily PostgreSQL backups to external storage
- Dream Central Storage handles file redundancy
- Database migration scripts in version control

## Testing Requirements

**Unit Testing + Integration Testing (Manual E2E)**

**Backend Testing (pytest):**

- Unit tests for service layer business logic (target: 80% coverage)
- Integration tests for API endpoints using TestClient
- Database tests with test database fixtures
- Mock Dream Central Storage API for isolated tests

**Frontend Testing (Vitest + React Testing Library):**

- Unit tests for utility functions and hooks
- Component tests for UI components (target: 70% coverage)
- Integration tests for user flows (assignment creation, bulk import dialog)

**Manual Testing:**

- End-to-end user journeys performed manually by project team
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Responsive design testing (desktop, tablet, mobile viewports)
- Accessibility testing with screen readers (WCAG AA validation)

**Test Data:**

- Seed scripts for creating test users, books, and assignments
- Anonymized production-like data for realistic testing

## Additional Technical Assumptions and Requests

**Performance Targets:**

- API response times under 200ms for standard queries (excluding Dream Central Storage calls)
- Page load time under 3 seconds on 3G connection
- Support 100 concurrent users on single VPS (MVP scale)

**Monitoring & Logging:**

- Structured logging with Python logging module (JSON format)
- Application Performance Monitoring (APM) - consider Sentry for error tracking
- Basic metrics: request counts, response times, error rates

**Code Quality & Standards:**

- **Backend**: PEP 8 style guide, enforced by Black formatter and Flake8 linter
- **Frontend**: ESLint + Prettier for code formatting
- **Git**: Feature branch workflow with pull request reviews
- **Documentation**: OpenAPI/Swagger auto-generated for API docs

**Security Considerations:**

- HTTPS only (Let's Encrypt SSL certificates)
- SQL injection prevention via SQLModel parameterized queries
- XSS prevention via React's built-in escaping
- CSRF protection for state-changing operations
- Rate limiting on API endpoints (e.g., 100 requests/minute per user)
- Input validation on all user-supplied data

**Development Environment:**

- Docker Compose for local development (PostgreSQL + Redis + backend + frontend)
- Environment variables for configuration (`.env` files, never committed)
- VS Code recommended with Python, TypeScript, and ESLint extensions

**FlowBook Activity Player:**

- Interactive activities shall be rebuilt as React components from scratch
- UX and interaction patterns shall reference FlowBook screenshots for consistency
- WebAssembly reuse is OUT OF SCOPE for MVP due to integration complexity
- Activity types to support: drag-and-drop, word matching, multiple-choice, true/false, word search
- Activity rendering shall parse config.json structure from Dream Central Storage

**Excel Bulk Import Structure:**

- Required columns for student import: First Name, Last Name, Email, Grade/Class
- Optional columns: Student ID, Date of Birth, Parent Email
- Template file shall be downloadable from the admin/teacher interface
- Validation errors shall be reported line-by-line with specific error messages

---
