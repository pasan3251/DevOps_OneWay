# Waypoint Logistics — Deployment & Infrastructure Guide

## 1. Overview & Zero-Paywall Mandate

Waypoint Logistics is designed to be completely self-hostable and runnable locally or in any cloud environment without paying for managed SaaS services. The entire infrastructure stack can be provisioned using **Docker Compose** on any commodity Linux/macOS/Windows host.

### Core Services Topology

```text
                           +----------------------------+
                           |  Reverse Proxy (Traefik /  |
                           |       Nginx / Gateway)     |
                           +--------------+-------------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
     +---------------------+                             +---------------------+
     |  Web Application    |                             |  Backend API Server |
     |  (Next.js 16)       |                             |  (NestJS + Fastify) |
     |  Port: 3000         |                             |  Port: 3001         |
     +---------------------+                             +----------+----------+
                                                                    |
                                        +---------------------------+---------------------------+
                                        |                                                       |
                                        v                                                       v
                             +---------------------+                                 +---------------------+
                             |  PostgreSQL 16      |                                 |  Redis 7            |
                             |  Primary DB         |                                 |  Coordination Cache |
                             |  Port: 5432         |                                 |  Port: 6379         |
                             +---------------------+                                 +----------+----------+
                                                                                                |
                                                                                                v
                                                                                     +---------------------+
                                                                                     |  BullMQ Background  |
                                                                                     |  Worker Service     |
                                                                                     +---------------------+
```

---

## 2. Docker Compose Configuration

The root `docker-compose.yml` provides a production-grade local and single-node deployment setup.

### Services:
1. **`postgres`**: PostgreSQL 16 with optimized connection pooling parameters, health check, and persistent named volume `waypoint_pgdata`.
2. **`redis`**: Redis 7 Alpine with persistent append-only file (AOF) enabled, memory capped at 512MB with volatile-lru eviction.
3. **`api`**: NestJS Fastify backend running on Node 20 LTS Alpine. Executes automatic database schema migration and seeding before booting the HTTP server.
4. **`worker`**: Background worker container processing BullMQ queues (audit trail flushing, notifications, report aggregation).
5. **`web`**: Next.js 16 production server serving the Unified Logistics Workspace.

---

## 3. Environment Variables Specification

The system uses standard 12-factor application configuration loaded via `.env`.

### Complete `.env.example` Reference

```dotenv
# ==============================================================================
# Waypoint Logistics Environment Configuration
# ==============================================================================

# Node Environment
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info

# API URLs & CORS
API_PREFIX=/api/v1
PUBLIC_API_URL=http://localhost:3001
WEB_APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# PostgreSQL Database (Authoritative Source of Truth)
DATABASE_URL=postgresql://waypoint_user:waypoint_secure_pass@postgres:5432/waypoint_db
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=waypoint_user
DATABASE_PASSWORD=waypoint_secure_pass
DATABASE_NAME=waypoint_db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
DATABASE_SSL=false

# Redis (Caching, Idempotency, Sliding Rate Limiting & Queues)
REDIS_URL=redis://redis:6379/0
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Security & Authentication
JWT_SECRET=super_secret_jwt_signing_key_at_least_64_characters_long_for_hs512_security
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_different_from_access_secret_entropy
JWT_REFRESH_EXPIRES_IN=30d
COOKIE_SECRET=secure_fastify_cookie_secret_salt_32_chars

# Operational Parameters
OPERATIONAL_CUTOFF_TIME=16:00
DEFAULT_TIMEZONE=Asia/Colombo
MAX_UPLOAD_SIZE_BYTES=10485760 # 10MB
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Storage (Local Filesystem default; S3-compatible backend abstraction)
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=/var/waypoint/uploads
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

---

## 4. Database Lifecycle & Migrations

All schema modifications follow strict version-controlled migrations executed via `drizzle-kit`. **Never manually execute ad-hoc DDL in production.**

### Migration Workflow

```bash
# 1. Inspect or modify schema files in src/database/schema/
# 2. Generate migration SQL
npm --prefix apps/api run db:generate

# 3. Inspect generated SQL in apps/api/src/database/migrations/
# 4. Apply migrations to database
npm --prefix apps/api run db:migrate

# 5. Check migration status
npm --prefix apps/api run db:status
```

### Automatic Migration on Startup

In containerized deployments, the backend container entrypoint runs:
```bash
node dist/database/migrate.js && node dist/main.js
```
This guarantees database migrations are applied sequentially before the Fastify server opens listening ports to incoming HTTP traffic.

---

## 5. Realistic Logistics Seeding Pipeline

To ensure immediate operational readiness for testing and development, the seed pipeline populates:

1. **Master Depots**:
   - `DEP-PELIYAGODA` (Colombo / Peliyagoda Central Hub - Lat: 6.9667, Lng: 79.9167)
   - `DEP-KANDY` (Kandy Regional Hub - Lat: 7.2906, Lng: 80.6337)
2. **Master Outlets**:
   - 120 authentic retail outlets across **Fresh**, **Style**, and **Tech** brands in Western and Central provinces.
   - Exact delivery time windows (e.g., 08:00 - 11:00, 14:00 - 18:00).
   - Vehicle access restrictions (`van_only` flags).
3. **Fleet Vehicles**:
   - 60 vehicles across `truck_reefer`, `truck_ambient`, `van_reefer`, `van_ambient`.
   - Exact physical constraints: max payload ($W_{\max}$ in kg) and volumetric capacity ($V_{\max}$ in $m^3$).
4. **Drivers & System Roles**:
   - Pre-seeded credentialed accounts for Central Dispatcher (stationed at Peliyagoda Hub with network-wide multi-depot planning authority), Store Managers, Loaders, Drivers, and Administrators.
5. **Initial Daily Orders & Trip Plans**:
   - Realistic orders demonstrating ambient vs chilled goods, cutoff compliance, and LIFO manifest verification.

Run seeding command:
```bash
npm --prefix apps/api run db:seed
```

---

## 6. Health Checks & Observability

The API exposes standard Kubernetes/Docker-compatible health probes:

| Endpoint | Method | Purpose | Response |
| :--- | :--- | :--- | :--- |
| `/api/v1/health/liveness` | `GET` | Verifies Fastify process is running | `200 OK {"status": "ok", "uptime": 1243.2}` |
| `/api/v1/health/readiness` | `GET` | Verifies PostgreSQL and Redis connectivity | `200 OK {"status": "ok", "checks": {"db": "up", "redis": "up"}}` |
| `/api/docs` | `GET` | Interactive OpenAPI / Swagger UI documentation | HTML interactive explorer |

---

## 7. Disaster Recovery & Backup Strategy

### Automated PostgreSQL Backup

Use standard `pg_dump` with compression:
```bash
# Snapshot database
docker compose exec postgres pg_dump -U waypoint_user -d waypoint_db -Fc -f /backups/waypoint_$(date +%Y%m%d_%H%M%S).dump

# Restore from snapshot
docker compose exec -T postgres pg_restore -U waypoint_user -d waypoint_db --clean --if-exists < waypoint_backup.dump
```

### Redis Recovery
Because Redis is used solely for volatile caches, rate limiting, and queues, if Redis memory is completely wiped or corrupted, **no authoritative business data is lost**. The PostgreSQL database will reconstruct operational state on demand.
