# Store Manager Business Rules Catalog — Waypoint Logistics

This catalog defines the authoritative business rules, operational constraints, triggers, preconditions, failure conditions, and database vs application enforcement for all Store Manager interactions.

---

## 1. Order Creation & Cutoff Rules

### `SM-ORD-001`: Operational 16:00 Daily Cutoff
- **Rule**: Orders submitted before 16:00 (Colombo local time, UTC+5:30) are confirmed for next-day dispatch planning. Orders submitted at or after 16:00 are automatically marked as `QUEUED_NEXT_RUN` with `is_cutoff_locked = true` and will only be included in the dispatch run for the following business day.
- **Affected Entity**: `orders`
- **Trigger**: Store Manager clicks "Submit Replenishment Order".
- **Preconditions**: User is an authenticated Store Manager for the designated outlet.
- **Result**:
  - If $\text{Local Hour} < 16 \implies \text{status} = \text{'ORDER\_RECORDED'}$, `is_cutoff_locked = false`.
  - If $\text{Local Hour} \ge 16 \implies \text{status} = \text{'QUEUED\_NEXT\_RUN'}$, `is_cutoff_locked = true`.
- **Database Enforcement**: `orders.is_cutoff_locked` boolean column, `orders.submission_time` timestamp.
- **Application Enforcement**: `OrdersService.createOrder` cutoff calculation logic based on Asia/Colombo timezone.

---

### `SM-ORD-002`: Fresh Dual-Order Invariant
- **Rule**: Fresh supermarkets may place at most ONE ambient order and at most ONE chilled order for a single target delivery date. Duplicate orders within the same temperature requirement for the same date are strictly prohibited. Style and Tech outlets may only place ambient orders.
- **Affected Entity**: `orders`
- **Trigger**: Order creation payload validation.
- **Preconditions**: Outlet brand is `Fresh`.
- **Result**: Successful insertion of distinct ambient and chilled orders.
- **Failure Condition**: User attempts to submit a second ambient or second chilled order for the same date $\implies$ System rejects with `409 Conflict`.
- **Database Enforcement**: Multi-column unique index:
  ```sql
  CREATE UNIQUE INDEX uniq_outlet_date_temp ON orders (outlet_id, order_date, temp_requirement);
  ```
- **Application Enforcement**: Pre-check in `OrdersService.createOrder` raising `ConflictException`.

---

### `SM-ORD-003`: Brand Product Line Isolation
- **Rule**: Store Managers can only order products belonging to their store's brand (`Fresh`, `Style`, or `Tech`). Furthermore, chilled products can only be added to chilled orders for Fresh supermarkets. Style and Tech outlets cannot order chilled products.
- **Affected Entities**: `orders`, `order_items`, `products`, `outlets`
- **Trigger**: Adding SKU line items to order draft.
- **Preconditions**: `outlet.brand === product.brand` AND `order.temp_requirement === product.temp_requirement`.
- **Failure Condition**: Submitting product from different brand or temperature class $\implies$ `400 Bad Request`.
- **Database Enforcement**: Foreign key checks on `products.brand`.
- **Application Enforcement**: DTO validation and database verification in `OrdersService.createOrder`.

---

### `SM-ORD-004`: Order Minimum Integrity
- **Rule**: An order must contain at least one line item, and each line item quantity must be an integer $\ge 1$.
- **Affected Entity**: `order_items`
- **Database Enforcement**: `CHECK (quantity_requested > 0)`.
- **Application Enforcement**: `class-validator` `@Min(1)` on `CreateOrderItemDto`.

---

### `SM-ORD-005`: Pre-Cutoff Order Cancellation
- **Rule**: A Store Manager may cancel an order only while it remains `ORDER_RECORDED`, is not cutoff-locked, and the live Colombo time is before 16:00. `QUEUED_NEXT_RUN` is produced after cutoff and is therefore locked. Once Dispatch processing or the cutoff begins, cancellation by the Store Manager is blocked.
- **Affected Entity**: `orders`
- **Trigger**: Store Manager triggers "Cancel Order".
- **Preconditions**: `order.status = 'ORDER_RECORDED'`, `is_cutoff_locked = false`, and current Colombo time `< 16:00`.
- **Failure Condition**: Attempting cancellation when `order.status === 'ASSIGNED'` $\implies$ `400 Bad Request` ("Cannot cancel an order currently locked in dispatch planning").
- **Database Enforcement**: State machine transition validation.
- **Application Enforcement**: `OrdersService.cancelOrder`.

---

## 2. Delivery & Receiving Rules

### `SM-DEL-001`: Delivery Window Compliance & Visibility
- **Rule**: The Store Manager must be shown their outlet's contractual delivery window (e.g. `08:00 - 12:00`). If driver transit telemetry indicates a projected arrival drift over 15 minutes within the window, an automated **Watch Notice** is displayed. If arrival is projected past the window closing, a **Breach Warning** is triggered.
- **Affected Entities**: `outlets`, `trips`, `trip_stops`
- **Application Enforcement**: Calculation of ETA vs `outlets.window_start` and `outlets.window_end`.

---

### `SM-DEL-002`: Dual-Order Split ETA Visibility (`ALT-1`)
- **Rule**: When a Fresh store's ambient and chilled orders are split across two different vehicles due to reefer capacity constraints, the Store Manager application must present **two distinct delivery cards with separate ETAs, driver names, and vehicle registrations**.
- **Affected Entities**: `orders`, `trip_stops`, `trips`
- **Application Enforcement**: `DeliveriesService.getUpcomingDeliveries` grouping by active order.

---

### `SM-POD-001`: Mandatory Electronic Handover Verification
- **Rule**: An order cannot transition to `DELIVERED` without a valid electronic Proof of Delivery record containing:
  1. Receiving store representative's printed full name.
  2. Cryptographically timestamped digital signature data.
  3. Geo-coordinate coordinates verifying the physical handover occurred within the outlet's geofence.
- **Affected Entity**: `proof_of_deliveries`
- **Database Enforcement**: `NOT NULL` on `store_rep_name`, `store_rep_signature_url`, `geo_latitude`, `geo_longitude`, `captured_at`.

---

### `SM-DISC-001`: Receiving Discrepancy Logging (`SM-3`)
- **Rule**: If delivered items differ from the packing list (carton damage, missing items, or temperature rejection), the Store Manager must log a discrepancy claim specifying:
  - Discrepancy type (`DAMAGE_IN_TRANSIT`, `STORE_SHORTFALL`, `REJECTED_TEMPERATURE`).
  - Shortfall quantity.
  - Explanatory notes.
- **Affected Entity**: `discrepancy_claims`
- **Database Enforcement**: `discrepancy_type` enum, foreign keys to `orders(id)` and `outlets(id)`.

---

## 3. Security & Multi-Tenant Scope Rules

### `SM-SEC-001`: Multi-Tenant Outlet Scope Isolation
- **Rule**: A Store Manager authenticated in the system can ONLY view, create, or cancel orders and deliveries belonging to their assigned store outlet (`users.outlet_id`). Any request attempting to query or manipulate another store's ID is rejected immediately with `403 Forbidden`.
- **Affected Entities**: All domain entities.
- **Application Enforcement**: Server-side `ResourceScopeGuard` on all `/api/v1/orders`, `/api/v1/deliveries`, and `/api/v1/store` endpoints.
