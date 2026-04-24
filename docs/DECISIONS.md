# Mughal Grace - Technical Decisions

This document records key architectural and technical decisions made during the development of Mughal Grace.

---

## Decision Log

### ADR-001: Multi-Tenant Architecture

**Decision**: Schema-per-tenant isolation using PostgreSQL schemas

**Context**:
Need to support multiple factories (tenants) with complete data isolation.

**Options Considered**:
1. **Single database, tenant_id column** - Simple but risk of data leakage
2. **Database per tenant** - Strong isolation but complex management
3. **Schema per tenant** - Balance of isolation and manageability

**Chosen**: Schema per tenant

**Rationale**:
- Strong data isolation at database level
- No accidental cross-tenant queries
- Easier backup/restore per tenant
- PostgreSQL handles schemas efficiently
- Single database connection management

**Trade-offs**:
- (+) Complete data isolation
- (+) Tenant-specific optimizations possible
- (-) Schema migrations apply to all tenants
- (-) Connection pool per tenant (mitigated with LRU cache)

---

### ADR-002: Authentication Strategy

**Decision**: JWT tokens stored in httpOnly cookies

**Context**:
Need secure authentication for multi-tenant SaaS application.

**Options Considered**:
1. **Session-based auth** - Server-side sessions
2. **JWT in localStorage** - Vulnerable to XSS
3. **JWT in cookies** - Secure with proper flags

**Chosen**: JWT in httpOnly cookies

**Configuration**:
```javascript
{
  httpOnly: true,      // No JavaScript access
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
}
```

**Rationale**:
- httpOnly prevents XSS token theft
- Secure flag ensures HTTPS
- SameSite=Strict prevents CSRF
- Automatic token sending with requests

---

### ADR-003: Frontend Framework

**Decision**: Next.js 15 with App Router

**Context**:
Need modern React framework with SSR capabilities.

**Options Considered**:
1. **Create React App** - Client-side only
2. **Next.js Pages Router** - Proven but older
3. **Next.js App Router** - Modern, React 19 support
4. **Remix** - Alternative full-stack framework

**Chosen**: Next.js 15 App Router

**Rationale**:
- Server components for better performance
- Built-in routing
- API routes (not used, separate Express API)
- Strong TypeScript support
- React 19 compatibility
- Large ecosystem

---

### ADR-004: State Management

**Decision**: React Query + Context API

**Context**:
Need to manage server state and minimal client state.

**Options Considered**:
1. **Redux** - Powerful but boilerplate heavy
2. **Zustand** - Simple but another dependency
3. **React Query + Context** - Server state + minimal client state

**Chosen**: React Query + Context API

**Rationale**:
- React Query handles all server state (caching, refetching)
- Context API sufficient for auth, toast notifications
- No need for complex client-side state
- Automatic cache invalidation
- Optimistic updates built-in

---

### ADR-005: API Design

**Decision**: RESTful API with Express.js

**Context**:
Need backend API for frontend consumption.

**Options Considered**:
1. **GraphQL** - Flexible queries but complex
2. **REST** - Well-understood, simple
3. **tRPC** - Type-safe but requires monorepo setup

**Chosen**: REST with Express.js

**Rationale**:
- Team familiarity with REST
- Simpler implementation
- Clear resource-based endpoints
- Easy to document
- Standard HTTP caching

**API Conventions**:
```
GET    /api/v1/{resource}      # List
GET    /api/v1/{resource}/:id  # Get one
POST   /api/v1/{resource}      # Create
PUT    /api/v1/{resource}/:id  # Update
DELETE /api/v1/{resource}/:id  # Delete
```

---

### ADR-006: Database ORM

**Decision**: Prisma ORM

**Context**:
Need database abstraction for PostgreSQL.

**Options Considered**:
1. **Raw SQL** - Full control but tedious
2. **Knex.js** - Query builder, migrations
3. **TypeORM** - Decorator-based ORM
4. **Prisma** - Modern, type-safe ORM

