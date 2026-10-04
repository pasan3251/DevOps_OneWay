# Waypoint Logistics — Backend Testing Strategy & Test Plan

## 1. Testing Pyramid Architecture

The Waypoint Logistics backend enforces an exhaustive automated testing strategy. Mocking the database for all tests is strictly prohibited; real database behavior, constraints, and concurrency locks are validated against real PostgreSQL instances.

```
            / \
           /   \        End-to-End Workflow Tests (5-10%)
          / E2E \       HTTP Endpoints, Full Life-Cycle, RBAC
         /-------\
        /         \     Integration & Concurrency Tests (30-40%)
       / Integrat. \    Real PostgreSQL, Constraints, Rollbacks, Locks
      /-------------\
     /               \  Unit Tests (50-60%)
    /      Unit       \ Domain Rules, Feasibility Formulas, State FSM
   /-------------------\
```

---

## 2. Test Suites & Coverage Scope

### 2.1 Unit Tests (`test/unit/`)
- **Feasibility Rule Evaluation**:
  - `Rule 1`: Reject mixed Fresh + Style orders on one trip.
  - `Rule 2`: Reject chilled orders on ambient dry-box trucks.
  - `Rule 3`: Reject standard trucks for outlets flagged `van_only`.
  - `Rule 4`: Reject vehicle serving an outlet from a different depot.
  - `Rule 5`: Reject splitting order lines across two trips.
  - `Rule 6`: Reject cumulative payload exceeding $W_{\max}$ or $V_{\max}$.
  - `Rule 7`: Reject 3rd daily trip; enforce 270m Fresh and 480m Style/Tech budgets.
  - `Fuel Quota`: Calculate outbound + return fuel liters; warn at 85%, block at 100%.
- **Temporal & Window Math**:
  - Intersect standard outlet delivery window and mall window ($[\text{open}_1, \text{close}_1] \cap [\text{open}_2, \text{close}_2]$).
  - Calculate early arrival holding delay duration.
- **State Machine Transitions**:
  - Assert invalid transitions throw domain errors (e.g. `PENDING` $\rightarrow$ `DELIVERED`).

### 2.2 Integration Tests with Real PostgreSQL (`test/integration/`)
- **Database Constraint Verification**:
  - Verify `uq_trips_vehicle_date_number` blocks 3rd trip at SQL level.
  - Verify `uq_orders_outlet_date_temp` blocks duplicate Fresh orders for same date.
  - Verify `RESTRICT` prevents deleting an Outlet with active orders.
- **Transaction Rollback Testing**:
  - Intentionally inject a failure in the 3rd step of trip allocation; assert that all prior order status updates roll back cleanly.
- **Optimistic Concurrency Testing**:
  - Simulate two workers attempting to update `Trip` with stale `version`; assert one succeeds and the other receives `409 Conflict`.
- **Race Condition & Locking Testing**:
  - Launch 10 concurrent requests to assign the same available vehicle to 10 different trips.
  - **Expected Result**: Exactly 1 request succeeds; 9 requests fail with assignment conflict.

### 2.3 End-to-End Business Scenario Tests (`test/e2e/`)
- **Primary Operational Happy Path**:
  1. Store Manager logs in, places dual Fresh orders before 16:00.
  2. Dispatcher logs in at 16:00, consolidates backlog, assigns orders to vehicle `WP-012` on `TRIP-01`, validates 7 core rules, and publishes plan.
  3. Warehouse Loader opens LIFO manifest, inspects cargo, and confirms L5 departure clearance.
  4. Delivery Driver receives active route, starts route, logs arrival at Stop 1, passes window holding wait, and submits digital touch signature POD.
  5. System marks Stop 1 `DELIVERED`, advances to Stop 2, and updates real-time telemetry.
- **FAIL-A Scenario (Pre-Departure Shortfall)**:
  - Loader flags 3 punctured milk cartons; payload recalculates; dispatcher authorizes `SHIP_PARTIAL`; driver manifest updates.
- **FAIL-B Scenario (Capacity Starvation Deferral)**:
  - Backlog demand exceeds fleet capacity; dispatcher defers unserved order with code `NO_REEFER_AVAILABLE`; next-day priority score increments.
- **FAIL-C Scenario (Offline Driver Sync)**:
  - Driver executes stops offline; sync endpoint ingests batch; assert all PODs persist idempotently.
