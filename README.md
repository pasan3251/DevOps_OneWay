# Waypoint Logistics Management System

Enterprise multi-tenant supply chain planning and logistics execution platform designed for complex retail operations across Sri Lanka. Waypoint orchestrates end-to-end freight lifecycles across four core roles: **Central Dispatcher**, **Store Manager**, **Warehouse Loader**, and **Delivery Driver**.

---

## 1. System Overview

Waypoint coordinates freight demand, vehicle routing, dock staging, and proof-of-delivery across three retail brands:

- **Waypoint Fresh**: Fast-moving perishable groceries, produce, dairy, and cold-chain meats requiring refrigerated vehicles and pre-08:00 AM delivery windows.
- **Waypoint Style**: High-cube apparel, hanging garments, and boxed fashion goods distributed to urban retail storefronts.
- **Waypoint Tech**: High-value electronics, computing hardware, and appliances requiring serial tracking and dock-level handover verification.

Fulfillment operations originate from the **Peliyagoda Central Hub**, supplying **120 retail outlets** across the Western Province (Colombo, Gampaha, Kalutara) and regional corridors using a fleet of **60 commercial vehicles** (ambient trucks, refrigerated reefer trucks, and urban access vans).

---

## 2. System Architecture

The platform is engineered as a **Modular Monolith** with zero external SaaS dependencies, ensuring full local portability, high transaction throughput, and ACID consistency:

```mermaid
graph TD
    subgraph ClientLayer ["Frontend Applications (Next.js 15 App Router - Port 3000)"]
        SM["Store Manager Portal<br/>(/workspace/store-manager)"]
        DISP["Central Dispatcher Desk<br/>(/workspace/dispatcher)"]
        LOAD["Loader Dock Terminal<br/>(/workspace/loader)"]
        DRV["Driver Mobile Web App<br/>(/workspace/driver)"]
    end

    subgraph ApiGateway ["API Gateway & Core Backend (NestJS + Fastify - Port 3001)"]
        AuthModule["Auth & RBAC Module<br/>(JWT + ResourceScopeGuard)"]
        StoreModule["Store Operations Module<br/>(Cutoff & Discrepancies)"]
        OrdersModule["Orders & Replenishment Module<br/>(Dual-Order Invariant)"]
        DispatchModule["Dispatch & Routing Module<br/>(7 Feasibility Rules)"]
        LoaderModule["Loader & Staging Module<br/>(LIFO Reverse Sequences)"]
        DriverModule["Driver Execution Module<br/>(POD & Geofenced Arrivals)"]
        SyncModule["Offline Sync Module<br/>(Idempotent Mutations)"]
    end

    subgraph DataLayer ["Persistence & Infrastructure Layer"]
        PgBouncer["PgBouncer Connection Pooler<br/>(Transaction Mode - Port 6432)"]
        Postgres[("PostgreSQL 16 Database<br/>(Drizzle ORM - Port 5432)")]
        Redis[("Redis 7 + BullMQ<br/>(Async Worker Queue - Port 6379)")]
    end

    ClientLayer -->|REST API / JSON| ApiGateway
    ApiGateway --> PgBouncer
    PgBouncer --> Postgres
    ApiGateway --> Redis
```

---

## 3. Technology Stack

### Frontend Application (`apps/web`)
- **Framework**: Next.js 15 (React 19, Turbopack, App Router)
- **Language**: TypeScript 5.7 (Strict mode enabled)
- **Styling & UI**: Tailwind CSS, CSS Variables design token system
- **UI Primitives**: Radix UI / shadcn accessible component architecture
- **Icons & Data Viz**: Lucide React, Recharts 2.15
- **Mapping**: Leaflet 1.9 & React-Leaflet with OpenStreetMap tiles

