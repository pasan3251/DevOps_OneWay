# Waypoint Logistics — Backend System Architecture Specification

## 1. Architectural Style: Modular Monolith

The Waypoint Logistics backend is designed as a **Modular Monolith** in TypeScript using **NestJS** with the high-performance **Fastify** HTTP adapter.

```
+-----------------------------------------------------------------------------------+
|                        WAYPOINT MODULAR MONOLITH RUNTIME                          |
+-----------------------------------------------------------------------------------+
|                                 FASTIFY HTTP ENGINE                               |
|                (Routing | Schema Validation | Compression | Fast JSON)            |
+-----------------------------------------------------------------------------------+
|                               CROSS-CUTTING CONCERNS                              |
|  * JWT Auth & RBAC Guards        * Idempotency Interceptor                        |
|  * Correlation ID Tracing        * Global Exception Filter (Error Codes)          |
|  * Structured JSON Logger        * Rate Limiter & Security Headers                |
+-----------------------------------------------------------------------------------+
|                                DOMAIN MODULES                                     |
|                                                                                   |
|  +------------------+  +------------------+  +------------------+                 |
|  |   Auth & Users   |  |     Network      |  |  Fleet & Fuel    |                 |
|  |  (RBAC / Scope)  |  | (Depots/Outlets) |  | (Reefer / Quota) |                 |
|  +------------------+  +------------------+  +------------------+                 |
|                                                                                   |
|  +------------------+  +------------------+  +------------------+                 |
|  |     Orders       |  |     Dispatch     |  | Warehouse Loader |                 |
|  | (Cutoff / Dual)  |  |  (7 Core Rules)  |  |  (LIFO / Gate)   |                 |
|  +------------------+  +------------------+  +------------------+                 |
|                                                                                   |
|  +------------------+  +------------------+  +------------------+                 |
|  | Delivery Driver  |  |   Offline Sync   |  |   Audit Trail    |                 |
|  |  (POD / Window)  |  |  (Idempotent)    |  |  (Traceability)  |                 |
|  +------------------+  +------------------+  +------------------+                 |
+-----------------------------------------------------------------------------------+
|                             INFRASTRUCTURE ADAPTERS                               |
|  * PostgreSQL Pool (Drizzle ORM)         * Redis Cache & Idempotency Store        |
|  * BullMQ Async Job Workers              * Storage Abstraction (S3 / Local File)  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Directory & Module Organization

The backend service is housed in `apps/api/` with a domain-bounded folder hierarchy:

```text
apps/api/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── Dockerfile
├── src/
│   ├── main.ts                          # Bootstrap Fastify + NestJS + Swagger
│   ├── app.module.ts                    # Root module composition
│   │
│   ├── config/                          # Typed configuration validation (Zod)
│   │   ├── env.schema.ts
│   │   └── configuration.ts
│   │
│   ├── database/                        # Database Infrastructure
│   │   ├── database.module.ts
│   │   ├── database.provider.ts         # pg.Pool connection provider
│   │   ├── schema/                      # Drizzle ORM Table Schemas
│   │   │   ├── depots.ts
│   │   │   ├── outlets.ts
│   │   │   ├── vehicles.ts
│   │   │   ├── users.ts
│   │   │   ├── orders.ts
│   │   │   ├── trips.ts
│   │   │   ├── trip-stops.ts
│   │   │   ├── deliveries.ts
│   │   │   ├── order-deferrals.ts
│   │   │   ├── discrepancy-claims.ts
│   │   │   ├── audit-logs.ts
│   │   │   └── index.ts
│   │   ├── migrations/                  # Generated SQL migrations
│   │   └── seed/                        # Deterministic master & test seeders
│   │
│   ├── modules/
│   │   ├── auth/                        # JWT authentication & session management
│   │   ├── users/                       # User management & role resolution
│   │   ├── network/                     # Depots, Outlets & Travel matrices
│   │   ├── fleet/                       # Vehicle registry, fuel tracking, reefer telematics
│   │   ├── orders/                      # 16:00 cutoff lock, Fresh dual-orders, intake
│   │   ├── dispatch/                    # 7 Core Feasibility Rules, allocation, deferrals
│   │   ├── loader/                      # LIFO manifests, FAIL-A shortfalls, gate clearance
│   │   ├── driver/                      # Route execution, arrival holding, POD, delay alerts
│   │   ├── sync/                        # Offline mutation batch ingestion (FAIL-C)
│   │   ├── audit/                       # Append-only audit logger
│   │   └── health/                      # Kubernetes / Docker liveness & readiness probes
│   │
│   ├── common/                          # Cross-cutting utilities
│   │   ├── decorators/                  # @Roles(), @CurrentUser()
│   │   ├── guards/                      # JwtAuthGuard, RolesGuard, ResourceScopeGuard
│   │   ├── filters/                     # GlobalExceptionFilter (Domain error translation)
│   │   ├── interceptors/                # LoggingInterceptor, IdempotencyInterceptor
│   │   └── pipes/                       # ZodValidationPipe
│   │
│   └── workers/                         # BullMQ Background Job Processors
│       ├── notification.worker.ts
│       └── deferral-rollover.worker.ts
│
└── test/                                # Testing Suites
    ├── unit/
    ├── integration/                     # Real PostgreSQL container tests
    └── e2e/                             # End-to-end HTTP workflow tests
