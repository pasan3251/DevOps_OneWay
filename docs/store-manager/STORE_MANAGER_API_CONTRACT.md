# Store Manager API Contract Specification — Waypoint Logistics

## 1. Overview & Security Standards

All Store Manager endpoints operate under `/api/v1/`, require a valid Bearer JWT token, and enforce strict server-side **Resource Scope Protection** (`ResourceScopeGuard`). A Store Manager can only query or mutate resources belonging to their assigned outlet (`users.outlet_id`).

### Standard Response Envelope:
```json
{
  "data": { ... },
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

### Standard Error Envelope:
```json
{
  "error": {
    "code": "ORDER_CUTOFF_EXCEEDED",
    "message": "Order submission past operational cutoff; queued for following cycle.",
    "timestamp": "2026-10-04T16:05:00.000Z",
    "path": "/api/v1/orders"
  }
}
```

---

## 2. API Endpoints Specification

### 2.1 Store Operational Overview
- **Path**: `GET /api/v1/store/overview`
- **Authorized Role**: `store_manager`, `admin`
- **Purpose**: Feeds the operational dashboard with store metadata, cutoff countdown, inbound deliveries, and order pipeline counts.
- **Response `200 OK`**:
  ```json
  {
    "store": {
      "id": "c1f7a63b-...",
      "code": "OUT-FRESH-001",
      "name": "Fresh Supermarket - Peliyagoda Main",
      "brand": "Fresh",
      "district": "Gampaha",
      "windowStart": "08:00",
      "windowEnd": "12:00",
      "isVanOnly": false,
      "depotName": "Peliyagoda Central Distribution Hub"
    },
    "cutoff": {
      "cutoffTime": "16:00",
      "isPastCutoff": false,
      "timeRemainingMinutes": 145,
      "targetDeliveryDate": "2026-10-05"
    },
    "todayDeliveries": [
      {
        "tripStopId": "e3b8a1c4-...",
        "orderNumber": "ORD-2026-10-04-FR-1001",
        "tempRequirement": "ambient",
        "tripStatus": "EN_ROUTE",
        "stopStatus": "PENDING",
        "estimatedArrival": "09:30",
        "vehicleRegistration": "WP-CAB-2001",
        "driverName": "Sunil Fernando",
        "driverPhone": "+94 77 400 0001"
      }
    ],
    "orderMetrics": {
      "recorded": 2,
      "assigned": 1,
      "inTransit": 1,
      "deliveredToday": 3,
      "queuedNextRun": 0
    }
  }
  ```

---

### 2.2 Submit Replenishment Order (`SM-1`)
- **Path**: `POST /api/v1/orders`
- **Authorized Role**: `store_manager`, `admin`, `dispatcher`
- **Request Body**:
  ```json
  {
    "outletId": "c1f7a63b-...",
    "brand": "Fresh",
    "tempRequirement": "chilled",
    "orderDate": "2026-10-05",
    "items": [
      {
        "productId": "p9201-...",
        "quantity": 25
      }
    ]
  }
  ```
- **Validation**:
  - `outletId` matches authenticated Store Manager's assigned store.
  - `brand` matches store brand.
  - If brand is `Style` or `Tech`, `tempRequirement` must be `ambient`.
  - At least 1 line item with `quantity >= 1`.
- **Response `201 Created`**:
  ```json
  {
    "id": "9021a-...",
    "orderNumber": "ORD-2026-10-05-FR-4821",
    "status": "ORDER_RECORDED",
    "totalWeightKg": "26.25",
    "totalVolumeM3": "0.04",
    "totalItemsCount": 25,
    "isCutoffLocked": false,
    "items": [ ... ]
  }
  ```
- **Errors**:
  - `409 Conflict`: `Duplicate order violation: Outlet already has a chilled order for 2026-10-05`.
  - `400 Bad Request`: `Order must contain at least one line item`.

---

### 2.3 List Store Orders
- **Path**: `GET /api/v1/orders`
- **Authorized Role**: `store_manager`, `admin`, `dispatcher`
- **Query Parameters**:
  - `orderDate`: string (`YYYY-MM-DD`)
  - `status`: string (`ORDER_RECORDED`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`)
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
- **Scoping**: Automatically forces `outletId = user.outletId` for Store Managers.

---

### 2.4 Cancel Order (Pre-Cutoff)
- **Path**: `POST /api/v1/orders/:id/cancel`
- **Authorized Role**: `store_manager`, `admin`
- **Business Rule**: Allowed only if status is `ORDER_RECORDED` or `QUEUED_NEXT_RUN`.
- **Response `200 OK`**:
  ```json
  {
    "id": "9021a-...",
    "status": "CANCELLED",
    "updatedAt": "2026-10-04T12:00:00Z"
  }
  ```
- **Errors**:
  - `400 Bad Request`: `Cannot cancel order in status ASSIGNED. Trip planning has commenced.`

---

### 2.5 Report Discrepancy Claim (`SM-3`)
- **Path**: `POST /api/v1/store/discrepancies`
- **Authorized Role**: `store_manager`, `admin`
- **Request Body**:
  ```json
  {
    "orderId": "9021a-...",
    "tripStopId": "e3b8a1c4-...",
    "discrepancyType": "DAMAGE_IN_TRANSIT",
    "shortfallQty": 3,
    "notes": "Three cartons of milk punctured and leaking upon receipt."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "claimNumber": "DISC-SM-179111400-842",
    "status": "LOGGED",
    "discrepancyType": "DAMAGE_IN_TRANSIT",
    "shortfallQty": 3
  }
  ```
