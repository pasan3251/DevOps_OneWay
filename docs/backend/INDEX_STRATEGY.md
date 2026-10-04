# Waypoint Logistics — PostgreSQL Index Strategy & Access Pattern Analysis

## 1. Indexing Principles & Guidelines

Indexes in the Waypoint Logistics PostgreSQL database are engineered strictly around demonstrated operational access patterns. Blind indexing is prohibited to avoid write amplification and buffer pool churn during high-frequency dispatch updates.

### Principles:
1. **Index Foreign Keys**: All relational foreign keys that participate in frequent JOINs, cascades, or parent lookups receive dedicated B-tree indexes.
2. **Leftmost Prefix for Composites**: Composite indexes follow the column cardinality and equality-first ordering:
   $$\text{Equality Columns} \rightarrow \text{Range / Filter Columns} \rightarrow \text{Sorting Columns}$$
3. **Partial Indexes for Sparse Queries**: Where queries filter for specific active states (e.g. `status = 'CONFIRMED'`, `status = 'IN_TRANSIT'`), partial indexes are utilized to minimize index bloat.
4. **Covering Indexes for Read-Heavy Queries**: Frequently accessed summary views use `INCLUDE` clauses to satisfy queries purely from the index pages (Index-Only Scans).

---

## 2. Access Pattern Analysis & Index Specifications

### 2.1 Table: `orders`

#### Query Pattern 1: Dispatcher 16:00 Cutoff Backlog Consolidation
- **Query**:
  ```sql
  SELECT * FROM orders 
  WHERE depot_id = $1 AND order_date = $2 AND status = 'CONFIRMED'
  ORDER BY brand, district, total_weight_kg DESC;
  ```
- **Index**:
  ```sql
  CREATE INDEX idx_orders_backlog_consolidation 
  ON orders (depot_id, order_date, brand, district) 
  WHERE status = 'CONFIRMED';
  ```
- **Justification**:
  - *Column Order*: `depot_id` (high-cardinality equality) $\rightarrow$ `order_date` (equality) $\rightarrow$ `brand` & `district` (clustering for Rule 1 grouping).
  - *Partial Filter*: Only indexes unallocated confirmed orders; excludes millions of historical delivered orders.
  - *Benefit*: Eliminates full table scan during plan generation; transforms search into an index range scan.

#### Query Pattern 2: Store Manager Order History & Cutoff Lookup
- **Query**:
  ```sql
  SELECT * FROM orders 
  WHERE outlet_id = $1 
  ORDER BY order_date DESC, submitted_at DESC 
  LIMIT 20;
  ```
- **Index**:
  ```sql
  CREATE INDEX idx_orders_outlet_history 
  ON orders (outlet_id, order_date DESC, submitted_at DESC);
  ```
- **Justification**: Supports keyset/offset pagination on store manager order portal without in-memory sort.

#### Query Pattern 3: Fresh Dual-Order Uniqueness (Business Invariant)
- **Constraint Index**:
  ```sql
  CREATE UNIQUE INDEX uq_orders_outlet_date_temp 
  ON orders (outlet_id, order_date, temp_requirement);
  ```
- **Justification**: Hard database guarantee preventing accidental duplicate ambient or duplicate chilled orders for the same outlet on the same date.

---

### 2.2 Table: `trips`

#### Query Pattern 1: Vehicle 2-Trip Daily Ceiling (Core Rule 7 Invariant)
- **Constraint Index**:
  ```sql
  CREATE UNIQUE INDEX uq_trips_vehicle_date_number 
  ON trips (vehicle_id, operating_date, trip_number);
  ```
- **Justification**: Strictly guarantees that a single vehicle cannot be scheduled for more than two trips (trip 1 and trip 2) on any single calendar date at the database engine level.

#### Query Pattern 2: Active Driver Route Lookup (Driver Mobile App Start)
- **Query**:
  ```sql
  SELECT * FROM trips 
  WHERE driver_id = $1 AND operating_date = $2 AND status IN ('CLEARED_DEPARTURE', 'IN_TRANSIT', 'RETURNING')
  LIMIT 1;
  ```
- **Index**:
  ```sql
  CREATE INDEX idx_trips_active_driver_run 
  ON trips (driver_id, operating_date) 
  WHERE status IN ('CLEARED_DEPARTURE', 'IN_TRANSIT', 'RETURNING');
  ```
- **Justification**: Partial index instantly identifies the driver's active on-road shift in sub-millisecond time.

#### Query Pattern 3: Warehouse Staging Dashboard by Depot
- **Query**:
  ```sql
  SELECT * FROM trips 
  WHERE depot_id = $1 AND operating_date = $2 AND status IN ('STAGING', 'CLEARED_DEPARTURE')
  ORDER BY departure_planned_min ASC;
  ```
- **Index**:
  ```sql
  CREATE INDEX idx_trips_staging_queue 
  ON trips (depot_id, operating_date, departure_planned_min ASC) 
  WHERE status IN ('STAGING', 'CLEARED_DEPARTURE');
  ```
