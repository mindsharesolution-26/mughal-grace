# Mughal Grace - Database Schema Documentation

## Overview

| Attribute | Value |
|-----------|-------|
| **Database** | PostgreSQL |
| **ORM** | Prisma 6.3.0 |
| **Schema Pattern** | Multi-schema (schema-per-tenant) |
| **Total Models** | 70+ |
| **Total Enums** | 70+ |
| **Schema Lines** | 3,387 |

---

## Schema Organization

### Public Schema (Global)
Contains tenant registry and platform-level data.

### Tenant Schemas (tenant_*)
Each tenant has isolated schema with identical table structure.

```
PostgreSQL
├── public
│   ├── Tenant
│   ├── TenantUser
│   ├── AuditLog
│   └── TenantModule
├── tenant_1
│   ├── YarnType, YarnVendor, PayOrder...
│   ├── Machine, ProductionLog, Roll...
│   └── Customer, SalesOrder, Ledger...
├── tenant_2
│   └── (same structure)
└── tenant_N
    └── (same structure)
```

---

## Core Models

### 1. Multi-Tenant Admin Layer (public schema)

#### Tenant
```prisma
model Tenant {
  id              Int           @id @default(autoincrement())
  name            String
  slug            String        @unique
  domain          String?
  ownerEmail      String
  plan            TenantPlan    @default(TRIAL)
  status          TenantStatus  @default(ACTIVE)
  trialEndsAt     DateTime?
  subscriptionEndsAt DateTime?
  settings        Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  users           TenantUser[]
  modules         TenantModule[]
}
```

#### TenantUser
```prisma
model TenantUser {
  id            Int        @id @default(autoincrement())
  tenantId      Int
  email         String
  username      String
  passwordHash  String
  fullName      String
  role          UserRole
  phone         String?
  isActive      Boolean    @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  tenant        Tenant     @relation(...)

  @@unique([tenantId, email])
  @@unique([tenantId, username])
}
```

#### Enums
```prisma
enum TenantPlan {
  TRIAL
  BASIC
  PROFESSIONAL
  ENTERPRISE
}

enum TenantStatus {
  ACTIVE
  SUSPENDED
  CANCELLED
}

enum UserRole {
  SUPER_ADMIN
  FACTORY_OWNER
  MANAGER
  SUPERVISOR
  OPERATOR
  ACCOUNTANT
  VIEWER
}
```

---

### 2. Yarn Management Module

#### YarnType
```prisma
model YarnType {
  id              Int       @id @default(autoincrement())
  name            String
  brand           String?
  color           String?
  colorCode       String?
  grade           String?
  composition     String?
  count           String?
  denier          Decimal?
  ply             Int?
  unitPrice       Decimal?
  currency        String    @default("PKR")
  minStock        Decimal?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### YarnVendor
```prisma
model YarnVendor {
  id              Int       @id @default(autoincrement())
  name            String
  contactPerson   String?
  phone           String?
  email           String?
  address         String?
  city            String?
  creditLimit     Decimal?
  paymentTerms    String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  payOrders       PayOrder[]
}
```

#### PayOrder (Purchase Order)
```prisma
model PayOrder {
  id              Int             @id @default(autoincrement())
  orderNumber     String          @unique
  vendorId        Int
  orderDate       DateTime
  expectedDate    DateTime?
  status          PayOrderStatus  @default(PENDING)
  totalAmount     Decimal?
  paidAmount      Decimal         @default(0)
  notes           String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  vendor          YarnVendor      @relation(...)
  items           PayOrderItem[]
  boxes           YarnBox[]
}

enum PayOrderStatus {
  PENDING
  PARTIAL
  COMPLETED
  CANCELLED
}
```

#### YarnBox
```prisma
model YarnBox {
  id              Int         @id @default(autoincrement())
  boxNumber       String
  payOrderId      Int?
  yarnTypeId      Int
  receivedWeight  Decimal
  currentWeight   Decimal
  coneCount       Int?
  status          BoxStatus   @default(IN_STOCK)
  receivedAt      DateTime    @default(now())
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  cones           YarnCone[]
}

