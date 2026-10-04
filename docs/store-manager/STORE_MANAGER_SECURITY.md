# Store Manager Security & Access Control Architecture — Waypoint Logistics

## 1. Threat Modeling & OWASP API Top 10 Protections

The Store Manager module interfaces store-level personnel across 120 retail outlets. It must enforce strict security boundaries to prevent horizontal privilege escalation, data leakage, and unauthorized order tampering.

| OWASP Threat Category | Specific Attack Vector | Server-Side Mitigation Strategy |
| :--- | :--- | :--- |
| **API1: BOLA (Broken Object Level Authorization)** | Store Manager for Store A attempts to fetch or cancel orders for Store B by manipulating the URL (`GET /api/v1/orders/:id`). | **`ResourceScopeGuard`**: Intercepts requests, resolves the user's assigned `outlet_id` from JWT session, and verifies resource ownership before executing queries. Store Managers are blocked from accessing other store records with `403 Forbidden`. |
| **API2: Broken Authentication** | Tampered or forged JWT tokens; brute force. | **Argon2id password hashing**; short-lived access JWT (7d) signed with 512-bit entropy keys; rate-limited auth endpoints. |
| **API3: Broken Object Property Level Authorization** | Client attempts to force-override fields such as `is_cutoff_locked = false`, `total_weight_kg`, or `status = 'DELIVERED'` in request body. | **Strict DTO Validation (`ValidationPipe`)**: Uses `whitelist: true` and `forbidNonWhitelisted: true`. State fields and price/weight rollups are computed server-side exclusively. |
| **API4: Unrestricted Resource Consumption** | Rapid automated order submissions creating denial-of-service on database connection pool. | **Sliding Window Rate Limiting**: 100 requests per minute per IP/User mediated by Redis; Fastify connection timeouts. |
| **API5: Broken Function Level Authorization** | Store Manager attempts to execute Central Dispatcher actions (`POST /api/v1/dispatch/plan` or `lock`). | **`RolesGuard`**: Checks `@Roles('dispatcher', 'admin')` metadata. Rejects Store Manager requests with `403 Forbidden`. |

---

## 2. Least-Privilege Data Flow & Isolation

```text
  [Store Manager Request]
            │
            ▼
  [JwtAuthGuard] ───────────────> (Verifies signature and expiration)
            │
            ▼
  [RolesGuard] ─────────────────> (Verifies role === 'store_manager')
            │
            ▼
  [ResourceScopeGuard] ─────────> (Verifies target outletId === user.outletId)
            │
            ▼
  [Service & Database Pool] ───> (Executes scoped query with WHERE outlet_id = ...)
```

Store Managers are **never allowed to supply an arbitrary `outletId`**. If `user.role === 'store_manager'`, the backend automatically forces `outletId = user.outletId` directly from the verified server-side JWT claims.
