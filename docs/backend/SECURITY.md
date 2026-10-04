# Waypoint Logistics — Backend Security Architecture & OWASP Review

## 1. Security Architecture Principles

The Waypoint Logistics backend implements Defense-in-Depth, ensuring that security controls are enforced at the network, transport, application, and database layers.

```
[Client / Mobile App]
         │ (TLS 1.3 / Strict CORS / Helmet Headers)
         ▼
[Rate Limiting & Request Throttling] (100 req/min per IP; 30 req/min for Auth)
         │
         ▼
[JWT Authentication Guard] (Signature Verification / Expiry Check)
         │
         ▼
[Role-Based Authorization (RBAC)] (Dispatcher | Loader | Driver | Store Manager)
         │
         ▼
[Resource-Level Scope Guard] (Depot Isolation / Outlet Ownership)
         │
         ▼
[Strict Schema Validation Pipe] (Zod DTO validation / Strip Unknowns)
         │
         ▼
[Domain Business Invariant Checks] (Feasibility Rules / Cutoff Enforcement)
         │
         ▼
[Parameterized Database Execution] (Drizzle ORM / SQL Injection Protection)
```

---

## 2. OWASP API Security Top 10 Compliance Matrix

| Vulnerability | Threat in Waypoint Logistics | Mitigation Implemented |
|---|---|---|
| **API1: Broken Object Level Authorization (BOLA)** | A Store Manager accesses orders from another outlet; a Driver completes stops for another driver's trip. | **ResourceScopeGuard**: Every request targeting an Outlet, Trip, or Delivery verifies that the authenticated user's `assignedOutletId`, `depotId`, or `driverId` matches the target entity before executing. |
| **API2: Broken Authentication** | Credential stuffing on `/api/v1/auth/login` or JWT tampering. | Argon2id password hashing with salt; short-lived access tokens (12h demo, configurable); rate limiting on auth endpoints (5 failed attempts locks for 15 min). |
| **API3: Broken Object Property Level Authorization** | Driver modifies trip fuel quota; Store Manager modifies order weight/cube directly. | Strict DTO white-listing via Zod pipes. Unexpected or privileged fields in payloads are stripped before reaching domain services. |
| **API4: Unrestricted Resource Consumption** | Large unpaginated order queries or DoS via massive payload uploads. | Mandatory pagination on collection endpoints (`limit` capped at 100); maximum JSON payload limit (2 MB); Redis sliding-window rate limiting. |
| **API5: Broken Function Level Authorization** | Driver calls `POST /api/v1/dispatch/publish`; Loader calls order intake. | **RolesGuard**: Endpoints are decorated with explicit `@Roles()` decorators; unauthorized roles receive `403 Forbidden`. |
| **API6: Unrestricted Access to Sensitive Business Flows** | Submitting orders after 16:00 to bypass planning cutoff; double-booking vehicles. | Hard business logic gates enforced inside ACID database transactions. Database constraints reject invalid states even if API validation fails. |
| **API7: Server-Side Request Forgery (SSRF)** | Malicious webhook or image URI download in photo proof. | No external URL fetching from user input; photo uploads are processed directly as binary streams and stored in self-hosted S3/local storage. |
| **API8: Security Misconfiguration** | Verbose error stack traces leaked to clients; unencrypted database connections. | Global exception filter maps internal errors to sanitized error codes; Fastify Helmet configured with CSP and HSTS. |
| **API9: Improper Inventory Management** | Undocumented debug or legacy API endpoints. | OpenAPI/Swagger documentation generated directly from active NestJS controllers; versioned `/api/v1` namespace. |
| **API10: Unsafe Consumption of APIs** | Malformed telemetry packets from GPS simulators. | Strict type validation on all incoming telemetry data streams. |

---

## 3. Resource-Level Authorization Rules

### 3.1 Store Manager Scope
- `GET /api/v1/orders`: Automatically filters `WHERE outlet_id = user.assignedOutletId`.
- `POST /api/v1/orders`: Rejects if payload `outletId != user.assignedOutletId`.
- `POST /api/v1/stores/discrepancies`: Rejects if target delivery is not for the manager's store.

### 3.2 Delivery Driver Scope
- `GET /api/v1/driver/active-route`: Scoped strictly to `trips.driver_id = user.id`.
- `POST /api/v1/driver/stops/:id/complete`: Verifies that the stop belongs to the trip assigned to `user.id`.
- `POST /api/v1/driver/report-delay`: Verifies that the trip is currently assigned to `user.id`.

### 3.3 Warehouse Loader Scope
- `GET /api/v1/loader/manifests/:tripId`: Verifies that `trip.depot_id = user.depotId`.
- `POST /api/v1/loader/clearances`: Confirms loader is stationed at the origin depot.
