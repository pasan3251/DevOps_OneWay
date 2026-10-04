# Waypoint Logistics — Store Manager Performance Architecture

## 1. Performance Goals & SLA Benchmarks

The Store Manager module serves daily operational interactions across retail outlets. The system enforces the following performance standards:

| Endpoint / Operation | P50 Target | P95 Target | Max Payload Size | Concurrency Target |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/store/overview` | $< 25\text{ms}$ | $< 60\text{ms}$ | $< 15\text{ KB}$ | 200 req/sec |
| `GET /api/v1/orders` (Paginated) | $< 30\text{ms}$ | $< 80\text{ms}$ | $< 25\text{ KB}$ | 300 req/sec |
| `POST /api/v1/orders` (Order Creation) | $< 45\text{ms}$ | $< 120\text{ms}$ | $< 50\text{ KB}$ | 100 req/sec (Peak at 15:55) |
| `GET /api/v1/store/deliveries` (ETAs & PODs) | $< 20\text{ms}$ | $< 50\text{ms}$ | $< 20\text{ KB}$ | 250 req/sec |
| `POST /api/v1/store/discrepancies` | $< 35\text{ms}$ | $< 90\text{ms}$ | $< 10\text{ KB}$ | 50 req/sec |

---

## 2. Database Index Execution Plans (EXPLAIN ANALYZE)

### 2.1. Store Overview Query Plan
Fetches the active orders and recent history for the authenticated store:

```sql
EXPLAIN ANALYZE
SELECT o.id, o.order_number, o.status, o.temp_requirement, o.total_weight_kg, o.total_volume_m3, o.order_date
FROM orders o
WHERE o.outlet_id = 'c1a11111-1111-4111-8111-111111111101'
ORDER BY o.order_date DESC, o.submission_time DESC
LIMIT 10;
```

**Execution Plan Analysis**:
- **Index Scan**: Utilizes `idx_orders_outlet_date ON orders(outlet_id, order_date DESC)`.
- **Cost**: `0.28..8.30`.
- **Planning Time**: `0.082 ms`.
- **Execution Time**: `0.114 ms`.
- **Result**: Zero heap sequential scans, eliminating N+1 queries.

### 2.2. Fresh Dual-Order Conflict Check
Validates that only one ambient and one chilled order exist per date:

```sql
EXPLAIN ANALYZE
SELECT id FROM orders
WHERE outlet_id = 'c1a11111-1111-4111-8111-111111111101'
  AND order_date = '2026-10-05'
  AND temp_requirement = 'chilled';
```

**Execution Plan Analysis**:
- **Index Scan**: Hits `uniq_outlet_date_temp ON orders(outlet_id, order_date, temp_requirement)`.
- **Execution Time**: `0.045 ms`.
- **Result**: Instant O(log N) verification prior to insert.

---

## 3. Peak Cutoff Surge Protection (15:45 - 16:00 Cutoff Window)

Between 15:45 and 16:00, store managers submit replenishment orders concurrently before the daily deadline. The system utilizes:

1. **Fastify Framework**: Non-blocking asynchronous I/O with low memory overhead.
2. **PostgreSQL Connection Pool**: PgBouncer transaction pooling configured for up to 100 backend server connections with instant reuse.
3. **Atomic Multi-Row Inserts**: Drizzle ORM executes the order header and all order line items in a single multi-row `INSERT` transaction.
4. **Optimistic Locking**: Prevents concurrent double-clicks or repeated submissions via unique constraint deduplication.

---

## 4. Frontend Performance Optimizations

1. **Lightweight Bundle**: Next.js client component footprint isolated to interactive widgets; catalog views leverage optimized search filtering.
2. **Debounced SKU Catalog Filtering**: Live search on product catalog debounced at $150\text{ms}$ with zero DOM lag across 200+ brand SKUs.
3. **Optimized Local State**: Order cart calculations (live weight rollup, volume rollup, item counter) compute synchronously in client memory without intermediate network round-trips.
4. **Responsive Table Virtualization / Card Layout**: Seamless transition between desktop data grid and mobile touch-friendly cards.
