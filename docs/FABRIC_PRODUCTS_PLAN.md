# Fabric Products Feature - Implementation Plan

## Overview

Extend the Products section to include a "Fabrics" tab for managing fabric products (sale-ready fabric rolls with inventory/ledger tracking).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FABRIC TEMPLATE                               │
│     (Master Data / Recipe / Specifications)                          │
│     - Material/Yarn specs, Width, Tube/Open, Color, Grade, etc.     │
│     - Location: Settings > Fabrics                                   │
└─────────────────────┬───────────────────────────┬───────────────────┘
                      │                           │
                      ▼                           ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│            ROLL                  │   │       FABRIC PRODUCT            │
│   (Production Output)            │   │   (Sale-Ready SKU)              │
│   - Semi-finished                │   │   - type = 'FABRIC'             │
│   - Daily logs, weight, machine  │   │   - Final code/QR               │
│   - References fabricId          │   │   - Inventory/Ledger tracking   │
│   - Status: GREY → FINISHED      │   │   - References fabricId (req)   │
└────────────────┬────────────────┘   └───────────────────────────────┬─┘
                 │                                                     │
                 └──────────────────┬──────────────────────────────────┘
                                    ▼
                    When Roll is FINISHED/SOLD,
                    it links to Fabric Product
                    (Stock IN recorded in ledger)
```

---

## Data Model Changes

### Product Model - Add `type` field

```prisma
enum ProductType {
  FABRIC    // Fabric products (sale-ready rolls)
  GOODS     // Other products (finished goods, etc.)
}

model Product {
  // ... existing fields ...

  type          ProductType   @default(GOODS)  // NEW
  fabricId      Int?          // Already exists - MANDATORY for type=FABRIC

  // ... rest of fields ...
}
```

### Roll Model - Add `fabricProductId` (optional)

```prisma
model Roll {
  // ... existing fields ...

  fabricProductId   Int?      // NEW - Links to Fabric Product when finished
  fabricProduct     Product?  @relation(fields: [fabricProductId], references: [id])
}
```

---

## Business Rules

| Rule | Description |
|------|-------------|
| Fabric Product requires Fabric Template | When creating a Product with `type=FABRIC`, `fabricId` is mandatory |
| Roll → Fabric Product linking | When Roll status changes to FINISHED_STOCK or SOLD, it can be linked to a Fabric Product |
| Stock IN on linking | When Roll links to Fabric Product, stock IN is recorded in ledger |
| Stock OUT on sale | When Fabric Product is sold, stock OUT is recorded in ledger |
| Ledger for both types | Same ledger system works for both FABRIC and GOODS products |

---

## UI Changes

### Products Navigation

```
Products (sidebar menu)
├── Products Tab      → Shows type = 'GOODS' (or all if no filter)
├── Fabrics Tab       → Shows type = 'FABRIC'
└── Ledger            → Shows ledger for selected product (any type)
```

### Products Page Tabs

```tsx
<Tabs>
  <Tab id="products" label="Products" />      // type = GOODS
  <Tab id="fabrics" label="Fabrics" />        // type = FABRIC
</Tabs>
```

### Fabric Product Form

When creating/editing a Fabric Product:
- **Product Type**: Radio/Select with `FABRIC` selected
- **Fabric Template**: Required dropdown (FabricFinder component)
- Auto-populate fields from Fabric Template:
  - GSM, Width, WidthUnit, isTube
  - FabricType, FabricComposition
  - Machine, Grade, Color, Material

### Fabrics Table Columns

| Column | Description |
|--------|-------------|
| Code | Product code (e.g., FP-001) |
| Name | Product name |
| Fabric Template | Linked Fabric template name |
| GSM | Grams per square meter |
| Width | Width with unit |
| Stock | Current stock quantity |
| Status | Active/Inactive |
| Actions | Edit, View Ledger, Delete |

---

## API Changes

### GET /products

Add query parameter for filtering:
```
GET /products?type=FABRIC    → Fabric products only
GET /products?type=GOODS     → Goods products only
GET /products                 → All products
```

### POST /products

Validation:
- If `type === 'FABRIC'`, then `fabricId` is required
- Auto-generate code with prefix `FP-` for fabric products

### Roll Status Update

When Roll status → FINISHED_STOCK:
- Optionally link to a Fabric Product (`fabricProductId`)
- If linked, record stock IN movement

---

## Implementation Phases

### Phase 1: Schema & API
1. Add `ProductType` enum to Prisma schema
2. Add `type` field to Product model (default: GOODS)
3. Add `fabricProductId` to Roll model
4. Run migration
5. Update products API with type filter
6. Add validation for Fabric Products

### Phase 2: Frontend - Products Page
1. Add tabs (Products / Fabrics) to products page
2. Filter products by type based on active tab
3. Update table columns for Fabrics tab

### Phase 3: Frontend - Fabric Product Form
1. Create/update product form with type selection
2. When type=FABRIC, show FabricFinder (required)
3. Auto-populate fields from selected Fabric Template

### Phase 4: Roll → Fabric Product Linking
1. Update Roll status change flow
2. Add option to link to Fabric Product when finishing
3. Record stock movement on linking

---

## Files to Modify

| File | Changes |
|------|---------|
| `apps/api/prisma/schema.prisma` | Add ProductType enum, type field, fabricProductId |
| `apps/api/src/routes/products.routes.ts` | Add type filter, validation |
| `apps/api/src/routes/rolls.routes.ts` | Add fabricProductId linking |
| `apps/frontend/app/(authenticated)/products/page.tsx` | Add tabs, filter by type |
| `apps/frontend/app/(authenticated)/products/new/page.tsx` | Add type selection, FabricFinder |
| `apps/frontend/lib/types/product.ts` | Add ProductType enum |
| `apps/frontend/lib/api/products.ts` | Add type filter param |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-XX-XX | Use `type` enum instead of separate model | Products and Fabric Products share 90% same fields, simpler to filter |
| 2024-XX-XX | Fabric Product requires Fabric Template | Ensures traceability from template → roll → product |
| 2024-XX-XX | Same ledger for both types | Consistent inventory tracking across all products |
| 2024-XX-XX | Product types: `FABRIC` and `GOODS` | User preference for naming |

---

## Open Questions (Resolved)

1. ~~What to name non-fabric products?~~ → **GOODS**
2. ~~Is Fabric Template mandatory for Fabric Products?~~ → **Yes**
3. ~~Separate ledger for fabrics?~~ → **No, same ledger system**
4. ~~Roll links to Fabric Product when?~~ → **When FINISHED_STOCK or SOLD**