- **Justification**: Supports warehouse tablet staging overview ordered chronologically by scheduled departure time.

---

### 2.3 Table: `trip_stops`

#### Query Pattern 1: Stop Sequenced Manifest (Driver & Loader LIFO Access)
- **Query**:
  ```sql
  SELECT * FROM trip_stops 
  WHERE trip_id = $1 
  ORDER BY sequence ASC;
  ```
- **Index**:
  ```sql
  CREATE UNIQUE INDEX uq_trip_stops_trip_sequence 
  ON trip_stops (trip_id, sequence);
  ```
- **Justification**: Guarantees stop sequence uniqueness per trip and fulfills sequence-ordered queries with an Index-Only Scan.

#### Query Pattern 2: LIFO Loading Sequence (Warehouse Tablets)
- **Query**:
  ```sql
  SELECT * FROM trip_stops 
  WHERE trip_id = $1 
  ORDER BY lifo_position ASC;
  ```
- **Index**:
  ```sql
  CREATE INDEX idx_trip_stops_lifo_order 
  ON trip_stops (trip_id, lifo_position ASC);
  ```
- **Justification**: Directly supports reverse loading displays where Stop 1 is presented at the rear doors (LIFO #1).

---

### 2.4 Table: `deliveries` & `proof_of_deliveries`

#### Query Pattern 1: Idempotent Offline Sync Lookup (FAIL-C)
- **Query**:
  ```sql
  SELECT id, status FROM deliveries 
  WHERE client_mutation_id = $1;
  ```
- **Constraint Index**:
  ```sql
  CREATE UNIQUE INDEX uq_deliveries_client_mutation 
  ON deliveries (client_mutation_id) 
  WHERE client_mutation_id IS NOT NULL;
  ```
- **Justification**: Prevents duplicate delivery creation when offline mobile drivers retry their sync payload upon restoring cellular signal.

#### Query Pattern 2: Delivery by Trip Stop Lookup
- **Index**:
  ```sql
  CREATE UNIQUE INDEX uq_deliveries_stop_id 
  ON deliveries (trip_stop_id);
  ```
- **Justification**: Enforces exactly one delivery fulfillment record per trip stop.

---

### 2.5 Table: `order_deferrals`

#### Query Pattern 1: Anti-Starvation Historical Lookback
- **Query**:
  ```sql
  SELECT order_id, operating_date, reason_code 
  FROM order_deferrals 
  WHERE order_id = $1 AND operating_date = $2 - INTERVAL '1 day';
  ```
- **Index**:
  ```sql
  CREATE INDEX idx_order_deferrals_starvation_check 
  ON order_deferrals (order_id, operating_date DESC);
  ```
- **Justification**: Instantly verifies whether an order was skipped on the immediate prior operating day (`deferred_yesterday`).

---

### 2.6 Table: `audit_logs`

#### Query Pattern 1: Entity Audit Trail
- **Query**:
  ```sql
  SELECT * FROM audit_logs 
  WHERE entity_type = $1 AND entity_id = $2 
  ORDER BY created_at DESC 
  LIMIT 50;
  ```
- **Index**:
  ```sql
  CREATE INDEX idx_audit_logs_entity_timeline 
  ON audit_logs (entity_type, entity_id, created_at DESC);
  ```
- **Justification**: Fast timeline tracing of state mutations on any Order, Trip, or Delivery.

---

## 3. Summary of Indexes & Tradeoff Matrix

| Index Name | Table | Indexed Columns | Index Type | Tradeoff / Cost |
|---|---|---|---|---|
| `idx_orders_backlog_consolidation` | `orders` | `(depot_id, order_date, brand, district)` WHERE `status = 'CONFIRMED'` | Partial B-tree | Minor insert cost for confirmed orders; saves 95% storage vs full index. |
| `uq_orders_outlet_date_temp` | `orders` | `(outlet_id, order_date, temp_requirement)` | Unique B-tree | Uniqueness check overhead; enforces business rule at DB engine level. |
| `uq_trips_vehicle_date_number` | `trips` | `(vehicle_id, operating_date, trip_number)` | Unique B-tree | Hard blocker on 3rd trip; zero maintenance overhead. |
| `idx_trips_active_driver_run` | `trips` | `(driver_id, operating_date)` WHERE active status | Partial B-tree | Ultra-compact index (< 100 rows at any time); instantaneous driver login lookup. |
| `uq_trip_stops_trip_sequence` | `trip_stops` | `(trip_id, sequence)` | Unique B-tree | Enforces linear route numbering; index-only scan on manifest views. |
| `uq_deliveries_client_mutation` | `deliveries` | `(client_mutation_id)` | Partial Unique | Guarantees offline idempotency; ignores nulls for direct API handovers. |
| `idx_audit_logs_entity_timeline` | `audit_logs` | `(entity_type, entity_id, created_at DESC)` | B-tree | Minimal overhead on append-only audit table. |
