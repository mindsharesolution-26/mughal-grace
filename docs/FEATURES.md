# Mughal Grace - Features Documentation

## Overview

Mughal Grace is a comprehensive Factory Intelligence System (ERP) designed specifically for knitting textile factories. This document outlines all implemented features.

---

## Module Overview

| Module | Description | Status |
|--------|-------------|--------|
| Multi-Tenancy | Schema-per-tenant isolation | Complete |
| Authentication | JWT-based auth with RBAC | Complete |
| Yarn Management | Raw material tracking | Complete |
| Production | Machine & production logs | Complete |
| Roll Tracking | Grey stock management | Complete |
| Dyeing | Dyeing vendor & orders | Complete |
| Sales | Customer & order management | Complete |
| Receivables | Customer ledger & aging | Complete |
| Payables | Vendor ledger & payments | Complete |
| Inventory | Warehouse & stock tracking | Complete |
| Settings | Master data configuration | Complete |
| AI Assistant | Claude-powered chat | Complete |
| Reports | Business intelligence | Partial |
| WhatsApp | Messaging integration | Preview |

---

## 1. Multi-Tenancy

### Description
Complete data isolation for each tenant (factory) using PostgreSQL schema-per-tenant architecture.

### Features
- **Automatic Schema Creation**: New schema created on tenant registration
- **Schema Isolation**: Each tenant's data completely separate
- **Connection Pooling**: LRU cache (50 clients, 30-min TTL)
- **Admin Override**: Super Admin can access any tenant
- **Tenant Metadata**: Plan, status, trial tracking

### Technical Details
```
Request → Auth → Tenant Middleware → Schema Selection → Query Execution
```

---

## 2. Authentication & Authorization

### Authentication
- **JWT Tokens**: Access (15min) + Refresh (7 days)
- **Secure Cookies**: httpOnly, Secure, SameSite=Strict
- **Password Hashing**: bcrypt (12 rounds)
- **Token Refresh**: Automatic token renewal
- **Logout**: Token invalidation

### Authorization (RBAC)
| Role | Description | Modules |
|------|-------------|---------|
| SUPER_ADMIN | Platform admin | All + Admin Panel |
| FACTORY_OWNER | Tenant owner | All tenant features |
| MANAGER | Factory manager | Production, Sales, Reports |
| SUPERVISOR | Floor supervisor | Production, Machines |
| OPERATOR | Machine operator | Production (limited) |
| ACCOUNTANT | Finance staff | Sales, Receivables, Payables |
| VIEWER | Read-only | View all, edit none |

### Module Permissions
```javascript
{
  yarn: ['FACTORY_OWNER', 'MANAGER', 'SUPERVISOR'],
  production: ['FACTORY_OWNER', 'MANAGER', 'SUPERVISOR', 'OPERATOR'],
  sales: ['FACTORY_OWNER', 'MANAGER', 'ACCOUNTANT'],
  finance: ['FACTORY_OWNER', 'ACCOUNTANT'],
  settings: ['FACTORY_OWNER', 'MANAGER'],
  users: ['FACTORY_OWNER'],
  admin: ['SUPER_ADMIN']
}
```

---

## 3. Yarn Management

### Yarn Types
- Create yarn specifications (brand, color, grade, composition, count)
- Track denier, ply, pricing
- Minimum stock alerts
- Active/inactive status

### Yarn Vendors
- Vendor master data
- Credit limit management
- Payment terms configuration
- Contact information

### Pay Orders (Purchase Orders)
- Create purchase orders to vendors
- Line items with yarn type, quantity, price
- Order status tracking (Pending → Partial → Complete)
- Payment tracking against orders

### Yarn Boxes & Cones
- Physical box receiving with weight
- Individual cone tracking
- Current weight vs received weight
- Cone status (Available → In Use → Empty)

### Yarn Ledger
- Inward entries (receiving)
- Outward entries (consumption)
- Running balance tracking
- Transaction history

### Yarn Outward
- Issue yarn to production
- Link to machines/production logs
- Consumption tracking
- Balance deduction

---

## 4. Production Management

### Machines
- Machine master data
  - Machine number, name, type
  - Gauge, diameter, feeders
  - Brand, model, location
- Status tracking (Active, Maintenance, Idle)
- Maintenance history
- Installation date