### Backend API Service (`apps/api`)
- **Framework**: NestJS 11 with Fastify (`@nestjs/platform-fastify`)
- **Database Engine**: PostgreSQL 16 (Relational, 3NF/BCNF normalized)
- **ORM & Migrations**: Drizzle ORM 0.40 with PostgreSQL driver (`pg`)
- **Connection Pooling**: PgBouncer transaction-mode pooler
- **Async Queue & Cache**: Redis 7 Alpine with BullMQ
- **Validation & Serialization**: `class-validator`, `class-transformer`
- **Security & Auth**: Passport.js, JWT bearer tokens, Argon2 password hashing

---

## 4. Role Workspaces & Implemented Workflows

### 4.1 Store Manager (`/workspace/store-manager`)
- **Replenishment Ordering (`SM-1`)**: Daily replenishment ordering with SKU search, category filters, and live cart weight/volume rollups.
- **16:00 Colombo Cutoff Enforcement (`SM-ORD-001`)**: Real-time cutoff clock. Orders submitted before 16:00 are scheduled for next-day dispatch ($T+1$); orders submitted after 16:00 are automatically queued for the following run ($T+2$).
- **Fresh Dual-Order Invariant (`SM-ORD-002`)**: Fresh supermarkets can place max 1 ambient order and 1 chilled order per date (`UNIQUE(outlet_id, order_date, temp_requirement)`). Style and Tech are locked to ambient.
- **Split Delivery Visibility (`ALT-1`)**: Displays dual delivery cards with distinct driver details, vehicle plates, and separate ETAs when ambient and chilled goods travel on separate trucks.
- **Electronic Receiving Inspection (`SM-POD-001`)**: Visual review of driver proof of delivery receipts, touch-signatures, and GPS dock geofence coordinates.
- **Receiving Discrepancy Claims (`SM-3`, `SM-DISC-001`)**: Reporting of physical damage (`DAMAGE_IN_TRANSIT`), carton shortages (`STORE_SHORTFALL`), or temperature violations (`REJECTED_TEMPERATURE`).

### 4.2 Central Dispatcher (`/workspace/dispatcher`)
- **Stationed Location**: Single Central Dispatch desk at **Peliyagoda Central Hub**.
- **8 Integrated Workspaces**:
  1. `Today's Overview`: Fleet donut charts, vehicle capacity utilization, brand volume breakdown, and real-time Colombo cutoff countdown.
  2. `Order Intake`: Backlog filtering by brand/status, SKU line inspection, and atomic trip allocation.
  3. `Manage Fleet`: Vehicle payload limits (kg / m³), refrigeration types, and weekly fuel quotas.
  4. `Route Planning`: Multi-stop route construction with drag-and-drop sequencing and delivery window alerts.
  5. `Deferrals`: Anti-starvation tracking, structured deferral reasons, and automatic priority elevation.
  6. `Outlets`: Store directory, district routing zones, and van-only access flags.
  7. `Calendar`: Fleet departure schedules and operational events.
  8. `Chat & Monitoring`: Role-filtered operations communication.
- **7 Core Feasibility Rules**: Automated validation of brand homogeneity, temperature matching, van-only access, depot parity, capacity bounds, shift duration budgets (270m Fresh / 480m Style & Tech), and vehicle trip limits (max 2 trips/day).

### 4.3 Delivery Driver (`/workspace/driver`)
- **Operational Execution**: Smartphone-optimized mobile web app designed for thumb-friendly in-cab use.
- **Trip Sequence Manifest**: Ordered stops with target delivery windows ($[T_{\text{open}}, T_{\text{close}}]$).
- **Geofenced Arrival & Holding Timer**: GPS geofencing with holding countdown if arriving prior to store opening hours.
- **Proof of Delivery (POD) Capture**: Digital touch signature, photo upload, receiver name, and GPS coordinates.
- **Exception Reporting**: Direct logging of store closures, customer refusals, and road delays.

