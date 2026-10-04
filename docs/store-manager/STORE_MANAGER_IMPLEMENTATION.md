# Waypoint Logistics — Store Manager Implementation Guide

## 1. Architectural Architecture & Module Structure

The Store Manager implementation follows the **Modular Monolith** architecture:

```text
apps/web/src/features/store-manager/
├── store-manager-dashboard.tsx      # Main unified dashboard shell & view switcher
├── store-manager-api.ts            # Client API bridge & mock fallback service
├── components/
│   ├── overview-view.tsx           # Operational Overview & cutoff countdown
│   ├── new-order-view.tsx          # Replenishment Order Creation workflow
│   ├── orders-view.tsx             # Canonical Orders list & Detail drawer
│   ├── deliveries-view.tsx         # Inbound shipments, POD inspection & claims
│   ├── discrepancy-modal.tsx       # Receiving discrepancy reporting modal
│   └── pod-modal.tsx               # Proof of Delivery inspection modal

apps/api/src/store/
├── store.controller.ts             # REST Controller for Store Manager operations
├── store.service.ts                # Application service & business rules
├── store.module.ts                 # NestJS dependency injection module
└── dto/
    ├── create-discrepancy.dto.ts   # Receiving discrepancy claim DTO
    └── store-overview.dto.ts       # Store overview response shape
```

---

## 2. Implemented Business Capabilities

### 2.1. Store Overview (`overview-view.tsx`)
- **Operational Status Banner**: Shows store code, brand badge (Fresh/Style/Tech), address, and delivery window (`08:00 - 18:00`).
- **16:00 Cutoff Countdown Clock**: Dynamic real-time countdown to the daily order cutoff with clear color-coded states (Green: open, Amber: $<30\text{min}$, Red: closed/queued for next run).
- **Today's Inbound Delivery Cards (`ALT-1`)**: Displays inbound trucks with ETA, driver name, vehicle plate, and status. For Fresh stores, displays split cards when ambient and chilled orders arrive in separate vehicles.
- **Active Orders KPI Row**: Immediate count of orders in `ORDER_RECORDED`, `ASSIGNED`, `IN_TRANSIT`, and `DELIVERED`.
- **Quick Action**: Direct jump to "New Order" replenishment form.

### 2.2. Order Creation Workflow (`new-order-view.tsx`)
- **Order Context Step**: Delivery date selection (default $T+1$) and temperature requirement selector (`ambient` vs `chilled` for Fresh; locked to `ambient` for Style & Tech).
- **Product Catalog Grid**: Filterable by category, searchable by SKU name or code, showing unit weight (kg), unit volume (m³), and price (LKR).
- **Live Cart & Rollup Summary**: Real-time totals for item count, cumulative weight (kg), cumulative volume (m³), and total value.
- **Cutoff Awareness Banner**: Visually notifies the user if the order is being submitted after 16:00 (marked as `QUEUED_NEXT_RUN`).
- **Submission Handler**: Submits to `/api/v1/orders` and transitions directly to the order tracking view.

### 2.3. Canonical Orders & Detail View (`orders-view.tsx`)
- **Filterable Orders Table**: Search by order number, filter by status pill (`ALL`, `RECORDED`, `QUEUED`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`).
- **Order Detail Drawer / Modal**:
  - Full metadata header with status badge and cutoff lock status.
  - Temperature requirement and store assignment.
  - Itemized table with product code, name, requested qty, unit weight, and unit volume.
  - Contextual cancellation action: Active only while in `ORDER_RECORDED`, not cutoff-locked, and the live Colombo time remains before 16:00.

### 2.4. Deliveries & Receiving Verification (`deliveries-view.tsx`)
- **Active Shipments Tracker**: Shows stops assigned to the store with vehicle type, driver name, contact phone, and route ETA.
- **Proof of Delivery (POD) Inspector (`pod-modal.tsx`)**:
  - Displays driver's captured delivery receipt (`SM-POD-001`).
  - Renders store receiver's signature, delivery timestamp, and GPS coordinates.
- **Discrepancy Reporting (`discrepancy-modal.tsx`, `SM-DISC-001`, `SM-3`)**:
  - Enables Store Manager to report physical receiving issues:
    - `DAMAGE_IN_TRANSIT`
    - `STORE_SHORTFALL`
    - `REJECTED_TEMPERATURE`
  - Records shortfall quantity and manager notes for Dispatcher investigation.

---

## 3. Backend Integration & Resource Scope Security

All endpoints enforce tenant isolation via the Store Manager's JWT session:
```typescript
const outletId = req.user.outletId;
if (!outletId) {
  throw new ForbiddenException('Store Manager must be assigned to an active outlet');
}
```
Queries strictly scope `where: eq(orders.outletId, outletId)`, preventing IDOR attacks across stores.