```

---

## 3. Transaction Management & Isolation

Multi-step logistics mutations must execute atomically within PostgreSQL transactions (`BEGIN ... COMMIT`). Drizzle ORM's transactional closure API is used:

```typescript
await db.transaction(async (tx) => {
  // 1. Validate feasibility rules under SELECT ... FOR UPDATE
  // 2. Insert Trip and Stop records
  // 3. Update Order statuses to 'ASSIGNED'
  // 4. Update Vehicle cumulative load and fuel projections
  // 5. Emit Audit Log record
});
```

### Isolation Levels:
- **Default (`READ COMMITTED`)**: Used for routine queries, stop lookups, and order reads.
- **Strict (`REPEATABLE READ` / `SERIALIZABLE` or `SELECT ... FOR UPDATE`)**:
  - Used for vehicle trip allocation to prevent two dispatchers from booking the same vehicle on the same date.
  - Used for order assignment to prevent dual booking of the same order onto two trips.

---

## 4. Concurrency Control Mechanisms

1. **Unique Database Constraints**:
   - `UNIQUE (vehicle_id, operating_date, trip_number)`: Hard guarantee that a vehicle cannot have a 3rd trip.
   - `UNIQUE (outlet_id, order_date, temp_requirement)`: Hard guarantee against duplicate same-day Fresh orders.
   - `UNIQUE (order_id)` in trip stops: Hard guarantee against order splitting.
2. **Optimistic Locking**:
   - High-activity entities (`Order`, `Trip`) carry an integer `version` column.
   - When updating state, queries check `WHERE id = $1 AND version = $2`, incrementing `version = version + 1`. A mismatch throws `409 Conflict`.
3. **Idempotency Keys**:
   - Offline sync requests (`POST /api/v1/sync/reconcile`) and driver delivery completions carry a client-generated UUID in header `Idempotency-Key` or payload `clientMutationId`.
   - Redis or PostgreSQL partial unique index caches and returns the prior result for duplicated requests without re-executing side effects.

---

## 5. Security & Observability

- **Password Hashing**: Argon2id with minimum 19 MiB memory cost and 2 iterations.
- **Authorization**: Role-Based Access Control (RBAC) paired with Attribute-Based Scope Checks (e.g. Store Managers can only view their own outlet's orders; Loaders can only access their assigned depot's manifests).
- **Request Tracing**: Fastify assigns an `X-Correlation-ID` header to every request; logs include this ID across HTTP layer, database queries, and background worker queues.
- **Metrics & Health**: `/api/v1/health/ready` evaluates database query response (`SELECT 1`) and Redis `PING` before returning `200 OK`.