### 4.4 Warehouse Loader (`/workspace/loader`)
- **Dock Staging Queue**: Filterable staging manifest by vehicle plate, temperature type, and trip sequence.
- **LIFO Reverse Loading (`BR-LOAD-001`)**: Enforces reverse stop sequence ($N \to 1$) so first-delivery goods are loaded last at the truck door.
- **Pre-Departure Discrepancy Logging (`FAIL-A`)**: Reports warehouse shortfalls or damaged pallets before departure.
- **Gate Clearance Issuance (`L5`)**: Validates LIFO compliance and generates electronic gate passes before vehicles leave the yard.

---

## 5. Repository Structure

```text
waypoint-logistics/
├── apps/
│   ├── api/                     # NestJS + Fastify REST Backend
│   │   ├── src/
│   │   │   ├── auth/            # JWT authentication & strategies
│   │   │   ├── common/          # Guards, interceptors, filters, decorators
│   │   │   ├── database/        # Drizzle schema, connection pool, migrations
│   │   │   ├── dispatch/        # Trip planning & 7 feasibility rules
│   │   │   ├── driver/          # Driver trips, stops, and POD capture
│   │   │   ├── loader/          # Loading manifest, LIFO checks, gate pass
│   │   │   ├── master-data/     # Outlets, vehicles, products, depots
│   │   │   ├── orders/          # Order intake & dual-order validation
│   │   │   ├── store/           # Store Manager overview, deliveries, claims
│   │   │   └── sync/            # Offline mutation sync
│   │   └── test/                # Unit and E2E API integration test suites
│   └── web/                     # Next.js 15 Unified Frontend Application
│       └── src/
│           ├── app/             # App Router pages (/login, /workspace/[role])
│           ├── components/      # UI primitives (buttons, dialogs, badges)
│           └── features/        # Domain features (store-manager, dispatcher, driver, loader)
├── docs/                        # Complete technical architecture documentation
│   ├── backend/                 # Backend, database, API, and sizing design
│   ├── driver/                  # Driver domain and screen specifications
│   └── store-manager/           # Store Manager domain, rules, DB, and API specs
├── infra/                       # Local infrastructure configurations
│   └── pgbouncer/               # PgBouncer configuration and user lists
├── docker-compose.yml           # Multi-container orchestration (PostgreSQL, Redis, PgBouncer)
└── package.json                 # Monorepo workspace configuration
```

---

## 6. Local Development Quickstart

### Prerequisites
- **Node.js**: `v20.9.0` or higher (Node 22 LTS recommended)
- **npm**: `v10.0.0` or higher
- **Docker Engine & Docker Compose**: For local PostgreSQL, Redis, and PgBouncer

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd waypoint-logistics
npm install
```

### 2. Start Local Infrastructure
Launch PostgreSQL 16, Redis 7, and PgBouncer via Docker Compose:
```bash
docker compose up -d postgres redis pgbouncer
```

### 3. Configure Environment Variables
Copy the example environment configurations:
```bash
# In repository root
cp .env.example .env

# Verify environment variables
cat .env
```

Key environment settings:
```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/waypoint
PGBOUNCER_URL=postgresql://postgres:postgres@localhost:6432/waypoint
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret-waypoint-jwt-key-2026
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### 4. Run Migrations & Seed Development Data
```bash
# Execute Drizzle schema migrations
npm run db:migrate

# Seed master outlets, fleet vehicles, depots, and demonstration users
npm run db:seed
```

### 5. Launch Development Servers
Run both API and Web applications concurrently:
```bash
# Terminal 1: Backend API (Port 3001)
npm run dev:api

# Terminal 2: Web Frontend (Port 3000)
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Demonstration Accounts & Roles

The system is pre-seeded with authenticated accounts for each supply chain role:

| Role | Username / Email | Employee ID | Default Password | Workspace Route |
| :--- | :--- | :--- | :--- | :--- |
| **Central Dispatcher** | `dispatcher@waypoint.demo` | `DISP001` | `waypoint-demo` | `/workspace/dispatcher` |
| **Store Manager** | `store@waypoint.demo` | `STORE001` | `waypoint-demo` | `/workspace/store-manager` |
| **Warehouse Loader** | `loader@waypoint.demo` | `LOAD001` | `waypoint-demo` | `/workspace/loader` |
| **Delivery Driver** | `driver@waypoint.demo` | `DRIV001` | `waypoint-demo` | `/workspace/driver` |

---

## 8. Testing Strategy & Automated Verification

Waypoint maintains automated test coverage across business math, database integration, API contracts, and security guards:

```bash
# Run backend unit, integration, and API contract tests
npm run test:api

