# Mughal Grace Documentation

Welcome to the Mughal Grace technical documentation.

## Documentation Index

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, tech stack, deployment |
| [DATABASE.md](./DATABASE.md) | Database schema, models, relationships |
| [FEATURES.md](./FEATURES.md) | Complete feature documentation |
| [DECISIONS.md](./DECISIONS.md) | Technical decisions and rationale (ADRs) |

---

## Quick Overview

**Mughal Grace** is a multi-tenant Factory Intelligence System (ERP) for knitting textile factories.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Express.js, Node.js, Prisma ORM |
| Database | PostgreSQL (multi-schema) |
| AI | Claude (Anthropic) |
| Deployment | Railway |

### Key Features

- Multi-tenant with schema-per-tenant isolation
- Yarn inventory and purchase management
- Production tracking and efficiency
- Roll and dyeing operations
- Sales orders and customer management
- Accounts receivable and payable
- AI-powered chat assistant
- Role-based access control (7 roles)

### Getting Started

```bash
# Install dependencies
pnpm install

# Set environment variables
cp apps/api/.env.example apps/api/.env
cp apps/frontend/.env.example apps/frontend/.env.local

# Run database migrations
pnpm db:migrate:deploy

# Start development servers
pnpm dev
```

### Project Structure

```
mughal-grace/
├── apps/
│   ├── api/          # Express.js backend
│   └── frontend/     # Next.js frontend
├── packages/
│   └── shared/       # Shared utilities
├── docs/             # Documentation
└── infra/            # Infrastructure
```

---

## Contact

For questions or support, contact the development team.