enum BoxStatus {
  IN_STOCK
  PARTIAL
  EMPTY
}
```

#### YarnCone
```prisma
model YarnCone {
  id              Int         @id @default(autoincrement())
  coneNumber      String?
  boxId           Int
  initialWeight   Decimal
  currentWeight   Decimal
  status          ConeStatus  @default(AVAILABLE)
  machineId       Int?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

enum ConeStatus {
  AVAILABLE
  IN_USE
  EMPTY
}
```

#### YarnLedger
```prisma
model YarnLedger {
  id              Int       @id @default(autoincrement())
  yarnTypeId      Int
  transactionType String    // INWARD, OUTWARD, ADJUSTMENT
  quantity        Decimal
  balanceAfter    Decimal
  reference       String?
  notes           String?
  createdAt       DateTime  @default(now())
}
```

---

### 3. Production Module

#### Machine
```prisma
model Machine {
  id              Int           @id @default(autoincrement())
  machineNumber   String        @unique
  name            String?
  type            MachineType?
  brand           String?
  model           String?
  gauge           Int?
  diameter        Int?
  feeders         Int?
  status          MachineStatus @default(ACTIVE)
  location        String?
  installDate     DateTime?
  lastMaintenance DateTime?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  productionLogs  ProductionLog[]
  needleAllocations NeedleMachineAllocation[]
}

enum MachineType {
  CIRCULAR
  FLAT
  WARP
}

enum MachineStatus {
  ACTIVE
  MAINTENANCE
  IDLE
  DECOMMISSIONED
}
```

#### ProductionLog
```prisma
model ProductionLog {
  id              Int       @id @default(autoincrement())
  machineId       Int
  shiftId         Int?
  productId       Int?
  fabricId        Int?
  productionDate  DateTime
  targetWeight    Decimal?
  actualWeight    Decimal
  rollCount       Int       @default(0)
  efficiency      Decimal?
  operatorId      Int?
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  machine         Machine   @relation(...)
  yarnConsumptions YarnConsumption[]
  rolls           Roll[]
}
```

#### YarnConsumption
```prisma
model YarnConsumption {
  id              Int       @id @default(autoincrement())
  productionLogId Int
  yarnTypeId      Int
  quantity        Decimal
  coneId          Int?
  createdAt       DateTime  @default(now())
}
```

#### DowntimeLog
```prisma
model DowntimeLog {
  id              Int            @id @default(autoincrement())
  machineId       Int
  startTime       DateTime
  endTime         DateTime?
  duration        Int?           // minutes
  reason          DowntimeReason
  description     String?
  resolvedBy      Int?
  createdAt       DateTime       @default(now())
}

enum DowntimeReason {
  MECHANICAL_FAILURE
  ELECTRICAL_ISSUE
  YARN_BREAKAGE
  NEEDLE_DAMAGE
  POWER_OUTAGE
  SCHEDULED_MAINTENANCE
  OPERATOR_BREAK
  NO_YARN
  OTHER
}
```

---

### 4. Roll & Dyeing Module

#### Roll
```prisma
model Roll {
  id              Int         @id @default(autoincrement())
  rollNumber      String      @unique
  productionLogId Int?
  fabricId        Int?
  greyWeight      Decimal
  finishedWeight  Decimal?
  grade           String?     // A, B, C
  status          RollStatus  @default(GREY_STOCK)
  defects         String?
  location        String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  statusHistory   RollStatusHistory[]
  dyeingItems     DyeingOrderItem[]
}

enum RollStatus {
  GREY_STOCK
  SENT_TO_DYEING
  AT_DYEING
  RECEIVED_FROM_DYEING
  FINISHED_STOCK
  SOLD
  REJECTED
}
```

#### DyeingVendor
```prisma
model DyeingVendor {
  id              Int       @id @default(autoincrement())
  name            String
  contactPerson   String?
  phone           String?
  email           String?
  address         String?
  turnaroundDays  Int?
  qualityRating   Decimal?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  dyeingOrders    DyeingOrder[]
}
```

#### DyeingOrder
```prisma
model DyeingOrder {
  id              Int           @id @default(autoincrement())
  orderNumber     String        @unique
  vendorId        Int
  sentDate        DateTime
  expectedDate    DateTime?
  receivedDate    DateTime?
  status          DyeingStatus  @default(PENDING)
  totalGreyWeight Decimal?
  totalFinishedWeight Decimal?
  processingCost  Decimal?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  vendor          DyeingVendor  @relation(...)
  items           DyeingOrderItem[]
}

enum DyeingStatus {
  PENDING
  IN_PROCESS
  COMPLETED
  PARTIAL_RECEIVED
  CANCELLED
}
```

---

### 5. Sales Module

#### Customer
```prisma
model Customer {
  id              Int           @id @default(autoincrement())
  name            String
  customerType    CustomerType  @default(REGULAR)
  contactPerson   String?
  phone           String?
  email           String?
  address         String?
  city            String?
  creditLimit     Decimal?
  paymentTerms    String?
  openingBalance  Decimal       @default(0)
  currentBalance  Decimal       @default(0)
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  salesOrders     SalesOrder[]
  ledgerEntries   CustomerLedgerEntry[]
  payments        CustomerPayment[]
}

enum CustomerType {
  REGULAR
  WHOLESALE
  RETAIL
  EXPORT
}
```

#### SalesOrder
```prisma
model SalesOrder {
  id              Int           @id @default(autoincrement())
  orderNumber     String        @unique
  customerId      Int
  orderDate       DateTime
  deliveryDate    DateTime?
  status          OrderStatus   @default(PENDING)
  subtotal        Decimal?
  discount        Decimal       @default(0)
  tax             Decimal       @default(0)
  total           Decimal?
  paidAmount      Decimal       @default(0)
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  customer        Customer      @relation(...)
  items           SaleItem[]
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  DISPATCHED
  DELIVERED
  CANCELLED
}
```

#### CustomerLedgerEntry
```prisma
model CustomerLedgerEntry {
  id              Int       @id @default(autoincrement())
  customerId      Int
  entryDate       DateTime
  entryType       String    // INVOICE, PAYMENT, CREDIT_NOTE, DEBIT_NOTE
  reference       String?
  description     String?
  debit           Decimal   @default(0)
  credit          Decimal   @default(0)
  balance         Decimal
  createdAt       DateTime  @default(now())
  customer        Customer  @relation(...)
}
```

---

### 6. Finance Module

#### ChartOfAccount
```prisma
model ChartOfAccount {
  id              Int           @id @default(autoincrement())
  accountCode     String        @unique
  name            String
  accountType     AccountType
  accountGroup    AccountGroup
  parentId        Int?
  normalBalance   NormalBalance
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

enum AccountGroup {
  CURRENT_ASSETS
  FIXED_ASSETS
  CURRENT_LIABILITIES
  LONG_TERM_LIABILITIES
  EQUITY
  OPERATING_REVENUE
  OTHER_REVENUE
  COST_OF_GOODS_SOLD
  OPERATING_EXPENSES
  OTHER_EXPENSES
}

enum NormalBalance {
  DEBIT
  CREDIT
}
```

#### JournalEntry
```prisma
model JournalEntry {
  id              Int               @id @default(autoincrement())
  entryNumber     String            @unique
  entryDate       DateTime
  entryType       JournalEntryType
  status          JournalStatus     @default(DRAFT)
  description     String?
  reference       String?
  totalDebit      Decimal
  totalCredit     Decimal
  postedAt        DateTime?
  postedBy        Int?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  lines           JournalLine[]
}

enum JournalEntryType {
  GENERAL
  SALES
  PURCHASE
  RECEIPT
  PAYMENT
  ADJUSTMENT
}

enum JournalStatus {
  DRAFT
  POSTED
  VOIDED
}
```

---

### 7. Inventory & Warehouse

#### Warehouse
```prisma
model Warehouse {
  id              Int           @id @default(autoincrement())
  code            String        @unique
  name            String
  locationType    LocationType
  address         String?
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  stockLevels     StockLevel[]
}

enum LocationType {
  WAREHOUSE
  SHOP_FLOOR
  TRANSIT
  QUALITY_HOLD
  RETURNS
}
```

#### StockItem
```prisma
model StockItem {
  id              Int             @id @default(autoincrement())
  sku             String          @unique
  name            String
  description     String?
  categoryId      Int?
  itemType        StockItemType
  unit            String          @default("PCS")
  minStock        Decimal?
  maxStock        Decimal?
  reorderPoint    Decimal?
  valuationMethod ValuationMethod @default(FIFO)
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

enum StockItemType {
  RAW_MATERIAL
  WORK_IN_PROGRESS
  FINISHED_GOODS
  CONSUMABLE
  SPARE_PART
}

enum ValuationMethod {
  FIFO
  LIFO
  WEIGHTED_AVERAGE
}
```

#### StockTransaction
```prisma
model StockTransaction {
  id              Int                   @id @default(autoincrement())
  stockItemId     Int
  warehouseId     Int
  transactionType StockTransactionType
  quantity        Decimal
  unitCost        Decimal?
  reference       String?
  notes           String?
  transactionDate DateTime              @default(now())
  createdAt       DateTime              @default(now())
}

enum StockTransactionType {
  RECEIPT
  ISSUE
  TRANSFER_IN
  TRANSFER_OUT
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  RETURN
}
```

---

### 8. Chat & Communication

#### ChatConversation
```prisma
model ChatConversation {
  id              Int           @id @default(autoincrement())
  userId          Int
  title           String?
  isActive        Boolean       @default(true)
  lastMessageAt   DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  messages        ChatMessage[]
}
```

#### ChatMessage
```prisma
model ChatMessage {
  id              Int       @id @default(autoincrement())
  conversationId  Int
  role            ChatRole
  content         String
  metadata        Json?
  createdAt       DateTime  @default(now())
}

enum ChatRole {
  USER
  ASSISTANT
  SYSTEM
}
```

---

## Relationships Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  YarnVendor │────<│  PayOrder   │────<│ PayOrderItem│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   YarnBox   │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  YarnCone   │
                    └─────────────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Machine   │────<│ProductionLog│────<│YarnConsumption│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Roll     │
                    └─────────────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│DyeingVendor │────<│ DyeingOrder │────<│DyeingOrderItem│
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │────<│ SalesOrder  │────<│  SaleItem   │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────────────┐
│CustomerLedgerEntry  │
└─────────────────────┘
```

---

## Indexes & Constraints

### Primary Keys
All models use auto-incrementing `id` as primary key.

### Unique Constraints
- `Tenant.slug`
- `TenantUser(tenantId, email)`
- `TenantUser(tenantId, username)`
- `Machine.machineNumber`
- `Roll.rollNumber`
- `PayOrder.orderNumber`
- `DyeingOrder.orderNumber`
- `SalesOrder.orderNumber`
- `StockItem.sku`
- `ChartOfAccount.accountCode`

### Foreign Keys
All relationships enforced with cascading deletes where appropriate.

---

## Migration Commands

```bash
# Create migration
pnpm db:migrate "migration_name"

# Apply migrations
pnpm db:migrate:deploy

# Reset database (dev only)
pnpm db:reset

# Open Prisma Studio
pnpm db:studio

# Generate Prisma client
pnpm db:generate
```
