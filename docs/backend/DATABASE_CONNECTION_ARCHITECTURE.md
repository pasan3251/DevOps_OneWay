# Waypoint Logistics — Database Connection Architecture & Sizing Strategy

## 1. Executive Summary & Core Principle

This document establishes the authoritative database connection architecture for the **Waypoint Logistics Management System**.

The architectural decision is derived directly from the business domain constraints, user roles, transactional integrity requirements, and workload characteristics described in the project case study (`project_overview.md`, `system_business_logic_operational_constraints.md`, `primary_workflow.md`, and `secondary_workflows (1).md`).

### Critical Architectural Distinction:
> **Application User Roles $\neq$ PostgreSQL Database Roles.**
> 
> End users (Store Managers, Drivers, Dispatchers, Loaders) **MUST NEVER** establish direct TCP connections to PostgreSQL. All client traffic terminates at the **NestJS Fastify API Gateway**, where authentication, role-based access control (RBAC), and tenant resource scoping (`ResourceScopeGuard`) are strictly enforced. The backend then accesses PostgreSQL through a centralized, monitored, and size-constrained connection pool using dedicated service accounts.

---

## 2. Workload Analysis Per Application Role

The Waypoint Logistics network encompasses **2 distribution hubs** (Peliyagoda Central and Kandy Regional), **120 retail outlets** across 3 distinct brands (**Fresh**, **Style**, **Tech**), and a fleet of **60 commercial vehicles** with assigned drivers.

```text
+---------------------------------------------------------------------------------------------------+
|                                 APPLICATION ROLE WORKLOAD MATRIX                                  |
+------------------+-----------------------------+------------+-----------+-------------+-----------+
| Role             | Core Database Operations    | Read/Write | Frequency | Transaction | Concurrency|
|                  |                             | Pattern    |           | Complexity  | Profile   |
+------------------+-----------------------------+------------+-----------+-------------+-----------+
| Central          | - Consolidated backlog fetch| Heavy Read | High      | High        | Low       |
| Dispatcher       | - 7 Core feasibility checks | + Complex  | (Peak     | (Multi-row, | (1 single |
| (Peliyagoda)     | - Atomic trip generation    | Writes     | 16:00 -   | multi-table | active    |
|                  | - LIFO sequence allocation  |            | 18:00)    | atomic      | planner)  |
|                  | - Starvation deferrals      |            |           | locks)      |           |
|                  | - Fleet telematics monitor  |            |           |             |           |
+------------------+-----------------------------+------------+-----------+-------------+-----------+
| Store Manager    | - Catalog SKU browse        | Moderate   | Moderate  | Medium      | Moderate  |
| (120 Outlets)    | - Order creation & items    | Read /     | (Spikes   | (Atomic     | (120      |
|                  | - 16:00 cutoff lock check   | Write      | 14:00 -   | order +     | potential |
|                  | - Fresh dual-order check    |            | 16:00)    | items)      | concurrent|
|                  | - Delivery status tracking  |            |           |             | users)    |
|                  | - Discrepancy acknowledgement|           |           |             |           |
+------------------+-----------------------------+------------+-----------+-------------+-----------+
| Warehouse Loader | - LIFO manifest sheet fetch | Read-Heavy | Moderate  | Low         | Low       |
| (Peliyagoda &    | - FAIL-A shortfall logging  | + Point    | (Morning  | (Single-row | (4-8 dock |
|  Kandy Docks)    | - L5 Gate clearance token   | Writes     | 06:00 -   | updates,    | loaders)  |
|                  |   issuance & trip release   |            | 08:30)    | fast)       |           |
+------------------+-----------------------------+------------+-----------+-------------+-----------+
| Delivery Driver  | - Active trip fetch         | High-Freq  | High      | Medium      | High      |
| (60 Fleet        | - Gate departure confirm    | Point      | (Continuous| (Atomic POD | (60 mobile|
|  Vehicles)       | - Stop geofence arrival     | Writes     | throughout| insert +    | devices   |
|                  | - Early arrival wait calc   |            | delivery  | stop update | active    |
|                  | - Electronic POD capture    |            | shifts)   | + order)    | on road)  |
|                  | - Exception reporting       |            |           |             |           |
|                  | - Periodic GPS telematics   |            |           |             |           |
|                  | - Offline mutation sync     |            |           |             |           |
+------------------+-----------------------------+------------+-----------+-------------+-----------+
| System Admin     | - User management & RBAC    | Low Read / | Low       | Low         | Low       |
|                  | - Audit log inspection      | Point Write| (Ad-hoc)  |             | (1-2)     |
+------------------+-----------------------------+------------+-----------+-------------+-----------+
| Background Worker| - 16:00 Cutoff transition   | Batch Read | Scheduled | Medium      | Moderate  |
| (BullMQ / Cron)  | - Telematics data retention | + Batch    | & Periodic| (Batch row  | (2-4 async|
|                  | - Fuel quota threshold alert| Write      |           | processing) | threads)  |
|                  | - Notification dispatch     |            |           |             |           |
+------------------+-----------------------------+------------+-----------+-------------+-----------+
```