### Production Logs
- Daily production recording
- Target vs actual weight
- Roll count per shift
- Efficiency calculation
- Operator assignment
- Yarn consumption linking

### Shifts
- Shift definition (name, start/end time)
- Production assignment by shift
- Shift-wise reporting

### Yarn Consumption
- Track yarn used per production log
- Cone-level tracking
- Auto-deduction from inventory
- Multi-yarn blend support

### Downtime Logging
- Record machine downtime
- Reason categorization
  - Mechanical failure
  - Electrical issue
  - Yarn breakage
  - Needle damage
  - Power outage
  - Scheduled maintenance
- Duration tracking
- Resolution notes

---

## 5. Roll & Grey Stock Management

### Roll Creation
- Auto-generate roll numbers
- Link to production log
- Record grey weight
- Grade assignment (A, B, C)
- Defect notes
- Location tracking

### Roll Status Workflow
```
GREY_STOCK → SENT_TO_DYEING → AT_DYEING → RECEIVED_FROM_DYEING → FINISHED_STOCK → SOLD
                                                                               ↓
                                                                           REJECTED
```

### Status History
- Full audit trail of status changes
- Timestamp and user tracking
- Notes on each transition

### Grey Stock Summary
- Daily opening/closing stock
- Production additions
- Dyeing dispatches
- Current inventory count

---

## 6. Dyeing Operations

### Dyeing Vendors
- Vendor profile management
- Quality rating (1-5 stars)
- Turnaround time tracking
- Contact information
- Payment terms

### Dyeing Orders
- Create dispatch orders
- Select rolls for dyeing
- Track grey weight sent
- Expected return date
- Order status management

### Order Status Tracking
```
PENDING → IN_PROCESS → COMPLETED/PARTIAL_RECEIVED
                    ↓
                CANCELLED
```

### Receipt Management
- Record finished weight
- Calculate weight gain/loss
- Quality notes
- Update roll status
- Partial receipt support

---

## 7. Sales Management

### Customers
- Customer profile
  - Contact details
  - Customer type (Regular, Wholesale, Retail, Export)
  - Credit limit
  - Payment terms
- Opening balance setup
- Current balance tracking

### Sales Orders
- Create sales orders
- Line items with:
  - Product/fabric selection
  - Quantity, unit price
  - Discount per line
- Order-level discount & tax
- Delivery date scheduling

### Order Workflow
```
PENDING → CONFIRMED → PROCESSING → DISPATCHED → DELIVERED
                                               ↓
                                           CANCELLED
```

### Dispatch & Delivery
- Generate dispatch challan
- Update order status
- Link rolls to order items
- Delivery confirmation

---

## 8. Receivables (Accounts Receivable)

### Customer Ledger
- All customer transactions
- Invoice entries (debit)
- Payment entries (credit)
- Running balance
- Transaction reference

### Payment Receipt
- Record customer payments
- Payment method tracking
- Link to invoices
- Partial payment support

### Aging Analysis
- Outstanding by age bucket
  - 0-30 days
  - 31-60 days
  - 61-90 days
  - 90+ days
- Customer-wise summary
- Total outstanding
- Credit limit utilization

### Customer Statement
- Date range selection
- Opening balance
- Transaction listing
- Closing balance

---

## 9. Payables (Accounts Payable)

### Vendor Ledger
- Yarn vendor transactions
- Dyeing vendor transactions
- General supplier transactions
- Running balance tracking

### Payment Management
- Record vendor payments
- Payment method selection
- Link to invoices/bills
- Advance payment tracking

### Cheque Management
- Issue cheques to vendors
- Receive cheques from customers
- Cheque status tracking
  - Pending
  - Deposited
  - Cleared
  - Bounced
- Due date tracking
- Bank reconciliation support

### Aging Analysis
- Payables by age bucket
- Vendor-wise summary
- Total payables
- Due date alerts

---

## 10. Inventory & Warehouse

### Warehouse Management
- Define warehouse locations
- Location types
  - Warehouse
  - Shop floor
  - Transit
  - Quality hold
  - Returns
- Hierarchical structure

### Stock Items
- Item master data
- SKU management
- Categorization
- Unit of measure
- Min/max stock levels
- Reorder point