**Chosen**: Prisma

**Rationale**:
- Excellent TypeScript integration
- Auto-generated types from schema
- Powerful migrations
- Prisma Studio for debugging
- Schema-first approach
- Multi-schema support

---

### ADR-007: Validation Strategy

**Decision**: Zod for both frontend and backend validation

**Context**:
Need consistent input validation across stack.

**Options Considered**:
1. **Joi** - Backend only, no TypeScript inference
2. **Yup** - Good but less TypeScript support
3. **Zod** - TypeScript-first validation

**Chosen**: Zod

**Rationale**:
- TypeScript-first design
- Infers types from schemas
- Works with React Hook Form
- Same schemas frontend/backend
- Composable schemas

---

### ADR-008: Role-Based Access Control

**Decision**: 7-role RBAC with module permissions

**Context**:
Need flexible access control for different user types.

**Roles Defined**:
| Role | Level | Access |
|------|-------|--------|
| SUPER_ADMIN | Platform | All tenants |
| FACTORY_OWNER | Tenant | All modules |
| MANAGER | Operational | Most modules |
| SUPERVISOR | Floor | Production modules |
| OPERATOR | Limited | Production entry |
| ACCOUNTANT | Finance | Finance modules |
| VIEWER | Read-only | View all |

**Rationale**:
- Covers all factory personnel types
- Clear hierarchy
- Module-based granularity
- Super Admin for platform ops

---

### ADR-009: AI Integration

**Decision**: Claude (Anthropic) for AI assistant

**Context**:
Need AI capabilities for natural language queries.

**Options Considered**:
1. **OpenAI GPT-4** - Popular but expensive
2. **Claude** - Strong reasoning, safer
3. **Local LLM** - Privacy but limited capability

**Chosen**: Claude (Anthropic)

**Rationale**:
- Strong reasoning capabilities
- Better at following instructions
- Safer outputs
- Good context handling
- Competitive pricing

**Implementation**:
- Intent classification first
- Tenant-scoped queries
- Read-only operations (Phase 1)
- Bilingual support (English/Urdu)

---

### ADR-010: Styling Approach

**Decision**: Tailwind CSS with CVA (Class Variance Authority)

**Context**:
Need consistent, maintainable styling.

**Options Considered**:
1. **CSS Modules** - Scoped but verbose
2. **Styled Components** - Runtime cost
3. **Tailwind CSS** - Utility-first, fast

**Chosen**: Tailwind CSS + CVA

**Rationale**:
- Rapid development
- Consistent design tokens
- No CSS file management
- CVA for variant handling
- Small production bundle

---

### ADR-011: Form Handling

**Decision**: React Hook Form with Zod resolvers

**Context**:
Need performant form handling with validation.

**Options Considered**:
1. **Controlled forms** - Re-renders on every keystroke
2. **Formik** - Established but slower
3. **React Hook Form** - Uncontrolled, fast

**Chosen**: React Hook Form

**Rationale**:
- Minimal re-renders
- Zod integration via resolvers
- TypeScript support
- Easy validation
- DevTools available

---

### ADR-012: Deployment Platform

**Decision**: Railway for both API and Frontend

**Context**:
Need simple deployment for full-stack app.

**Options Considered**:
1. **Vercel** - Great for Next.js, limited for Express
2. **AWS** - Powerful but complex
3. **Railway** - Simple, supports both
4. **DigitalOcean** - Good but more manual

**Chosen**: Railway

**Rationale**:
- Simple deployment from GitHub
- Supports Node.js and Next.js
- Built-in PostgreSQL
- Environment variables
- Auto-deploy on push
- Reasonable pricing

---

### ADR-013: Connection Pooling

**Decision**: LRU cache for Prisma clients (50 max, 30-min TTL)

**Context**:
Schema-per-tenant requires separate Prisma clients.

**Problem**:
- Each tenant needs its own Prisma client
- Creating client per request is slow
- Keeping all clients in memory wastes resources