# Run TypeScript typecheck across all applications
npm run typecheck

# Build backend production bundle
npm --prefix apps/api run build

# Build frontend production bundle (Next.js Turbopack)
npm --prefix apps/web run build
```

### Test Suite Summary
- **Lifo & Cutoff Math (`lifo-and-cutoff.spec.ts`)**: Validates stop $N \to 1$ inverse sequencing, early arrival hold time math, and 16:00 cutoff boundary classification.
- **7 Feasibility Rules (`feasibility-rules.spec.ts`)**: Validates cold-chain constraints, van access, vehicle weight/volume boundaries, and anti-starvation rules.
- **Store Manager Integration (`store-manager.spec.ts`)**: Tests store overview generation, split vehicle ETAs (`ALT-1`), proof of delivery inspection, and receiving discrepancy logging (`SM-3`).
- **Connection Pool & Health (`connection-pool.spec.ts`, `api-validation.spec.ts`)**: Asserts PgBouncer connection reuse, transaction rollbacks, and health endpoints.

---

## 9. Comprehensive Documentation Sitemap

| Domain / Focus Area | Authoritative Document |
| :--- | :--- |
| **Store Manager Architecture** | [`docs/store-manager/STORE_MANAGER_IMPLEMENTATION_REPORT.md`](docs/store-manager/STORE_MANAGER_IMPLEMENTATION_REPORT.md) |
| **Store Business Rules** | [`docs/store-manager/STORE_MANAGER_BUSINESS_RULES.md`](docs/store-manager/STORE_MANAGER_BUSINESS_RULES.md) |
| **Store Database Design** | [`docs/store-manager/STORE_MANAGER_DATABASE_DESIGN.md`](docs/store-manager/STORE_MANAGER_DATABASE_DESIGN.md) |
| **Store Manager API Contract** | [`docs/store-manager/STORE_MANAGER_API_CONTRACT.md`](docs/store-manager/STORE_MANAGER_API_CONTRACT.md) |
| **Backend Architecture & ADRs** | [`docs/backend/BACKEND_ARCHITECTURE.md`](docs/backend/BACKEND_ARCHITECTURE.md) |
| **Database Connection & Sizing** | [`docs/backend/DATABASE_CONNECTION_ARCHITECTURE.md`](docs/backend/DATABASE_CONNECTION_ARCHITECTURE.md) |
| **REST API Specification** | [`docs/backend/API_CONTRACT.md`](docs/backend/API_CONTRACT.md) |
| **State Machine Transitions** | [`docs/backend/STATE_MACHINES.md`](docs/backend/STATE_MACHINES.md) |
| **Driver Responsibilities** | [`docs/driver/DRIVER_RESPONSIBILITIES.md`](docs/driver/DRIVER_RESPONSIBILITIES.md) |
| **Deployment & Production** | [`docs/backend/DEPLOYMENT.md`](docs/backend/DEPLOYMENT.md) |

---

## 10. Security & Data Integrity

- **Resource Scope Isolation (`ResourceScopeGuard`)**: Store Managers can access only records belonging to their assigned outlet (`outletId` derived from signed JWT). Cross-outlet IDOR attempts return `403 Forbidden`.
- **Pre-Cutoff Invariants**: Cancellation and order mutations are strictly blocked once orders are locked or dispatched into route manifests.
- **Zero Paid Dependencies**: The entire architecture runs on open-source, self-hosted software without proprietary paywalls.
