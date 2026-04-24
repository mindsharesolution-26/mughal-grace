# Mughal Grace - System Architecture

## Overview

**Mughal Grace** is a multi-tenant SaaS Factory Intelligence System (ERP) for knitting textile factories.

| Attribute | Value |
|-----------|-------|
| **Type** | Full-stack Monorepo |
| **Version** | 1.0.4 |
| **Pattern** | Multi-tenant with schema-per-tenant isolation |
| **Package Manager** | pnpm v9.0.0 |
| **Node Version** | >= 20.0.0 |

---

## Monorepo Structure

```
mughal-grace/
├── apps/
│   ├── api/                    # Express.js Backend API
│   ├── frontend/               # Next.js React Frontend
│   ├── whatsapp-api/          # WhatsApp Integration (future)
│   └── ai-service/            # AI/ML Services (future)
├── packages/
│   └── shared/                 # Shared utilities and types
├── infra/                      # Infrastructure configs
├── docs/                       # Documentation
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

---

## Backend Architecture (apps/api)

### Directory Structure

```
apps/api/src/
├── index.ts                    # Entry point
├── app.ts                      # Express configuration
├── config/                     # Environment config
├── controllers/                # Request handlers
├── routes/                     # 26 route modules
├── middleware/                 # Auth, Tenant, RBAC, Validation
├── services/                   # Business logic
│   ├── ai/                    # Claude AI integration
│   ├── chat/                  # Chat service
│   └── superadmin.service.ts  # Admin operations
├── utils/                      # Utilities
├── validators/                 # Zod schemas
└── prisma/
    └── schema.prisma          # Database schema
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Express.js 4.21 | HTTP server |
| Database | PostgreSQL + Prisma 6.3 | Multi-tenant data |
| Auth | JWT + bcryptjs | Token-based auth |
| Validation | Zod 3.24 | Input validation |
| AI | Anthropic SDK | Claude API |
| Caching | Redis/IORedis | Session/data caching |
| Security | Helmet, CORS, Rate Limiting | API protection |

### Middleware Stack

```
Request
  ↓
[Helmet] Security headers
  ↓
[CORS] Origin validation
  ↓
[Rate Limiter] 100 req/15min (prod)
  ↓
[Auth Middleware] JWT validation
  ↓
[Tenant Middleware] Schema routing
  ↓
[RBAC Middleware] Permission check
  ↓
[Validation] Zod schema validation
  ↓
Route Handler
  ↓
[Error Handler] Centralized errors
  ↓
Response
```

### Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────┐
│                   PostgreSQL                         │
├─────────────────────────────────────────────────────┤
│  public schema                                       │
│  ├── tenants (tenant registry)                      │
│  ├── tenant_users (admin users)                     │
│  └── audit_logs                                     │
├─────────────────────────────────────────────────────┤
│  tenant_1 schema                                     │
│  ├── yarn_types, yarn_vendors, pay_orders...        │
│  ├── machines, production_logs, rolls...            │
│  └── customers, sales_orders, ledgers...            │
├─────────────────────────────────────────────────────┤
│  tenant_2 schema                                     │
│  └── (same tables, isolated data)                   │
├─────────────────────────────────────────────────────┤
│  tenant_N schema                                     │
│  └── (same tables, isolated data)                   │
└─────────────────────────────────────────────────────┘
```

**Key Benefits:**
- Complete data isolation between tenants
- No accidental cross-tenant data leakage
- Independent backup/restore per tenant
- Scalable horizontally

---

## Frontend Architecture (apps/frontend)

### Directory Structure

```
apps/frontend/
├── app/                        # Next.js App Router
│   ├── (public)/              # Login, Register
│   └── (authenticated)/       # Protected routes
│       ├── dashboard/
│       ├── yarn/
│       ├── production/
│       ├── machines/
│       ├── rolls/
│       ├── dyeing/
│       ├── sales/
│       ├── receivables/
│       ├── payables/
│       ├── inventory/
│       ├── settings/
│       └── admin/
├── components/
│   ├── atoms/                 # Button, Input, Badge
│   ├── molecules/             # StatsCard, Tables, Modals
│   ├── organisms/             # ChatWidget, ProductFinder
│   └── templates/             # AppShell layout
├── contexts/                  # Auth, Chat, Toast
├── lib/
│   ├── api/                   # API client functions
│   ├── types/                 # TypeScript types
│   ├── config/                # Role access config
│   └── utils/                 # Utilities
└── public/                    # Static assets
```

### Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15.1 | React framework |
| React | 19.0 | UI library |
| TypeScript | 5.7 | Type safety |
| Tailwind CSS | 3.4 | Styling |
| React Query | 5.64 | Server state |
| React Hook Form | 7.54 | Forms |
| Axios | 1.7 | HTTP client |
| Recharts | 2.15 | Charts |

### Component Architecture (Atomic Design)

```
┌─────────────────────────────────────────┐
│              Templates                   │
│  (AppShell - main layout)               │
├─────────────────────────────────────────┤
│              Organisms                   │
│  (ChatWidget, ProductFinder, RouteGuard)│
├─────────────────────────────────────────┤
│              Molecules                   │
│  (StatsCard, LedgerTable, PaymentModal) │
├─────────────────────────────────────────┤
│               Atoms                      │
│  (Button, Input, Badge, StatusBadge)    │
└─────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────>│   API    │────>│    DB    │
└──────────┘     └──────────┘     └──────────┘
     │                │                │
     │  POST /login   │                │
     │  {email, pass} │                │
     │───────────────>│                │
     │                │  Verify user   │
     │                │───────────────>│
     │                │<───────────────│
     │                │                │
     │                │  Generate JWT  │
     │                │  (15min access)│
     │                │  (7d refresh)  │
     │<───────────────│                │
     │  Set cookies   │                │
     │  (httpOnly)    │                │
     │                │                │
     │  GET /api/...  │                │
     │  Cookie: token │                │
     │───────────────>│                │
     │                │  Validate JWT  │
     │                │  Extract tenant│
     │                │  Check RBAC    │
     │                │───────────────>│
     │<───────────────│<───────────────│