---

## 3. Database Connection Requirements & Characteristics

To guarantee data consistency without exhausting system resources, the database layer must support specific query patterns and transaction boundaries:

### 3.1 Short-Lived Reads (85% of traffic)
- Store catalog views, active trip queries, vehicle status lookups, and telematics polling.
- Execution duration: $< 5\text{ ms}$.
- Requirement: Connections must be checked out, executed, and immediately returned to the pool.

### 3.2 Atomic Multi-Step Transactions (15% of traffic)
- **Trip Planning (`POST /api/v1/dispatch/plan`)**:
  1. Read and lock vehicle record.
  2. Verify prior trip count on operating date $\le 1$.
  3. Insert `trips` record.
  4. Insert $N$ `trip_stops` with calculated LIFO sequences.
  5. Bulk-update $N$ `orders` from `ORDER_RECORDED` $\to$ `ASSIGNED`.
- **Proof of Delivery (`POST /api/v1/driver/stops/:id/deliver`)**:
  1. Insert `proof_of_deliveries` record with signature, GPS, and timestamp.
  2. Update `trip_stops` status $\to$ `DELIVERED`, record departure timestamp.
  3. Update `orders` status $\to$ `DELIVERED`.
- Requirement: **Guaranteed single-connection transaction scoping** (`BEGIN ... COMMIT / ROLLBACK`). Connection multiplexers must not swap server connections mid-transaction.

### 3.3 Offline Reconciliation (`POST /api/v1/sync/mutations`)
- Accepts batches of 5-20 client mutations submitted after cellular connectivity restoration.
- Requirement: Idempotency table (`client_mutations`) verification and sequential execution per mutation to prevent duplicate side effects (`FAIL-C`).

### 3.4 What the System Does NOT Require:
- **No Long-Running Transactions**: Transactions are never held open across network I/O, file uploads, or human interaction.
- **No PostgreSQL LISTEN/NOTIFY**: Pub/Sub and async job queues are handled via **Redis + BullMQ**, completely unburdening PostgreSQL from connection-holding websocket state.
- **No Temporary Tables or Session Variables**: All queries operate on standard relational schemas without session-scoped state.

---

## 4. Evaluation of Connection Architecture Options

```text
                        COMPARISON OF CONNECTION TOPOLOGIES

Option A: Direct Connections (No Pooling)
[Client / API] =================(New TCP per request)=================> [PostgreSQL]
* High connection overhead (20-50ms handshake per query).
* PostgreSQL process fork per connection exhausts RAM at ~100 clients.
* Verdict: REJECTED for all environments.

Option B: Application-Level Pool (pg.Pool / Drizzle)
[API Pod 1] ───(Pool of 10)───┐
[API Pod 2] ───(Pool of 10)───┼───────────────────────────────────────> [PostgreSQL]
[Worker]    ───(Pool of 5)────┘
* Native integration with node-postgres and Drizzle ORM.
* Zero external infrastructure dependencies.
* Perfectly handles multi-statement transactions.
* Total DB connections = N_instances * Pool_Max.
* Verdict: SELECTED as primary engine for Development, Staging, and Initial Production.

Option C: PgBouncer Middleware (Transaction Pooling)
[API Pod 1..10] ───(App Pools)───> [PgBouncer Proxy] ──(20 Conns)───> [PostgreSQL]
* Decouples horizontal API scaling from PostgreSQL connection limits.
* Multiplexes hundreds of API connections onto 20-30 physical database backends.
* Self-hostable, open-source, zero license fees.
* Verdict: SELECTED as modular horizontal scaling extension for high-load production.
```

### Detailed Evaluation Table

