# Waypoint Logistics — Performance Strategy, Load Testing & Query Optimization

## 1. Performance Goals & Target Service Level Objectives (SLOs)

Under normal peak operating load (16:00 cutoff consolidation and 05:00 morning fleet dispatch):

| Metric | Target SLO | High-Load Tolerance (500 VUs) |
|---|---|---|
| **API p50 Response Time** | $\le 15\text{ ms}$ | $\le 35\text{ ms}$ |
| **API p95 Response Time** | $\le 60\text{ ms}$ | $\le 120\text{ ms}$ |
| **API p99 Response Time** | $\le 120\text{ ms}$ | $\le 250\text{ ms}$ |
| **Throughput (Peak API)** | $\ge 1,200\text{ req/sec}$ | $\ge 2,500\text{ req/sec}$ |
| **Error Rate** | $< 0.05\%$ (excluding 4xx business validations) | $< 0.1\%$ |
| **Database Pool Utilization** | $\le 65\%$ under normal load | $\le 85\%$ under peak burst |

---

## 2. Load Testing Architecture with k6

Load tests are organized in `tests/load/` using **k6** to simulate realistic multi-role workloads:

```text
tests/load/
├── scenarios/
│   ├── store-order-intake.js        # Store managers placing orders ahead of 16:00
│   ├── dispatcher-backlog.js        # Dispatchers running feasibility checks & allocation
│   ├── driver-execution.js          # Drivers logging arrivals, window checks, and PODs
│   └── mixed-peak-lifecycle.js      # Combined multi-role concurrency
├── thresholds.json
└── run-load-test.sh
```

### Progressive Ramp-Up Stages:
```javascript
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Warm-up
    { duration: '1m', target: 100 },   // Sustained baseline
    { duration: '2m', target: 250 },   // Morning dispatch burst
    { duration: '1m', target: 500 },   // Peak stress test
    { duration: '30s', target: 0 },    // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<120', 'p(99)<250'],
    http_req_failed: ['rate<0.01'],
  },
};
```

---

## 3. PostgreSQL Query Profiling & `EXPLAIN ANALYZE`

Every high-frequency query is benchmarked against a 10,000-order database seed to verify that:
1. Full table scans (`Seq Scan`) are eliminated on large tables.
2. Index scans (`Index Scan` or `Index Only Scan`) are active.
3. Nested loop joins on large sets are avoided in favor of hash joins.

### Example: Backlog Consolidation Query Optimization
```sql
EXPLAIN (ANALYZE, BUFFERS, COSTS)
SELECT o.id, o.order_number, o.brand, o.district, o.total_weight_kg, o.total_volume_m3
FROM orders o
WHERE o.depot_id = 'PELIYAGODA'
  AND o.order_date = '2026-10-05'
  AND o.status = 'CONFIRMED'
ORDER BY o.brand, o.district;
```
- **Before Optimization (No Index)**:
  `Seq Scan on orders (cost=0.00..385.00 rows=48 width=120) (actual time=0.045..4.810 rows=48 loops=1)`
- **After Optimization (`idx_orders_backlog_consolidation`)**:
  `Bitmap Index Scan on idx_orders_backlog_consolidation (cost=0.00..4.35 rows=48 width=120) (actual time=0.012..0.038 rows=48 loops=1)`
  **Performance Gain**: $125\times$ speedup, zero buffer cache thrashing.
