# Technology Stack

This document provides a comprehensive overview of the technology choices for Dream LMS, including versions, purposes, and rationale.

## Frontend Stack

| Technology | Version | Purpose | Rationale |
|-----------|---------|---------|-----------|
| **React** | 18.x | UI library | Concurrent features, large ecosystem, component reusability |
| **Vite** | 5.x | Build tool & dev server | Fast HMR, optimized production builds, modern ESM support |
| **TypeScript** | 5.x | Type safety | Catches errors at compile-time, better IDE support, self-documenting code |
| **Tailwind CSS** | 3.x | Utility-first styling | Rapid UI development, small bundle size, consistent design system |
| **Shadcn UI** | Latest | Component library | Built on Radix UI primitives, accessible, customizable, copy-paste components |
| **TanStack Query** | 5.x | Server state management | Automatic caching, background refetching, optimistic updates |
| **Zustand** | 4.x | Client state management | Lightweight (1KB), simple API, no boilerplate, TypeScript support |
| **React Hook Form** | 7.x | Form handling | Minimal re-renders, easy validation, great DX |
| **Zod** | 3.x | Schema validation | Type-safe validation, composable schemas, shared with backend |
| **Recharts** | 2.x | Data visualization | Declarative API, responsive charts, built on D3.js |
| **React Router** | 6.x | Client-side routing | Standard routing solution, type-safe routes |

## Backend Stack

| Technology | Version | Purpose | Rationale |
|-----------|---------|---------|-----------|
| **Python** | 3.11+ | Programming language | Modern syntax, async/await support, performance improvements, rich ecosystem |
| **FastAPI** | 0.110+ | Web framework | Async by default, automatic OpenAPI docs, built-in validation with Pydantic |
| **Uvicorn** | Latest | ASGI server | High-performance async server, WebSocket support |
| **Gunicorn** | Latest | Process manager | Multi-worker management, production-ready, graceful restarts |
| **SQLAlchemy** | 2.0+ | ORM | Async support, mature ecosystem, flexible query API |
| **Alembic** | Latest | Database migrations | Industry standard, version control for database schema |
| **Pydantic** | 2.x | Data validation | Built into FastAPI, runtime validation, automatic OpenAPI schema generation |
| **python-jose** | Latest | JWT handling | JWT creation/validation, secure token management |
| **passlib[bcrypt]** | Latest | Password hashing | Industry-standard bcrypt hashing, secure password storage |
| **httpx** | Latest | Async HTTP client | Used for Dream Central Storage API calls, async/await support |

## Database & Cache

| Technology | Version | Purpose | Rationale |
|-----------|---------|---------|-----------|
| **PostgreSQL** | 15+ | Primary database | ACID compliance, excellent JSON support (JSONB), advanced indexing, mature |
| **Redis** | 7.x | Cache layer (optional) | Fast in-memory storage, session management, query result caching |

## Infrastructure & DevOps

| Technology | Version | Purpose | Rationale |
|-----------|---------|---------|-----------|
| **Nginx** | 1.24+ | Reverse proxy | SSL termination, static file serving, load balancing, rate limiting |
| **Docker** | 24.x | Containerization | Consistent environments, easy deployment, isolated services |
| **Docker Compose** | 2.x | Local orchestration | Simple multi-container setup, good for MVP deployment |
| **Let's Encrypt** | Latest | SSL certificates | Free HTTPS, automatic renewal via Certbot |

## External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| **Dream Central Storage** | S3-compatible object storage (MinIO) | Book assets, audio files, teacher materials via pre-signed URLs |

## Development Tools

| Tool | Purpose |
|------|---------|
| **pytest** | Backend testing framework |
| **Vitest** | Frontend testing framework |
| **Testing Library** | Component testing utilities |
| **ESLint** | JavaScript/TypeScript linting |
| **Prettier** | Code formatting |
| **Black** | Python code formatting |
| **mypy** | Python static type checking |

## Architecture Decisions

### Why Monolithic Backend?

- **Simplicity**: Single deployment unit, easier to develop and debug
- **Cost-effective**: Runs on single VPS, sufficient for 100-1000 concurrent users
- **Future-proof**: Clean module boundaries allow microservice extraction when needed
- **Faster MVP**: No distributed system complexity during initial development

### Why FastAPI over Flask/Django?

- **Async by default**: Better performance for I/O-bound operations
- **Automatic documentation**: OpenAPI/Swagger docs generated automatically
- **Type safety**: Built-in Pydantic validation catches errors early
- **Modern Python**: Full async/await support, Python 3.11+ features

### Why PostgreSQL over NoSQL?

- **ACID transactions**: Critical for assignment submissions, user management
- **Complex queries**: Analytics require joins, aggregations
- **JSONB support**: Flexible activity configurations without sacrificing relational integrity
- **Mature ecosystem**: Excellent ORM support, migration tools, monitoring

### Why React over Vue/Svelte?

- **Ecosystem**: Largest component library selection, extensive documentation
- **Team familiarity**: Most developers know React
- **Job market**: Easier to find React developers
- **Enterprise adoption**: Used by major companies, proven at scale

### Why TanStack Query over Redux?

- **Server state focus**: Designed specifically for API data
- **Less boilerplate**: No actions, reducers, or middleware to configure
- **Better caching**: Automatic background refetching, stale-while-revalidate
- **Smaller bundle**: Zustand (1KB) + TanStack Query vs Redux + RTK

## Version Pinning Strategy

- **Major versions**: Pinned in package.json/requirements.txt
- **Minor versions**: Allow updates (^) for security patches
- **Production deploys**: Lock file ensures reproducible builds
- **Update cadence**: Review dependencies quarterly, security patches immediately

## Technology Upgrade Path

### Scaling Triggers

| Metric | Monolith OK | Consider Microservices |
|--------|-------------|------------------------|
| Concurrent users | < 1,000 | > 5,000 |
| Database size | < 100GB | > 500GB |
| Request latency | < 200ms | > 500ms |
| Team size | < 10 | > 20 |

### Potential Future Migrations

1. **Redis caching**: Add when PostgreSQL queries slow down
2. **CDN**: Add when serving global users
3. **Microservices**: Extract analytics engine if it becomes bottleneck
4. **Kubernetes**: Replace Docker Compose when horizontal scaling needed
5. **Message queue**: Add RabbitMQ/Redis for background jobs if async tasks grow

## Security Considerations

- **JWT tokens**: Short-lived access tokens (1 hour), long-lived refresh tokens
- **Password hashing**: bcrypt with 12 rounds (configurable)
- **SQL injection**: Prevented by SQLAlchemy ORM parameterized queries
- **XSS prevention**: React's automatic escaping, Content Security Policy headers
- **CORS**: Configured to allow only frontend domain
- **Rate limiting**: Nginx-level (100 req/min) + application-level per endpoint

## Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Page load | < 2s | Code splitting, lazy loading, CDN for static assets |
| API response | < 200ms | Database indexing, query optimization, optional Redis caching |
| Activity player load | < 1s | Pre-signed URL caching, image optimization, progressive loading |
| Analytics dashboard | < 3s | Materialized views, aggregated tables, background computation |

---

**Last Updated**: 2025-10-24
**Version**: 1.0
**Maintained by**: Architecture Team
