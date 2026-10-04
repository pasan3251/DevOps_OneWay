# Loader Dashboard Execution Plan (EPs)

This document breaks down the end-to-end implementation of the Waypoint Loader Dashboard into sequentially executable Engineering Phases / Execution Plans (EPs). The loader workspace strictly inherits the design tokens, navy/blue typography, accessible light/dark theme system, and notification shell of the dispatcher workspace while providing specialized warehouse floor tools.

---

## EP Breakdown Overview

| EP ID | Phase Title | Focus Area | Key Workflows & Traceability |
|---|---|---|---|
| **EP-01** | **Workspace Shell, Theme Parity & Staging Overview** *(Completed)* | Shell, Theme, Top Bar, Navigation, Initial Dashboard | Shared design tokens, Depot selector, Colombo Clock, Notifications, Light/Dark appearance |
| **EP-02** | **Staging Queue & Vehicle Manifest Explorer** *(Completed)* | Vehicle Queue, Trip Selection, Capacity & Status | `CORE-1`, Vehicle loading queue (Peliyagoda / Kandy), Chilled/Ambient indicators |
| **EP-03** | **LIFO Reverse-Stop Loading Checklist** *(Completed)* | LIFO Stop Sequencing, Order & SKU Verification | `CORE-1`, Stop $N \to 1$ loading sequence, Stop verification |
| **EP-04** | **Shortfall & Damage Discrepancy Logging** *(Completed)* | Exception capture, payload recalculation, alerts | `FAIL-A` Pre-departure shortfall/damage handling |
| **EP-05** | **Manifest Version Invalidation & Re-verification** *(Completed)* | Plan revision handling, live alerts | `ALT-6` Plan change after loading starts |
| **EP-06** | **Departure Clearance & Verification Suite** *(Completed)* | Sign-off, Driver handoff, automated tests | `L5` Departure confirmation, Playwright test suite |

---

## Detailed Specification per EP

### EP-01: Workspace Shell, Theme Parity & Staging Overview (Initial EP)
- **Goal:** Establish `/workspace/loader` route matching the Dispatcher’s visual fidelity and theme.
- **Deliverables:**
  1. Update `apps/web/src/app/workspace/[role]/page.tsx` to mount `LoaderDashboard` when `role === 'loader'`.
  2. Implement `LoaderDashboard` with header matching Dispatcher: Waypoint logo, Depot badge (Peliyagoda/Kandy), Colombo clock (with 16:00 cutoff indicator), Theme toggle (Light/Dark), Notifications drawer, and Account menu.
  3. Navigation tabs:
     - **Staging Overview** (Vehicle queue summary, active loads, discrepancy counts)
     - **Active Loading Manifest** (Trip inspection and loading workflow)
     - **Discrepancy Records** (Logged damage and shortfalls)
     - **Warehouse Chat** (Direct communication with Dispatch desk)
  4. Build responsive shell layouts for desktop, tablet (1024px), and mobile (390px).

### EP-02: Staging Queue & Vehicle Manifest Explorer
- **Goal:** Provide warehouse loaders with a clear, filterable list of vehicles and trips scheduled for loading.
- **Deliverables:**
  1. Filter by Depot, Brand, Vehicle Type (Reefer / Ambient), and Trip (Trip 1 / Trip 2).
  2. Summary cards: Ready for Staging, In Progress, Cleared for Departure, Discrepancies.
  3. Trip Card / Table with vehicle capacity indicators (weight kg / volume m³).

### EP-03: LIFO Reverse-Stop Loading Checklist & SKU Verification
- **Goal:** Enforce Last-In, First-Out (LIFO) packing sequence based on the reverse delivery order.
- **Deliverables:**
  1. Reverse-sequenced stop list: Stop $N \to N-1 \to \dots \to \text{Stop } 1$.
  2. Stop details: Outlet name, District, Brand, Delivery Window, Dock type, Temperature requirement.
  3. SKU-level verification checklist with tap/check actions.

### EP-04: Shortfall & Damage Discrepancy Logging (FAIL-A)
- **Goal:** Enable warehouse loaders to flag missing or damaged goods during staging before departure.
- **Deliverables:**
  1. Shortfall/Damage reporting dialog with SKU, reported quantity, damage type, and notes.
  2. Dynamic payload weight/volume recalculation.
  3. Flag manifest as "Discrepancy Logged" awaiting dispatch resolution (Ship Partial / Hold / Defer).

### EP-05: Manifest Version Invalidation & Re-verification (ALT-6)
- **Goal:** Instantly handle plan changes made by dispatch after staging has begun.
- **Deliverables:**
  1. Visual banner and alert when manifest version updates.
  2. Highlighting altered/re-sequenced stops in amber/red.
  3. Require loader to re-verify re-ordered stops before allowing departure clearance.

### EP-06: Departure Clearance & Verification Suite
- **Goal:** Final sign-off and end-to-end testing.
- **Deliverables:**
  1. "Clear for Departure" action locking the manifest and updating Dispatch Monitor (`D6`).
  2. Comprehensive Playwright test (`scripts/verify-loader.js`) testing all screen widths, LIFO checks, exception handling, and persistence.

