# Waypoint Logistics — REST API Contract & Specification

## 1. Global API Standards

- **Base URL**: `/api/v1`
- **Protocol**: HTTPS / HTTP 1.1 & HTTP/2
- **Data Exchange Format**: JSON (`application/json`)
- **Authentication**: Bearer JWT tokens (`Authorization: Bearer <jwt>`)
- **Timezone Standard**: Timestamps formatted in ISO 8601 with timezone offset (e.g. `2026-10-04T05:30:00+05:30`). Time values in planning math represent integer minutes from midnight ($00:00 = 0$, $03:30 = 210$, $08:00 = 480$, $16:00 = 960$).

---

## 2. Standardized Error Response Model

Every non-2xx response returns a predictable, machine-readable JSON structure. Internal stack traces are strictly stripped in production.

```json
{
  "error": {
    "code": "CAPACITY_WEIGHT_EXCEEDED",
    "message": "Assigned payload weight (1,920 kg) exceeds vehicle WP-012 maximum rating of 1,800 kg.",
    "statusCode": 422,
    "timestamp": "2026-10-04T16:00:00+05:30",
    "path": "/api/v1/dispatch/trips/TRIP-01/assign",
    "details": {
      "vehicleId": "WP-012",
      "weightCapacityKg": 1800,
      "attemptedWeightKg": 1920,
      "overflowKg": 120
    }
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `VALIDATION_FAILED` | Request payload fails schema or type validation |
| `401` | `AUTHENTICATION_REQUIRED` | Missing, expired, or malformed JWT token |
| `403` | `FORBIDDEN_RESOURCE_ACCESS` | User lacks role or depot/outlet scope permission |
| `404` | `RESOURCE_NOT_FOUND` | Specified Order, Trip, Outlet, or Vehicle does not exist |
| `409` | `STATE_TRANSITION_CONFLICT` | Target entity state incompatible with requested transition |
| `422` | `RULE_1_HOMOGENEITY_VIOLATION` | Cross-brand or cross-district trip assignment blocked |
| `422` | `RULE_2_TEMPERATURE_MISMATCH` | Chilled freight assigned to ambient vehicle |
| `422` | `RULE_3_VAN_ONLY_ACCESS_VIOLATION` | Truck assigned to van-only restricted outlet |
| `422` | `RULE_4_DEPOT_PARITY_VIOLATION` | Vehicle and outlet depots do not match |
| `422` | `RULE_6_CAPACITY_EXCEEDED` | Weight or volume capacity bounds exceeded |
| `422` | `RULE_7_SHIFT_BUDGET_EXCEEDED` | Exceeds 270m (Fresh) or 480m (Style/Tech) budget |
| `422` | `ORDER_CUTOFF_LOCKED` | Order placed after 16:00 locked from next-day dispatch |
| `422` | `TRIP_NOT_CLEARED_BY_WAREHOUSE` | Driver departed before loader confirmed L5 clearance |

---

## 3. Endpoints by Domain Module

### 3.1 Authentication & Profile (`/auth`)

#### `POST /api/v1/auth/login`
- **Purpose**: Authenticate user and issue scoped JWT.
- **Request Body**:
  ```json
  {
    "identifier": "driver@waypoint.demo",
    "password": "waypoint-demo"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 43200,
    "user": {
      "id": "u-driv-001",
      "employeeId": "DRIV001",
      "email": "driver@waypoint.demo",
      "fullName": "Sunil Rathnayake",
      "role": "driver",
      "depotId": "PELIYAGODA",
      "assignedOutletId": null
    }
  }
  ```

#### `GET /api/v1/auth/me`
- **Purpose**: Retrieve authenticated identity and current operational context.

---

### 3.2 Orders & Retail Outlets (`/orders`, `/stores`)

#### `POST /api/v1/orders`
- **Purpose**: Store Manager submits daily store inventory requisition (SM-1).
- **Authorized Roles**: `store-manager`, `dispatcher`, `admin`
- **Request Body**:
  ```json
  {
    "outletId": "OUT-FR-BOR",
    "orderDate": "2026-10-05",
    "tempRequirement": "chilled",
    "items": [
      {
        "skuCode": "DAIRY-012",
        "name": "Highland Fresh Full Cream Milk 1L",
        "category": "Chilled Dairy",
        "quantity": 120,
        "unitOfMeasure": "Carton",
        "unitWeightKg": 10.5,
        "unitVolumeM3": 0.04
      }
    ]
  }
  ```
- **Business Logic**:
  - Enforces 16:00 cutoff lock. If after 16:00, sets `status = 'QUEUED_NEXT_RUN'`.
  - Enforces Fresh dual-order rule: unique `(outletId, orderDate, tempRequirement)`.
- **Response** (`201 Created`):
  ```json
  {
    "id": "ord-uuid-1041",
    "orderNumber": "ORD-1041-C",
    "outletId": "OUT-FR-BOR",
    "brand": "Fresh",
    "tempRequirement": "chilled",
    "totalWeightKg": 1260.00,
    "totalVolumeM3": 4.80,
    "totalCartons": 120,
    "status": "CONFIRMED",
    "isLocked": true
  }
  ```

#### `GET /api/v1/orders`
- **Query Parameters**: `depotId`, `orderDate`, `status`, `brand`, `page`, `limit`.
- **Response** (`200 OK`): Paginated order list.

#### `GET /api/v1/stores/:id/inbound`
- **Purpose**: Store Manager monitors inbound delivery ETA and vehicle location (FAIL-D).

---

### 3.3 Dispatch, Feasibility & Allocation (`/dispatch`)

#### `GET /api/v1/dispatch/backlog`
- **Purpose**: Consolidated view of confirmed orders for a depot at 16:00, including carried-over deferrals.
- **Authorized Roles**: `dispatcher`, `admin`
- **Query Parameters**: `depotId`, `operatingDate`.
- **Response** (`200 OK`): List of orders annotated with `deferred_yesterday`, `days_since_last_served`, and priority score.

#### `POST /api/v1/dispatch/validate-trip`
- **Purpose**: Dry-run check evaluating the 7 Core Feasibility Rules and fuel quotas without persisting.
- **Request Body**:
  ```json
  {
    "depotId": "PELIYAGODA",
    "vehicleId": "WP-012",
    "operatingDate": "2026-10-05",
    "tripNumber": 1,
    "orderIds": ["ord-uuid-1041", "ord-uuid-1042"],
    "departureMin": 300
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "isValid": true,
    "violations": [],
    "metrics": {
      "totalWeightKg": 1560.00,
      "weightCapacityKg": 1800.00,
      "totalVolumeM3": 8.10,
      "volumeCapacityM3": 10.00,
      "tripMinutes": 105,
      "shiftBudgetMinutes": 270,
      "fuelLitersConsumed": 14.5,
      "fuelLitersRemaining": 25.5
    }
  }
  ```

#### `POST /api/v1/dispatch/trips`
- **Purpose**: Commit an allocated trip with verified feasibility.
- **Response** (`201 Created`): Created Trip with generated LIFO stop sequence.

#### `POST /api/v1/dispatch/defer`
- **Purpose**: Log an unserved order deferral with mandatory reason code (FAIL-B).
- **Request Body**:
  ```json
  {
    "orderId": "ord-uuid-1043",
    "operatingDate": "2026-10-05",
    "reasonCode": "NO_REEFER_AVAILABLE",
    "category": "UNAVOIDABLE",
    "justificationNote": "All 12 reefer trucks allocated to Colombo Fresh runs. Zero chilled capacity remains."
  }
  ```

---

### 3.4 Warehouse Staging & Gate Clearance (`/loader`)

#### `GET /api/v1/loader/manifests/:tripId`
- **Purpose**: Digital loading manifest presented in strict **LIFO reverse stop order**.
- **Authorized Roles**: `loader`, `dispatcher`, `admin`

#### `POST /api/v1/loader/discrepancies`
- **Purpose**: Flag punctured or missing cartons during warehouse staging (FAIL-A).
- **Request Body**:
  ```json
  {
    "tripId": "trip-uuid-01",
    "orderId": "ord-uuid-1041",
    "type": "damaged",
    "quantity": 3,
    "itemDescription": "Highland Full Cream Milk 1L",
    "notes": "Punctured cartons leaking dairy."
  }
  ```

#### `POST /api/v1/loader/clearances`
- **Purpose**: Loader sign-off officially authorizing gate departure (L5).
- **Response** (`200 OK`): Trip state transitions to `CLEARED_DEPARTURE`; releases manifest to driver.

---

### 3.5 Delivery Execution & Field Synchronization (`/driver`, `/sync`)

#### `GET /api/v1/driver/active-route`
- **Purpose**: Fetch assigned route for the signed-in driver's shift.

#### `POST /api/v1/driver/stops/:id/arrive`
- **Purpose**: Driver logs destination arrival. If before window, returns `WAITING_FOR_WINDOW`.

#### `POST /api/v1/driver/stops/:id/complete`
- **Purpose**: Driver confirms delivery with digital signature, photo proof, and verified count (SM-3).
- **Request Body**:
  ```json
  {
    "deliveredCartons": 42,
    "expectedCartons": 42,
    "outcome": "FULL",
    "recipientName": "Kusal Perera",
    "recipientDesignation": "Store Manager",
    "signatureBase64": "data:image/png;base64,iVBOR...",
    "photoBase64": "data:image/png;base64,iVBOR...",
    "notes": "Rear dock delivery verified < 4.0C",
    "clientMutationId": "mut-7829-1041"
  }
  ```

#### `POST /api/v1/driver/stops/:id/exception`
- **Purpose**: Driver reports delivery failure (store closed, rejected, dock blocked).

#### `POST /api/v1/driver/report-delay`
- **Purpose**: Driver reports road transit delay (monsoon, traffic, breakdown). Broadcasts updated ETAs.

#### `POST /api/v1/sync/reconcile`
- **Purpose**: Offline-first mutation batch ingestion (FAIL-C).
- **Request Body**: Array of client mutations with idempotency keys.
- **Behavior**: Processed atomically; detects and flags server version conflicts without discarding driver proof.

---

### 3.6 Store Manager Operations (`/store`)

#### `GET /api/v1/store/overview`
- **Purpose**: Aggregated operational overview for Store Manager dashboard. Returns outlet metadata, 16:00 cutoff countdown clock, active order counts, and inbound vehicle deliveries.
- **Authorized Roles**: `store_manager`, `dispatcher`, `admin`
- **Resource Scope**: Automatically bound to `user.outletId` for Store Managers.
- **Response** (`200 OK`):
  ```json
  {
    "outlet": {
      "id": "c1a11111-1111-4111-8111-111111111101",
      "code": "F-COL-01",
      "name": "Cargills Food City — Kollupitiya",
      "brand": "Fresh",
      "deliveryWindow": "08:00 - 18:00"
    },
    "cutoff": {
      "cutoffTime": "16:00:00",
      "isPastCutoff": false,
      "minutesToCutoff": 85,
      "nextDeliveryDate": "2026-10-05",
      "message": "Order cutoff is 16:00. You have 1h 25m remaining for next-day dispatch."
    },
    "activeCounts": { "total": 3, "recorded": 1, "queued": 0, "inTransit": 1, "delivered": 1 },
    "inboundDeliveries": [
      {
        "tripStopId": "stop-uuid-01",
        "tripNumber": "TRIP-20261005-01",
        "orderNumber": "ORD-20261005-FR-1044",
        "tempRequirement": "chilled",
        "status": "IN_TRANSIT",
        "vehiclePlate": "WP-CAD-1029",
        "driverName": "Sunil Perera",
        "plannedArrivalTime": "10:15"
      }
    ]
  }
  ```

#### `GET /api/v1/store/deliveries`
- **Purpose**: Lists today's and historical deliveries for the retail store with split vehicle ETAs (`ALT-1`) and verified proof-of-delivery receipts (`SM-POD-001`).
- **Authorized Roles**: `store_manager`, `dispatcher`, `admin`

#### `POST /api/v1/store/discrepancies`
- **Purpose**: Submit physical receiving discrepancy claim upon dock unloading (`SM-3`, `SM-DISC-001`).
- **Authorized Roles**: `store_manager`, `admin`
- **Request Body**:
  ```json
  {
    "orderId": "ord-uuid-1041",
    "tripStopId": "stop-uuid-01",
    "discrepancyType": "DAMAGE_IN_TRANSIT",
    "shortfallQty": 3,
    "notes": "Punctured cartons sustained during transit."
  }
  ```
- **Response** (`201 Created`): Returns created claim with unique tracking number `CLM-YYYYMMDD-XXXX`.

#### `GET /api/v1/store/discrepancies`
- **Purpose**: Fetches historical discrepancy claims filed for the store.
- **Authorized Roles**: `store_manager`, `dispatcher`, `admin`

---

### 3.7 Health & Observability (`/health`)

#### `GET /api/v1/health/liveness`
- **Purpose**: Kubernetes/Docker process health check.
- **Response** (`200 OK`): `{ "status": "ok", "uptimeSeconds": 1842 }`

#### `GET /api/v1/health/readiness`
- **Purpose**: Validates PostgreSQL pool connectivity and database read capability.
- **Response** (`200 OK`): `{ "status": "ok", "checks": { "database": "up" } }`

