# Waypoint Product Context & Domain Specifications

## 1. Product Platform & Ecosystem

**Platform**: Enterprise Web Application (Desktop, Tablet, and Mobile Web)  
**Ecosystem**: Multi-tenant logistics and supply chain execution platform coordinating four interdependent operational roles.

---

## 2. Implemented Architecture & Technology Stack

The platform is implemented as a full-stack, self-hostable monorepo with zero proprietary paywalls:

- **Frontend**: Next.js 15 (React 19, App Router, Turbopack), Tailwind CSS, shadcn/ui accessible primitives, Lucide React, and Leaflet 1.9.
- **Backend**: NestJS 11 with `@nestjs/platform-fastify`, Drizzle ORM, and Passport JWT authentication.
- **Database**: PostgreSQL 16 (Relational, strictly 3NF/BCNF normalized) with PgBouncer connection pooling.
- **Async Queue & Cache**: Redis 7 Alpine with BullMQ.
- **Deployment**: Docker Compose orchestration for local and production deployment.

---

## 3. System Users & Operational Roles

1. **Central Dispatcher** (Planning Office, Peliyagoda Central Hub):
   - Single central dispatcher managing the full network.
   - Responsible for order intake, 7 Core Feasibility checks, fleet capacity allocation, route sequencing, and starvation deferral tracking.
2. **Store Manager** (Retail Store Loading Dock across 120 outlets):
   - Places daily replenishment orders before the 16:00 Colombo cutoff.
   - Monitors inbound shipments, reviews split delivery cards for Fresh ambient and chilled goods (`ALT-1`), and inspects digital Proof of Delivery receipts.
   - Reports physical receiving discrepancies (`DAMAGE_IN_TRANSIT`, `STORE_SHORTFALL`, `REJECTED_TEMPERATURE`).
3. **Warehouse Loader** (Depot Staging Bay, Peliyagoda & regional docks):
   - Inspects staging queues and enforces Last-In, First-Out (LIFO) reverse loading sequences based on route order ($N \to 1$).
   - Flags pre-departure shortfalls or damaged pallets (`FAIL-A`).
   - Issues verified gate passes (`L5`) before fleet release.
4. **Delivery Driver** (Fleet Vehicle In-Cab Execution):
   - Follows ordered stop sequences on a mobile-responsive interface.
   - Logs geofenced arrivals and observes delivery window holding timers if arriving before store opening.
   - Captures electronic Proof of Delivery (POD) touch-signatures and photographic evidence.
   - Logs en-route exceptions (store closed, road flooded, vehicle breakdown).

---

## 4. Operational Context & Network Scale

- **Retail Outlets**: 120 commercial storefronts across three brands (**Fresh Supermarkets**, **Style Apparel**, and **Tech Electronics**) located across Colombo, Gampaha, Kalutara, and regional corridors.
- **Depot**: **Peliyagoda Central Hub** operates as the primary central distribution and dispatch command center.
- **Commercial Fleet**: 60 vehicles comprising heavy ambient trucks, refrigerated reefer trucks, and maneuverable urban vans.
- **Temperature Constraints**: Fresh outlets place dual deliveries (ambient dry goods + chilled perishables $\le 4^\circ\text{C}$). Style and Tech outlets order ambient-only.
- **Cutoff Protocol**: Daily order intake locks strictly at **16:00 Asia/Colombo time** (`SM-ORD-001`). Orders placed after 16:00 are held in `QUEUED_NEXT_RUN` for following dispatch cycles.

---

## 5. Core Product Principles

1. **Unified Reality**: An action or state change in one role creates immediate observable effects across all other roles via the centralized database.
2. **Deterministic Invariants**: Business rules (16:00 cutoff, Fresh dual-order limit, 2-trip vehicle bounds, LIFO packing, geofenced POD) are enforced authoritatively by backend database transactions and constraints, not frontend logic alone.
3. **Tenant Resource Isolation**: Store Managers are strictly scoped to their assigned outlet (`ResourceScopeGuard`), eliminating cross-store data leakage.
4. **Zero-Paywall Self-Hostability**: Every component is 100% runnable using open-source, standard containerized technology without commercial SaaS paywalls.