### Stock Levels
- Current stock by location
- Batch tracking
- Valuation method
  - FIFO
  - LIFO
  - Weighted average

### Stock Movements
- Receipt transactions
- Issue transactions
- Transfers between locations
- Adjustments (positive/negative)
- Full audit trail

### Alerts
- Low stock notifications
- Below reorder point
- Alert configuration
- Email/dashboard alerts

---

## 11. Needle Management

### Needle Types
- Needle specifications
- Gauge compatibility
- Brand management
- Pricing

### Stock Batches
- Batch receiving
- Quantity tracking
- Cost per batch
- Supplier tracking

### Stock Movements
- Issue to machines
- Returns from machines
- Damage write-offs
- Inter-batch transfers

### Machine Allocation
- Allocate needles to machines
- Track usage per machine
- Replacement scheduling
- Damage tracking per machine

### Damage Tracking
- Record needle damage
- Damage reason
- Machine association
- Cost impact

---

## 12. Settings & Master Data

### Configurable Masters

| Master | Description |
|--------|-------------|
| Fabrics | Fabric specifications |
| Grades | Quality grades (A, B, C, etc.) |
| Materials | Raw material types |
| Fabric Sizes | Dimension specifications |
| Fabric Compositions | Blend percentages |
| Brands | Brand master |
| Departments | Department structure |
| Groups | Grouping categories |
| Fabric Types | Type definitions |
| Units | Unit of measure |
| Fabric Forms | Form specifications |
| Colors | Color palette |
| Machine Sizes | Machine size specs |

### Bulk Import
- Excel file upload
- Data validation
- Mapping configuration
- Error reporting
- Import history

### Factory Reset
- Clear all transactional data
- Preserve master data
- Confirmation required
- Admin only

---

## 13. AI Chat Assistant

### Capabilities
- Natural language queries
- Bilingual support (English/Urdu)
- Intent classification
  - Yarn queries
  - Production queries
  - Sales queries
  - Finance queries
  - Inventory queries

### Query Examples
```
"Show me today's production"
"آج کی پیداوار دکھائیں"
"What is our yarn stock?"
"List pending sales orders"
"Show customer aging report"
```

### Technical Integration
- Claude Anthropic API
- Context-aware responses
- Tenant-scoped queries
- Read-only operations (Phase 1)
- Conversation history

### Quick Suggestions
- Contextual suggestions
- Common queries
- Role-based suggestions

---

## 14. Reporting

### Available Reports

| Report | Description |
|--------|-------------|
| Production Summary | Daily/weekly/monthly production |
| Machine Efficiency | Efficiency by machine |
| Yarn Consumption | Yarn usage report |
| Grey Stock | Current grey stock |
| Dyeing Status | Orders in dyeing |
| Sales Summary | Sales by period |
| Receivables Aging | Customer aging |
| Payables Aging | Vendor aging |
| Stock Valuation | Inventory value |
| Defect Analysis | Quality issues |

### Report Features
- Date range selection
- Filter by machine/customer/vendor
- Export to Excel
- Print-friendly format

---

## 15. User Management

### User Operations
- Create users within tenant
- Assign roles
- Activate/deactivate
- Password management

### Admin Operations (Super Admin)
- View all tenants
- View all users
- Cross-tenant management
- Create Super Admins

---

## 16. Audit & Security

### Audit Logging
- User actions logged
- Entity changes tracked
- Timestamp and IP recording
- User agent logging

### Security Features
- Rate limiting (100 req/15min)
- Security headers (Helmet)
- CORS protection
- CSRF prevention
- Input validation
- SQL injection prevention

---

## 17. WhatsApp Integration (Preview)

### Planned Features
- Message receiving
- Intent classification
- Natural language routing
- Automated responses
- Two-way communication

### Current Status
- Webhook handlers implemented
- Message parsing ready
- Integration pending activation

---

## Feature Roadmap

### Phase 2 (Planned)
- [ ] Write operations via AI chat
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Barcode/QR scanning
- [ ] Email notifications
- [ ] Scheduled reports

### Phase 3 (Future)
- [ ] Multi-currency support
- [ ] Multi-warehouse transfers
- [ ] Purchase approval workflow
- [ ] Sales quotations
- [ ] Customer portal
- [ ] Supplier portal
