# Waypoint Logistics — Business Domain Analysis & Rule Catalogue

## 1. Domain Overview & Actors

The **Waypoint Intelligent Enterprise Delivery Planning System** serves a tri-brand retail conglomerate in Sri Lanka comprising:
- **Waypoint Fresh**: 80 outlets (tight morning delivery window 03:30 – 08:00 AM, dual orders: ambient + chilled, strict reefer temperature compliance).
- **Waypoint Style**: 25 outlets (weekly apparel deliveries, mall bay parking restrictions, high volume/cube ratio).
- **Waypoint Tech**: 15 outlets (on-demand appliances, heavy/fragile goods, curbside/dock handling).

The distribution network is orchestrated from two central hubs:
1. **Peliyagoda Distribution Center** (Western Province Hub)
2. **Kandy Regional Hub** (Central Province Hub)

### System Actors & Roles

```
+-----------------------------------------------------------------------------------+
|                                  SYSTEM ACTORS                                    |
+-----------------------------------------------------------------------------------+
| 1. STORE MANAGER                                                                  |
|    - Submits inventory replenishment orders prior to 16:00 cutoff.                |
|    - Places dual orders for Fresh (Ambient + Chilled).                            |
|    - Receives plan publication (Confirmed ETA delivery window or Deferral notice).|
|    - Acknowledges physical handover or logs discrepancy claims (SM-3).            |
+-----------------------------------------------------------------------------------+
| 2. CENTRAL DISPATCHER (Exclusively Stationed at Peliyagoda Hub)                    |
|    - Single organizational role responsible for network-wide route planning.      |
|    - Centrally manages dispatch for BOTH Peliyagoda and Kandy hubs via console    |
|      depot selector filter (each vehicle only serves its home depot outlets).     |
|    - Reviews consolidated order backlog at 16:00 cutoff.                          |
|    - Evaluates 7 core feasibility rules, fuel quotas, and mall windows.           |
|    - Allocates orders to vehicle trips (at most 2 trips/vehicle/day).             |
|    - Assigns formal deferral reason codes under capacity starvation.              |
|    - Publishes final plans and monitors live execution telematics.                |
+-----------------------------------------------------------------------------------+
| 3. WAREHOUSE LOADER                                                               |
|    - Accesses digital loading manifests sequenced in reverse stop order (LIFO).   |
|    - Verifies cargo integrity, SKU counts, and packaging seals.                   |
|    - Flags pre-departure shortfalls or carton damage (FAIL-A).                    |
|    - Confirms gate clearance and releases vehicles for route departure (L5).      |
+-----------------------------------------------------------------------------------+
| 4. DELIVERY DRIVER                                                                |
|    - Conducts pre-trip safety & reefer temperature check (< 4.0°C).               |
|    - Departs depot and executes sequential route legs.                            |
|    - Holds at destination if arriving before delivery window opens (R3 -> R4).    |
|    - Unloads cargo and captures legally binding Proof of Delivery (POD).          |
|    - Reports field exceptions (closed store, damaged box, road delays).          |
|    - Operates resiliently in cellular dead zones via local offline queue.         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Comprehensive Business Rules Catalogue

### Group 1: Order Intake & Cutoff Rules (`BR-ORD`)

#### BR-ORD-001: Daily Order Cutoff Lock
- **Rule**: Daily order placement locks strictly at **16:00 (4:00 PM)**. Orders submitted before 16:00 are scheduled for the next operating day. Orders submitted at or after 16:00 cannot be scheduled for next-day dispatch and are queued for the subsequent operating run.
- **Affected Entity**: `Order` (`orders`)
- **Trigger**: Order creation / submission endpoint `POST /api/v1/orders`.
- **Preconditions**: Target delivery date is tomorrow; current timestamp compared to 16:00 Asia/Colombo.
- **Result**: Order status set to `CONFIRMED` and eligible for current backlog, or `QUEUED_NEXT_RUN` with received timestamp.
- **Failure Condition**: User attempts to force schedule an order past 16:00 without explicit dispatcher override.
- **Database Enforcement**: `CHECK (status IN ('PENDING', 'CONFIRMED', 'ASSIGNED', 'QUEUED_NEXT_RUN', 'DEFERRED', 'DELIVERED', 'CANCELLED'))`.
- **Application Enforcement**: Business service checks `cutoff_time` against `Asia/Colombo` clock.
- **Tests**: Unit test with mock time before/after 16:00; integration test asserting scheduled backlog exclusion.

#### BR-ORD-002: Waypoint Fresh Dual-Order Integrity
- **Rule**: A Waypoint Fresh outlet may generate up to two distinct orders for the same delivery date: one **Ambient** order (`temp_requirement = 'ambient'`) and one **Chilled** order (`temp_requirement = 'chilled'`). They possess distinct primary keys but share the same `outlet_id` and `order_date`.
- **Affected Entity**: `Order` (`orders`)
- **Trigger**: Order submission.
- **Preconditions**: Outlet brand is `Fresh`.
- **Result**: Both orders recorded; system maintains relationship link `parent_outlet_date_key`.
- **Failure Condition**: Same outlet attempts to place two ambient or two chilled orders for the identical date.
- **Database Enforcement**: `UNIQUE(outlet_id, order_date, temp_requirement)`.
- **Application Enforcement**: Order validator checks existing orders for outlet and date.
- **Tests**: Unit test attempting duplicate order submission; DB constraint verification test.

#### BR-ORD-003: Whole Order Integrity (No Splitting)
- **Rule**: Every served order must be assigned completely to exactly one vehicle trip. Splitting an order's SKUs across multiple trips or vehicles is strictly prohibited.
- **Affected Entity**: `TripStopOrder`, `Order`
- **Trigger**: Trip allocation `POST /api/v1/dispatch/trips/:id/assign`.
- **Preconditions**: Order is in `CONFIRMED` status.
- **Result**: All line items of the order assigned to the single trip stop.
- **Failure Condition**: Partial assignment of order line items or assigning the same order to two active trips.
- **Database Enforcement**: `UNIQUE(order_id)` in active trip-orders table.
- **Application Enforcement**: Allocation service enforces whole-order mapping.
- **Tests**: Concurrency and integration tests verifying assignment exclusivity.

---

### Group 2: Fleet Allocation & Hard Feasibility Rules (`BR-ALLOC`)

#### BR-ALLOC-001: Brand & District Homogeneity per Trip (Core Rule 1)
- **Rule**: All orders assigned to a single trip $(\text{vehicle\_id}, \text{trip\_id})$ **must** belong to the same brand (`Fresh`, `Style`, or `Tech`) and the same geographical district (e.g. `Colombo`, `Gampaha`, or `Kandy`). Cross-brand and cross-district consolidation is strictly blocked.
- **Affected Entity**: `Trip`, `TripStop`, `Order`
- **Trigger**: Adding an order to a trip.
- **Preconditions**: Trip exists with designated brand and district, or takes them from the first assigned order.
- **Result**: All subsequent orders must match trip `brand` and `district`.
- **Failure Condition**: Mismatched brand or district rejected with `RULE_1_HOMOGENEITY_VIOLATION`.
- **Database Enforcement**: Composite foreign key / check constraints linking trip `(brand, district)` to stop `(brand, district)`.
- **Application Enforcement**: `AllocationEngine.validateHomogeneity(trip, order)`.
- **Tests**: Negative unit test with mixed brand/district payloads.

#### BR-ALLOC-002: Temperature Capability Compliance (Core Rule 2)
- **Rule**: Any trip carrying orders with `temp_requirement = 'chilled'` **must** be assigned to a vehicle with `thermal_capability = 'reefer'`. Ambient vehicles (`ambient`) cannot carry chilled freight. Reefers may carry ambient freight (Ambient Overflow Policy).
- **Affected Entity**: `Trip`, `Vehicle`, `Order`
- **Trigger**: Trip creation / vehicle assignment.
- **Preconditions**: Vehicle status is `AVAILABLE`.
- **Result**: Verified vehicle capability matches or supersedes order requirement.
- **Failure Condition**: Chilled order placed on ambient truck rejected with `RULE_2_TEMPERATURE_MISMATCH`.
- **Database Enforcement**: `CHECK (vehicle_is_reefer = true OR NOT trip_requires_chilled)`.
- **Application Enforcement**: `AllocationEngine.validateThermalCompatibility()`.
- **Tests**: Matrix unit tests across reefer/ambient vehicles and chilled/ambient orders.

#### BR-ALLOC-003: Physical Vehicle Access Matching (Core Rule 3)
- **Rule**: If any outlet in a trip has `parking_constraint = 'van_only'`, the assigned vehicle **must** have `vehicle_type = 'van'`. Standard trucks are physically blocked due to narrow approach roads or low bridges.
- **Affected Entity**: `Trip`, `Vehicle`, `Outlet`
- **Trigger**: Vehicle assignment to trip.
- **Preconditions**: Outlet access constraints evaluated.
- **Result**: Valid van vehicle assigned.
- **Failure Condition**: Truck assigned to `van_only` route rejected with `RULE_3_VAN_ONLY_ACCESS_VIOLATION`.
- **Database Enforcement**: Vehicle type check on `van_only` trip assignment.
- **Application Enforcement**: `AllocationEngine.validatePhysicalAccess()`.
- **Tests**: Unit tests assigning truck vs van to van_only outlet.

#### BR-ALLOC-004: Home Depot Origin Parity (Core Rule 4)
- **Rule**: Each vehicle is permanently based at either `Peliyagoda` or `Kandy`. A vehicle may serve **only** outlets whose assigned depot matches the vehicle's home depot. Cross-depot transfers or cross-depot deliveries are prohibited.
- **Affected Entity**: `Trip`, `Vehicle`, `Outlet`
- **Trigger**: Trip planning.
- **Preconditions**: `vehicle.depot_id == outlet.depot_id`.
- **Result**: Route originates and terminates at the designated home depot.
- **Failure Condition**: Mismatch rejected with `RULE_4_DEPOT_PARITY_VIOLATION`.
- **Database Enforcement**: `CHECK (trip.depot_id = vehicle.depot_id)`.
- **Application Enforcement**: Allocation query scopes vehicles and outlets by depot.
- **Tests**: Integration test attempting to assign Peliyagoda vehicle to Kandy outlet.

#### BR-ALLOC-005: Two-Dimensional Capacity Compliance (Core Rule 6)
- **Rule**: The total weight ($\text{kg}$) and total volume ($\text{m}³$) of all orders on trip $t$ must not exceed the vehicle's physical ratings:
  $$\sum_{o \in O_t} \text{weight\_kg}(o) \le W_{\max}(v) \quad \text{AND} \quad \sum_{o \in O_t} \text{volume\_m3}(o) \le V_{\max}(v)$$
- **Affected Entity**: `Trip`, `Vehicle`
- **Trigger**: Order addition or warehouse shortfall adjustment.
- **Preconditions**: Vehicle payload ratings loaded.
- **Result**: Trip cumulative payload calculated and compared.
- **Failure Condition**: Overload rejected with `CAPACITY_WEIGHT_EXCEEDED` or `CAPACITY_VOLUME_EXCEEDED`.
- **Database Enforcement**: Application transactional validation + trigger/stored function verification.
- **Application Enforcement**: Payload aggregator checks both dimensions concurrently.
- **Tests**: Boundary tests at $99\%$, $100\%$, and $101\%$ of weight and volume caps.

#### BR-ALLOC-006: Daily Trip Count & Shift Time Budget Limits (Core Rule 7)
- **Rule**:
  1. A vehicle may execute at most **two trips** ($\text{trip\_number} \in \{1, 2\}$) per operating date.
  2. Fresh trips share a cumulative daily budget of **270 minutes** ($03:30 - 08:00\text{ AM}$).
  3. Style and Tech trips share a cumulative daily budget of **480 minutes** ($8\text{ hours}$).
  4. Dual-window split schedule: A single vehicle may execute 1 Fresh morning trip ($\le 270\text{ min}$) and 1 commercial daytime trip ($\le 480\text{ min}$).
  5. Trip duration formula: $\text{trip\_minutes} = T_{\text{outbound}} + T_{\text{inter-stop}} + T_{\text{handling}}$.
- **Affected Entity**: `Trip`, `Vehicle`
- **Trigger**: Trip scheduling.
- **Preconditions**: Daily trips for vehicle on date counted.
- **Result**: Verified trip count $\le 2$ and cumulative duration $\le \text{budget}$.
- **Failure Condition**: 3rd trip rejected with `MAX_TRIPS_EXCEEDED`; time overflow rejected with `SHIFT_BUDGET_EXCEEDED`.
- **Database Enforcement**: `CHECK (trip_number IN (1, 2))` and partial unique index on `(vehicle_id, date, trip_number)`.
- **Application Enforcement**: Shift budget calculator validates cumulative elapsed and planned minutes.
- **Tests**: Test attempting 3 trips on one day; test exceeding 270 min on Fresh runs.

#### BR-ALLOC-007: Weekly Fuel Quota Compliance
- **Rule**: Weekly operating fuel consumption is tracked Monday through Saturday.
  $$\text{Trip Liters} = \frac{\text{Trip Distance (km)} + \text{Return Distance (km)}}{\text{Efficiency (km/L)}}$$
  - $\le 85\%$ quota: Normal operation.
  - $> 85\%$ and $\le 100\%$: Soft warning alert to Dispatcher.
  - $> 100\%$: Hard blocking alert; requires supervisor override.
- **Affected Entity**: `VehicleQuotaLog`, `Trip`
- **Trigger**: Trip allocation confirmation.
- **Preconditions**: Week-to-date fuel consumption retrieved.
- **Result**: Remaining liters updated and threshold alerts emitted.
- **Failure Condition**: Exceeding quota blocks dispatch unless `fuel_override = true`.
- **Application Enforcement**: Fuel tracking service in allocation transaction.
- **Tests**: Unit tests at $84\%$, $86\%$, and $101\%$ fuel usage.

#### BR-ALLOC-008: Vehicle Maintenance Exclusion
- **Rule**: Any vehicle with status `IN_WORKSHOP` cannot be allocated to any trip.
- **Affected Entity**: `Vehicle`
- **Trigger**: Vehicle assignment query.
- **Preconditions**: Vehicle query checks status.
- **Result**: Excluded from eligible fleet pool.
- **Failure Condition**: Attempt to force-assign workshop vehicle fails with `VEHICLE_IN_WORKSHOP`.
- **Database Enforcement**: `CHECK (vehicle_status = 'AVAILABLE')` on assignment relation.
- **Tests**: Integration test verifying workshop vehicles cannot be assigned.

---

### Group 3: Delivery Windows & Access Rules (`BR-WINDOW`)

#### BR-WINDOW-001: Standard Delivery Time Windows
- **Rule**: Every outlet defines $[\text{window\_open}, \text{window\_close}]$. Waypoint Fresh supermarkets must be served before **08:00 AM** opening ($03:30 - 08:00$). Arrivals after $\text{window\_close}$ are flagged as SLA breaches.
- **Affected Entity**: `TripStop`, `Outlet`
- **Trigger**: Route sequencing and live execution.
- **Preconditions**: Outlet delivery window configured.
- **Result**: Projected arrival compared to window.
- **Failure Condition**: Projected arrival $> \text{window\_close}$ triggers `Tier 2 Breach Risk Alert`.
- **Application Enforcement**: Schedule simulator & telemetry processor.
- **Tests**: Window validator tests for early, on-time, and late scenarios.

#### BR-WINDOW-002: Shopping Mall Delivery Bay Intersections
- **Rule**: Outlets located inside shopping malls (`parking_constraint = 'mall_dock'`) have an additional property `mall_window`. The effective allowable unloading window is the mathematical intersection:
  $$\text{Effective Window} = [\text{window\_open}, \text{window\_close}] \cap [\text{mall\_open}, \text{mall\_close}]$$
  If the intersection is empty ($\emptyset$), trip planning is blocked.
- **Affected Entity**: `Outlet`, `TripStop`
- **Trigger**: Route planning for mall outlets.
- **Preconditions**: Outlet has mall dock constraint.
- **Result**: Effective window calculated and stored on `TripStop`.
- **Failure Condition**: Zero overlap throws `MALL_WINDOW_DISJOINT_CONFLICT`.
- **Application Enforcement**: `WindowCalculator.computeEffectiveWindow()`.
- **Tests**: Overlapping vs non-overlapping mall window calculations.

#### BR-WINDOW-003: Early Arrival Holding Rule
- **Rule**: A vehicle arriving prior to $\text{effective\_window\_open}$ cannot unload immediately. The driver must hold on-site until the window officially opens. This holding duration consumes daily shift budget time.
- **Affected Entity**: `TripStop`, `Delivery`
- **Trigger**: Driver marks arrival at outlet.
- **Preconditions**: $\text{arrival\_time} < \text{window\_open}$.
- **Result**: Stop status transitions to `WAITING_FOR_WINDOW`; holding countdown timer initiated.
- **Failure Condition**: Handover execution blocked until window open or explicit manager standby override.
- **Application Enforcement**: Delivery state machine transition validation.
- **Tests**: State transition test from `ARRIVED` to `WAITING_FOR_WINDOW` to `UNLOADING`.

---

### Group 4: Warehouse Staging & Gate Clearance (`BR-LOAD`)

#### BR-LOAD-001: LIFO (Last-In, First-Out) Loading Sequence
- **Rule**: Cargo must be staged and loaded into the truck in reverse stop sequence:
  $$\text{Loading Order} = \text{Stop } N, \text{Stop } (N-1), \dots, \text{Stop } 1$$
  Stop 1 cargo is positioned directly adjacent to rear doors.
- **Affected Entity**: `TripStop`, `LoadingManifest`
- **Trigger**: Loader accesses trip load sheet.
- **Result**: Manifest rendered in descending stop sequence order.
- **Application Enforcement**: Manifest repository sorts by `sequence DESC`.
- **Tests**: Test verifying manifest sequence order matches LIFO.

#### BR-LOAD-002: Pre-Departure Shortfall & Damage Handling (FAIL-A)
- **Rule**: If loaders detect punctured cartons, broken packaging, or missing inventory during staging, an exception record is created. The system recalculates trip payload weight and volume in real-time and alerts Dispatcher with 3 resolution paths:
  1. `SHIP_PARTIAL`: Update manifest with short quantity, notify Store Manager.
  2. `HOLD_REPLACEMENT`: Delay route departure, adjust downstream ETAs.
  3. `EMERGENCY_DEFER`: Remove order from trip, re-sequence remaining stops, log deferral code.
- **Affected Entity**: `DiscrepancyClaim`, `Trip`, `Order`
- **Trigger**: Loader submits shortfall report `POST /api/v1/loader/discrepancies`.
- **Result**: Payload recalculated, exception linked, dispatcher notified.
- **Application Enforcement**: Transactional update of order line weights/volumes and audit trail.
- **Tests**: Integration test verifying payload reduction upon shortfall logging.

#### BR-LOAD-003: Departure Gate Clearance (L5)
- **Rule**: A vehicle cannot depart the depot gate until the warehouse loader officially signs off on cargo verification (`clear_departure`). Once cleared, the loading manifest locks as read-only.
- **Affected Entity**: `Trip`, `GateClearance`
- **Trigger**: Loader executes `POST /api/v1/loader/clearances`.
- **Preconditions**: All stops verified or resolved.
- **Result**: Trip status transitions to `CLEARED_FOR_DEPARTURE`; driver manifest released.
- **Failure Condition**: Driver attempting to start unreleased trip receives `TRIP_NOT_CLEARED_BY_WAREHOUSE`.
- **Database Enforcement**: `CHECK (trip_status != 'IN_TRANSIT' OR gate_cleared_at IS NOT NULL)`.
- **Tests**: State transition test asserting driver cannot start uncleared trip.

---

### Group 5: Delivery Handover, Proof & Discrepancies (`BR-DELIV`)

#### BR-DELIV-001: Mandatory Proof of Delivery (POD)
- **Rule**: A delivery cannot transition to `DELIVERED` without a valid Proof of Delivery record comprising:
  1. Recipient Name & Designation.
  2. Verified delivered carton count vs expected carton count.
  3. Delivery outcome (`full`, `partial`, `damaged`, `refused`).
  4. Touch signature capture or photo proof of delivery.
  5. Handover timestamp and GPS coordinates.
- **Affected Entity**: `Delivery`, `ProofOfDelivery`
- **Trigger**: Driver completes stop `POST /api/v1/deliveries/:id/complete`.
- **Preconditions**: Stop status is `ARRIVED` or `UNLOADING`.
- **Result**: POD persisted; stop marked `DELIVERED` or `PARTIALLY_DELIVERED`.
- **Failure Condition**: Missing signature/photo or missing recipient name rejected with `POD_VERIFICATION_INCOMPLETE`.
- **Database Enforcement**: Non-null foreign key from completed `delivery` to `proof_of_delivery` record.
- **Tests**: Negative validation tests without signature/recipient.

#### BR-DELIV-002: Store-Side Discrepancy Claims (SM-3)
- **Rule**: Upon physical handover, if delivered goods do not match the expected manifest (punctured packaging, temperature breach, missing units), Store Manager can file an official discrepancy claim with photographic evidence.
- **Affected Entity**: `DiscrepancyClaim`
- **Trigger**: Store Manager submits `POST /api/v1/stores/discrepancies`.
- **Preconditions**: Delivery is in progress or completed within 2 hours.
- **Result**: Discrepancy logged; audit ticket generated; central dispatch notified.
- **Tests**: Integration test verifying claim creation and status propagation.

---

### Group 6: Deferrals, Starvation & Anti-Starvation Rules (`BR-DEFER`)

#### BR-DEFER-001: Mandatory Deferral Reason Codes (FAIL-B)
- **Rule**: Every order left unserved at plan publication **must** have a structured deferral reason code logged in the database:
  - `CAPACITY_WEIGHT_EXCEEDED`: Fleet payload weight exhausted.
  - `CAPACITY_VOLUME_EXCEEDED`: Fleet volumetric capacity exhausted.
  - `NO_REEFER_AVAILABLE`: Chilled order unfulfillable due to reefer truck exhaustion.
  - `NO_VAN_AVAILABLE`: `van_only` outlet unfulfillable due to van fleet exhaustion.
  - `WINDOW_UNACHIEVABLE`: Delivery window closes before reachable trip departure.
  - `VEHICLE_IN_WORKSHOP`: Unexpected vehicle breakdown reducing fleet availability.
- **Affected Entity**: `OrderDeferralLog`
- **Trigger**: Plan publication.
- **Preconditions**: Order is in backlog and unassigned to any trip.
- **Result**: Deferral log created with mandatory reason and explanation note.
- **Failure Condition**: Attempt to publish plan with unassigned orders lacking deferral codes fails with `UNJUSTIFIED_DEFERRAL_ERROR`.
- **Database Enforcement**: `NOT NULL` on `reason_code` foreign key / enum.
- **Tests**: Integration test asserting unassigned orders cannot be orphaned without deferral records.

#### BR-DEFER-002: Anti-Starvation Priority Escalation
- **Rule**: To prevent remote or low-volume outlets from being repeatedly deferred under sustained demand surges:
  - System tracks `deferred_yesterday` (boolean) and `days_since_last_served` (integer).
  - Any outlet with `deferred_yesterday = true` or $\text{days\_since\_last\_served} \ge 2$ receives **elevated scheduling priority**.
  - A Dispatcher attempting to defer an outlet with `deferred_yesterday = true` is blocked with an override warning requiring explicit justification.
- **Affected Entity**: `Outlet`, `Order`
- **Trigger**: Backlog generation & deferral validation.
- **Preconditions**: Historical delivery dates analyzed.
- **Result**: Outlet tagged with priority score; override justification recorded if deferred again.
- **Application Enforcement**: Anti-starvation policy gate in Dispatcher service.
- **Tests**: Unit test verifying anti-starvation warning when skipping priority outlet.

---

### Group 7: Offline Resilience & Conflict Resolution (`BR-SYNC`)

#### BR-SYNC-001: Offline-First Idempotent Mutation Ingestion (FAIL-C)
- **Rule**: In cellular dead zones (e.g. Kandy mountain corridors), Driver and Loader apps generate mutations locally with client-generated UUIDs and ISO timestamps. When signal returns, mutations sync via `POST /api/v1/sync/reconcile`. The server must process these idempotently.
- **Affected Entity**: `SyncLog`, `Delivery`, `ProofOfDelivery`
- **Trigger**: Network reconnection sync request.
- **Preconditions**: Client transmits mutation batch with idempotency keys.
- **Result**: Duplicate mutations return original success without re-executing; new mutations processed in strict chronological order.
- **Database Enforcement**: Unique constraint on `(client_mutation_id, entity_type)`.
- **Application Enforcement**: Idempotency middleware & transaction orchestrator.
- **Tests**: Concurrency test sending identical sync batch twice; test clock skew ordering.

#### BR-SYNC-002: Two-Way Conflict Detection
- **Rule**: If a dispatcher amended a route while the driver was offline (e.g. order re-sequenced or cancelled), the server detects version divergence:
  - Driver physical on-the-ground logs (arrival timestamp, physical handover) are **never silently overwritten**.
  - Both states are flagged with `conflict = true` for dispatcher review.
- **Affected Entity**: `Trip`, `TripStop`, `SyncConflict`
- **Trigger**: Sync ingestion against modified entity.
- **Preconditions**: `entity.version > client_expected_version`.
- **Result**: Driver fact-of-handover accepted; route plan conflict flagged.
- **Application Enforcement**: Optimistic locking (`version` column).
- **Tests**: Test simulating concurrent dispatch edit and driver offline completion.