| Feature / Metric | Option A: Direct Connections | Option B: Application Pool (`pg.Pool`) | Option C: PgBouncer (Transaction Pooling) |
| :--- | :--- | :--- | :--- |
| **Connection Overhead** | Extreme (Handshake per request) | Zero (Persistent reused TCP sessions) | Zero (Multiplexed persistent sessions) |
| **Transaction Integrity** | Supported | **Fully Supported** | **Supported** (with non-prepared statements) |
| **Max Scale (API Pods)** | $< 5$ instances | $5 - 8$ instances ($\approx 80$ conns) | **$50+$ instances** ($> 1000$ client conns) |
| **Infrastructure Complexity**| Lowest | **Minimal (Built-in)** | Moderate (Requires proxy container) |
| **Local Dev Simplicity** | Poor | **Ideal (No extra containers)** | Overkill for single developer |
| **Cost** | Free / Open-source | **Free / Open-source** | **Free / Open-source** |

---

## 5. Session Pooling vs Transaction Pooling Deep-Dive

PgBouncer supports three distinct pooling modes. Selecting the wrong mode can silently break business logic:

### 5.1 Statement Pooling (DISQUALIFIED ❌)
- Breaks multi-statement transactions. If a transaction runs `BEGIN; INSERT INTO trips...; INSERT INTO trip_stops...; COMMIT;`, each statement could be dispatched to a completely different PostgreSQL backend process!
- **Verdict**: Strictly forbidden.

### 5.2 Session Pooling (INEFFICIENT ⚠️)
- Keeps the server connection tied to an API client until the API client explicitly disconnects.
- Does not solve the connection multiplication problem during horizontal scaling (100 API workers still require 100 server connections).
- **Verdict**: Only useful if the application relies on `LISTEN/NOTIFY` or temporary tables (which Waypoint does not).

### 5.3 Transaction Pooling (OPTIMAL FOR HIGH SCALE ✅)
- A physical PostgreSQL connection is assigned to the client **only for the duration of a single transaction** (`BEGIN` through `COMMIT/ROLLBACK`) or a single auto-commit query.
- The connection is immediately released back to the pool once the transaction ends.
- **Drizzle ORM Compatibility Rule**: Under transaction pooling, PostgreSQL session-level named prepared statements are not preserved across different server connections. Drizzle ORM and `node-postgres` must be configured with `prepare: false` or anonymous parameterized queries when routing through PgBouncer in transaction mode.

---

## 6. Connection Capacity & Sizing Mathematics

PostgreSQL creates a dedicated OS process for every open connection. Each process consumes approximately **5MB to 10MB of RAM** plus allocated `work_mem`. Excessive connections degrade performance due to CPU cache thrashing and context switching.

The optimal number of concurrent PostgreSQL connections follows the proven formula:
$$\text{Max Active Connections} = (\text{CPU Cores} \times 2) + \text{Disk Spindle / SSD Concurrent Channels}$$

On a standard **4-Core / 8-Thread cloud VM with NVMe SSDs**:
$$\text{Target Active PostgreSQL Connections} \approx (4 \times 2) + 4 = 12 \text{ to } 24 \text{ connections}$$

### Sizing Formula for Waypoint Logistics:

$$\text{Total Connections} = (N_{\text{api}} \times \text{Pool}_{\text{api}}) + (N_{\text{worker}} \times \text{Pool}_{\text{worker}}) + \text{Reserve}_{\text{admin}}$$

