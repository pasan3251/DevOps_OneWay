# Store Manager Domain Analysis — Waypoint Logistics

## 1. Domain Overview & Actor Definition

In the Waypoint Logistics Management System, the **Store Manager** represents the retail demand side of the distribution network. Store Managers operate across **120 retail outlets** in Sri Lanka's Western and Central provinces across three retail banners:
1. **Fresh Supermarkets**: Fast-moving consumer goods requiring daily dry/ambient grocery replenishment and frequent temperature-controlled chilled dairy/meat runs.
2. **Style Outlets**: Apparel and fashion retail with weekly and bi-weekly replenishment patterns (ambient only).
3. **Tech Outlets**: Consumer electronics and high-value accessories (ambient only).

```text
                               STORE MANAGER OPERATIONAL CONTEXT
   
   +---------------------------------------------------------------------------------+
   |                                STORE MANAGER                                    |
   |                                                                                 |
   |  Demand Initiation (SM-1)           Visibility & Handover (SM-3)                |
   |  * Daily stock replenishment        * Live ETA tracking & drift alerts          |
   |  * Ambient vs Chilled dual orders   * Dual-order split arrival tracking (ALT-1) |
   |  * 16:00 cutoff deadline awareness  * Driver handover & signature POD capture   |
   |  * Pre-cutoff cancellations         * Delivery discrepancy claims logging       |
   +-----------------------+---------------------------------+-----------------------+
                           |                                 ^
                           v                                 |
              [Order Capture & Backlog]             [Final Trip Manifests]
                           |                                 |
                           v                                 |
                 +-------------------+             +-------------------+
                 | CENTRAL DISPATCH  |             | DELIVERY DRIVER   |
                 | (Peliyagoda Hub)  |             | (Fleet Vehicles)  |
                 +-------------------+             +-------------------+
```

---

## 2. Store Manager Responsibilities & Capabilities

### 2.1 Core Responsibilities:
1. **Inventory Replenishment Capture (`SM-1`)**: Formulates store demand from the approved SKU catalog.
2. **Cutoff Compliance (`BR-ORD-001`)**: Submits orders before the strict **16:00 daily cutoff** to secure next-day delivery run inclusion.
3. **Dual-Demand Management for Fresh Outlets (`SM-1` / `ALT-1`)**: Submits up to one ambient order and one separate chilled order for a single delivery date.
4. **Receiving & Gate Handover (`SM-3`)**: Coordinates dock staff during the store's designated delivery time window (e.g., 08:00 - 12:00).
5. **Electronic Proof of Delivery Signing**: Inspects physical goods, signs driver mobile terminal, and verifies receiving representative name.
6. **Discrepancy Reporting (`SM-3`)**: Formally logs delivery shortages, carton damage, or temperature rejections immediately upon arrival.

### 2.2 Explicit Operational Boundaries (What Store Managers CANNOT Do):
- Store Managers **CANNOT** allocate vehicles, drivers, or route sequences (this belongs solely to the Central Dispatcher at Peliyagoda).
- Store Managers **CANNOT** view other stores' orders, deliveries, or inventory (strictly scoped via `ResourceScopeGuard`).
- Store Managers **CANNOT** modify or cancel an order once the 16:00 cutoff has passed or dispatch planning has locked the trip (`ASSIGNED` / `IN_TRANSIT`).
- Store Managers **CANNOT** override physical vehicle constraints or van-only restrictions.

---

## 3. Workflow Triggers & Event Lifecycle

### 3.1 Primary Workflow Triggers:
| Trigger | Initiating Actor | System Reaction | Store Manager Output |
| :--- | :--- | :--- | :--- |
| **Daily Ordering Window Opens** | Time (Morning) | Presents active SKU catalog, yesterday's history, and cutoff countdown | New replenishment order form ready |
| **Order Submitted Before 16:00** | Store Manager | Validates dual-order invariant, aggregates weight/volume, sets status `ORDER_RECORDED` | Immediate confirmation: *"Order scheduled for tomorrow's run"* |
| **Order Submitted After 16:00** | Store Manager | Sets status `QUEUED_NEXT_RUN`, locks `is_cutoff_locked = true` | Warning message: *"Submitted after 16:00; queued for following run"* |
| **Dispatcher Plans Trip** | Central Dispatcher | Trip status $\to$ `PLANNED`, order status $\to$ `ASSIGNED` | Order details show assigned vehicle and planned delivery date |
| **Dispatcher Defers Order** | Central Dispatcher | Order status retains `ORDER_RECORDED`, `deferred_count += 1`, records reason code (`FAIL-B`) | Deferral Notice received with specific operational constraint cause |
| **Driver Departs Depot** | Delivery Driver | Trip status $\to$ `EN_ROUTE`, order status $\to$ `IN_TRANSIT` | Live delivery tracker shows vehicle on road and estimated window |
| **ETA Drift Alert (> 15 min)** | Telematics Engine | Detects transit delay within window | Watch notice with revised arrival window |
| **Driver Arrives at Outlet** | Delivery Driver | Stop status $\to$ `ARRIVED`, calculates early arrival wait time | Notification: *"Driver arrived at receiving dock"* |
| **Driver Completes Delivery** | Driver + Manager | Stores signature POD, updates order $\to$ `DELIVERED` | Digital delivery receipt with timestamp and signed receipt |
| **Discrepancy Reported** | Store Manager | Logs `discrepancy_claims` record, flags claim number | Claim confirmation with shortage units and dispatcher alert |

---

## 4. Cross-Role Interactions & Information Flow

### 4.1 Upstream: Store Manager $\longrightarrow$ Central Dispatcher
- Validated order with precise cubic volume ($m^3$) and gross weight ($kg$).
- Store physical access limitations (e.g. `is_van_only` flag for narrow alleys).
- Designated store delivery window (e.g. `window_start = 08:00`, `window_end = 12:00`).

### 4.2 Downstream: Central Dispatcher $\longrightarrow$ Store Manager
- Confirmed dispatch assignment or formal capacity deferral reason (`FAIL-B`).
- If a Fresh dual order is split across two vehicles due to reefer capacity constraints (`ALT-1`), the Store Manager receives **two separate arrival ETAs**.

### 4.3 Ground-Level: Delivery Driver $\longleftrightarrow$ Store Manager
- Driver presents physical cargo and electronic terminal at receiving dock.
- Store Manager validates carton counts against the digital packing list.
- Store Manager signs on glass; driver terminal records geo-coordinates ($\pm 10\text{m}$) and UTC timestamp.