```

---

## Data Flow

### API Request Flow

```
1. Request arrives at Express server
2. Helmet adds security headers
3. CORS validates origin
4. Rate limiter checks request count
5. Auth middleware validates JWT
6. Tenant middleware selects schema
7. RBAC middleware checks permissions
8. Validation middleware validates input
9. Route handler processes request
10. Response sent to client
```

### Chat/AI Flow

```
User Message
    ↓
ChatService.processMessage()
    ↓
IntentClassifier (yarn/production/sales/finance)
    ↓
QueryExecutor (tenant-specific query)
    ↓
AnthropicProvider (Claude API)
    ↓
Store in ChatConversation
    ↓
Return AI Response
```

---

## Deployment Architecture

### Railway Deployment

```
┌─────────────────────────────────────────────────────┐
│                    Railway                           │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   API       │  │  Frontend   │  │  PostgreSQL │ │
│  │  Service    │  │  Service    │  │   Service   │ │
│  │  (Express)  │  │  (Next.js)  │  │             │ │
│  │  Port: $PORT│  │  Port: $PORT│  │  Port: 5432 │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │         │
│         └────────────────┼────────────────┘         │
│                          │                          │
│                   Internal Network                  │
└─────────────────────────────────────────────────────┘
```

### Environment Variables

**API Service:**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=<32+ chars>
CORS_ORIGINS=https://frontend.railway.app
ANTHROPIC_API_KEY=...
```

**Frontend Service:**
```env
NEXT_PUBLIC_API_URL=https://api.railway.app
```

---

## Security Architecture

### Layers of Protection

```
┌─────────────────────────────────────────┐
│          Security Headers (Helmet)       │
├─────────────────────────────────────────┤
│          Rate Limiting (100/15min)       │
├─────────────────────────────────────────┤
│          CORS (origin whitelist)         │
├─────────────────────────────────────────┤
│          JWT Authentication              │
├─────────────────────────────────────────┤
│          RBAC Authorization              │
├─────────────────────────────────────────┤
│          Input Validation (Zod)          │
├─────────────────────────────────────────┤
│          Schema Isolation                │
├─────────────────────────────────────────┤
│          Parameterized Queries           │
└─────────────────────────────────────────┘
```

---

## Performance Optimizations

| Layer | Optimization |
|-------|-------------|
| Database | LRU cache for Prisma clients (50 max, 30min TTL) |
| Database | Connection pooling via PgBouncer |
| API | Gzip compression |
| API | Pagination support |
| Frontend | Next.js code splitting |
| Frontend | React Query caching |
| Frontend | Lazy loading components |

---

## Scalability Considerations

1. **Horizontal Scaling**: Stateless API allows multiple instances
2. **Database**: Schema-per-tenant allows tenant-specific optimizations
3. **Caching**: Redis for session and frequently accessed data
4. **CDN**: Static assets served via Next.js optimization
5. **Background Jobs**: Separate worker processes for heavy tasks
