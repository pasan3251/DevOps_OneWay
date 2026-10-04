# Loader Dashboard Execution Plan (EPs)

This document breaks down the end-to-end implementation of the Waypoint Loader Dashboard into sequentially executable Engineering Phases / Execution Plans (EPs). The loader workspace inherits the dispatcher shell, monochrome design tokens, accessible light/dark theme system, and notification tools while providing touch-oriented warehouse floor controls.

## Normalized screen flow

The loader has one operational path rather than a collection of peer dashboards:

1. **Staging queue** — choose a trip released to the loader's current depot.
2. **Loading checklist** — a drill-down from the queue, not a second navigation destination. Load in reverse stop order and verify every SKU line before confirming a stop.
3. **Exception report** — record damage, shortfall, or temperature breach against the affected order and SKU. This locks departure until Dispatch responds.
4. **Dispatch instruction** — the loader can read and act on `ship partial`, `hold for replacement`, or `emergency defer`; the loader cannot choose these outcomes.
5. **Departure clearance** — enabled only when depot, route-group, thermal, and capacity checks pass; the latest manifest is acknowledged; every stop is verified; and no dispatch hold remains.

Top-level navigation is limited to **Staging queue**, **Exception log**, and **Comms**. The exception log is an audit and instruction view; it does not duplicate dispatcher decision controls. Checklist progress is stored by trip so navigation and reloads do not discard physical verification work.

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
     - **Staging queue** (Vehicle queue summary and entry into the active checklist)
     - **Exception log** (Logged damage/shortfalls and read-only Dispatch instructions)
     - **Comms** (Direct communication with the planning desk)
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
  3. SKU-level verification checklist with tap/check actions. No bulk verification is allowed for physical loading.

### EP-04: Shortfall & Damage Discrepancy Logging (FAIL-A)
- **Goal:** Enable warehouse loaders to flag missing or damaged goods during staging before departure.
- **Deliverables:**
  1. Shortfall/Damage reporting dialog with SKU, reported quantity, damage type, and notes.
  2. Dynamic payload weight/volume recalculation.
  3. Flag manifest as "Waiting on Dispatch" and lock departure until a Ship Partial / Hold / Defer instruction is received. Resolution remains a dispatcher responsibility.

### EP-05: Manifest Version Invalidation & Re-verification (ALT-6)
- **Goal:** Instantly handle plan changes made by dispatch after staging has begun.
- **Deliverables:**
  1. Passive visual banner and alert when a new manifest version arrives from Dispatch; loaders do not initiate route changes.
  2. Highlighting altered/re-sequenced stops in amber/red.
  3. Require loader to re-verify re-ordered stops before allowing departure clearance.

### EP-06: Departure Clearance & Verification Suite
- **Goal:** Final sign-off and end-to-end testing.
- **Deliverables:**
  1. "Clear for Departure" action locks the manifest and updates Dispatch Monitor (`D6`) only after the four clearance gates pass.
  2. Comprehensive Playwright test (`scripts/verify-loader.js`) testing all screen widths, LIFO checks, exception handling, and persistence.

