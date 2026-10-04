# Waypoint Logistics — Architecture Decision Records (ADR)

## ADR-001: Modular Monolith Architecture over Microservices

### Context
Waypoint Logistics coordinates four interdependent roles (Store Manager, Dispatcher, Loader, Driver) across a unified supply chain lifecycle. Cross-role invariants (such as whole order integrity, 2-trip vehicle limits, and LIFO loading) require tight consistency guarantees across orders, trips, and vehicles.

### Alternatives Considered
1. **Microservices Architecture**: Separate services for Orders, Fleet, Routing, and Tracking communicating via HTTP/gRPC and message brokers (Kafka/RabbitMQ).
2. **Single Unstructured Monolith**: Traditional MVC app with shared models and global controllers.

### Decision
Adopt a **Modular Monolith** in TypeScript with NestJS and Fastify.

### Rationale & Advantages
- **ACID Transaction Guarantees**: Dispatcher trip planning requires atomic validation across orders, vehicles, and fuel quotas. A single relational database allows standard SQL transactions without the massive complexity of distributed 2-phase commits or saga orchestrators.
- **Sub-Millisecond In-Process Calls**: Communication between bounded contexts (e.g. Orders and Dispatch) occurs in-memory with zero network serialization overhead.
- **Lower Operational Surface Area**: Deploys as a single containerized process (`docker compose up`), perfectly matching the Hackathon deadline and eliminating Kubernetes/service-mesh overhead.

### Tradeoffs & Mitigation
- *Tradeoff*: Potential risk of developers bypassing module boundaries.
- *Mitigation*: Enforce strict NestJS module encapsulation (`exports` arrays) and package boundaries.

---

## ADR-002: PostgreSQL with Drizzle ORM

### Context
The system enforces strict physical, geographical, and temporal business constraints (two-dimensional weight/volume limits, mall delivery window intersections, anti-starvation rules).

### Alternatives Considered
1. **Prisma ORM**: Popular but features high query engine overhead, complex schema generator, and limited control over raw SQL execution and partial indexes.
2. **TypeORM**: Mature but plagued by legacy decorator bugs, fragile migrations, and awkward transaction handling.
3. **Raw SQL / Knex.js**: Full SQL control but lacks compile-time end-to-end TypeScript type inference.

### Decision
Select **PostgreSQL 16** with **Drizzle ORM**.

### Rationale & Advantages
- **SQL-First Philosophy**: Drizzle maps directly to standard SQL constructs without an intermediary engine. What you write is what executes.
- **Complete Type Safety**: Zero code generation step; schema definitions in TypeScript automatically infer exact insert, select, and update types.
- **Advanced PostgreSQL Feature Support**: Direct native support for `CHECK` constraints, composite keys, partial unique indexes, `EXPLAIN ANALYZE`, and transaction closures.
- **Minimal Runtime Overhead**: Extremely lightweight memory footprint compared to Prisma's Rust engine binaries.

### Tradeoffs
- Requires developers to understand relational SQL concepts rather than relying on an abstracted object graph.

---

## ADR-003: Fastify HTTP Adapter over Express

### Context
NestJS supports both Express and Fastify as HTTP transports. Field execution involves frequent mobile telemetry check-ins and high-throughput batch synchronization.

### Alternatives Considered
1. **Express**: The standard default, but slower and lacks native asynchronous schema compilation.

### Decision
Use the **`@nestjs/platform-fastify`** engine.

### Rationale & Advantages
- **Up to 2x Throughput**: Fastify's internal routing tree and `fast-json-stringify` serialization yield substantially higher requests per second and lower p99 latency under load.
- **Low Overhead**: Critical when running containerized alongside PostgreSQL and Redis in resource-constrained environments.

### Tradeoffs
- Slight differences in third-party middleware APIs; mitigated by using Fastify-native plugins (`@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`).

---

## ADR-004: Redis for Ephemeral State & BullMQ for Non-Blocking Jobs

### Context
The application needs rate limiting, idempotency caching, and background processing (e.g. daily order cutoff consolidation, anti-starvation priority roll-forward, delivery window breach broadcasts) without blocking operational HTTP threads.

### Alternatives Considered
1. **In-Memory JavaScript Timers (`setInterval`)**: Brittle; lost on server restart; cannot scale horizontally across multiple instances.
2. **PostgreSQL-Based Queues (`pg-boss` / SKIP LOCKED)**: Increases lock contention on the primary transactional database.

### Decision
Use **Redis 7** for ephemeral caching and **BullMQ** for asynchronous job queues.

### Rationale & Advantages
- **Strict Separation of Concerns**: PostgreSQL remains the single authoritative persistent source of truth; Redis handles transient high-speed locks, rate-limit counters, and job queues.
- **Horizontal Scalability**: Background workers can run in separate processes or containers listening to the same BullMQ Redis queue without altering business logic.

---

## ADR-005: Client-Generated Idempotency Keys for Offline Synchronization

### Context
Drivers in the central highlands and rural corridors frequently lose cellular connectivity. When connection returns, their mobile client submits queued arrival logs, touch signatures, and discrepancy reports in bulk, often retrying upon network timeout.

### Alternatives Considered
1. **Server-Generated Transaction IDs**: Impossible when disconnected from the server.
2. **Blind Upserts**: Risks overwriting changes made concurrently on the dispatcher console.

### Decision
Implement client-generated mutation UUIDs (`clientMutationId`) enforced by PostgreSQL partial unique indexes and Redis idempotency locks.

### Rationale & Advantages
- **Guaranteed Idempotence**: Retried network requests return the recorded successful response without creating duplicate delivery records or double-charging inventory.
- **Audit Traceability**: Every offline action preserves its original on-the-ground client timestamp and geo-coordinates alongside server ingestion time.
