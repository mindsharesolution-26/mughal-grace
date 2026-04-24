# Mughal Grace - Textile ERP System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Core Modules](#core-modules)
6. [Workflow Diagrams](#workflow-diagrams)
7. [API Endpoints](#api-endpoints)
8. [Getting Started](#getting-started)

---

## System Overview

**Mughal Grace** is a comprehensive **Textile ERP (Enterprise Resource Planning)** system designed specifically for knitting/textile manufacturing operations. It manages the complete production lifecycle from raw materials (yarn) to finished products (fabric rolls).

### Key Business Processes
- **Yarn Management** - Procurement, inventory, and vendor management
- **Production Management** - Daily production tracking with machine assignments
- **Fabric/Product Management** - Product catalog with approval workflow
- **Inventory Management** - Stock in/out tracking with real-time balances
- **Machine Management** - Knitting machine tracking and maintenance
- **Needle Management** - Needle installation, damage tracking, and stock
- **Financial Management** - Payables, receivables, and cheque management
- **Reporting** - Production logs, ledgers, and analytics

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.x | React framework with App Router |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| React Hook Form | - | Form handling |
| Zod | - | Schema validation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Express.js | 4.x | HTTP server |
| TypeScript | 5.x | Type safety |
| Prisma | 6.x | ORM |
| PostgreSQL | 15.x | Database (Supabase) |
| JWT | - | Authentication |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Supabase | PostgreSQL database hosting |
| pnpm | Package manager |
| tsx | TypeScript execution |

---

## Architecture

```
                                    MUGHAL GRACE ARCHITECTURE
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|    +-------------------+              +-------------------+              +-------------+  |
|    |                   |    HTTP      |                   |    SQL       |             |  |
|    |  FRONTEND (3001)  | <----------> |   BACKEND (3000)  | <----------> |  SUPABASE   |  |
|    |    Next.js 15     |    REST      |    Express.js     |   Prisma     | PostgreSQL  |  |
|    |                   |              |                   |              |             |  |
|    +-------------------+              +-------------------+              +-------------+  |
|           |                                   |                                           |
|           v                                   v                                           |
|    +-------------+                    +---------------+                                   |
|    | AuthContext |                    |  Middleware   |                                   |
|    | ToastContext|                    |  - auth       |                                   |
|    | ChatContext |                    |  - tenant     |                                   |
|    +-------------+                    |  - rbac       |                                   |
|                                       |  - validate   |                                   |
|                                       +---------------+                                   |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

### Multi-Tenant Architecture

The system uses a **multi-schema** approach for multi-tenancy:
- `public` schema - Shared system tables (tenants, super admin)
- `tenant_template` schema - Tenant-specific data

```
+------------------+
|  PUBLIC SCHEMA   |
+------------------+
| - Tenants        |
| - SuperAdmin     |
+------------------+
        |
        | References
        v
+----------------------+
| TENANT_TEMPLATE      |
+----------------------+
| - Users              |
| - Products           |
| - Fabrics            |
| - Machines           |
| - Yarn               |
| - Stock Movements    |
| - ... (all business) |
+----------------------+
```

---

## Database Schema

### Core Entity Relationships

```
                           DATABASE ENTITY RELATIONSHIPS
+-------------------------------------------------------------------------------------------+

                    MASTER DATA                              TRANSACTIONAL DATA
            +------------------------+              +--------------------------------+
            |                        |              |                                |
            |  +------------+        |              |  +---------------+             |
            |  | Department |<-------+----+        |  |   Product     |             |
            |  +------------+        |    |        |  +---------------+             |
            |        ^               |    |        |  | - name        |             |
            |        |               |    +--------+--| - qrCode      |             |
            |  +------------+        |    |        |  | - currentStock|             |
            |  |   Group    |<-------+----+        |  | - fabricId FK |----------+  |
            |  +------------+        |    |        |  | - machineId FK|------+   |  |
            |                        |    |        |  | - approvalStat|      |   |  |
            |  +------------+        |    +--------+--| - departmentId|      |   |  |
            |  |  Material  |<-------+----+        |  | - groupId     |      |   |  |
            |  +------------+        |    |        |  +---------------+      |   |  |
            |                        |    |        |         |               |   |  |
            |  +------------+        |    |        |         v               |   |  |
            |  |   Brand    |<-------+----+        |  +---------------+      |   |  |
            |  +------------+        |    |        |  |StockMovement  |      |   |  |
            |                        |    |        |  +---------------+      |   |  |
            |  +------------+        |    |        |  | - productId FK|      |   |  |
            |  |   Color    |<-------+----+        |  | - type IN/OUT |      |   |  |
            |  +------------+        |             |  | - quantity    |      |   |  |
            |                        |             |  | - sourceType  |      |   |  |
            |  +------------+        |             |  +---------------+      |   |  |
            |  |   Grade    |<-------+-------------+                         |   |  |
            |  +------------+        |             |                         |   |  |
            |                        |             +-------------------------+---+--+
            |  +------------+        |                                       |   |
            |  |FabricType  |<-------+                                       |   |
            |  +------------+        |             +---------------+         |   |
            |                        |             |    Machine    |<--------+   |
            |  +------------+        |             +---------------+             |
            |  |FabricComp  |<-------+             | - machineNumber|            |
            |  +------------+        |             | - gauge        |            |
            |                        |             | - diameter     |            |
            |  +------------+        |             +---------------+             |
            |  | FabricSize |<-------+                    ^                      |
            |  +------------+        |                    |                      |
            |                        |             +---------------+             |
            +------------------------+             |    Fabric     |<------------+
                                                   +---------------+
                                                   | - code        |
                                                   | - name        |
                                                   | - gsm         |
                                                   | - width       |
                                                   | - isTube      |
                                                   +---------------+
```

### Key Models

#### Product
The central entity representing finished goods (fabric rolls):
```prisma
model Product {
  id                 Int
  name               String
  articleNumber      String        // Auto-generated: ART-0001
  qrCode             String        // Auto-generated: MG-XXXXX-XXX
  currentStock       Decimal

  // Relations
  departmentId       Int?
  groupId            Int?
  materialId         Int?
  brandId            Int?
  colorId            Int?
  fabricSizeId       Int?
  fabricId           Int?          // Link to Fabric master
  machineId          Int?          // Production machine
  gradeId            Int?
  fabricTypeId       Int?
  fabricCompositionId Int?

  // Fabric Properties
  gsm                Decimal?
  width              Decimal?
  widthUnit          String?       // inch, cm
  isTube             Boolean

  // Approval Workflow
  approvalStatus     ProductApprovalStatus  // PENDING, APPROVED, REJECTED
  approvedBy         Int?
  approvedAt         DateTime?
  rejectionReason    String?
  createdBy          Int?
}
```

#### Fabric (Master Data)
Template/specification for fabric types:
```prisma
model Fabric {
  id                Int
  code              String        // Auto-generated: FAB000001
  name              String
  qrPayload         String?       // QR code data

  // Relations
  departmentId      Int
  groupId           Int
  materialId        Int?
  brandId           Int?
  colorId           Int?
  machineId         Int?
  gradeId           Int?
  fabricTypeId      Int?
  fabricCompositionId Int?

  // Properties
  gsm               Decimal?
  width             Decimal?
  widthUnit         String?
  isTube            Boolean
}
```

#### StockMovement
Tracks all inventory changes:
```prisma
model StockMovement {
  id               Int
  productId        Int
  type             StockMovementType  // IN, OUT
  quantity         Decimal
  referenceNumber  String?            // Roll number
  sourceType       String?            // PRODUCTION, PURCHASE, ADJUSTMENT
  destinationType  String?            // SALE, TRANSFER, ADJUSTMENT
  notes            String?
  createdBy        Int?
}
```

---

## Core Modules

### 1. Authentication & Authorization

```
+------------------+     +------------------+     +------------------+
|     Login        | --> |   JWT Token      | --> |  Protected       |
|   superadmin@    |     |   Generation     |     |    Routes        |
|   mughalgrace.com|     |                  |     |                  |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                                                  +------------------+
                                                  |  RBAC Middleware |
                                                  +------------------+
                                                  | Roles:           |
                                                  | - super_admin    |
                                                  | - admin          |
                                                  | - manager        |
                                                  | - operator       |
                                                  | - viewer         |
                                                  +------------------+
```

### 2. Product Management

**Features:**
- Create/Edit/View products
- Auto-generate QR codes and article numbers
- Link to Fabric master data
- Approval workflow for non-admin users
- Stock tracking with ledger view

### 3. Production Management (Daily Production)

**Features:**
- Scan product QR code or select product
- Enter weight (kg) for production roll
- Auto-generate roll numbers
- Assign to machine
- Real-time production logs
- Daily summary reports

### 4. Inventory Management

**Features:**
- Stock In (purchases, production)
- Stock Out (sales, transfers)
- Warehouse management
- Low stock alerts
- Transaction history

### 5. Yarn Management

**Features:**
- Yarn types and inventory
- Vendor management
- Pay orders
- Inward/Outward tracking
- Yarn ledger

### 6. Machine Management

**Features:**
- Knitting machine registration
- Machine specifications (gauge, diameter)
- Maintenance scheduling
- Production assignment

### 7. Needle Management

**Features:**
- Needle types and specifications
- Installation on machines
- Damage tracking and reporting
- Stock management

### 8. Financial Management

**Features:**
- Payables (suppliers)
- Receivables (customers)
- Cheque management
- Aging reports

### 9. Settings (Master Data)

**Master Data Entities:**
- Departments
- Groups
- Materials
- Brands
- Colors
- Grades
- Fabric Types
- Fabric Compositions
- Fabric Sizes
- Fabric Forms
- Units
- Machine Sizes

---

## Workflow Diagrams

### Product Creation & Approval Workflow

```
                        PRODUCT CREATION & APPROVAL FLOW

    +----------------+      +------------------+      +------------------+
    |                |      |                  |      |                  |
    |  Regular User  |----->|  Create Product  |----->|  Status: PENDING |
    |                |      |                  |      |                  |
    +----------------+      +------------------+      +--------+---------+
                                                               |
                                                               v
                            +------------------+      +------------------+
                            |                  |      |                  |
                            |   Admin Review   |<-----|  Awaiting Admin  |
                            |                  |      |    Approval      |
                            +--------+---------+      +------------------+
                                     |
                     +---------------+---------------+
                     |                               |
                     v                               v
            +------------------+            +------------------+
            |                  |            |                  |
            | Status: APPROVED |            | Status: REJECTED |
            |  (Visible to all)|            | (With reason)    |
            |                  |            |                  |
            +------------------+            +------------------+

    +----------------+      +------------------+      +------------------+
    |                |      |                  |      |                  |
    |  Admin/Super   |----->|  Create Product  |----->| Status: APPROVED |
    |    Admin       |      |                  |      |  (Auto-approved) |
    +----------------+      +------------------+      +------------------+
```

### Daily Production Flow

```
                           DAILY PRODUCTION WORKFLOW

+-------------+     +---------------+     +---------------+     +---------------+
|             |     |               |     |               |     |               |
| Select/Scan |---->| Enter Weight  |---->| Select Machine|---->| Preview Entry |
|  Product    |     |    (kg)       |     |   (Optional)  |     |               |
|             |     |               |     |               |     |               |
+-------------+     +---------------+     +---------------+     +------+--------+
                                                                       |
                                                                       v
                                                               +---------------+
                                                               |               |
                                                               | Confirm Entry |
                                                               |               |
                                                               +-------+-------+
                                                                       |
                    +--------------------------------------------------+
                    |
                    v
+-------------------+-------------------+-------------------+
|                   |                   |                   |
| Create Stock      | Generate Roll     | Update Product    |
| Movement (IN)     | Number            | Current Stock     |
| type: PRODUCTION  | (Auto-increment)  | (+= weight)       |
|                   |                   |                   |
+-------------------+-------------------+-------------------+
                    |
                    v
            +---------------+
            |               |
            | Production    |
            | Log Entry     |
            | Created       |
            |               |
            +---------------+
```

### Stock Movement Flow

```
                           STOCK MOVEMENT WORKFLOW

                    +-------------------+
                    |                   |
                    |   Stock Movement  |
                    |                   |
                    +---------+---------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
    +-------------------+           +-------------------+
    |                   |           |                   |
    |    STOCK IN       |           |    STOCK OUT      |
    |                   |           |                   |
    +-------------------+           +-------------------+
    | Source Types:     |           | Dest Types:       |
    | - PRODUCTION      |           | - SALE            |
    | - PURCHASE        |           | - TRANSFER        |
    | - RETURN          |           | - ADJUSTMENT      |
    | - ADJUSTMENT      |           | - DAMAGE          |
    +--------+----------+           +---------+---------+
             |                                |
             v                                v
    +-------------------+           +-------------------+
    | Product Stock     |           | Product Stock     |
    | += quantity       |           | -= quantity       |
    +-------------------+           +-------------------+
             |                                |
             +----------------+---------------+
                              |
                              v
                    +-------------------+
                    |                   |
                    |  Ledger Entry     |
                    |  with Running     |
                    |  Balance          |
                    |                   |
                    +-------------------+
```

### Fabric-Product Relationship

```
                    FABRIC & PRODUCT RELATIONSHIP

+-------------------------+          +-------------------------+
|      FABRIC (Master)    |          |        PRODUCT          |
+-------------------------+          +-------------------------+
|                         |          |                         |
| Fabric is a TEMPLATE    |    1:N   | Product is an INVENTORY |
| or SPECIFICATION        |<-------->| item with STOCK         |
|                         |          |                         |
| - Defines fabric specs  |          | - Can reference Fabric  |
| - Created by Admin      |          | - Has QR code           |
| - No stock tracking     |          | - Tracks current stock  |
| - Used for consistency  |          | - Has approval workflow |
|                         |          |                         |
+-------------------------+          +-------------------------+

Example:
+-------------------------+          +-------------------------+
| Fabric: "Single Jersey  |          | Product: "SJ Cotton     |
|          Cotton 180gsm" |          |           Roll #1234"   |
+-------------------------+          +-------------------------+
| code: FAB000042         |   refs   | articleNumber: ART-0156 |
| gsm: 180                |--------->| qrCode: MG-XXX-YYY      |
| width: 48 inch          |          | currentStock: 250 kg    |
| fabricType: Single Jersey          | fabricId: 42            |
| composition: 100% Cotton|          | status: APPROVED        |
+-------------------------+          +-------------------------+
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| GET | `/api/v1/auth/me` | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List all products |
| GET | `/api/v1/products/lookup` | Lightweight list for dropdowns |
| GET | `/api/v1/products/pending-approval` | List pending products (admin) |
| GET | `/api/v1/products/:id` | Get product details |
| GET | `/api/v1/products/:id/ledger` | Get product ledger |
| GET | `/api/v1/products/:id/stock-history` | Get stock history |
| GET | `/api/v1/products/search-by-qr/:qrCode` | Search by QR |
| GET | `/api/v1/products/production-logs` | Get production logs |
| POST | `/api/v1/products` | Create product |
| POST | `/api/v1/products/:id/approve` | Approve product |
| POST | `/api/v1/products/:id/reject` | Reject product |
| POST | `/api/v1/products/stock-movement` | Record stock movement |
| PUT | `/api/v1/products/:id` | Update product |
| DELETE | `/api/v1/products/:id` | Deactivate product |

### Fabrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/fabrics` | List all fabrics |
| GET | `/api/v1/fabrics/:id` | Get fabric details |
| POST | `/api/v1/fabrics` | Create fabric |
| PUT | `/api/v1/fabrics/:id` | Update fabric |
| DELETE | `/api/v1/fabrics/:id` | Delete fabric |

### Machines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/machines` | List all machines |
| GET | `/api/v1/machines/lookup` | Lightweight list |
| GET | `/api/v1/machines/:id` | Get machine details |
| POST | `/api/v1/machines` | Create machine |
| PUT | `/api/v1/machines/:id` | Update machine |
| DELETE | `/api/v1/machines/:id` | Delete machine |

### Settings (Master Data)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/settings/departments` | List departments |
| GET | `/api/v1/settings/groups` | List groups |
| GET | `/api/v1/settings/materials` | List materials |
| GET | `/api/v1/settings/brands` | List brands |
| GET | `/api/v1/settings/colors` | List colors |
| GET | `/api/v1/settings/grades` | List grades |
| GET | `/api/v1/settings/fabric-types` | List fabric types |
| GET | `/api/v1/settings/fabric-compositions` | List compositions |

### Yarn Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/yarn` | List yarn inventory |
| GET | `/api/v1/yarn/vendors` | List yarn vendors |
| GET | `/api/v1/yarn/pay-orders` | List pay orders |
| POST | `/api/v1/yarn/inward` | Record yarn inward |
| POST | `/api/v1/yarn/outward` | Record yarn outward |

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 8+
- PostgreSQL database (Supabase recommended)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd mughal-grace

# Install dependencies
pnpm install

# Setup environment variables
cp apps/api/.env.example apps/api/.env
cp apps/frontend/.env.example apps/frontend/.env.local

# Edit .env files with your database credentials

# Generate Prisma client
cd apps/api
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial data (optional)
npm run db:seed
```

### Running the Application

```bash
# Terminal 1: Start API server
cd apps/api
npm run dev
# API runs on http://localhost:3000

# Terminal 2: Start Frontend
cd apps/frontend
npm run dev
# Frontend runs on http://localhost:3001
```

### Default Credentials
| User | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@mughalgrace.com | Admin@123 |

---

## Directory Structure

```
mughal-grace/
├── apps/
│   ├── api/                      # Backend Express.js API
│   │   ├── prisma/
│   │   │   └── schema.prisma     # Database schema
│   │   └── src/
│   │       ├── controllers/      # Request handlers
│   │       ├── middleware/       # Auth, RBAC, validation
│   │       ├── routes/           # API route definitions
│   │       ├── services/         # Business logic
│   │       └── utils/            # Helpers
│   │
│   └── frontend/                 # Next.js 15 Frontend
│       ├── app/
│       │   ├── (authenticated)/  # Protected routes
│       │   │   ├── dashboard/
│       │   │   ├── products/
│       │   │   ├── production/
│       │   │   ├── inventory/
│       │   │   ├── yarn/
│       │   │   ├── machines/
│       │   │   ├── needles/
│       │   │   ├── settings/
│       │   │   └── ...
│       │   └── login/           # Public routes
│       ├── components/          # Reusable UI components
│       ├── contexts/            # React contexts
│       └── lib/
│           ├── api/             # API client functions
│           └── types/           # TypeScript types
│
├── docs/                        # Documentation
└── package.json                 # Monorepo config
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial release |
| 1.1.0 | 2025 | Added Fabric-Product relationship |
| 1.2.0 | 2025 | Added Product approval workflow |

---

*Documentation generated on April 2026*