### 6.1 Development Environment Sizing
- $N_{\text{api}} = 1$ instance
- $\text{Pool}_{\text{api}}: \text{min} = 2, \text{max} = 10$
- $N_{\text{worker}} = 0$ (Worker embedded or idle)
- $\text{Reserve}_{\text{admin}} = 5$ (Studio, Migrations, psql)
- **Total Peak Connections** = $10 + 5 = \mathbf{15 \text{ connections}}$ (Well within PostgreSQL's default `max_connections = 100`).

### 6.2 Staging / Single-Node Production Sizing
- $N_{\text{api}} = 2$ instances (High Availability pair)
- $\text{Pool}_{\text{api}}: \text{min} = 2, \text{max} = 12 \implies 24$ connections
- $N_{\text{worker}} = 1$ instance, $\text{max} = 5 \implies 5$ connections
- $\text{Reserve}_{\text{admin}} = 5$
- **Total Peak Connections** = $24 + 5 + 5 = \mathbf{34 \text{ connections}}$ (Optimal for a 4-core database server).

### 6.3 High-Load Scaled Production (with PgBouncer)
- $N_{\text{api}} = 10$ horizontal API instances
- Client pools to PgBouncer = $10 \times 15 = 150$ incoming connections
- **PgBouncer Server Pool to PostgreSQL** = $\mathbf{25 \text{ multiplexed connections}}$
- PostgreSQL CPU remains $\ge 90\%$ efficient with zero context-switch thrashing.

---

## 7. Database Service Accounts & Security (Principle of Least Privilege)

Application users (Drivers, Store Managers, Dispatchers) do NOT correspond to database accounts. All access is mediated by **four controlled infrastructure service accounts**:

| Account Name | Primary Role | Granted Privileges | Prohibited Actions | Usage Context |
| :--- | :--- | :--- | :--- | :--- |
| **`waypoint_app`** | API Server & Runtime | `SELECT`, `INSERT`, `UPDATE`, `DELETE` on all domain tables; `USAGE` on sequences | **NO DDL** (Cannot `CREATE`, `ALTER`, `DROP`, or `TRUNCATE` tables) | Standard Fastify HTTP server runtime |
| **`waypoint_worker`** | BullMQ Background Jobs | `SELECT`, `INSERT`, `UPDATE` on orders, trips, telematics, audit | **NO DDL**; No user management privileges | Background queue worker container |
| **`waypoint_migrator`** | Database Migrations | Full DDL: `CREATE`, `ALTER`, `DROP`, `REFERENCES`, `INDEX` | Restricted from general public network access | Controlled deployment entrypoint (`npm run db:migrate`) |
| **`waypoint_readonly`** | BI & Operational Audit | `SELECT` only on reporting views and materialized tables | **NO MUTATIONS** (`INSERT`, `UPDATE`, `DELETE` blocked) | Read-only analytics & reporting replicas |

---

## 8. Selected Connection Architecture & Environment Roadmap

```text
                           PRODUCTION DATABASE ARCHITECTURE

                     +---------------------------------------+
                     |        Stateless API Instances        |
                     |       (NestJS + Fastify Pods)         |
                     +---+-------------------------------+---+
                         |                               |
                 (App Pool: 10)                  (App Pool: 10)
                         |                               |
                         v                               v
                     +---------------------------------------+
                     |               PgBouncer               |
                     |       (Transaction Pooling Mode)      |
                     |         Port: 6432 (Self-Hosted)      |
                     +-------------------+-------------------+
                                         |
                            (Multiplexed Server Pool: 25)
                                         |
                                         v
                     +---------------------------------------+
                     |             PostgreSQL 16             |
                     |         (Authoritative Source)        |
                     |         max_connections = 100         |
                     +---------------------------------------+
```

### Component Decision Matrix

| Component | Target Environment | Connection Method | Pooling Engine | Database User | Primary Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **API Server** | Development | Direct to PostgreSQL | `pg.Pool` (Min: 2, Max: 10) | `waypoint_app` | Lowest cognitive overhead; fast local boots. |
| **API Server** | Production | Via PgBouncer Proxy | PgBouncer Transaction Pool | `waypoint_app` | Prevents connection cliff during horizontal scaling. |
| **Background Worker**| Production | Via PgBouncer Proxy | PgBouncer Transaction Pool | `waypoint_worker` | Segregated pool; prevents worker jobs from starving HTTP API. |
| **Migration Runner** | All Environments | Direct to PostgreSQL | Direct Dedicated Session | `waypoint_migrator`| DDL operations and schema migration require session-level locks. |
| **Local Automated Tests**| CI / Test Suite | Containerized PostgreSQL | Test-isolated `pg.Pool` | `waypoint_app` | Fast test runs with deterministic rollback verification. |

---

## 9. Failure Handling & Resilience Safeguards

The database connection layer implements four resilience safeguards:

1. **Connection Timeout (`connectionTimeoutMillis: 5000`)**: If PostgreSQL does not respond within 5 seconds during pool acquisition, the request fails fast with `503 Service Unavailable` rather than hanging indefinitely.
2. **Statement Timeout (`statement_timeout = 15000`)**: Individual SQL queries exceeding 15 seconds are automatically terminated by PostgreSQL to prevent unindexed queries or deadlocks from holding locks.
3. **Idle Client Eviction (`idleTimeoutMillis: 30000`)**: Connections unused for 30 seconds are gracefully closed down to `min` pool capacity.
4. **Graceful Shutdown**: On process `SIGTERM` or `SIGINT`, the Fastify server stops accepting new HTTP connections, waits up to 10 seconds for in-flight transactions to commit, and drains the connection pool via `pool.end()`.

---

## 10. Cost & Zero-Paywall Verification

- **Proprietary Proxies**: None. Zero reliance on paid commercial proxies.
- **Hosting**: 100% self-hostable using standard Docker Compose and official open-source images (`postgres:16-alpine`, `edoburu/pgbouncer:latest`, `redis:7-alpine`).
- **Cloud Neutrality**: Deployable on bare metal, local workstations, AWS EC2, DigitalOcean, or standard Kubernetes without proprietary cloud vendor locking.