**Solution**:
```javascript
const clientCache = new LRUCache({
  max: 50,           // Max clients
  ttl: 30 * 60 * 1000  // 30 minutes
});
```

**Rationale**:
- LRU evicts least recently used
- TTL prevents stale connections
- 50 concurrent tenants supported
- Graceful cleanup on eviction

---

### ADR-014: Error Handling

**Decision**: Centralized AppError class with error handler middleware

**Context**:
Need consistent error responses across API.

**Implementation**:
```javascript
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }

  static badRequest(message) {
    return new AppError(message, 400, 'BAD_REQUEST');
  }

  static notFound(resource) {
    return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  static unauthorized(message) {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }
}
```

**Rationale**:
- Consistent error structure
- HTTP status code mapping
- Error codes for client handling
- Stack traces in development only

---

### ADR-015: Security Headers

**Decision**: Helmet.js with strict configuration

**Context**:
Need security headers for API protection.

**Headers Applied**:
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection
- Strict-Transport-Security

**Rationale**:
- Industry standard protection
- Easy to configure
- Covers OWASP recommendations

---

### ADR-016: Rate Limiting

**Decision**: 100 requests per 15 minutes in production

**Context**:
Need protection against abuse.

**Configuration**:
```javascript
{
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests'
}
```

**Rationale**:
- Prevents brute force attacks
- Limits scraping
- Higher limit in development
- Per-IP tracking

---

### ADR-017: Audit Logging

**Decision**: Database-based audit log with user/entity tracking

**Context**:
Need audit trail for compliance.

**Logged Data**:
- User ID
- Action type
- Entity type and ID
- Before/after values
- IP address
- Timestamp

**Rationale**:
- Compliance requirements
- Debug/troubleshooting
- User accountability
- Historical tracking

---

### ADR-018: File Upload

**Decision**: Multer with disk storage (development), S3 (production)

**Context**:
Need file upload for Excel imports.

**Configuration**:
- Max file size: 10MB
- Allowed types: xlsx, xls, csv
- Disk storage in development
- S3 planned for production

**Rationale**:
- Multer is Express standard
- Easy to switch storage backends
- Size limits for security

---

### ADR-019: Development Authentication Bypass

**Decision**: Optional dev bypass with environment variable secret

**Context**:
Need easier testing during development.

**Implementation**:
```javascript
if (process.env.NODE_ENV !== 'production') {
  const devAuth = req.headers['x-dev-auth'];
  if (devAuth === process.env.DEV_AUTH_SECRET) {
    // Bypass JWT validation
  }
}
```

**Rationale**:
- Faster development iteration
- Requires secret token (not exposed)
- Disabled in production
- Clear audit trail

---

### ADR-020: Monorepo Structure

**Decision**: pnpm workspaces with apps/ and packages/

**Context**:
Need to manage multiple applications.

**Structure**:
```
mughal-grace/
├── apps/
│   ├── api/
│   ├── frontend/
│   ├── whatsapp-api/
│   └── ai-service/
├── packages/
│   └── shared/
└── pnpm-workspace.yaml
```

**Rationale**:
- Shared dependencies
- Consistent versioning
- Single repository
- Easy CI/CD
- Type sharing possible

---

## Pending Decisions

### PD-001: Caching Strategy
- Redis vs in-memory
- What to cache
- Cache invalidation

### PD-002: Background Jobs
- Bull vs Agenda
- Job queue for heavy tasks
- Email notifications

### PD-003: Real-time Updates
- WebSockets vs SSE
- Live dashboard updates
- Notification system

### PD-004: Mobile App
- React Native vs Flutter
- Shared code with web
- Offline support

---

## Decision Template

```markdown
### ADR-XXX: [Title]

**Decision**: [One sentence]

**Context**: [Why needed]

**Options Considered**:
1. Option A - pros/cons
2. Option B - pros/cons

**Chosen**: [Which option]

**Rationale**: [Why this option]

**Trade-offs**:
- (+) Benefit
- (-) Drawback
```
